#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const changelogPath = path.join(rootDir, 'CHANGELOG.md');

function run(cmd) {
  try {
    return execSync(cmd, { cwd: rootDir, encoding: 'utf8' }).trim();
  } catch (err) {
    return '';
  }
}

function getCurrentVersion() {
  const pkgPath = path.join(rootDir, 'platforms/web/package.json');
  return JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;
}

function getLatestTag() {
  const tag = run('git describe --tags --abbrev=0');
  return tag || null;
}

function getCommitsSince(tag) {
  const range = tag ? `${tag}..HEAD` : 'HEAD';
  // Full bodies, NUL-separated, so BREAKING CHANGE footers count.
  const log = run(`git log ${range} --format=%B%x00`);
  if (!log) return [];
  return log.split('\0').map((entry) => entry.trim()).filter(Boolean);
}

function parseSemver(versionStr) {
  const match = versionStr.match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9a-zA-Z.-]+))?$/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || null
  };
}

// Same scope charset as .githooks/commit-msg.
const SCOPE = '(\\([a-zA-Z0-9_/-]+\\))?';

function determineNextVersion(currentVersion, commits, latestTag) {
  const parsed = parseSemver(currentVersion);
  if (!parsed) {
    throw new Error(`Cannot parse current version: ${currentVersion}`);
  }
  if (parsed.prerelease) {
    throw new Error(`Pre-release versions are not allowed: ${currentVersion}`);
  }

  // The manifests already carry a version that was never tagged: that release is still pending.
  if (!latestTag || parseSemver(latestTag).patch !== parsed.patch || latestTag.replace(/^v/, '') !== currentVersion) {
    const tagged = run(`git rev-parse -q --verify refs/tags/v${currentVersion}`);
    if (!tagged) return currentVersion;
  }

  let hasBreaking = false;
  let hasChange = false;

  for (const commit of commits) {
    const subject = commit.split('\n')[0];
    if (/^BREAKING[ -]CHANGE:/m.test(commit) || new RegExp(`^[a-z]+${SCOPE}!:`).test(subject)) {
      hasBreaking = true;
    } else if (new RegExp(`^(feat|fix|refactor|perf)${SCOPE}:`).test(subject)) {
      hasChange = true;
    }
  }

  // Pre-1.0: patch per feature, fix or refactor. A minor bump marks a milestone and is chosen by hand,
  // so breaking changes only get flagged here.
  if (parsed.major === 0) {
    if (hasBreaking) {
      console.log('ℹ Breaking change detected: pre-1.0 bumps patch; choose a minor version by hand if this is a milestone.');
    }
    return `0.${parsed.minor}.${parsed.patch + 1}`;
  }

  // 1.0+ Standard SemVer rules
  if (hasBreaking) {
    return `${parsed.major + 1}.0.0`;
  }
  if (commits.some((c) => new RegExp(`^feat${SCOPE}:`).test(c.split('\n')[0]))) {
    return `${parsed.major}.${parsed.minor + 1}.0`;
  }
  return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
}

function updateChangelog(newVersion) {
  if (!fs.existsSync(changelogPath)) return;
  const content = fs.readFileSync(changelogPath, 'utf8');
  const today = new Date().toISOString().split('T')[0];
  
  if (content.includes(`## [${newVersion}]`)) {
    console.log(`ℹ CHANGELOG.md already contains header for [${newVersion}]`);
    return;
  }

  const unreleasedRegex = /## \[Unreleased\]\s*\n\s*\n/;
  if (unreleasedRegex.test(content)) {
    const replacement = `## [Unreleased]\n\n## [${newVersion}] - ${today}\n\n`;
    const updated = content.replace(unreleasedRegex, replacement);
    fs.writeFileSync(changelogPath, updated, 'utf8');
    console.log(`✓ Updated CHANGELOG.md with release header [${newVersion}] - ${today}`);
  }
}

// CLI Orchestration
const args = process.argv.slice(2);
const command = args[0];

const currentVer = getCurrentVersion();
const latestTag = getLatestTag();
const commits = getCommitsSince(latestTag);

if (command === '--check' || command === '-c') {
  console.log('=== Judarn Automated Version Analysis ===\n');
  console.log(`Current synchronized version: ${currentVer}`);
  console.log(`Latest release tag:           ${latestTag || '(none)'}`);
  console.log(`Pending commits since tag:    ${commits.length}\n`);

  if (commits.length === 0) {
    console.log('No new commits since last release tag. Working tree is up to date.');
  } else {
    console.log('Recent Commits:');
    commits.slice(0, 8).forEach(c => console.log(`  - ${c.split('\n')[0]}`));
    const recommended = determineNextVersion(currentVer, commits, latestTag);
    console.log(`\nRecommended next version:     ${recommended}`);
  }
  process.exit(0);
}

let targetVersion = null;

if (command === '--auto' || !command) {
  if (commits.length === 0) {
    console.log(`No pending commits since ${latestTag || 'HEAD'}. Nothing to bump.`);
    process.exit(0);
  }
  targetVersion = determineNextVersion(currentVer, commits, latestTag);
} else if (!command.startsWith('-')) {
  targetVersion = command;
} else {
  console.error('Usage: node scripts/bump-version.js [--check | --auto | <version>]');
  process.exit(1);
}

console.log(`=== Bumping Judarn to ${targetVersion} (from ${currentVer}) ===\n`);

// 1. Run cross-platform version synchronization
execSync(`node "${path.join(__dirname, 'sync-version.js')}" ${targetVersion}`, { stdio: 'inherit' });

// 2. Update CHANGELOG if needed
updateChangelog(targetVersion);

console.log(`\n✓ Next version ${targetVersion} fully prepared.`);
console.log(`  To complete release:\n    git add -A && git commit -m "chore(release): cut version ${targetVersion}" && git tag -a v${targetVersion} -m "Release v${targetVersion}"`);
