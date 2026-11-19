#!/usr/bin/env node
/**
 * Judarn consumer status. Read-only: for each app that loads Judarn it reports which version the app
 * holds and what updating it to a target tag would change, limited to what that app loads.
 *
 *   node scripts/consumers.js [--list <file>] [--to vX.Y.Z] [--json] [--page <file>] [--offline]
 *
 * The consumer list is private (`docs/private/consumers.json`, gitignored):
 *   { "scanRoot": "<folder>", "consumers": [ { "name": "...", "path": "..." } ] }
 * Relative paths resolve against the list file's folder. Nothing here writes to a consumer folder.
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_LIST = path.join(ROOT, 'docs/private/consumers.json');
const SKIP_DIRS = new Set(['.build', 'build', 'DerivedData', 'node_modules', 'scripts', 'Pods']);
const PIN_FILES = new Set(['package-lock.json', 'package.json', 'Package.resolved', 'Package.swift', 'project.yml', 'project.xcproj', 'project.pbxproj']);
const SCAN_DEPTH = 2; // the consumer folder plus two levels of subfolders
const RANK = { none: 0, code: 1, visible: 2 };
// What each kind of consumer loads from Judarn.
const LOADED_PATHS = {
  swift: ['Sources', 'Package.swift'],
  npm: ['platforms/web/src', 'platforms/web/package.json', 'tokens']
};
const URL_RE = /[/:][\w.-]+\/judarn(?:\.git)?(?=["'\s,)]|$)/i;
const LOCAL_RE = /(?:relativePath|path)["']?\s*[:=]\s*\(?\s*["']?([^"';,\n)]*[/\\]judarn)[/\\]?["']?/gi;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function defaultExec(cmd, args, opts = {}) {
  const r = cp.spawnSync(cmd, args, { encoding: 'utf8', timeout: 30000, maxBuffer: 256 * 1024 * 1024, ...opts });
  return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '', error: r.error || null };
}

const readText = (file) => { try { return fs.readFileSync(file, 'utf8'); } catch { return null; } };
const isExact = (v) => /^\d+\.\d+\.\d+$/.test(v);
const cmpVersion = (a, b) => {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
};
const expandHome = (p) => (p === '~' || p.startsWith('~/') ? path.join(os.homedir(), p.slice(1)) : p);

// ---------------------------------------------------------------------------
// Step 1: the consumer list
// ---------------------------------------------------------------------------

function loadList(file) {
  const text = readText(file);
  if (text === null) {
    throw Object.assign(new Error(
      `No consumer list at ${file}.\n` +
      'Make one (the folder docs/private/ is gitignored, never commit it):\n' +
      '  { "scanRoot": "<folder holding your apps>",\n' +
      '    "consumers": [ { "name": "<app name>", "path": "<app folder>" } ] }\n' +
      'Relative paths resolve against the list file\'s folder. Use --list <file> for another place.'
    ), { code: 'NO_LIST' });
  }
  let doc;
  try { doc = JSON.parse(text); } catch (e) { throw Object.assign(new Error(`${file} is not valid JSON: ${e.message}`), { code: 'BAD_LIST' }); }
  if (!doc || !Array.isArray(doc.consumers)) throw Object.assign(new Error(`${file} needs a "consumers" array`), { code: 'BAD_LIST' });
  const base = path.dirname(path.resolve(file));
  const resolve = (p) => path.resolve(base, expandHome(String(p)));
  const consumers = doc.consumers.map((c, i) => {
    if (!c || typeof c.name !== 'string' || typeof c.path !== 'string') throw Object.assign(new Error(`${file}: consumer ${i + 1} needs "name" and "path"`), { code: 'BAD_LIST' });
    return { name: c.name, path: resolve(c.path) };
  });
  return { scanRoot: doc.scanRoot ? resolve(doc.scanRoot) : null, consumers };
}

// ---------------------------------------------------------------------------
// Step 2: pin detection
// ---------------------------------------------------------------------------

function listDirs(dir) {
  try { return fs.readdirSync(dir, { withFileTypes: true }); } catch { return []; }
}

/** Pin-bearing files in the top levels of a consumer, plus Xcode's resolved file below its project folders. */
function collectPinFiles(root) {
  const found = [];
  const visit = (dir, depth) => {
    for (const e of listDirs(dir)) {
      const abs = path.join(dir, e.name);
      if (e.isFile() && PIN_FILES.has(e.name)) found.push(abs);
      else if (e.isDirectory() && !e.name.startsWith('.') && !SKIP_DIRS.has(e.name)) {
        if (/\.(xcodeproj|xcworkspace)$/.test(e.name)) {
          const nested = e.name.endsWith('.xcodeproj') ? path.join(abs, 'project.xcworkspace') : abs;
          const resolved = path.join(nested, 'xcshareddata/swiftpm/Package.resolved');
          if (fs.existsSync(resolved)) found.push(resolved);
        }
        if (depth < SCAN_DEPTH) visit(abs, depth + 1);
      }
    }
  };
  visit(root, 0);
  return found.sort();
}

