#!/usr/bin/env node
/**
 * Judarn consumer status. Read-only: for each app that loads Judarn it reports which version the app
 * holds and what updating it to a target tag would change, limited to what that app loads.
 *
 *   node scripts/consumers.js [--list <file>] [--pins <file>] [--to vX.Y.Z] [--json] [--page <file>] [--offline] [--gate]
 *
 * Which apps load Judarn, and which version each pins, come from the shared commit-checks package: this script runs
 * Judarn's own `scripts/commit-checks pins` (or reads `--pins <file>`, the same JSON that the roll-out wrote) and
 * judges the update. The private consumer list is the commit-checks list: `--list <file>`, else
 * `git config --global commit-checks.list`. Nothing here parses a pin file or writes to a consumer folder.
 * `--gate` prints the decision the commit-checks roll-out reads: { "<name>": { "decision": "go" | "hold", "reason": "..." } }.
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['.build', 'build', 'DerivedData', 'node_modules', 'scripts', 'Pods']);
const RANK = { none: 0, code: 1, visible: 2 };
// What each kind of consumer loads from Judarn. A test checks that each path exists, so a moved folder can't
// turn every update into "none" (it did: the Swift path once named a root `Sources` that never existed).
const LOADED_PATHS = {
  swift: ['platforms/apple/Sources', 'Package.swift'],
  npm: ['platforms/web/src', 'platforms/web/package.json', 'tokens']
};

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function defaultExec(cmd, args, opts = {}) {
  const r = cp.spawnSync(cmd, args, { encoding: 'utf8', timeout: 30000, maxBuffer: 256 * 1024 * 1024, ...opts });
  return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '', error: r.error || null };
}

const readText = (file) => { try { return fs.readFileSync(file, 'utf8'); } catch { return null; } };
const cmpVersion = (a, b) => {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
};
const expandHome = (p) => (p === '~' || p.startsWith('~/') ? path.join(os.homedir(), p.slice(1)) : p);

// ---------------------------------------------------------------------------
// Step 1: the pins, read by the shared commit-checks reader
// ---------------------------------------------------------------------------

const PINS_FORMAT = 1;

const NO_LIST_HELP =
  'No consumer list given.\n' +
  'Pass --list <file>, or set one once: git config --global commit-checks.list <file>\n' +
  '(a private file; the commit-checks package describes its format).';

/** The list file: --list, else `git config --global commit-checks.list`. Writes no path of its own. */
function findList(explicit, exec = defaultExec) {
  if (explicit) return path.resolve(expandHome(explicit));
  const r = exec('git', ['config', '--global', '--get', 'commit-checks.list']);
  const configured = r.status === 0 ? r.stdout.trim() : '';
  if (!configured) throw new Error(NO_LIST_HELP);
  return path.resolve(expandHome(configured));
}

/** Checks the shape of a commit-checks `pins --json` document; throws on anything this script cannot judge. */
function parsePins(text, source) {
  let doc;
  try { doc = JSON.parse(text); } catch (e) { throw new Error(`${source} is not valid JSON: ${e.message}`); }
  if (!doc || doc.format !== PINS_FORMAT) throw new Error(`${source} has pin format ${doc && doc.format}, this script reads format ${PINS_FORMAT}`);
  if (!Array.isArray(doc.consumers)) throw new Error(`${source} has no "consumers" array`);
  return { consumers: doc.consumers, unlisted: Array.isArray(doc.unlisted) ? doc.unlisted : [] };
}

/**
 * The pin report: from --pins FILE (the roll-out wrote it), else from Judarn's own `scripts/commit-checks pins`,
 * so the reader is the release this repository pins.
 */
function readPins({ list = null, pinsFile = null, exec = defaultExec, root = ROOT }) {
  if (pinsFile) {
    const text = readText(pinsFile);
    if (text === null) throw new Error(`Cannot read the pins file ${pinsFile}`);
    return parsePins(text, pinsFile);
  }
  const listFile = findList(list, exec);
  const r = exec(path.join(root, 'scripts/commit-checks'), ['pins', '--list', listFile, '--package', 'judarn', '--json'], { cwd: root, timeout: 120000 });
  if (r.error || r.status !== 0) {
    const why = r.error ? r.error.message : (r.stderr.trim() || r.stdout.trim() || `exit ${r.status}`);
    throw new Error(`commit-checks pins failed: ${why}`);
  }
  return parsePins(r.stdout, 'commit-checks pins output');
}

