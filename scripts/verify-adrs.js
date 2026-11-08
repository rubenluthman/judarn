#!/usr/bin/env node
/**
 * scripts/verify-adrs.js
 *
 * Enforces the ADR governance rules in docs/adr/README.md:
 * - Record format: frontmatter, status vocabulary, required sections, typography.
 * - Amendment rule: a changed decision needs a new ADR, a predecessor status,
 *   a matching top-level callout, and index entries.
 * - Immutability: accepted records never change outside their status and callout.
 *
 * Usage:
 *   node scripts/verify-adrs.js                       # Working tree against HEAD
 *   node scripts/verify-adrs.js --staged              # Index against HEAD (pre-commit)
 *   node scripts/verify-adrs.js --range <base>..<head>  # Commit range (CI)
 *   node scripts/verify-adrs.js --root <dir>          # Audit another checkout
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ADR_DIR = 'docs/adr';
const INDEX_PATH = `${ADR_DIR}/README.md`;
const ARCHITECTURE_PATH = 'ARCHITECTURE.md';
const ADR_FILE = /^(\d{4})-[a-z0-9-]+\.md$/;
const INVARIANTS_HEADING = '### Invariants & Negative Constraints';
const REQUIRED_FIELDS = ['status', 'date', 'deciders', 'tags'];
const RACI_FIELDS = ['consulted', 'informed'];

function parseArgs(argv) {
  const args = { root: path.resolve(__dirname, '..'), staged: false, range: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--staged') args.staged = true;
    else if (argv[i] === '--range') args.range = argv[++i];
    else if (argv[i] === '--root') args.root = path.resolve(argv[++i]);
    else {
      console.error(`✗ Unknown argument: ${argv[i]}`);
      process.exit(2);
    }
  }
  return args;
}

function createSnapshots({ root, staged, range }) {
  const git = (...gitArgs) =>
    execFileSync('git', gitArgs, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const tryGit = (...gitArgs) => {
    try {
      return git(...gitArgs);
    } catch {
      return null;
    }
  };
  const lines = (output) => output.split('\n').filter(Boolean).map((file) => path.posix.basename(file));
  const refSnapshot = (ref) => ({
    list: () => lines(git('ls-tree', '-r', '--name-only', ref, '--', `${ADR_DIR}/`)),
    read: (file) => tryGit('show', `${ref}:${file}`)
  });

  if (range) {
    const [baseRef, headRef] = range.split('..');
    // A zero SHA (new branch push) or an unknown base (shallow clone, force-push) has no history
    // to compare against, so only the head state is validated.
    const baseUsable = Boolean(baseRef) && !/^0+$/.test(baseRef) &&
      tryGit('rev-parse', '--verify', '-q', `${baseRef}^{commit}`) !== null;
    return { current: refSnapshot(headRef || 'HEAD'), base: baseUsable ? refSnapshot(baseRef) : null };
  }

  const hasHead = tryGit('rev-parse', '--verify', '-q', 'HEAD') !== null;
  const base = hasHead ? refSnapshot('HEAD') : null;
  if (staged) {
    return {
      current: {
        list: () => lines(git('ls-files', '--cached', '--', `${ADR_DIR}/`)),
        read: (file) => tryGit('show', `:${file}`)
      },
      base
    };
  }
  return {
    current: {
      list: () => fs.readdirSync(path.join(root, ADR_DIR)),
      read: (file) => {
        const fullPath = path.join(root, file);
        return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : null;
      }
    },
    base
  };
}

function parseStatus(raw) {
  const value = (raw || '').trim();
  if (['proposed', 'accepted', 'rejected', 'deprecated'].includes(value)) {
    return { kind: value, targets: [] };
  }
  const amended = value.match(/^accepted \(amended by ((?:\[?ADR-\d{4}\]?(?:, )?)+)\)$/);
  if (amended) {
    return { kind: 'amended', targets: amended[1].match(/\d{4}/g) };
  }
  const superseded = value.match(/^superseded by \[?ADR-(\d{4})\]?$/);
  if (superseded) {
    return { kind: 'superseded', targets: [superseded[1]] };
  }
  return { kind: 'invalid', targets: [] };
}

function parseAdr(file, text) {
  const frontmatterMatch = text.match(/^---\n([\s\S]*?)\n---\n/);
  const fields = {};
  if (frontmatterMatch) {
    for (const line of frontmatterMatch[1].split('\n')) {
      const field = line.match(/^([a-zA-Z_-]+):\s*(.*)$/);
      if (field) fields[field[1]] = field[2].trim();
    }
  }

  const body = frontmatterMatch ? text.slice(frontmatterMatch[0].length) : text;
  const bodyLines = body.split('\n');
  const titleIndex = bodyLines.findIndex((line) => line.startsWith('# '));
  const title = titleIndex === -1 ? null : bodyLines[titleIndex].slice(2).trim();

  let cursor = titleIndex + 1;
  while (cursor < bodyLines.length && bodyLines[cursor].trim() === '') cursor++;
  const calloutStart = cursor;
  while (cursor < bodyLines.length && bodyLines[cursor].startsWith('>')) cursor++;
  const calloutLines = titleIndex === -1 ? [] : bodyLines.slice(calloutStart, cursor);
  const callout = calloutLines.join('\n');
  const calloutType = (callout.match(/^> \[!(NOTE|WARNING)\]/) || [])[1] || null;

  const outsideCallout = titleIndex === -1
    ? bodyLines
    : [...bodyLines.slice(0, calloutStart), ...bodyLines.slice(calloutStart + calloutLines.length)];
  const hasStrayCallout = outsideCallout.some((line) => /^> \[!(NOTE|WARNING)\]/.test(line));

  const frontmatterWithoutStatus = (frontmatterMatch ? frontmatterMatch[1] : '')
    .split('\n')
    .filter((line) => !line.startsWith('status:'))
    .join('\n');
  const immutable = `${frontmatterWithoutStatus}\n${outsideCallout.join('\n')}`.replace(/\n{3,}/g, '\n\n').trimEnd();

  return {
    file,
    id: file.slice(0, 4),
    hasFrontmatter: Boolean(frontmatterMatch),
    fields,
    status: parseStatus(fields.status),
    title,
    callout,
    calloutType,
    hasStrayCallout,
    immutable,
    text
  };
}

function checkRecord(adr, errors) {
  const label = adr.file;
  if (!adr.hasFrontmatter) {
    errors.push(`${label}: missing YAML frontmatter`);
    return;
  }
  for (const field of REQUIRED_FIELDS) {
    if (!adr.fields[field]) errors.push(`${label}: missing frontmatter field "${field}"`);
  }
  for (const field of RACI_FIELDS) {
    if (field in adr.fields) errors.push(`${label}: RACI field "${field}" is prohibited`);
  }
  if (adr.fields.date && !/^\d{4}-\d{2}-\d{2}$/.test(adr.fields.date)) {
    errors.push(`${label}: date must be YYYY-MM-DD (got "${adr.fields.date}")`);
  }
  if (adr.fields.deciders && adr.fields.deciders !== 'Ruben Luthman') {
    errors.push(`${label}: deciders must be "Ruben Luthman" (got "${adr.fields.deciders}")`);
  }
  if (adr.fields.tags && !/^\[.+\]$/.test(adr.fields.tags)) {
    errors.push(`${label}: tags must be an inline list`);
  }
  if (adr.status.kind === 'invalid') {
    errors.push(`${label}: unrecognized status "${adr.fields.status}"`);
  }
  if (!adr.title) errors.push(`${label}: missing H1 title`);
  if (!adr.text.includes(`\n${INVARIANTS_HEADING}\n`)) {
    errors.push(`${label}: missing "${INVARIANTS_HEADING}" section`);
  }
}

function checkAmendmentState(adr, byId, errors) {
  const label = adr.file;
  const expectedCallout = { amended: 'NOTE', superseded: 'WARNING' }[adr.status.kind] || null;

  if (adr.hasStrayCallout) {
    errors.push(`${label}: alert callouts must sit directly under the title`);
  }
  if (expectedCallout && adr.calloutType !== expectedCallout) {
    errors.push(`${label}: status "${adr.fields.status}" requires a top-level > [!${expectedCallout}] callout`);
  }
  if (!expectedCallout && adr.callout) {
    errors.push(`${label}: callout present without an amended or superseded status`);
  }
  for (const target of adr.status.targets) {
    if (!byId.has(target)) {
      errors.push(`${label}: status references ADR-${target}, which does not exist`);
    } else if (Number(target) <= Number(adr.id)) {
      errors.push(`${label}: status references ADR-${target}, which is not newer than this record`);
    } else if (!['accepted', 'amended', 'superseded'].includes(byId.get(target).status.kind)) {
      errors.push(`${label}: status references ADR-${target}, whose own status "${byId.get(target).fields.status}" is not accepted`);
    }
    // A target later superseded stays valid: amendments it made before then remain historical fact.
    if (!adr.callout.includes(`ADR-${target}`)) {
      errors.push(`${label}: callout does not name ADR-${target}`);
    }
  }
}

function checkHistory(adrs, snapshots, errors) {
  const { base } = snapshots;
  if (!base) return;

  const currentByFile = new Map(adrs.map((adr) => [adr.file, adr]));
  const baseFiles = new Set(base.list().filter((file) => ADR_FILE.test(file)));

  for (const file of baseFiles) {
    const previous = parseAdr(file, base.read(`${ADR_DIR}/${file}`));
    const current = currentByFile.get(file);
    if (!current) {
      errors.push(`${file}: ADR deleted or renamed, records are permanent`);
      continue;
    }
    if (previous.status.kind === 'proposed') continue;

    if (previous.immutable !== current.immutable) {
      errors.push(`${file}: accepted record changed outside its status and callout, author a new ADR instead`);
    }
    const statusChanged = previous.fields.status !== current.fields.status;
    if (!statusChanged && previous.callout === current.callout) continue;

    if (current.status.kind === 'deprecated' && previous.status.kind === 'accepted') continue;

    const allowedTransition =
      ['accepted', 'amended'].includes(previous.status.kind) &&
      ['amended', 'superseded'].includes(current.status.kind);
    if (!allowedTransition) {
      errors.push(statusChanged
        ? `${file}: status cannot change from "${previous.fields.status}" to "${current.fields.status}"`
        : `${file}: status or callout changed without a new ADR in the same change`);
      continue;
    }
    const droppedAmendment = previous.status.targets.some((target) => !current.status.targets.includes(target));
    if (current.status.kind === 'amended' && droppedAmendment) {
      errors.push(`${file}: prior amendments must stay listed in status`);
    }

    const added = current.status.targets.filter((target) => !previous.status.targets.includes(target));
    if (added.length === 0) {
      errors.push(`${file}: status or callout changed without a new ADR in the same change`);
    }
    for (const target of added) {
      const targetFile = [...currentByFile.keys()].find((name) => name.startsWith(`${target}-`));
      if (targetFile && baseFiles.has(targetFile)) {
        errors.push(`${file}: ADR-${target} already existed, an amendment needs a new ADR in the same change`);
      }
    }
  }
}

function normalizeStatus(status) {
  return String(status || '').toLowerCase().replace(/[[\]]/g, '').trim();
}

function checkIndex(adrs, indexText, errors) {
  if (indexText === null) {
    errors.push(`${INDEX_PATH}: file is missing`);
    return;
  }
  const rows = new Map();
  for (const line of indexText.split('\n')) {
    const link = line.match(/^\| \[(\d{4})\]\(([^)]+)\) \|/);
    if (!link) continue;
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    rows.set(link[1], { file: link[2], title: cells[1], date: cells[2], status: cells[3], tags: cells[4] });
  }

  for (const adr of adrs) {
    const row = rows.get(adr.id);
    if (!row) {
      errors.push(`${INDEX_PATH}: no index row for ${adr.file}`);
      continue;
    }
    if (row.file !== adr.file) errors.push(`${INDEX_PATH}: row ${adr.id} links to "${row.file}", expected "${adr.file}"`);
    if (row.title !== adr.title) errors.push(`${INDEX_PATH}: row ${adr.id} title differs from the record`);
    if (row.date !== adr.fields.date) errors.push(`${INDEX_PATH}: row ${adr.id} date differs from the record`);
    if (normalizeStatus(row.status) !== normalizeStatus(adr.fields.status)) {
      errors.push(`${INDEX_PATH}: row ${adr.id} status "${row.status}" differs from "${adr.fields.status}"`);
    }
    if (`[${row.tags}]` !== adr.fields.tags) errors.push(`${INDEX_PATH}: row ${adr.id} tags differ from the record`);
  }
  for (const id of rows.keys()) {
    if (!adrs.some((adr) => adr.id === id)) errors.push(`${INDEX_PATH}: row ${id} has no matching record`);
  }
}

function checkArchitecture(adrs, architectureText, errors) {
  if (architectureText === null) {
    errors.push(`${ARCHITECTURE_PATH}: file is missing`);
    return;
  }
  const entries = new Map();
  for (const entry of architectureText.matchAll(/^- \[ADR-(\d{4}): (.+)\]\(docs\/adr\/([^)]+)\)$/gm)) {
    entries.set(entry[1], { title: entry[2], file: entry[3] });
  }
  for (const adr of adrs) {
    const entry = entries.get(adr.id);
    if (!entry) {
      errors.push(`${ARCHITECTURE_PATH}: ADR-${adr.id} is missing from the decision list`);
    } else if (entry.title !== adr.title || entry.file !== adr.file) {
      errors.push(`${ARCHITECTURE_PATH}: ADR-${adr.id} entry differs from the record`);
    }
  }
  for (const id of entries.keys()) {
    if (!adrs.some((adr) => adr.id === id)) errors.push(`${ARCHITECTURE_PATH}: ADR-${id} has no matching record`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const snapshots = createSnapshots(args);
  const errors = [];

  const files = snapshots.current.list().filter((file) => file !== 'README.md' && file !== '.DS_Store');
  for (const file of files) {
    if (!ADR_FILE.test(file)) errors.push(`${ADR_DIR}/${file}: name must be ####-kebab-case-title.md`);
  }

  const adrs = files
    .filter((file) => ADR_FILE.test(file))
    .sort()
    .map((file) => parseAdr(file, snapshots.current.read(`${ADR_DIR}/${file}`)));

  const byId = new Map();
  adrs.forEach((adr, position) => {
    if (byId.has(adr.id)) errors.push(`${adr.file}: duplicate number ${adr.id}`);
    byId.set(adr.id, adr);
    if (Number(adr.id) !== position + 1) errors.push(`${adr.file}: numbering must be sequential, expected ${position + 1}`);
  });

  for (const adr of adrs) {
    checkRecord(adr, errors);
    checkAmendmentState(adr, byId, errors);
  }
  checkHistory(adrs, snapshots, errors);
  checkIndex(adrs, snapshots.current.read(INDEX_PATH), errors);
  checkArchitecture(adrs, snapshots.current.read(ARCHITECTURE_PATH), errors);

  if (errors.length > 0) {
    console.error(`✗ ADR governance failed with ${errors.length} error(s):`);
    for (const error of errors) console.error(`  - ${error}`);
    console.error(`See the Decision Lifecycle in ${INDEX_PATH}.`);
    process.exit(1);
  }
  console.log(`✓ ADR governance verified (${adrs.length} records).`);
}

main();