function parseResolved(text) {
  let doc;
  try { doc = JSON.parse(text); } catch { return null; }
  const pins = doc.pins || (doc.object && doc.object.pins) || [];
  for (const p of pins) {
    const id = String(p.identity || p.package || '').toLowerCase();
    if (id === 'judarn' || URL_RE.test(p.location || p.repositoryURL || '')) {
      const s = p.state || {};
      return { version: s.version || null, branch: s.branch || null, revision: s.revision || null };
    }
  }
  return null;
}

/** Text between the first `(` after `from` and its matching `)`. */
function balanced(text, from) {
  const open = text.indexOf('(', from);
  if (open < 0) return '';
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')' && --depth === 0) return text.slice(open + 1, i);
  }
  return text.slice(open + 1);
}

/** A range from one version up to the next patch admits exactly one version: Xcode's project file has no exact key, so this is how an exact pin is written there. */
function rangeRequirement(min, max) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(min || '');
  if (m && max === `${m[1]}.${m[2]}.${Number(m[3]) + 1}`) return { type: 'exact', version: min };
  return { type: 'range', version: min, max };
}

function requirementFromKeys(pairs) {
  // pairs: [key, value] as found in a manifest or project file
  let min = null, max = null;
  for (const [k, v] of pairs) {
    const key = k.toLowerCase().replace(/[-_ ]/g, '');
    if (/^(exact|exactversion|version)$/.test(key) && isExact(v)) return { type: 'exact', version: v };
    if (/upto.*minor|^minorversion$/.test(key)) return { type: 'upToNextMinor', version: v };
    if (/upto.*major|^majorversion$|^from$/.test(key)) return { type: 'upToNextMajor', version: v };
    if (/^(minimumversion|minversion|versionrangemin)$/.test(key)) min = v;
    if (/^(maximumversion|maxversion|versionrangemax)$/.test(key)) max = v;
    if (key === 'branch') return { type: 'branch', version: v };
    if (key === 'revision') return { type: 'revision', version: v };
  }
  return min ? (max ? rangeRequirement(min, max) : { type: 'upToNextMajor', version: min }) : null;
}