/**
 * The pins one list entry holds, one per kind ('npm' | 'swift'), plus local-path forms.
 * Returns { pins: [{ kind, version, requirement, files }], local: boolean, problems: [..] }.
 */
function pinsFromEntry(entry) {
  const pkg = (entry.packages && entry.packages.judarn) || { forms: [], problems: [] };
  const byKind = new Map();
  let local = false;
  for (const f of pkg.forms || []) {
    if (f.requirement && f.requirement.type === 'local') { local = true; continue; }
    if (!byKind.has(f.kind)) byKind.set(f.kind, []);
    byKind.get(f.kind).push(f);
  }
  const pins = [];
  for (const [kind, forms] of byKind) {
    const req = forms.find((f) => f.requirement && f.requirement.version) || forms[0];
    const versions = [...new Set(forms.map((f) => (f.resolved && f.resolved.version) || (f.requirement && f.requirement.type === 'exact' ? f.requirement.version : null)).filter(Boolean))];
    const requirement = req && req.requirement ? { type: req.requirement.type, version: req.requirement.version || null, ...(req.requirement.max ? { max: req.requirement.max } : {}) } : null;
    const files = [...new Set(forms.flatMap((f) => [f.file, f.resolved && f.resolved.file].filter(Boolean)))];
    pins.push({ kind, version: versions[0] || null, requirement, files });
  }
  return { pins, local, problems: pkg.problems || [] };
}

function listDirs(dir) {
  try { return fs.readdirSync(dir, { withFileTypes: true }); } catch { return []; }
}


// ---------------------------------------------------------------------------
// Steps 3 and 4: reachability, consumer state
// ---------------------------------------------------------------------------

/** { onNpm: true | false | null, newest: string | null }. null means unknown: no network, no npm. */
function checkNpm(version, exec, offline) {
  if (offline) return { onNpm: null, newest: null };
  const one = exec('npm', ['view', `@judarn/ui@${version}`, 'version']);
  let onNpm = null;
  if (one.status === 0 && one.stdout.trim().split('\n').includes(version)) onNpm = true;
  else if (one.status !== 0 && /E404|404 Not Found|No match found/i.test(one.stderr + one.stdout)) onNpm = false;
  const newest = exec('npm', ['view', '@judarn/ui', 'version']);
  return { onNpm, newest: newest.status === 0 && newest.stdout.trim() ? newest.stdout.trim() : null };
}

/** true | false | null for "a GitHub release exists for the tag". */
function checkRelease(tag, exec, offline, repo) {
  if (offline) return null;
  const r = exec('gh', ['release', 'view', tag, '--json', 'tagName'], { cwd: repo });
  if (r.status === 0) return true;
  if (/release not found|not found/i.test(r.stderr + r.stdout)) return false;
  return null;
}

function consumerState(dir, exec) {
  const status = exec('git', ['-C', dir, 'status', '--porcelain']);
  if (status.status !== 0) return { git: false, dirty: null, branch: null };
  const branch = exec('git', ['-C', dir, 'branch', '--show-current']);
  return { git: true, dirty: status.stdout.split('\n').filter(Boolean).length, branch: branch.stdout.trim() || null };
}

// ---------------------------------------------------------------------------
// Steps 5 and 6: what changed, limited to what the consumer loads
// ---------------------------------------------------------------------------

/** Removes comments and collapses whitespace outside strings, so comment-only edits compare equal. */
function stripComments(src) {
  let out = '', i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') {
      let depth = 1; i += 2; // Swift nests block comments; the others close at the first */, which is the depth 1 case
      while (i < n && depth > 0) {
        if (src[i] === '/' && src[i + 1] === '*') { depth++; i += 2; } else if (src[i] === '*' && src[i + 1] === '/') { depth--; i += 2; } else i++;
      }
      out += ' '; continue;
    }
    if (c === '"' && src.startsWith('"""', i)) {
      const end = src.indexOf('"""', i + 3);
      const stop = end < 0 ? n : end + 3;
      out += src.slice(i, stop); i = stop; continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < n && src[j] !== c) { if (src[j] === '\\') j++; if (c !== '`' && src[j] === '\n') break; j++; }
      out += src.slice(i, j + 1); i = j + 1; continue;
    }
    out += c; i++;
  }
  return out.replace(/\s+/g, ' ').trim();
}

