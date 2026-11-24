'use strict';
// Fixtures are made at test time in a temporary folder, with made-up names. No network: exec is stubbed.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');
const c = require('./consumers.js');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'consumers-test-'));
test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

const write = (file, text) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };
const git = (dir, ...args) => cp.execFileSync('git', ['-C', dir, '-c', 'user.name=t', '-c', 'user.email=t@example.test', '-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', '-c', 'tag.gpgsign=false', ...args], { encoding: 'utf8' });

// A stand-in Judarn repository: tokens/flat.json is what its stub loader returns as the flat view.
const LOADER = "const fs=require('fs'),path=require('path');exports.loadTokens=()=>({flat:JSON.parse(fs.readFileSync(path.join(__dirname,'../../tokens/flat.json'),'utf8')),problems:[]});";
const flat = (hex, space = '8px') => ({ color: { accent: { light: { $value: 'x', $type: 'color', hex }, dark: { $value: 'y', $type: 'color', hex: '#111111' } } }, space: { 1: { $value: space, $type: 'dimension' } } });

function makeJudarn() {
  const repo = path.join(tmp, 'judarn-fixture');
  fs.mkdirSync(repo);
  git(repo, 'init', '-q', '-b', 'main');
  const commit = (tag, files) => {
    for (const [f, t] of Object.entries(files)) write(path.join(repo, f), t);
    git(repo, 'add', '-A'); git(repo, 'commit', '-q', '-m', tag); git(repo, 'tag', '-a', tag, '-m', tag);
  };
  const pkg = (v, d = 'tokens') => JSON.stringify({ name: '@judarn/ui', version: v, description: d });
  commit('v0.1.0', {
    'scripts/lib/design-tokens.js': LOADER, 'tokens/flat.json': JSON.stringify(flat('#aa0000')),
    'Sources/A.swift': '// header\nlet a = 1\n', 'Package.swift': '// swift-tools-version: 6.0\nlet p = 1\n',
    'platforms/web/src/index.js': '/** doc */\nexport const a = 1;\n', 'platforms/web/src/types.d.ts': 'export type A = 1;\n',
    'platforms/web/package.json': pkg('0.1.0'), 'README.md': 'one\n'
  });
  commit('v0.1.1', { // docs only, comment edit, version and description bump: nothing consumers load
    'README.md': 'two\n', 'Sources/A.swift': '// new header wording\nlet a = 1\n',
    'platforms/web/src/index.js': '/** doc, reworded */\nexport const a = 1;\n', 'platforms/web/package.json': pkg('0.1.1', 'prose')
  });
  commit('v0.1.2', { 'platforms/web/src/types.d.ts': 'export type A = 1 | 2;\n' }); // type declaration only
  commit('v0.1.3', { 'Sources/A.swift': '// new header wording\nlet a = 2\n' }); // real code
  commit('v0.1.4', { 'tokens/flat.json': JSON.stringify(flat('#bb0000', '16px')) }); // token values
  commit('v0.1.5', { 'tokens/flat.json': JSON.stringify({ ...flat('#bb0000', '16px'), extra: { $value: '1', $type: 'number' } }) }); // new token
  return repo;
}
const repo = makeJudarn();
const noNet = () => ({ status: 1, stdout: '', stderr: 'offline', error: null });
c.__exec = (cmd, args, opts) => { const r = cp.spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 28, ...opts }); return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '', error: r.error }; };

// ---- pin detection ---------------------------------------------------------

test('npm pin: lockfile version, exact requirement, mismatch flagged', () => {
  const d = path.join(tmp, 'npm-app');
  write(path.join(d, 'package.json'), JSON.stringify({ devDependencies: { '@judarn/ui': '0.1.2' } }));
  write(path.join(d, 'package-lock.json'), JSON.stringify({ packages: { 'node_modules/@judarn/ui': { version: '0.1.2' } } }));
  const pin = c.detectPin(d);
  assert.deepEqual([pin.kind, pin.version, pin.requirement.type, pin.mismatch], ['npm', '0.1.2', 'exact', null]);
  write(path.join(d, 'package.json'), JSON.stringify({ dependencies: { '@judarn/ui': '^0.1.0' } }));
  const loose = c.detectPin(d);
  assert.equal(loose.requirement.type, 'range');
  assert.match(loose.mismatch, /not an exact version/);
});