/** Judarn requirements and local paths named in one manifest or project file. */
function parseSwiftFile(name, text) {
  const out = { remote: [], local: false };
  if (name === 'Package.swift') {
    for (let i = text.indexOf('.package('); i >= 0; i = text.indexOf('.package(', i + 1)) {
      const args = balanced(text, i);
      if (/path:\s*"[^"]*[/\\]?judarn[/\\]?"/i.test(args)) out.local = true;
      else if (URL_RE.test(args)) {
        let req = null, m;
        if ((m = args.match(/exact:\s*"([^"]+)"|\.exact\(\s*"([^"]+)"/))) req = { type: 'exact', version: m[1] || m[2] };
        else if ((m = args.match(/\.upToNextMinor\(\s*from:\s*"([^"]+)"/))) req = { type: 'upToNextMinor', version: m[1] };
        else if ((m = args.match(/\.upToNextMajor\(\s*from:\s*"([^"]+)"|from:\s*"([^"]+)"/))) req = { type: 'upToNextMajor', version: m[1] || m[2] };
        else if ((m = args.match(/"([^"]+)"\s*\.\.[.<]\s*"([^"]+)"/))) req = rangeRequirement(m[1], m[2]);
        else if ((m = args.match(/branch:\s*"([^"]+)"/))) req = { type: 'branch', version: m[1] };
        else if ((m = args.match(/revision:\s*"([^"]+)"/))) req = { type: 'revision', version: m[1] };
        out.remote.push(req || { type: 'unknown', version: null });
      }
    }
    return out;
  }
  if (name === 'project.yml') {
    const lines = text.split('\n');
    const indent = (l) => l.match(/^\s*/)[0].length;
    lines.forEach((line, i) => {
      const isUrl = /^\s*url:\s*\S*judarn(\.git)?\s*$/i.test(line) && URL_RE.test(line);
      const isPath = /^\s*path:\s*\S*[/\\]judarn[/\\]?\s*$/i.test(line);
      if (isPath) out.local = true;
      if (!isUrl) return;
      const ind = indent(line);
      const pairs = [];
      for (let j = i; j >= 0 && indent(lines[j]) >= ind && lines[j].trim(); j--) pairs.push(lines[j]);
      for (let j = i + 1; j < lines.length && indent(lines[j]) >= ind && lines[j].trim(); j++) pairs.push(lines[j]);
      const kv = pairs.map((l) => l.trim().match(/^(\w+):\s*"?([^"\s]+)"?$/)).filter(Boolean).map((m) => [m[1], m[2]]);
      out.remote.push(requirementFromKeys(kv.filter(([k]) => k !== 'url')) || { type: 'unknown', version: null });
    });
    return out;
  }
  // project.xcproj (JSON-like) and project.pbxproj
  LOCAL_RE.lastIndex = 0;
  if (LOCAL_RE.test(text)) out.local = true;
  const urlRe = /(?:"repository"|"repositoryURL"|repositoryURL)\s*[:=]\s*"?([^"\s;,]+)/g;
  for (let m; (m = urlRe.exec(text));) {
    if (!URL_RE.test(m[1])) continue;
    const rest = text.slice(m.index + m[0].length, m.index + m[0].length + 400);
    const cut = rest.search(/"kind"|isa\s*=|XCRemoteSwiftPackageReference|XCLocalSwiftPackageReference/);
    const win = cut < 0 ? rest : rest.slice(0, cut);
    const kv = [...win.matchAll(/"?([A-Za-z][\w-]*)"?\s*[:=]\s*"?([\w.-]+)"?/g)].map((x) => [x[1], x[2]]);
    const kindKey = kv.find(([k]) => k === 'kind');
    const pbxKinds = { exactVersion: 'exact', upToNextMinorVersion: 'upToNextMinor', upToNextMajorVersion: 'upToNextMajor', versionRange: 'range' };
    let req = null;
    if (kindKey && pbxKinds[kindKey[1]]) {
      const ver = kv.find(([k]) => /^(version|minimumVersion)$/.test(k));
      const max = kv.find(([k]) => k === 'maximumVersion');
      req = !ver ? null : pbxKinds[kindKey[1]] === 'range' && max ? rangeRequirement(ver[1], max[1]) : { type: pbxKinds[kindKey[1]], version: ver[1], ...(max ? { max: max[1] } : {}) };
    } else if (kindKey && (kindKey[1] === 'branch' || kindKey[1] === 'revision')) {
      const v = kv.find(([k]) => k === kindKey[1]);
      req = { type: kindKey[1], version: v ? v[1] : null };
    } else {
      req = requirementFromKeys(kv);
    }
    out.remote.push(req || { type: 'unknown', version: null });
  }
  return out;
}

function parseNpm(consumerDir, files) {
  const out = { lockVersion: null, spec: null, local: false, files: [] };
  for (const f of files) {
    const base = path.basename(f);
    const text = base === 'package-lock.json' || base === 'package.json' ? readText(f) : null;
    if (!text) continue;
    let doc; try { doc = JSON.parse(text); } catch { continue; }
    if (base === 'package-lock.json') {
      const entry = (doc.packages && doc.packages['node_modules/@judarn/ui']) || (doc.dependencies && doc.dependencies['@judarn/ui']);
      if (entry && entry.version && out.lockVersion === null) { out.lockVersion = entry.version; out.files.push(path.relative(consumerDir, f)); }
    } else {
      for (const group of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
        const spec = doc[group] && doc[group]['@judarn/ui'];
        if (typeof spec !== 'string') continue;
        out.files.push(path.relative(consumerDir, f));
        if (/^(file|link):/.test(spec) || /[/\\]judarn/i.test(spec)) out.local = true;
        else if (out.spec === null) out.spec = spec;
      }
    }
  }
  return out;
}

/**
 * Which Judarn pin a consumer holds, found without configuration.
 * kind: 'npm' | 'swift' | 'unpinned' | 'none'.
 */
function detectPin(consumerDir) {
  const files = collectPinFiles(consumerDir);
  const rel = (f) => path.relative(consumerDir, f);
  const npm = parseNpm(consumerDir, files);

  let resolved = null, resolvedFile = null, local = npm.local;
  const remote = [];
  const swiftFiles = [];
  for (const f of files) {
    const base = path.basename(f);
    if (base === 'package.json' || base === 'package-lock.json') continue;
    const text = readText(f);
    if (text === null) continue;
    if (base === 'Package.resolved') {
      const pin = parseResolved(text);
      if (pin && !resolved) { resolved = pin; resolvedFile = rel(f); swiftFiles.push(rel(f)); }
      continue;
    }
    const parsed = parseSwiftFile(base, text);
    if (parsed.remote.length) { remote.push(...parsed.remote.map((r) => ({ ...r, file: rel(f) }))); swiftFiles.push(rel(f)); }
    if (parsed.local) { local = true; swiftFiles.push(rel(f)); }
  }

  if (npm.lockVersion || npm.spec) {
    const exactSpec = npm.spec && isExact(npm.spec);
    const requirement = npm.spec ? { type: exactSpec ? 'exact' : 'range', version: npm.spec } : null;
    const version = npm.lockVersion || (exactSpec ? npm.spec : null);
    let mismatch = null;
    if (requirement && !exactSpec) mismatch = `range "${npm.spec}", not an exact version`;
    else if (exactSpec && npm.lockVersion && npm.lockVersion !== npm.spec) mismatch = `lockfile holds ${npm.lockVersion}, package.json says ${npm.spec}`;
    return { kind: 'npm', version, requirement, mismatch, files: [...new Set(npm.files)], alsoLocalPath: local };
  }
  if (resolved || remote.length) {
    const requirement = remote.length ? { type: remote[0].type, version: remote[0].version, ...(remote[0].max ? { max: remote[0].max } : {}) } : null;
    let mismatch = null;
    const v = resolved && resolved.version;
    if (requirement && v && requirement.version) {
      if (requirement.type === 'exact' && v !== requirement.version) mismatch = `resolved ${v} differs from exact ${requirement.version}`;
      else if ((requirement.type === 'upToNextMinor' || requirement.type === 'upToNextMajor' || requirement.type === 'range') && v !== requirement.version) {
        mismatch = `resolved ${v} differs from floor ${requirement.version}`;
      }
    }
    return {
      kind: 'swift', version: v || (requirement && requirement.type === 'exact' ? requirement.version : null),
      requirement, mismatch, resolvedFile, files: [...new Set(swiftFiles)], alsoLocalPath: local
    };
  }
  if (local) return { kind: 'unpinned', version: null, requirement: null, mismatch: null, files: [...new Set([...npm.files, ...swiftFiles])], alsoLocalPath: true };
  return { kind: 'none', version: null, requirement: null, mismatch: null, files: [], alsoLocalPath: false };
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
// Step 8: unlisted consumers
// ---------------------------------------------------------------------------

function findUnlisted(scanRoot, listedPaths) {
  if (!scanRoot || !fs.existsSync(scanRoot)) return [];
  const real = (p) => { try { return fs.realpathSync(p); } catch { return p; } };
  const listed = new Set(listedPaths.map(real));
  const found = [];
  const visit = (dir, depth) => {
    for (const e of listDirs(dir)) {
      if (!e.isDirectory() || e.name.startsWith('.') || SKIP_DIRS.has(e.name)) continue;
      const abs = path.join(dir, e.name);
      if (fs.existsSync(path.join(abs, '.git'))) {
        if (listed.has(real(abs)) || fs.existsSync(path.join(abs, 'tokens/judarn.resolver.json'))) continue;
        const pin = detectPin(abs);
        if (pin.kind !== 'none') found.push({ name: e.name, path: abs, kind: pin.kind, version: pin.version });
      } else if (depth < 1) visit(abs, depth + 1);
    }
  };
  visit(scanRoot, 0);
  return found;
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

function describePin(pin) {
  if (pin.kind === 'unpinned') return 'unpinned (local path)';
  if (pin.kind === 'none') return 'no pin found';
  const req = pin.requirement ? `${pin.requirement.type === 'upToNextMinor' ? 'up to next minor' : pin.requirement.type === 'upToNextMajor' ? 'up to next major' : pin.requirement.type} ${pin.requirement.version || ''}`.trim() : null;
  return `${pin.version || '?'} (${pin.kind === 'npm' ? 'npm' : 'swift'}${req ? `, ${req}` : ''})`;
}

function buildReport({ list, repo = ROOT, to = null, offline = false, exec = defaultExec }) {
  const target = to || newestTag(repo, exec);
  if (!target) throw new Error('No vX.Y.Z tag found in the Judarn repository.');
  if (!/^v\d+\.\d+\.\d+$/.test(target)) throw new Error(`--to needs a tag like v0.8.29, got "${target}"`);
  const targetVersion = target.slice(1);
  const cache = new Map();
  let npmCache = null, releaseCache;

  const rows = list.consumers.map((c) => {
    const row = { name: c.name, path: c.path, exists: fs.existsSync(c.path), pin: null, target, change: 'n/a', changeDetail: null, blockers: [], state: null, stale: [] };
    if (!row.exists) { row.blockers.push('folder not found'); row.pin = { kind: 'none' }; return row; }
    const pin = detectPin(c.path);
    row.pin = pin;
    row.state = consumerState(c.path, exec);
    if (row.state.dirty) row.blockers.push(`${row.state.dirty} uncommitted file${row.state.dirty === 1 ? '' : 's'}${row.state.branch ? ` on ${row.state.branch}` : ''}`);
    if (pin.mismatch) row.blockers.push(pin.mismatch);
    if (pin.kind === 'unpinned') row.blockers.push('unpinned: builds whatever the Judarn folder holds');
    else if (pin.kind === 'none') row.blockers.push('no Judarn pin found');
    if (pin.alsoLocalPath && pin.kind !== 'unpinned') row.blockers.push('also loads a local Judarn path');

    if (pin.kind === 'npm') {
      if (!npmCache) npmCache = checkNpm(targetVersion, exec, offline);
      if (releaseCache === undefined) releaseCache = checkRelease(target, exec, offline, repo);
      row.reach = { onNpm: npmCache.onNpm, newestOnNpm: npmCache.newest, githubRelease: releaseCache };
      if (npmCache.onNpm === false) {
        row.blockers.push(npmCache.newest ? `not on npm past ${npmCache.newest}` : 'not on npm');
        if (releaseCache === false) row.blockers.push(`no GitHub release ${target} (publishing needs the owner's yes)`);
        else if (releaseCache === true) row.blockers.push(`GitHub release ${target} exists but npm lacks it; check the publish workflow`);
      } else if (npmCache.onNpm === null) row.blockers.push('npm availability unknown');
    } else if (pin.kind === 'swift') {
      row.reach = { githubRelease: undefined };
    }

    if ((pin.kind === 'npm' || pin.kind === 'swift')) {
      if (!pin.version) row.blockers.push('no resolved version found');
      else {
        const heldTag = `v${pin.version}`;
        if (cmpVersion(pin.version, targetVersion) > 0) { row.change = 'none'; row.changeDetail = { note: 'pin is newer than the target' }; row.blockers.push('pin is newer than the target'); }
        else if (!tagExists(repo, heldTag, exec)) { row.change = 'unknown'; row.blockers.push(`tag ${heldTag} not found in the Judarn repository`); }
        else if (!tagExists(repo, target, exec)) { row.change = 'unknown'; row.blockers.push(`tag ${target} not found in the Judarn repository`); }
        else {
          const ch = classifyChange(repo, pin.kind, heldTag, target, exec, cache);
          row.change = ch.class;
          row.changeDetail = ch;
          if (ch.error) row.blockers.push(ch.error);
        }
      }
      row.stale = findStaleLines(c.path, pin.version);
    }
    return row;
  });

  const unlisted = findUnlisted(list.scanRoot, list.consumers.map((c) => c.path));
  return { target, offline, generated: new Date().toISOString(), rows, unlisted };
}

function renderTable(report) {
  const head = ['Consumer', 'Holds', 'Target', 'Change', 'Blockers', 'Stale doc lines'];
  const body = report.rows.map((r) => [
    r.name,
    r.pin ? describePin(r.pin) : '',
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
      out.push('', `${r.name}: stale doc lines naming ${r.pin.version}`);
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
    let html = `<section><h2>${esc(r.name)}</h2><p>Holds ${esc(describePin(r.pin))}. Updating to ${esc(r.target)}: <strong>${esc(r.change)}</strong>.${r.blockers.length ? ` Blockers: ${esc(r.blockers.join('; '))}.` : ''}</p>`;
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

  const summary = `<table><thead><tr><th>Consumer</th><th>Holds</th><th>Change</th><th>Blockers</th></tr></thead><tbody>${report.rows.map((r) => `<tr><td>${esc(r.name)}</td><td>${esc(describePin(r.pin))}</td><td>${esc(r.change)}</td><td>${esc(r.blockers.join('; ') || '–')}</td></tr>`).join('')}</tbody></table>`;

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
<p class="quiet">Updating to ${esc(report.target)}. Generated ${esc(report.generated.slice(0, 10))}${report.offline ? ', offline' : ''}.</p>
${summary}
${sections}
${report.unlisted.length ? `<section><h2>Unlisted consumers</h2><ul>${report.unlisted.map((u) => `<li>${esc(u.name)} (${esc(u.kind)})</li>`).join('')}</ul></section>` : ''}
</main></body></html>
`;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const o = { list: DEFAULT_LIST, to: null, json: false, page: null, offline: false, repo: ROOT, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = () => { if (i + 1 >= argv.length) throw new Error(`${a} needs a value`); return argv[++i]; };
    if (a === '--list') o.list = path.resolve(val());
    else if (a === '--to') o.to = val();
    else if (a === '--page') o.page = path.resolve(val());
    else if (a === '--repo') o.repo = path.resolve(val());
    else if (a === '--json') o.json = true;
    else if (a === '--offline') o.offline = true;
    else if (a === '--help' || a === '-h') o.help = true;
    else throw new Error(`Unknown argument ${a}`);
  }
  return o;
}

const USAGE = `Usage: node scripts/consumers.js [--list <file>] [--to vX.Y.Z] [--json] [--page <file>] [--offline]
  --list     consumer list (default docs/private/consumers.json)
  --to       target tag (default: newest vX.Y.Z tag)
  --json     print the report as JSON
  --page     write a self-contained HTML review page, for example build/consumers.html
  --offline  skip npm and GitHub checks (reported as unknown)`;

function main(argv = process.argv.slice(2)) {
  let opts;
  try { opts = parseArgs(argv); } catch (e) { console.error(`${e.message}\n${USAGE}`); return 2; }
  if (opts.help) { console.log(USAGE); return 0; }
  let list;
  try { list = loadList(opts.list); } catch (e) { console.error(e.message); return 1; }
  let report;
  try { report = buildReport({ list, repo: opts.repo, to: opts.to, offline: opts.offline }); } catch (e) { console.error(e.message); return 1; }

  if (opts.page) {
    const { loadFlatOrThrow } = require('./lib/design-tokens.js');
    fs.mkdirSync(path.dirname(opts.page), { recursive: true });
    fs.writeFileSync(opts.page, renderPage(report, loadFlatOrThrow()));
    console.error(`Wrote ${opts.page}`);
  }
  console.log(opts.json ? JSON.stringify(report, null, 2) : renderTable(report));
  for (const u of report.unlisted) {
    console.error(`warning: ${u.name} loads Judarn (${u.kind}${u.version ? ` ${u.version}` : ''}) but is not on the consumer list`);
  }
  return 0;
}

module.exports = {
  loadList, collectPinFiles, parseResolved, parseSwiftFile, detectPin, checkNpm, checkRelease, consumerState,
  stripComments, classifyFile, flattenLeaves, diffTokens, snapshotFlat, tokenDiff, classifyChange,
  findStaleLines, findUnlisted, newestTag, buildReport, renderTable, renderPage, parseArgs, main
};

if (require.main === module) process.exitCode = main();