/** Drops documentation-only keys (every release or doc edit touches them) from parsed JSON. */
function withoutDocKeys(node, keys) {
  if (Array.isArray(node)) return node.map((n) => withoutDocKeys(n, keys));
  if (node && typeof node === 'object') {
    return Object.fromEntries(Object.entries(node).filter(([k]) => !keys.has(k)).map(([k, v]) => [k, withoutDocKeys(v, keys)]));
  }
  return node;
}

/** 'none' | 'code' | 'visible' for one changed file, given both versions of its text. */
function classifyFile(rel, oldText, newText) {
  const base = path.basename(rel);
  if (base === 'package.json') {
    // version changes every release and description is prose, so neither is a change to what loads
    try {
      const strip = (t) => JSON.stringify(withoutDocKeys(JSON.parse(t || '{}'), new Set(['version', 'description'])));
      return strip(oldText) === strip(newText) ? 'none' : 'code';
    } catch { return 'code'; }
  }
  if (base.endsWith('.json')) {
    // JSON has no comments; a description or $comment string plays that role
    try {
      const strip = (t) => JSON.stringify(withoutDocKeys(JSON.parse(t || 'null'), new Set(['description', '$comment'])));
      return strip(oldText) === strip(newText) ? 'none' : 'visible';
    } catch { return 'visible'; }
  }
  if (stripComments(oldText || '') === stripComments(newText || '')) return 'none';
  if (base === 'Package.swift' || base.endsWith('.d.ts')) return 'code';
  return 'visible';
}

/** Leaf tokens of a flat view as { "color.ink100.light": {...} }. */
function flattenLeaves(node, prefix = '', out = {}) {
  if (node === null || typeof node !== 'object') return out;
  if ('$value' in node || '$type' in node) { out[prefix] = node; return out; }
  for (const [k, v] of Object.entries(node)) flattenLeaves(v, prefix ? `${prefix}.${k}` : k, out);
  return out;
}

const MODE_NAMES = new Set(['light', 'dark', 'lightHighContrast', 'darkHighContrast']);
const leafValue = (leaf) => ('$value' in leaf ? leaf.$value : JSON.stringify(leaf));

function diffTokens(oldFlat, newFlat) {
  const a = flattenLeaves(oldFlat), b = flattenLeaves(newFlat);
  const split = (key) => {
    const parts = key.split('.');
    const last = parts[parts.length - 1];
    return MODE_NAMES.has(last) ? { name: parts.slice(0, -1).join('.'), mode: last } : { name: key, mode: null };
  };
  const changed = [], added = [], removed = [];
  for (const key of Object.keys(b)) {
    if (!(key in a)) added.push({ key, ...split(key), value: leafValue(b[key]) });
    else if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) {
      changed.push({ key, ...split(key), type: b[key].$type || a[key].$type || null, old: leafValue(a[key]), new: leafValue(b[key]), oldHex: a[key].hex || null, newHex: b[key].hex || null });
    }
  }
  for (const key of Object.keys(a)) if (!(key in b)) removed.push({ key, ...split(key), value: leafValue(a[key]) });
  return { changed, added, removed };
}