test('swift pin from GitHub: resolved version plus floor from an Xcode project, mismatch flagged', () => {
  const d = path.join(tmp, 'swift-xcode');
  write(path.join(d, 'App.xcodeproj/project.xcproj'), '{ "packages": [ { "kind": "remote", "repository": "https://example.test/owner/judarn", "version": { "up-to-next-minor-version": "0.1.1", }, }, { "kind": "local", "path": "Other" } ] }');
  write(path.join(d, 'App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved'), JSON.stringify({ pins: [
    { identity: 'other', state: { version: '9.9.9' } },
    { identity: 'judarn', kind: 'remoteSourceControl', location: 'https://example.test/owner/judarn', state: { version: '0.1.3', revision: 'abc' } }], version: 3 }));
  const pin = c.detectPin(d);
  assert.deepEqual([pin.kind, pin.version, pin.requirement.type, pin.requirement.version], ['swift', '0.1.3', 'upToNextMinor', '0.1.1']);
  assert.match(pin.mismatch, /resolved 0\.1\.3 differs from floor 0\.1\.1/);
});

test('swift requirements are read from Package.swift, project.yml and pbxproj', () => {
  const ps = c.parseSwiftFile('Package.swift', '.package(url: "https://example.test/o/judarn.git", exact: "0.1.2"),\n.package(url: "https://example.test/o/other", from: "1.0.0"),');
  assert.deepEqual(ps.remote, [{ type: 'exact', version: '0.1.2' }]);
  const up = c.parseSwiftFile('Package.swift', '.package(url: "https://example.test/o/judarn", .upToNextMinor(from: "0.1.1"))');
  assert.deepEqual(up.remote, [{ type: 'upToNextMinor', version: '0.1.1' }]);
  const yml = c.parseSwiftFile('project.yml', 'packages:\n  Judarn:\n    url: https://example.test/o/judarn\n    exactVersion: 0.1.4\n  Other:\n    url: https://example.test/o/other\n    from: 2.0.0\n');
  assert.deepEqual(yml.remote, [{ type: 'exact', version: '0.1.4' }]);
  const pbx = c.parseSwiftFile('project.pbxproj', 'isa = XCRemoteSwiftPackageReference;\n repositoryURL = "https://example.test/o/judarn";\n requirement = {\n kind = upToNextMajorVersion;\n minimumVersion = 0.1.0;\n };\n};\n/* other */ isa = XCRemoteSwiftPackageReference; repositoryURL = "https://example.test/o/other"; requirement = { kind = exactVersion; version = 5.0.0; };');
  assert.deepEqual(pbx.remote, [{ type: 'upToNextMajor', version: '0.1.0' }]);
  // Xcode's project file has no exact key: an exact pin is a range up to the next patch
  const xc = c.parseSwiftFile('project.xcproj', '{ "kind": "remote", "repository": "https://example.test/o/judarn", "version": { "version-range-min": "0.1.2", "version-range-max": "0.1.3", }, }, { "kind": "remote", "repository": "https://example.test/o/other", "version": { "up-to-next-major-version": "1.4.0" } }');
  assert.deepEqual(xc.remote, [{ type: 'exact', version: '0.1.2' }]);
  const wide = c.parseSwiftFile('project.xcproj', '{ "kind": "remote", "repository": "https://example.test/o/judarn", "version": { "version-range-min": "0.1.2", "version-range-max": "0.2.0" } }');
  assert.deepEqual(wide.remote, [{ type: 'range', version: '0.1.2', max: '0.2.0' }]);
  assert.deepEqual(c.parseSwiftFile('Package.swift', '.package(url: "https://example.test/o/judarn", "0.1.2"..<"0.1.3")').remote, [{ type: 'exact', version: '0.1.2' }]);
});

test('unpinned: a local path to the Judarn folder, in Package.swift, project.yml or an Xcode project', () => {
  for (const [file, text] of [
    ['Package.swift', '.package(path: "../../Packages/judarn"),'],
    ['project.yml', 'packages:\n  Judarn:\n    path: ../../Packages/judarn\n'],
    ['App.xcodeproj/project.pbxproj', 'isa = XCLocalSwiftPackageReference;\n relativePath = ../../Packages/judarn;\n']
  ]) {
    const d = path.join(tmp, `local-${file.replace(/\W/g, '')}`);
    write(path.join(d, file), text);
    const pin = c.detectPin(d);
    assert.equal(pin.kind, 'unpinned', file);
  }
  const none = path.join(tmp, 'plain'); write(path.join(none, 'Package.swift'), '.package(path: "../judarn-tools")');
  assert.equal(c.detectPin(none).kind, 'none');
});

