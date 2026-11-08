const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const SCRIPT = path.join(__dirname, 'verify-adrs.js');

function record(n, { status = 'accepted', callout = '', body = 'Original decision.', invariants = true, extra = '' } = {}) {
  const frontmatter = [`status: ${status}`, `date: 2026-01-0${(n % 9) + 1}`, 'deciders: Ruben Luthman', 'tags: [alpha, beta]', extra]
    .filter(Boolean)
    .join('\n');
  const invariantsSection = invariants ? '### Invariants & Negative Constraints\n\n1. **Boundary:** Constraint.' : '';
  const sections = [`# Decision ${n}`, callout, '## Context', body, invariantsSection].filter(Boolean);
  return `---\n${frontmatter}\n---\n\n${sections.join('\n\n')}\n`;
}

const fileName = (n) => `${String(n).padStart(4, '0')}-decision-${n}.md`;

function indexRow(n, status = 'Accepted') {
  return `| [${String(n).padStart(4, '0')}](${fileName(n)}) | Decision ${n} | 2026-01-0${(n % 9) + 1} | ${status} | alpha, beta |`;
}

function archEntry(n) {
  return `- [ADR-${String(n).padStart(4, '0')}: Decision ${n}](docs/adr/${fileName(n)})`;
}

class Fixture {
  constructor(count) {
    this.root = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-adrs-'));
    this.count = count;
    fs.mkdirSync(path.join(this.root, 'docs/adr'), { recursive: true });
    for (let n = 1; n <= count; n++) this.writeAdr(n, record(n));
    this.writeIndex();
    this.writeArchitecture();
    this.git('init', '-q');
    this.commit('seed');
  }