/** Compiles the tokens of a tag from a plain snapshot (git archive | tar -x), through that tag's own loader. */
function snapshotFlat(repo, tag, exec = defaultExec) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'judarn-snap-'));
  try {
    const ar = cp.spawnSync('git', ['-C', repo, 'archive', tag, 'tokens', 'scripts/lib'], { maxBuffer: 256 * 1024 * 1024 });
    if (ar.status !== 0) return { error: `git archive ${tag} failed` };
    const tar = cp.spawnSync('tar', ['-x', '-C', tmp], { input: ar.stdout });
    if (tar.status !== 0) return { error: `tar failed for ${tag}` };
    const loaderPath = path.join(tmp, 'scripts/lib/design-tokens.js');
    if (!fs.existsSync(loaderPath)) return { error: `${tag} has no scripts/lib/design-tokens.js` };
    const loader = require(loaderPath);
    if (typeof loader.loadTokens === 'function') {
      const r = loader.loadTokens();
      if (!r.flat) return { error: `${tag} tokens do not compile: ${(r.problems || []).slice(0, 2).join('; ')}` };
      return { flat: r.flat };
    }
    if (typeof loader.loadFlatOrThrow === 'function') return { flat: loader.loadFlatOrThrow() };
    return { error: `${tag} loader exposes no flat view` };
  } catch (e) {
    return { error: `${tag}: ${e.message.split('\n')[0]}` };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function gitIn(repo, args, exec) {
  return exec('git', ['-C', repo, ...args]);
}

/** Token value diff between two tags, or { error }. Only compiled when tokens or the loader changed. */
function tokenDiff(repo, from, to, exec) {
  const same = gitIn(repo, ['diff', '--quiet', from, to, '--', 'tokens', 'scripts/lib/design-tokens.js'], exec);
  if (same.status === 0) return { changed: [], added: [], removed: [] };
  const a = snapshotFlat(repo, from), b = snapshotFlat(repo, to);
  if (a.error || b.error) return { error: a.error || b.error };
  return diffTokens(a.flat, b.flat);
}

/** What updating from one tag to another changes for a consumer kind ('swift' or 'npm'). */
function classifyChange(repo, kind, from, to, exec = defaultExec, cache = new Map()) {
  const key = `${kind}|${from}|${to}`;
  if (cache.has(key)) return cache.get(key);
  const result = { class: 'none', files: [], reasons: [], tokens: { changed: [], added: [], removed: [] }, error: null };
  const paths = LOADED_PATHS[kind];
  const names = gitIn(repo, ['diff', '--name-status', from, to, '--', ...paths], exec);
  if (names.status !== 0) {
    result.class = 'unknown'; result.error = `git diff ${from} ${to} failed`;
    cache.set(key, result); return result;
  }
  let level = 0;
  for (const line of names.stdout.split('\n').filter(Boolean)) {
    const parts = line.split('\t');
    const file = parts[parts.length - 1];
    if (file.startsWith('tokens/')) continue; // judged by compiled values below
    const show = (tag) => { const r = gitIn(repo, ['show', `${tag}:${file}`], exec); return r.status === 0 ? r.stdout : ''; };
    const cls = classifyFile(file, show(from), show(to));
    if (cls !== 'none') result.files.push({ file, class: cls });
    level = Math.max(level, RANK[cls]);
  }
  const td = tokenDiff(repo, from, to, exec);
  if (td.error) {
    result.error = `token compare failed: ${td.error}`;
  } else {
    result.tokens = td;
    if (td.changed.length) { level = Math.max(level, RANK.visible); result.reasons.push(`${td.changed.length} token value${td.changed.length === 1 ? '' : 's'} changed`); }
    if (td.added.length || td.removed.length) level = Math.max(level, RANK.code);
  }
  result.class = Object.keys(RANK).find((k) => RANK[k] === level);
  if (result.error && result.class === 'none') result.class = 'unknown';
  if (result.files.some((f) => f.class === 'visible')) result.reasons.push('source files changed');
  cache.set(key, result);
  return result;
}

// ---------------------------------------------------------------------------
// Step 7: stale doc lines
// ---------------------------------------------------------------------------

function findStaleLines(consumerDir, version) {
  if (!version) return [];
  const re = new RegExp(`(?<![\\d.])v?${version.replace(/\./g, '\\.')}(?![\\d])`);
  const hits = [];
  const visit = (dir, depth) => {
    for (const e of listDirs(dir)) {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (depth < 3 && !e.name.startsWith('.') && !SKIP_DIRS.has(e.name) && !/\.(xcodeproj|xcworkspace)$/.test(e.name)) visit(abs, depth + 1);
      } else if (/\.md$/i.test(e.name) && !/^CHANGELOG/i.test(e.name)) {
        const text = readText(abs);
        if (!text || text.length > 1e6) continue;
        text.split('\n').forEach((line, i) => {
          if (/judarn/i.test(line) && re.test(line)) hits.push({ file: path.relative(consumerDir, abs), line: i + 1, text: line.trim().slice(0, 140) });
        });
      }
    }
  };
  visit(consumerDir, 0);
  return hits;
}

// ---------------------------------------------------------------------------
// Step 9: report
// ---------------------------------------------------------------------------

