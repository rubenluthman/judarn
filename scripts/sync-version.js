#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

const SEMVER = /^[0-9]+\.[0-9]+\.[0-9]+$/;

// Replaces every match of `regex` and throws when nothing matched, so a renamed pattern fails
// loudly instead of leaving a stale version behind.
function replaceOrThrow(content, regex, replacement, label) {
  if (!regex.test(content)) throw new Error(`Setter for ${label} matched nothing`);
  regex.lastIndex = 0;
  return content.replace(regex, replacement);
}

const targets = {
  webPackage: {
    path: path.join(rootDir, 'platforms/web/package.json'),
    get: (content) => JSON.parse(content).version,
    set: (content, version) => {
      const pkg = JSON.parse(content);
      pkg.version = version;
      return JSON.stringify(pkg, null, 2) + '\n';
    }
  },
  mcpServer: {
    path: path.join(rootDir, 'tools/wada-explorer/mcp/server.js'),
    get: (content) => {
      const match = content.match(/name:\s*"judarn-color-dictionary",\s*version:\s*"([^"]+)"/);
      return match ? match[1] : null;
    },
    set: (content, version) => {
      return replaceOrThrow(
        content,
        /(name:\s*"judarn-color-dictionary",\s*version:\s*")[^"]+(")/,
        `$1${version}$2`,
        'MCP server'
      );
    }
  },
  changelog: {
    path: path.join(rootDir, 'CHANGELOG.md'),
    // Check-only: bump-version.js and the release author write the heading, this target verifies it.
    checkOnly: true,
    get: (content) => {
      const match = content.match(/^## \[(\d+\.\d+\.\d+[^\]]*)\]/m);
      return match ? match[1] : null;
    }
  }
};

function readCurrentVersions() {
  const versions = {};
  for (const [key, target] of Object.entries(targets)) {
    if (!fs.existsSync(target.path)) {
      throw new Error(`Target file not found: ${target.path}`);
    }
    const content = fs.readFileSync(target.path, 'utf8');
    versions[key] = {
      path: path.relative(rootDir, target.path),
      version: target.get(content)
    };
  }
  return versions;
}

function checkVersions() {
  console.log('=== Judarn Cross-Platform Token Version Sync Verification ===\n');
  const versions = readCurrentVersions();
  const entries = Object.entries(versions);
  const primaryVersion = entries[0][1].version;
  let hasMismatch = false;

  for (const [key, info] of entries) {
    if (info.version === null || info.version !== primaryVersion || !SEMVER.test(info.version)) {
      console.error(`✗ Mismatch in ${info.path}: expected "${primaryVersion}", found "${info.version}"${key === 'changelog' ? ' (top released CHANGELOG.md heading)' : ''}`);
      hasMismatch = true;
    } else {
      console.log(`✓ ${info.path}: ${info.version}`);
    }
  }

  if (hasMismatch) {
    console.error('\n✗ Version drift detected across platform packages.');
    process.exit(1);
  }

  console.log(`\n✓ All platform targets strictly synchronized to version: ${primaryVersion}`);
}

function setVersion(newVersion) {
  if (!SEMVER.test(newVersion)) {
    console.error(`✗ Invalid version "${newVersion}": use X.Y.Z, pre-release suffixes are not allowed`);
    process.exit(1);
  }

  console.log(`=== Synchronizing Cross-Platform Packages to ${newVersion} ===\n`);
  // Compute every update first so a failing setter cannot leave the targets half-written.
  const updates = [];
  for (const target of Object.values(targets)) {
    if (target.checkOnly) continue;
    updates.push([target, target.set(fs.readFileSync(target.path, 'utf8'), newVersion)]);
  }
  for (const [target, updated] of updates) {
    fs.writeFileSync(target.path, updated, 'utf8');
    console.log(`✓ Updated ${path.relative(rootDir, target.path)} -> ${newVersion}`);
  }
  console.log(`\n✓ Successfully synchronized all platform targets to version ${newVersion}.`);
  console.log('ℹ CHANGELOG.md is check-only: add the "## [' + newVersion + ']" heading before verifying.');
}

// CLI Argument Handling
const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--check') {
  checkVersions();
} else if (command === '--get') {
  const versions = readCurrentVersions();
  console.log(Object.values(versions)[0].version);
} else if (command === 'set' && args[1]) {
  setVersion(args[1]);
} else if (!command.startsWith('-')) {
  setVersion(command);
} else {
  console.error(`Usage: node scripts/sync-version.js [--check | --get | <new-version> | set <new-version>]`);
  process.exit(1);
}
