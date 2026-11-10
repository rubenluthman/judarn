const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const SCRIPT = path.join(__dirname, 'verify-adrs.js');

function record(n, { status = 'Active', body = 'We do this.', title = `Decision ${n}` } = {}) {
  return `# ${title}\nStatus: ${status} · 2026-01-01\n\n## Decision\n\n${body}\n\n## Why\n\nBecause.\n\n## What we gave up\n\nSomething.\n\n## Revisit if\n\nThings change.\n`;
}

const fileName = (n) => `${String(n).padStart(4, '0')}-decision-${n}.md`;
const indexRow = (n, status = 'Active') => `| [${String(n).padStart(4, '0')}](${fileName(n)}) | Decision ${n} | ${status} |`;

class Fixture {
  constructor(count) {
    this.root = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-adrs-'));
    this.count = count;
    fs.mkdirSync(path.join(this.root, 'docs/adr'), { recursive: true });
    for (let n = 1; n <= count; n++) this.writeAdr(n, record(n));
    this.writeIndex();
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

test('a clean repository passes', () => {
  assertPasses(new Fixture(3));
});

test('a record edited in place passes with its index unchanged', () => {
  const fixture = new Fixture(2);
  fixture.writeAdr(1, record(1, { body: 'We now do something else.' }));
  assertPasses(fixture);
});

test('retiring a record passes once the index agrees', () => {
  const fixture = new Fixture(2);
  fixture.writeAdr(2, record(2, { status: 'Retired' }));
  fixture.writeIndex({ 2: 'Retired' });
  assertPasses(fixture);
});

test('a stale index status fails', () => {
  const fixture = new Fixture(2);
  fixture.writeAdr(2, record(2, { status: 'Retired' }));
  assertFails(fixture, /ADR-0002 row differs/);
});

test('a missing index row fails', () => {
  const fixture = new Fixture(2);
  fixture.count = 1;
  fixture.writeIndex();
  assertFails(fixture, /ADR-0002 is missing from the index/);
});

test('an index row without a record fails', () => {
  const fixture = new Fixture(2);
  fs.rmSync(path.join(fixture.root, 'docs/adr', fileName(2)));
  assertFails(fixture, /ADR-0002 has no matching record/);
});

test('deleting a replaced record passes once the index agrees', () => {
  const fixture = new Fixture(3);
  fs.rmSync(path.join(fixture.root, 'docs/adr', fileName(2)));
  fixture.writeIndex();
  const index = fs.readFileSync(path.join(fixture.root, 'docs/adr/README.md'), 'utf8')
    .split('\n').filter((line) => !line.includes('0002')).join('\n');
  fs.writeFileSync(path.join(fixture.root, 'docs/adr/README.md'), index);
  assertPasses(fixture);
});

test('a missing heading fails', () => {
  const fixture = new Fixture(1);
  fixture.writeAdr(1, record(1).replace('## Revisit if\n\nThings change.\n', ''));
  assertFails(fixture, /headings must be exactly/);
});

test('headings out of order fail', () => {
  const fixture = new Fixture(1);
  fixture.writeAdr(1, record(1).replace('## Why', '## Temp').replace('## What we gave up', '## Why').replace('## Temp', '## What we gave up'));
  assertFails(fixture, /headings must be exactly/);
});

test('an empty section fails', () => {
  const fixture = new Fixture(1);
  fixture.writeAdr(1, record(1).replace('Because.', ''));
  assertFails(fixture, /"Why" is empty/);
});

test('an unrecognized status fails', () => {
  const fixture = new Fixture(1);
  fixture.writeAdr(1, record(1, { status: 'Accepted' }));
  assertFails(fixture, /Status: Active \| Retired/);
});

test('old frontmatter fails', () => {
  const fixture = new Fixture(1);
  fixture.writeAdr(1, `---\nstatus: accepted\n---\n\n${record(1)}`);
  assertFails(fixture, /frontmatter is not used/);
});

test('an em dash fails', () => {
  const fixture = new Fixture(1);
  fixture.writeAdr(1, record(1, { body: 'Left — right.' }));
  assertFails(fixture, /em dash/);
});

test('a badly named file fails', () => {
  const fixture = new Fixture(1);
  fs.writeFileSync(path.join(fixture.root, 'docs/adr/notes.md'), 'x');
  assertFails(fixture, /file name must be NNNN-title\.md/);
});

test('duplicate numbers fail', () => {
  const fixture = new Fixture(1);
  fs.writeFileSync(path.join(fixture.root, 'docs/adr/0001-other.md'), record(1));
  assertFails(fixture, /duplicate number 0001/);
});

test('staged mode ignores unstaged edits and inspects the index', () => {
  const fixture = new Fixture(1);
  fixture.writeAdr(1, record(1, { status: 'Retired' }));
  assertPasses(fixture, '--staged');
  fixture.git('add', '-A');
  assertFails(fixture, /ADR-0001 row differs/, '--staged');
});

test('a range checks the head commit', () => {
  const fixture = new Fixture(1);
  const base = fixture.git('rev-parse', 'HEAD').trim();
  fixture.writeAdr(1, record(1, { status: 'Retired' }));
  fixture.commit('retire without index');
  assertFails(fixture, /ADR-0001 row differs/, '--range', `${base}..HEAD`);
});

test('a zero range base validates the head without throwing', () => {
  assertPasses(new Fixture(1), '--range', `${'0'.repeat(40)}..HEAD`);
});