function newestTag(repo, exec) {
  const r = gitIn(repo, ['tag', '--list', 'v*'], exec);
  const tags = r.stdout.split('\n').filter((t) => /^v\d+\.\d+\.\d+$/.test(t));
  return tags.sort((a, b) => cmpVersion(b.slice(1), a.slice(1)))[0] || null;
}

function tagExists(repo, tag, exec) {
  return gitIn(repo, ['rev-parse', '-q', '--verify', `refs/tags/${tag}^{commit}`], exec).status === 0;
}

function describePins(row) {
  if (!row.pins || !row.pins.length) return row.local ? 'unpinned (local path)' : 'no pin found';
  return row.pins.map(describePin).join(' + ');
}

function describePin(pin) {
  const req = pin.requirement ? `${pin.requirement.type === 'upToNextMinor' ? 'up to next minor' : pin.requirement.type === 'upToNextMajor' ? 'up to next major' : pin.requirement.type} ${pin.requirement.version || ''}`.trim() : null;
  return `${pin.version || '?'} (${pin.kind === 'npm' ? 'npm' : 'swift'}${req ? `, ${req}` : ''})`;
}

function buildReport({ pins, repo = ROOT, to = null, offline = false, exec = defaultExec }) {
  const target = to || newestTag(repo, exec);
  if (!target) throw new Error('No vX.Y.Z tag found in the Judarn repository.');
  if (!/^v\d+\.\d+\.\d+$/.test(target)) throw new Error(`--to needs a tag like v0.8.29, got "${target}"`);
  const targetVersion = target.slice(1);
  const cache = new Map();
  let npmCache = null, releaseCache;

  // Only the apps the list says load Judarn, or whose pins the reader found.
  const entries = pins.consumers.filter((c) => c.packages && c.packages.judarn && (c.packages.judarn.declared || c.packages.judarn.detected));
  const rows = entries.map((c) => {
    const found = pinsFromEntry(c);
    const row = { name: c.name, path: c.path, exists: c.exists !== false, pins: found.pins, local: found.local, pin: found.pins[0] || null, target, change: 'n/a', changeDetail: null, blockers: [], state: null, stale: [] };
    if (!row.exists) { row.blockers.push('folder not found'); row.blockers.push(...found.problems); return row; }
    row.state = consumerState(c.path, exec);
    if (row.state.dirty) row.blockers.push(`${row.state.dirty} uncommitted file${row.state.dirty === 1 ? '' : 's'}${row.state.branch ? ` on ${row.state.branch}` : ''}`);
    row.blockers.push(...found.problems); // every problem the reader names blocks: mismatches, local paths, a missing pin

    let level = -1;
    for (const pin of found.pins) {
      if (pin.kind === 'npm') {
        if (!npmCache) npmCache = checkNpm(targetVersion, exec, offline);
        if (releaseCache === undefined) releaseCache = checkRelease(target, exec, offline, repo);
        row.reach = { onNpm: npmCache.onNpm, newestOnNpm: npmCache.newest, githubRelease: releaseCache };
        if (npmCache.onNpm === false) {
          row.blockers.push(npmCache.newest ? `not on npm past ${npmCache.newest}` : 'not on npm');
          if (releaseCache === false) row.blockers.push(`no GitHub release ${target} (publishing needs the owner's yes)`);
          else if (releaseCache === true) row.blockers.push(`GitHub release ${target} exists but npm lacks it; check the publish workflow`);
        } else if (npmCache.onNpm === null) row.blockers.push('npm availability unknown');
      } else if (!row.reach) {
        row.reach = { githubRelease: undefined };
      }

      if (!pin.version) { row.blockers.push(`no resolved version found (${pin.kind})`); continue; }
      let ch = null, cls;
      const heldTag = `v${pin.version}`;
      if (cmpVersion(pin.version, targetVersion) > 0) { cls = 'none'; ch = { note: 'pin is newer than the target' }; row.blockers.push('pin is newer than the target'); }
      else if (!tagExists(repo, heldTag, exec)) { cls = 'unknown'; row.blockers.push(`tag ${heldTag} not found in the Judarn repository`); }
      else if (!tagExists(repo, target, exec)) { cls = 'unknown'; row.blockers.push(`tag ${target} not found in the Judarn repository`); }
      else {
        ch = classifyChange(repo, pin.kind, heldTag, target, exec, cache);
        cls = ch.class;
        if (ch.error) row.blockers.push(ch.error);
      }
      // An app judged on both kinds takes the higher class; an unknown beats them all, so it holds.
      const rank = cls === 'unknown' ? 3 : RANK[cls];
      if (rank > level) { level = rank; row.change = cls; row.changeDetail = ch; }
    }
    const versions = [...new Set(found.pins.map((p) => p.version).filter(Boolean))];
    row.stale = versions.flatMap((v) => findStaleLines(c.path, v));
    return row;
  });

  const unlisted = pins.unlisted.filter((u) => (u.loads || []).includes('judarn')).map((u) => ({ name: path.basename(u.path), path: u.path }));
  return { target, offline, generated: new Date().toISOString(), rows, unlisted };
}

