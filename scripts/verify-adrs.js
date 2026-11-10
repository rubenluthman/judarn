#!/usr/bin/env node
/**
 * scripts/verify-adrs.js
 *
 * Checks decision records against the format in docs/adr/README.md:
 * - File name NNNN-title.md, unique numbers, a title line, a `Status: Active|Retired · Date` line.
 * - The four headings Decision, Why, What we gave up, Revisit if, in that order.
 * - No em dashes, no leftover frontmatter or old-format sections.
 * - The README index lists every record with its number, title, and status.
 *
 * Records are edited in place, so no history comparison is made.
 *
 * Usage:
 *   node scripts/verify-adrs.js                         # Working tree
 *   node scripts/verify-adrs.js --staged                # Index (pre-commit)
 *   node scripts/verify-adrs.js --range <base>..<head>  # Head of a commit range (CI)
 *   node scripts/verify-adrs.js --root <dir>            # Audit another checkout
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ADR_DIR = 'docs/adr';
const INDEX_PATH = `${ADR_DIR}/README.md`;
const ADR_FILE = /^(\d{4})-[a-z0-9-]+\.md$/;
const HEADINGS = ['## Decision', '## Why', '## What we gave up', '## Revisit if'];
const STATUS_LINE = /^Status: (Active|Retired) · (\d{4}-\d{2}-\d{2})$/;
const EM_DASH = '—';

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

function createSnapshot({ root, staged, range }) {
  const git = (...gitArgs) =>
    execFileSync('git', gitArgs, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const tryGit = (...gitArgs) => {
    try {
      return git(...gitArgs);
    } catch {
      return null;
    }
  };
  const names = (output) => output.split('\n').filter(Boolean).map((file) => path.posix.basename(file));

  if (range) {
    const ref = range.split('..')[1] || 'HEAD';
    return {
      list: () => names(git('ls-tree', '-r', '--name-only', ref, '--', `${ADR_DIR}/`)),
      read: (file) => tryGit('show', `${ref}:${file}`)
    };
  }
  if (staged) {
    return {
      list: () => names(git('ls-files', '--cached', '--', `${ADR_DIR}/`)),
      read: (file) => tryGit('show', `:${file}`)
    };
  }
  return {
    list: () => fs.readdirSync(path.join(root, ADR_DIR)),
    read: (file) => {
      const fullPath = path.join(root, file);
      return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : null;
    }
  };
}

function parseAdr(file, text, errors) {
  const label = `${ADR_DIR}/${file}`;
  const id = file.match(ADR_FILE)[1];
  const lines = text.split('\n');

  if (text.startsWith('---')) errors.push(`${label}: frontmatter is not used; start with the title line`);
  if (text.includes(EM_DASH)) errors.push(`${label}: contains an em dash (U+2014); use a spaced en dash`);

  const title = lines[0].startsWith('# ') ? lines[0].slice(2).trim() : null;
  if (!title) errors.push(`${label}: first line must be "# Title"`);

  const statusMatch = (lines[1] || '').match(STATUS_LINE);
  if (!statusMatch) errors.push(`${label}: second line must be "Status: Active | Retired · YYYY-MM-DD"`);

  const found = lines.filter((line) => line.startsWith('## '));
  if (found.join('|') !== HEADINGS.join('|')) {
    errors.push(`${label}: headings must be exactly ${HEADINGS.map((h) => h.slice(3)).join(', ')} in that order`);
  }
  for (const heading of HEADINGS) {
    const start = lines.indexOf(heading);
    if (start === -1) continue;
    const next = lines.findIndex((line, i) => i > start && line.startsWith('## '));
    const section = lines.slice(start + 1, next === -1 ? undefined : next);
    if (!section.some((line) => line.trim())) errors.push(`${label}: "${heading.slice(3)}" is empty`);
  }
  return { id, file, title, status: statusMatch ? statusMatch[1] : null };
}

function checkIndex(adrs, indexText, errors) {
  if (indexText === null) {
    errors.push(`${INDEX_PATH}: file is missing`);
    return;
  }
  const rows = new Map();
  for (const line of indexText.split('\n')) {
    const cells = line.split('|').map((cell) => cell.trim());
    const link = (cells[1] || '').match(/^\[(\d{4})\]\(([^)]+)\)$/);
    if (link) rows.set(link[1], { target: link[2], title: cells[2], status: cells[3] });
  }
  for (const adr of adrs) {
    const row = rows.get(adr.id);
    if (!row) errors.push(`${INDEX_PATH}: ADR-${adr.id} is missing from the index`);
    else if (row.target !== adr.file || row.title !== adr.title || row.status !== adr.status) {
      errors.push(`${INDEX_PATH}: ADR-${adr.id} row differs from the record (link, title, or status)`);
    }
  }
  for (const id of rows.keys()) {
    if (!adrs.some((adr) => adr.id === id)) errors.push(`${INDEX_PATH}: ADR-${id} has no matching record`);
  }
}

function main() {
  const snapshot = createSnapshot(parseArgs(process.argv.slice(2)));
  const errors = [];
  const files = snapshot.list().filter((file) => file !== 'README.md').sort();
  const adrs = [];
  const seen = new Set();

  for (const file of files) {
    if (!ADR_FILE.test(file)) {
      errors.push(`${ADR_DIR}/${file}: file name must be NNNN-title.md`);
      continue;
    }
    const text = snapshot.read(`${ADR_DIR}/${file}`);
    if (text === null) continue;
    const adr = parseAdr(file, text, errors);
    if (seen.has(adr.id)) errors.push(`${ADR_DIR}/${file}: duplicate number ${adr.id}`);
    seen.add(adr.id);
    adrs.push(adr);
  }
  checkIndex(adrs, snapshot.read(INDEX_PATH), errors);

  if (errors.length) {
    for (const error of errors) console.error(`✗ ${error}`);
    process.exit(1);
  }
  console.log(`✓ ${adrs.length} decision records follow the format`);
}

main();