test('detection skips build folders, scripts/ and anything deeper than two levels', () => {
  const d = path.join(tmp, 'skips');
  const local = '.package(path: "../../Packages/judarn"),';
  write(path.join(d, 'scripts/Tool/Package.swift'), local);
  write(path.join(d, '.build/Package.swift'), local);
  write(path.join(d, 'node_modules/x/Package.swift'), local);
  write(path.join(d, 'a/b/c/Package.swift'), local);
  assert.equal(c.detectPin(d).kind, 'none');
  write(path.join(d, 'a/b/Package.swift'), local);
  assert.equal(c.detectPin(d).kind, 'unpinned');
});

// ---- change classification -------------------------------------------------

test('comments, doc strings, version and description lines count as none', () => {
  assert.equal(c.classifyFile('a.js', '/** x */\nlet a = "// not a comment";', '/** y */\nlet a = "// not a comment";'), 'none');
  assert.equal(c.classifyFile('a.js', 'let a = "// one";', 'let a = "// two";'), 'visible');
  assert.equal(c.classifyFile('a.swift', '/* /* nested */ */ let a = 1', '// c\nlet a = 1'), 'none');
  assert.equal(c.classifyFile('package.json', '{"version":"1","description":"a"}', '{"version":"2","description":"b"}'), 'none');
  assert.equal(c.classifyFile('package.json', '{"version":"1"}', '{"version":"1","dependencies":{"x":"1"}}'), 'code');
  assert.equal(c.classifyFile('Package.swift', 'let a = 1', 'let a = 2'), 'code');
  assert.equal(c.classifyFile('t.d.ts', 'type A = 1;', 'type A = 2;'), 'code');
  assert.equal(c.classifyFile('s.json', '{"description":"a","x":1}', '{"description":"b","x":1}'), 'none');
});

test('classifyChange over real tags: none, code only, visible by source, visible by token value', () => {
  const run = (kind, from, to) => c.classifyChange(repo, kind, from, to, c.__exec, new Map());
  assert.equal(run('swift', 'v0.1.0', 'v0.1.1').class, 'none');
  assert.equal(run('npm', 'v0.1.0', 'v0.1.1').class, 'none');
  assert.equal(run('npm', 'v0.1.0', 'v0.1.2').class, 'code');
  assert.equal(run('swift', 'v0.1.0', 'v0.1.2').class, 'none'); // Swift loads neither web file
  assert.equal(run('swift', 'v0.1.0', 'v0.1.3').class, 'visible');
  const tok = run('npm', 'v0.1.3', 'v0.1.4');
  assert.equal(tok.class, 'visible');
  assert.deepEqual(tok.tokens.changed.map((t) => [t.name, t.mode, t.old, t.new]).sort(), [['color.accent', 'light', 'x', 'x'], ['space.1', null, '8px', '16px']].sort());
  assert.equal(tok.tokens.changed.find((t) => t.name === 'color.accent').newHex, '#bb0000');
  assert.equal(run('npm', 'v0.1.4', 'v0.1.5').class, 'code'); // a new token is not a changed value
});

// ---- stale lines, unlisted, state, reachability ----------------------------

test('stale doc lines need both Judarn and the pinned version; the changelog is history', () => {
  const d = path.join(tmp, 'docs-app');
  write(path.join(d, 'README.md'), 'Uses Judarn 0.1.2 for color.\nOther 0.1.2 thing.\nJudarn 0.1.20 later.\n');
  write(path.join(d, 'docs/SPEC.md'), 'judarn v0.1.2\n');
  write(path.join(d, 'CHANGELOG.md'), 'Judarn 0.1.2\n');
  const hits = c.findStaleLines(d, '0.1.2');
  assert.deepEqual(hits.map((h) => `${h.file}:${h.line}`).sort(), ['README.md:1', 'docs/SPEC.md:1']);
});

test('unlisted consumers are found under the scan root', () => {
  const root = path.join(tmp, 'apps');
  for (const n of ['listed', 'unlisted', 'innocent']) { fs.mkdirSync(path.join(root, n), { recursive: true }); git(path.join(root, n), 'init', '-q'); }
  write(path.join(root, 'listed/Package.swift'), '.package(path: "../judarn")');
  write(path.join(root, 'unlisted/Package.swift'), '.package(path: "../judarn")');
  const found = c.findUnlisted(root, [path.join(root, 'listed')]);
  assert.deepEqual(found.map((f) => [f.name, f.kind]), [['unlisted', 'unpinned']]);
});