/** The calendar date of an ISO timestamp in the machine's local time zone, as YYYY-MM-DD. */
function localDate(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * The roll-out gate: hold an app when the update is visible, can't be judged, or the app has any blocker.
 * Throws when the target tag is not in the Judarn repository, so the caller can hold everyone.
 */
function buildGate(report, repo = ROOT, exec = defaultExec) {
  if (!tagExists(repo, report.target, exec)) throw new Error(`tag ${report.target} not found in the Judarn repository`);
  const gate = {};
  for (const r of report.rows) {
    // Name every cause, so a held app shows all it needs before an approval (visible change and an unpublished version, say).
    const causes = [];
    if (r.change === 'visible') causes.push('visible change');
    else if (r.change !== 'none' && r.change !== 'code') causes.push(`change is ${r.change}`);
    causes.push(...r.blockers);
    gate[r.name] = causes.length
      ? { decision: 'hold', reason: causes.join('; ') }
      : { decision: 'go', reason: r.change === 'none' ? 'no change' : 'code-only change' };
  }
  return gate;
}

function renderTable(report) {
  const head = ['Consumer', 'Holds', 'Target', 'Change', 'Blockers', 'Stale doc lines'];
  const body = report.rows.map((r) => [
    r.name,
    describePins(r),
    r.target,
    r.change,
    r.blockers.join('; ') || '–',
    String(r.stale.length)
  ]);
  const widths = head.map((h, i) => Math.max(h.length, ...body.map((b) => b[i].length)));
  const line = (cells) => cells.map((c, i) => c.padEnd(widths[i])).join('  ').trimEnd();
  const out = [line(head), line(widths.map((w) => '-'.repeat(w))), ...body.map(line)];
  for (const r of report.rows) {
    const t = r.changeDetail && r.changeDetail.tokens;
    if (t && t.changed.length) {
      out.push('', `${r.name}: ${t.changed.length} token value${t.changed.length === 1 ? '' : 's'} change`);
      for (const c of t.changed.slice(0, 40)) out.push(`  ${c.name}${c.mode ? ` (${c.mode})` : ''}: ${c.old} -> ${c.new}`);
      if (t.changed.length > 40) out.push(`  ... ${t.changed.length - 40} more (see --json or --page)`);
    }
    if (r.stale.length) {
      out.push('', `${r.name}: stale doc lines naming ${r.pins.map((p) => p.version).filter(Boolean).join(', ')}`);
      for (const s of r.stale.slice(0, 10)) out.push(`  ${s.file}:${s.line}`);
    }
  }
  return out.join('\n');
}

// ---------------------------------------------------------------------------
// The review page (--page)
// ---------------------------------------------------------------------------

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** One self-contained HTML page, styled from Judarn's own compiled tokens (never raw token JSON). */
function renderPage(report, flat) {
  const col = (name, mode) => flat.color[name][mode].hex;
  const vars = (mode) => ['substrate', 'surfaceElevated', 'surfaceRecessed', 'ink100', 'ink60', 'ink30', 'signalError']
    .map((n) => `--${n}: ${col(n, mode)};`).join(' ');
  const px = (n) => flat.space[n].$value;
  const font = flat.font.sans.$value;
  const swatch = (hex, label) => `<div class="sw"><span class="chip" style="background:${esc(hex)}"></span><span class="cap">${esc(label)}<br><code>${esc(hex)}</code></span></div>`;
  const panel = (mode, group) => {
    const subs = col('substrate', mode), elev = col('surfaceElevated', mode), ink = col('ink100', mode), ink60 = col('ink60', mode);
    const m = group.find((g) => g.mode === mode);
    if (!m) return '';
    return `<div class="panel" style="background:${subs};color:${ink}"><div class="mode" style="color:${ink60}">${mode === 'light' ? 'Light' : 'Dark'}</div><div class="pair" style="background:${elev}">${swatch(m.oldHex, 'Old')}${swatch(m.newHex, 'New')}</div></div>`;
  };

  const sections = report.rows.map((r) => {
    const t = r.changeDetail && r.changeDetail.tokens;
    const files = (r.changeDetail && r.changeDetail.files) || [];
    let html = `<section><h2>${esc(r.name)}</h2><p>Holds ${esc(describePins(r))}. Updating to ${esc(r.target)}: <strong>${esc(r.change)}</strong>.${r.blockers.length ? ` Blockers: ${esc(r.blockers.join('; '))}.` : ''}</p>`;
    if (files.length) html += `<ul>${files.map((f) => `<li><code>${esc(f.file)}</code> (${esc(f.class)})</li>`).join('')}</ul>`;
    if (t && t.changed.length) {
      const byName = new Map();
      for (const c of t.changed) { if (!byName.has(c.name)) byName.set(c.name, []); byName.get(c.name).push(c); }
      html += '<div class="tokens">';
      for (const [name, group] of byName) {
        const colors = group.every((g) => g.oldHex && g.newHex);
        html += `<div class="token"><h3><code>${esc(name)}</code></h3>`;
        if (colors) {
          html += `<div class="panels">${panel('light', group)}${panel('dark', group)}</div>`;
          const other = group.filter((g) => g.mode !== 'light' && g.mode !== 'dark');
          if (other.length) html += `<table><tbody>${other.map((g) => `<tr><td>${esc(g.mode)}</td><td class="num">${esc(g.old)}</td><td class="num">${esc(g.new)}</td></tr>`).join('')}</tbody></table>`;
        } else {
          html += `<table><thead><tr><th>Mode</th><th>Old</th><th>New</th></tr></thead><tbody>${group.map((g) => `<tr><td>${esc(g.mode || '–')}</td><td class="num">${esc(g.old)}</td><td class="num">${esc(g.new)}</td></tr>`).join('')}</tbody></table>`;
        }
        html += '</div>';
      }
      html += '</div>';
    } else if (r.change === 'none' || r.change === 'code') html += '<p class="quiet">No token value changes.</p>';
    return `${html}</section>`;
  }).join('\n');

  const summary = `<table><thead><tr><th>Consumer</th><th>Holds</th><th>Change</th><th>Blockers</th></tr></thead><tbody>${report.rows.map((r) => `<tr><td>${esc(r.name)}</td><td>${esc(describePins(r))}</td><td>${esc(r.change)}</td><td>${esc(r.blockers.join('; ') || '–')}</td></tr>`).join('')}</tbody></table>`;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Judarn consumer status</title>
<style>
:root{${vars('light')}}
@media (prefers-color-scheme: dark){:root{${vars('dark')}}}
*{box-sizing:border-box}
body{margin:0;background:var(--substrate);color:var(--ink100);font:400 16px/20px ${font};font-optical-sizing:auto}
main{max-width:960px;margin:0 auto;padding:${px('4')} ${px('2')} ${px('8')}}
h1{font-size:44px;line-height:48px;font-weight:800;letter-spacing:-0.01em;margin:0 0 ${px('1')}}
h2{font-size:32px;line-height:36px;font-weight:800;letter-spacing:-0.01em;margin:${px('6')} 0 ${px('1')}}
h3{font-size:16px;line-height:20px;font-weight:800;margin:0 0 ${px('1')}}
p,ul{max-width:65ch;margin:0 0 ${px('2')}}
.quiet,.mode{color:var(--ink60)}
code{font:400 12px/16px ui-monospace,Menlo,monospace;font-variant-ligatures:none}
table{border-collapse:collapse;width:100%;margin:0 0 ${px('2')};font-variant-numeric:tabular-nums lining-nums}
th{text-align:left;font-size:12px;line-height:16px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:var(--ink60)}
th,td{padding:${px('1')} ${px('1')} ${px('1')} 0;vertical-align:top;border-bottom:1px solid var(--ink30)}
.tokens{display:grid;gap:${px('2')}}
.token{background:var(--surfaceElevated);border-radius:16px;padding:${px('2')}}
.panels{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:${px('1')}}
.panel{border-radius:10px;padding:${px('2')}}
.mode{font-size:12px;line-height:16px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:${px('1')}}
.pair{display:flex;gap:${px('3')};padding:${px('2')};border-radius:10px}
.sw{display:flex;gap:${px('1')};align-items:center}
.chip{display:block;width:56px;height:56px;border-radius:10px}
.cap{font-size:14px;line-height:16px}
</style></head><body><main>
<h1>Judarn consumer status</h1>
<p class="quiet">Updating to ${esc(report.target)}. Generated ${esc(localDate(report.generated))}${report.offline ? ', offline' : ''}.</p>
${summary}
${sections}
${report.unlisted.length ? `<section><h2>Unlisted consumers</h2><ul>${report.unlisted.map((u) => `<li>${esc(u.name)}</li>`).join('')}</ul></section>` : ''}
</main></body></html>
`;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const o = { list: null, pins: null, to: null, json: false, page: null, offline: false, gate: false, repo: ROOT, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = () => { if (i + 1 >= argv.length) throw new Error(`${a} needs a value`); return argv[++i]; };
    if (a === '--list') o.list = path.resolve(val());
    else if (a === '--pins') o.pins = path.resolve(val());
    else if (a === '--to') o.to = val();
    else if (a === '--page') o.page = path.resolve(val());
    else if (a === '--repo') o.repo = path.resolve(val());
    else if (a === '--json') o.json = true;
    else if (a === '--offline') o.offline = true;
    else if (a === '--gate') o.gate = true;
    else if (a === '--help' || a === '-h') o.help = true;
    else throw new Error(`Unknown argument ${a}`);
  }
  return o;
}

const USAGE = `Usage: node scripts/consumers.js [--list <file>] [--pins <file>] [--to vX.Y.Z] [--json] [--page <file>] [--offline] [--gate]
  --list     the commit-checks consumer list (default: git config --global commit-checks.list)
  --pins     with --gate: read this commit-checks "pins --json" file instead of calling commit-checks
  --to       target tag (default: newest vX.Y.Z tag)
  --json     print the report as JSON
  --page     write a self-contained HTML review page, for example build/consumers.html
  --offline  skip npm and GitHub checks (reported as unknown)
  --gate     print only the roll-out gate JSON (go or hold per consumer); exits 1 when it cannot decide`;

function main(argv = process.argv.slice(2)) {
  let opts;
  try { opts = parseArgs(argv); } catch (e) { console.error(`${e.message}\n${USAGE}`); return 2; }
  if (opts.help) { console.log(USAGE); return 0; }
  let pins, report;
  try { pins = readPins({ list: opts.list, pinsFile: opts.gate ? opts.pins : null }); } catch (e) { console.error(e.message); return 1; }
  try { report = buildReport({ pins, repo: opts.repo, to: opts.to, offline: opts.offline }); } catch (e) { console.error(e.message); return 1; }

  if (opts.gate) {
    let gate;
    try { gate = buildGate(report, opts.repo); } catch (e) { console.error(e.message); return 1; }
    console.log(JSON.stringify(gate, null, 2));
    return 0;
  }

  if (opts.page) {
    const { loadFlatOrThrow } = require('./lib/design-tokens.js');
    fs.mkdirSync(path.dirname(opts.page), { recursive: true });
    fs.writeFileSync(opts.page, renderPage(report, loadFlatOrThrow()));
    console.error(`Wrote ${opts.page}`);
  }
  console.log(opts.json ? JSON.stringify(report, null, 2) : renderTable(report));
  for (const u of report.unlisted) {
    console.error(`warning: ${u.name} loads Judarn but is not on the consumer list`);
  }
  return 0;
}

module.exports = {
  findList, parsePins, readPins, pinsFromEntry, checkNpm, checkRelease, consumerState,
  stripComments, classifyFile, flattenLeaves, diffTokens, snapshotFlat, tokenDiff, classifyChange,
  LOADED_PATHS, findStaleLines, newestTag, buildReport, buildGate, localDate, renderTable, renderPage, parseArgs, main
};

if (require.main === module) process.exitCode = main();