  git(...args) {
    return execFileSync(
      'git',
      ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', '-c', 'core.hooksPath=/dev/null', ...args],
      { cwd: this.root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
  }

  commit(message) {
    this.git('add', '-A');
    this.git('commit', '-q', '-m', message);
  }

  writeAdr(n, text) {
    fs.writeFileSync(path.join(this.root, 'docs/adr', fileName(n)), text);
  }

  writeIndex(statuses = {}) {
    const rows = [];
    for (let n = 1; n <= this.count; n++) rows.push(indexRow(n, statuses[n]));
    fs.writeFileSync(path.join(this.root, 'docs/adr/README.md'), `# Index\n\n${rows.join('\n')}\n`);
  }

  writeArchitecture(ids) {
    const entries = (ids || Array.from({ length: this.count }, (_, i) => i + 1)).map(archEntry);
    fs.writeFileSync(path.join(this.root, 'ARCHITECTURE.md'), `# Architecture\n\n${entries.join('\n')}\n`);
  }

  run(...args) {
    return spawnSync('node', [SCRIPT, '--root', this.root, ...args], { encoding: 'utf8' });
  }
}

function assertFails(fixture, expected, ...args) {
  const result = fixture.run(...args);
  assert.equal(result.status, 1, `expected failure, got: ${result.stdout}`);
  assert.match(result.stderr, expected);
}

function assertPasses(fixture, ...args) {
  const result = fixture.run(...args);
  assert.equal(result.status, 0, result.stderr);
}

function amendment(fixture, target, addedStatusIndex = 'Accepted (amended by ADR-0007)') {
  fixture.count = 7;
  fixture.writeAdr(7, record(7));
  fixture.writeAdr(target, record(target, {
    status: 'accepted (amended by ADR-0007)',
    callout: '> [!NOTE]\n> Section 1 is amended by ADR-0007. Everything else remains binding.'
  }));
  fixture.writeIndex({ [target]: addedStatusIndex });
  fixture.writeArchitecture();
}

test('a clean repository passes', () => {
  assertPasses(new Fixture(6));
});

test('the full amendment procedure passes in every mode', () => {
  const fixture = new Fixture(6);
  amendment(fixture, 6);
  assertPasses(fixture);
  fixture.git('add', '-A');
  assertPasses(fixture, '--staged');
  const base = fixture.git('rev-parse', 'HEAD').trim();
  fixture.commit('amend');
  assertPasses(fixture, '--range', `${base}..HEAD`);
});

test('a second amendment keeps the first listed', () => {
  const fixture = new Fixture(6);
  amendment(fixture, 6);
  fixture.commit('first');
  fixture.count = 8;
  fixture.writeAdr(8, record(8));
  fixture.writeAdr(6, record(6, {
    status: 'accepted (amended by ADR-0007, ADR-0008)',
    callout: '> [!NOTE]\n> Amended by ADR-0007 and ADR-0008.'
  }));
  fixture.writeIndex({ 6: 'Accepted (amended by ADR-0007, ADR-0008)' });
  fixture.writeArchitecture();
  assertPasses(fixture);
});

test('superseding requires a warning callout and passes with one', () => {
  const fixture = new Fixture(6);
  fixture.count = 7;
  fixture.writeAdr(7, record(7));
  fixture.writeAdr(6, record(6, {
    status: 'superseded by [ADR-0007]',
    callout: '> [!NOTE]\n> Replaced by ADR-0007.'
  }));
  fixture.writeIndex({ 6: 'Superseded by ADR-0007' });
  fixture.writeArchitecture();
  assertFails(fixture, /requires a top-level > \[!WARNING\] callout/);

  fixture.writeAdr(6, record(6, {
    status: 'superseded by [ADR-0007]',
    callout: '> [!WARNING]\n> Replaced by ADR-0007.'
  }));
  assertPasses(fixture);
});

test('a silent body edit fails', () => {
  const fixture = new Fixture(6);
  fixture.writeAdr(5, record(5, { body: 'Corrected decision.' }));
  assertFails(fixture, /accepted record changed outside its status and callout/);
});

test('a silent body edit fails even alongside a valid amendment', () => {
  const fixture = new Fixture(6);
  amendment(fixture, 6);
  fixture.writeAdr(6, record(6, {
    status: 'accepted (amended by ADR-0007)',
    callout: '> [!NOTE]\n> Amended by ADR-0007.',
    body: 'Corrected decision.'
  }));
  assertFails(fixture, /accepted record changed outside its status and callout/);
});

test('a loose callout without a status change fails', () => {
  const fixture = new Fixture(6);
  fixture.writeAdr(6, record(6, { callout: '> [!NOTE]\n> This only covers contrastingInk.' }));
  assertFails(fixture, /callout present without an amended or superseded status/);
});

test('changing the callout of an amended record needs a new ADR', () => {
  const fixture = new Fixture(6);
  amendment(fixture, 6);
  fixture.commit('amend');
  fixture.writeAdr(6, record(6, {
    status: 'accepted (amended by ADR-0007)',
    callout: '> [!NOTE]\n> Reworded note about ADR-0007.'
  }));
  assertFails(fixture, /status or callout changed without a new ADR/);
});

test('amending against an existing ADR fails', () => {
  const fixture = new Fixture(7);
  fixture.writeAdr(6, record(6, {
    status: 'accepted (amended by ADR-0007)',
    callout: '> [!NOTE]\n> Amended by ADR-0007.'
  }));
  fixture.writeIndex({ 6: 'Accepted (amended by ADR-0007)' });
  assertFails(fixture, /ADR-0007 already existed/);
});

test('an amended status without a callout fails', () => {
  const fixture = new Fixture(6);
  amendment(fixture, 6);
  fixture.writeAdr(6, record(6, { status: 'accepted (amended by ADR-0007)' }));
  assertFails(fixture, /requires a top-level > \[!NOTE\] callout/);
});

test('a callout that does not name the amending ADR fails', () => {
  const fixture = new Fixture(6);
  amendment(fixture, 6);
  fixture.writeAdr(6, record(6, {
    status: 'accepted (amended by ADR-0007)',
    callout: '> [!NOTE]\n> Something changed.'
  }));
  assertFails(fixture, /callout does not name ADR-0007/);
});

test('a status pointing at a missing ADR fails', () => {
  const fixture = new Fixture(6);
  fixture.writeAdr(6, record(6, {
    status: 'accepted (amended by ADR-0009)',
    callout: '> [!NOTE]\n> Amended by ADR-0009.'
  }));
  fixture.writeIndex({ 6: 'Accepted (amended by ADR-0009)' });
  assertFails(fixture, /references ADR-0009, which does not exist/);
});

test('removing a prior amendment fails', () => {
  const fixture = new Fixture(6);
  amendment(fixture, 6);
  fixture.commit('amend');
  fixture.writeAdr(6, record(6));
  fixture.writeIndex();
  assertFails(fixture, /status cannot change/);
});

test('deleting an ADR fails', () => {
  const fixture = new Fixture(6);
  fs.unlinkSync(path.join(fixture.root, 'docs/adr', fileName(6)));
  fixture.count = 5;
  fixture.writeIndex();
  fixture.writeArchitecture();
  assertFails(fixture, /ADR deleted or renamed/);
});

test('a proposed ADR can be edited and accepted', () => {
  const fixture = new Fixture(6);
  fixture.count = 7;
  fixture.writeAdr(7, record(7, { status: 'proposed' }));
  fixture.writeIndex({ 7: 'Proposed' });
  fixture.writeArchitecture();
  fixture.commit('propose');
  fixture.writeAdr(7, record(7, { body: 'Refined decision.' }));
  fixture.writeIndex();
  assertPasses(fixture);
});

test('a stale index status fails', () => {
  const fixture = new Fixture(6);
  amendment(fixture, 6, 'Accepted');
  assertFails(fixture, /row 0006 status/);
});

test('a missing index row fails', () => {
  const fixture = new Fixture(6);
  fixture.count = 7;
  fixture.writeAdr(7, record(7));
  fixture.count = 6;
  fixture.writeIndex();
  fixture.writeArchitecture([1, 2, 3, 4, 5, 6, 7]);
  assertFails(fixture, /no index row/);
});

test('a missing ARCHITECTURE entry fails', () => {
  const fixture = new Fixture(6);
  fixture.writeArchitecture([1, 2, 3, 4]);
  assertFails(fixture, /ADR-0005 is missing from the decision list/);
});

test('a new ADR without the invariants section fails', () => {
  const fixture = new Fixture(6);
  fixture.count = 7;
  fixture.writeAdr(7, record(7, { invariants: false }));
  fixture.writeIndex();
  fixture.writeArchitecture();
  assertFails(fixture, /missing "### Invariants & Negative Constraints" section/);
});

test('the invariants section is required for every record, including the first', () => {
  const fixture = new Fixture(5);
  fixture.writeAdr(1, record(1, { invariants: false }));
  assertFails(fixture, /0001-decision-1\.md: missing "### Invariants & Negative Constraints" section/);
});

test('an unrecognized status fails', () => {
  const fixture = new Fixture(6);
  fixture.count = 7;
  fixture.writeAdr(7, record(7, { status: 'approved' }));
  fixture.writeIndex({ 7: 'approved' });
  fixture.writeArchitecture();
  assertFails(fixture, /unrecognized status "approved"/);
});

test('RACI fields fail', () => {
  const fixture = new Fixture(6);
  fixture.count = 7;
  fixture.writeAdr(7, record(7, { extra: 'consulted: Someone' }));
  fixture.writeIndex();
  fixture.writeArchitecture();
  assertFails(fixture, /RACI field "consulted" is prohibited/);
});

test('numbering gaps fail', () => {
  const fixture = new Fixture(6);
  fixture.count = 8;
  fs.writeFileSync(path.join(fixture.root, 'docs/adr', fileName(8)), record(8));
  fixture.writeIndex();
  fixture.writeArchitecture();
  assertFails(fixture, /numbering must be sequential/);
});

test('staged mode ignores unstaged edits and inspects the index', () => {
  const fixture = new Fixture(6);
  fixture.writeAdr(5, record(5, { body: 'Corrected decision.' }));
  assertPasses(fixture, '--staged');
  fixture.git('add', '-A');
  assertFails(fixture, /accepted record changed/, '--staged');
});

test('an amendment target that is not accepted fails', () => {
  const fixture = new Fixture(6);
  amendment(fixture, 6);
  fixture.writeAdr(7, record(7, { status: 'proposed' }));
  fixture.writeIndex({ 6: 'Accepted (amended by ADR-0007)', 7: 'Proposed' });
  assertFails(fixture, /ADR-0007, whose own status "proposed" is not accepted/);
});

test('a superseding target that is rejected fails', () => {
  const fixture = new Fixture(6);
  fixture.count = 7;
  fixture.writeAdr(7, record(7, { status: 'rejected' }));
  fixture.writeAdr(6, record(6, {
    status: 'superseded by [ADR-0007]',
    callout: '> [!WARNING]\n> Replaced by ADR-0007.'
  }));
  fixture.writeIndex({ 6: 'Superseded by ADR-0007', 7: 'Rejected' });
  fixture.writeArchitecture();
  assertFails(fixture, /whose own status "rejected" is not accepted/);
});

test('accepted to deprecated passes without a new ADR', () => {
  const fixture = new Fixture(6);
  fixture.writeAdr(6, record(6, { status: 'deprecated' }));
  fixture.writeIndex({ 6: 'Deprecated' });
  assertPasses(fixture);
});

test('deprecated cannot return to accepted', () => {
  const fixture = new Fixture(6);
  fixture.writeAdr(6, record(6, { status: 'deprecated' }));
  fixture.writeIndex({ 6: 'Deprecated' });
  fixture.commit('deprecate');
  fixture.writeAdr(6, record(6));
  fixture.writeIndex();
  assertFails(fixture, /status cannot change from "deprecated" to "accepted"/);
});

test('duplicate numbers fail', () => {
  const fixture = new Fixture(7);
  fixture.writeAdr(7, record(7));
  fs.writeFileSync(path.join(fixture.root, 'docs/adr/0007-duplicate.md'), record(7));
  assertFails(fixture, /duplicate number 0007/);
});

test('a zero range base validates the head without throwing', () => {
  const fixture = new Fixture(6);
  assertPasses(fixture, '--range', `${'0'.repeat(40)}..HEAD`);
});

test('an unknown range base validates the head without throwing', () => {
  const fixture = new Fixture(6);
  assertPasses(fixture, '--range', `${'a'.repeat(40)}..HEAD`);
});