test('consumer state reports uncommitted files and branch', () => {
  const d = path.join(tmp, 'state'); fs.mkdirSync(d); git(d, 'init', '-q', '-b', 'trunk');
  write(path.join(d, 'f'), 'x');
  assert.deepEqual(c.consumerState(d, c.__exec), { git: true, dirty: 1, branch: 'trunk' });
  assert.equal(c.consumerState(path.join(tmp, 'plain'), c.__exec).dirty, null);
});

test('reachability: unknown, never a failure, when offline or the tools fail; 404 means not published', () => {
  assert.deepEqual(c.checkNpm('0.1.2', noNet, true), { onNpm: null, newest: null });
  assert.equal(c.checkNpm('0.1.2', noNet, false).onNpm, null);
  const stub = (cmd, args) => (args.includes('@judarn/ui@0.1.9')
    ? { status: 1, stdout: '', stderr: 'npm error code E404' }
    : { status: 0, stdout: '0.1.2\n', stderr: '' });
  assert.deepEqual(c.checkNpm('0.1.9', stub, false), { onNpm: false, newest: '0.1.2' });
  assert.equal(c.checkRelease('v0.1.2', noNet, false, repo), null);
  assert.equal(c.checkRelease('v0.1.2', () => ({ status: 1, stdout: '', stderr: 'release not found' }), false, repo), false);
  assert.equal(c.checkRelease('v0.1.2', () => ({ status: 0, stdout: '{}', stderr: '' }), false, repo), true);
});

// ---- list, report, CLI -----------------------------------------------------

test('a missing list explains how to make one and the CLI exits non-zero', () => {
  assert.throws(() => c.loadList(path.join(tmp, 'nope.json')), /Make one/);
  const r = cp.spawnSync('node', [path.join(__dirname, 'consumers.js'), '--list', path.join(tmp, 'nope.json')], { encoding: 'utf8' });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /consumers/);
});

test('report end to end, JSON and page, without touching the consumer', () => {
  const npmApp = path.join(tmp, 'e2e-npm'), swiftApp = path.join(tmp, 'e2e-swift'), localApp = path.join(tmp, 'e2e-local');
  write(path.join(npmApp, 'package.json'), JSON.stringify({ dependencies: { '@judarn/ui': '0.1.3' } }));
  write(path.join(npmApp, 'package-lock.json'), JSON.stringify({ packages: { 'node_modules/@judarn/ui': { version: '0.1.3' } } }));
  write(path.join(swiftApp, 'Package.resolved'), JSON.stringify({ pins: [{ identity: 'judarn', state: { version: '0.1.0' } }], version: 3 }));
  write(path.join(swiftApp, 'Package.swift'), '.package(url: "https://example.test/o/judarn", exact: "0.1.0")');
  write(path.join(localApp, 'Package.swift'), '.package(path: "../judarn")');
  const before = [npmApp, swiftApp, localApp].map((d) => cp.execFileSync('find', [d, '-type', 'f', '-newer', repo]).toString());
  const list = { scanRoot: null, consumers: [{ name: 'Web app', path: npmApp }, { name: 'Phone app', path: swiftApp }, { name: 'Desk app', path: localApp }] };
  const stub = (cmd, args, opts) => (cmd === 'git' ? c.__exec(cmd, args, opts) : { status: 1, stdout: '', stderr: 'E404 no match found' });
  const report = c.buildReport({ list, repo, to: 'v0.1.4', exec: stub });
  const by = Object.fromEntries(report.rows.map((r) => [r.name, r]));
  assert.equal(by['Web app'].change, 'visible');
  assert.ok(by['Web app'].blockers.some((b) => /not on npm/.test(b)));
  assert.equal(by['Phone app'].change, 'visible');
  assert.equal(by['Desk app'].change, 'n/a');
  assert.match(c.renderTable(report), /Desk app\s+unpinned/);
  assert.equal(c.buildReport({ list, repo, exec: stub, offline: true }).target, 'v0.1.5');
  const page = c.renderPage(report, require('./lib/design-tokens.js').loadFlatOrThrow());
  assert.match(page, /#bb0000/);
  assert.match(page, /<style>/);
  assert.doesNotMatch(page, /<script|https?:\/\//);
  assert.deepEqual(before, [npmApp, swiftApp, localApp].map((d) => cp.execFileSync('find', [d, '-type', 'f', '-newer', repo]).toString()));
});

// ---- local date, gate ------------------------------------------------------

test('the page prints the local date of the timestamp; JSON keeps UTC', () => {
  const prev = process.env.TZ;
  process.env.TZ = 'Europe/Stockholm';
  try {
    assert.equal(c.localDate('2026-11-23T23:30:00.000Z'), '2026-11-24');
    const report = { target: 'v0.1.4', offline: false, generated: '2026-11-23T23:30:00.000Z', rows: [], unlisted: [] };
    const page = c.renderPage(report, require('./lib/design-tokens.js').loadFlatOrThrow());
    assert.match(page, /Generated 2026-11-24/);
    assert.equal(report.generated, '2026-11-23T23:30:00.000Z');
  } finally {
    if (prev === undefined) delete process.env.TZ; else process.env.TZ = prev;
  }
});

function gateFor(to, rows) {
  const dirs = rows.map(([name, version, extra]) => {
    const d = path.join(tmp, `gate-${to}-${name.replace(/\W/g, '')}`);
    write(path.join(d, 'Package.resolved'), JSON.stringify({ pins: [{ identity: 'judarn', state: { version } }], version: 3 }));
    write(path.join(d, 'Package.swift'), `.package(url: "https://example.test/o/judarn", exact: "${version}")`);
    if (extra) write(path.join(d, 'dirty.txt'), 'x');
    git(d, 'init', '-q');
    if (!extra) { git(d, 'add', '-A'); git(d, 'commit', '-q', '-m', 'init'); }
    return { name, path: d };
  });
  const report = c.buildReport({ list: { scanRoot: null, consumers: dirs }, repo, to, exec: c.__exec, offline: true });
  return { report, gate: () => c.buildGate(report, repo, c.__exec) };
}

test('gate: go for none and code, hold for visible and for a blocker', () => {
  const { gate } = gateFor('v0.1.3', [['Quiet', '0.1.0'], ['Loud', '0.1.2'], ['Dirty', '0.1.2', true]]);
  // Swift: 0.1.0 -> 0.1.3 is visible (Sources changed); 0.1.2 -> 0.1.3 is visible too
  const g = gate();
  assert.equal(g.Quiet.decision, 'hold');
  assert.equal(g.Quiet.reason, 'visible change');
  assert.equal(g.Dirty.decision, 'hold');
  const ok = gateFor('v0.1.2', [['Calm', '0.1.0']]).gate();
  assert.deepEqual(ok.Calm, { decision: 'go', reason: 'none change' });
  const blocked = gateFor('v0.1.2', [['Messy', '0.1.0', true]]).gate();
  assert.equal(blocked.Messy.decision, 'hold');
  assert.match(blocked.Messy.reason, /uncommitted/);
});

test('gate: an unknown tag cannot be decided', () => {
  const { gate } = gateFor('v9.9.9', [['Any', '0.1.0']]);
  assert.throws(gate, /not found/);
});

test('gate CLI: only JSON on stdout, nonzero for an unknown tag or a missing list', () => {
  const d = path.join(tmp, 'cli-gate');
  write(path.join(d, 'Package.resolved'), JSON.stringify({ pins: [{ identity: 'judarn', state: { version: '0.1.0' } }], version: 3 }));
  write(path.join(d, 'Package.swift'), '.package(url: "https://example.test/o/judarn", exact: "0.1.0")');
  git(d, 'init', '-q'); git(d, 'add', '-A'); git(d, 'commit', '-q', '-m', 'init');
  const listFile = path.join(tmp, 'cli-gate-list.json');
  write(listFile, JSON.stringify({ consumers: [{ name: 'Cli app', path: d }] }));
  const run = (...a) => cp.spawnSync('node', [path.join(__dirname, 'consumers.js'), '--gate', '--offline', '--repo', repo, '--list', listFile, ...a], { encoding: 'utf8' });
  const ok = run('--to', 'v0.1.2');
  assert.equal(ok.status, 0);
  assert.equal(JSON.parse(ok.stdout)['Cli app'].decision, 'go');
  assert.notEqual(run('--to', 'v9.9.9').status, 0);
  assert.equal(run('--to', 'v9.9.9').stdout, '');
  assert.notEqual(cp.spawnSync('node', [path.join(__dirname, 'consumers.js'), '--gate', '--list', path.join(tmp, 'nope.json')], { encoding: 'utf8' }).status, 0);
});
