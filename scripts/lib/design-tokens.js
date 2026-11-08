#!/usr/bin/env node
/**
 * Judarn token loader. Reads tokens/judarn.resolver.json (Design Tokens Resolver Module 2025.10),
 * resolves every `theme` context into a token tree (Design Tokens Format Module 2025.10, Color
 * Module 2025.10), validates conformance, and builds the flat view the emitters and tools read.
 *
 * The flat view keeps the pre-migration shape (strings such as "oklch(0.520 0.005 92)", "16px",
 * "-0.02em") so emitters stay unchanged. All Judarn-specific data lives under
 * `$extensions["design.judarn"]` in the source files.
 *
 *   node scripts/lib/design-tokens.js --flat        # print the flat view as JSON (Python builders)
 *   node scripts/lib/design-tokens.js --validate    # conformance validation only
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const TOKENS_DIR = path.join(ROOT, 'tokens');
const RESOLVER_FILE = path.join(TOKENS_DIR, 'judarn.resolver.json');
const EXT = 'design.judarn';
const MODES = ['light', 'dark', 'lightHighContrast', 'darkHighContrast'];
const ALLOWED_TYPES = new Set(['color', 'dimension', 'number', 'fontFamily', 'fontWeight', 'typography']);
const COLOR_SPACES = new Set([
  'srgb', 'srgb-linear', 'hsl', 'hwb', 'lab', 'lch', 'oklab', 'oklch',
  'display-p3', 'a98-rgb', 'prophoto-rgb', 'rec2020', 'xyz-d65', 'xyz-d50'
]);
const DIMENSION_UNITS = new Set(['px', 'rem']);
const FONT_WEIGHT_NAMES = new Set([
  'thin', 'hairline', 'extra-light', 'ultra-light', 'light', 'normal', 'regular', 'book', 'medium',
  'semi-bold', 'demi-bold', 'bold', 'extra-bold', 'ultra-bold', 'black', 'heavy', 'extra-black', 'ultra-black'
]);
const TYPOGRAPHY_PROPS = {
  fontFamily: 'fontFamily', fontSize: 'dimension', fontWeight: 'fontWeight',
  letterSpacing: 'dimension', lineHeight: 'number'
};
const SYSTEM_DOC_KEYS = new Set(['$schema']);

// ---------------------------------------------------------------------------
// OKLCh to sRGB, with CSS Color 4 chroma-bisection gamut mapping (ADR-0005)
// ---------------------------------------------------------------------------

function oklchToLinearSrgbRaw(l, c, h) {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  const lLms = l + 0.3963377774 * a + 0.2158037573 * b;
  const mLms = l - 0.1055613458 * a - 0.0638541728 * b;
  const sLms = l - 0.0894841775 * a - 1.2914855480 * b;

  const l3 = lLms * lLms * lLms;
  const m3 = mLms * mLms * mLms;
  const s3 = sLms * sLms * sLms;

  return {
    r: +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    g: -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    b: -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3
  };
}

function isInGamut(rgb, eps = 1e-6) {
  return (
    rgb.r >= -eps && rgb.r <= 1 + eps &&
    rgb.g >= -eps && rgb.g <= 1 + eps &&
    rgb.b >= -eps && rgb.b <= 1 + eps
  );
}

function oklchToLinearSrgb(l, c, h) {
  if (l <= 0) return { r: 0, g: 0, b: 0 };
  if (l >= 1) return { r: 1, g: 1, b: 1 };

  const raw = oklchToLinearSrgbRaw(l, c, h);
  if (isInGamut(raw)) {
    return {
      r: Math.max(0, Math.min(1, raw.r)),
      g: Math.max(0, Math.min(1, raw.g)),
      b: Math.max(0, Math.min(1, raw.b))
    };
  }

  let low = 0;
  let high = c;
  for (let i = 0; i < 24; i++) {
    const mid = 0.5 * (low + high);
    if (isInGamut(oklchToLinearSrgbRaw(l, mid, h))) {
      low = mid;
    } else {
      high = mid;
    }
  }
  const mapped = oklchToLinearSrgbRaw(l, low, h);
  return {
    r: Math.max(0, Math.min(1, mapped.r)),
    g: Math.max(0, Math.min(1, mapped.g)),
    b: Math.max(0, Math.min(1, mapped.b))
  };
}

/** Gamut-mapped sRGB hex (`#rrggbb`, lowercase) of an OKLCh colour. */
function oklchToHex(l, c, h) {
  const lin = oklchToLinearSrgb(l, c, h);
  const enc = (v) => {
    const g = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
    return Math.round(Math.max(0, Math.min(1, g)) * 255).toString(16).padStart(2, '0');
  };
  return `#${enc(lin.r)}${enc(lin.g)}${enc(lin.b)}`;
}

/** The legacy string form the emitters print: `oklch(0.520 0.005 92)`. */
function formatOklch(l, c, h) {
  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h})`;
}

// ---------------------------------------------------------------------------
// Resolver: sets, modifiers, contexts, resolutionOrder
// ---------------------------------------------------------------------------

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isToken = (v) => isPlainObject(v) && '$value' in v;
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

/** Groups merge key by key; a later token replaces an earlier one at the same path whole. */
function deepMerge(base, over) {
  const out = { ...base };
  for (const [key, val] of Object.entries(over)) {
    if (isPlainObject(val) && isPlainObject(out[key]) && !isToken(val) && !isToken(out[key])) {
      out[key] = deepMerge(out[key], val);
    } else {
      out[key] = val;
    }
  }
  return out;
}

function pointerGet(doc, pointer, problems, where) {
  if (!pointer.startsWith('#/')) {
    problems.push(`${where}: unsupported $ref "${pointer}"`);
    return undefined;
  }
  let cur = doc;
  for (const raw of pointer.slice(2).split('/')) {
    const seg = raw.replace(/~1/g, '/').replace(/~0/g, '~');
    if (!isPlainObject(cur) || !(seg in cur)) {
      problems.push(`${where}: $ref "${pointer}" does not resolve`);
      return undefined;
    }
    cur = cur[seg];
  }
  return cur;
}

/**
 * Loads the resolver and returns, per theme context, the merged source documents.
 * `sources` are the raw files that fed each context, kept for per-file validation.
 */
function loadResolver(problems) {
  const resolver = readJson(RESOLVER_FILE);
  const sources = new Map();

  if (resolver.version !== '2025.10') problems.push(`resolver: version must be "2025.10" (got ${JSON.stringify(resolver.version)})`);
  if (!Array.isArray(resolver.resolutionOrder) || resolver.resolutionOrder.length === 0) {
    problems.push('resolver: resolutionOrder must be a non-empty array');
    return { resolver, contexts: {}, sources };
  }

  const loadSources = (list, where, seen = []) => {
    let merged = {};
    for (const [i, src] of (list || []).entries()) {
      const at = `${where}[${i}]`;
      if (!isPlainObject(src)) { problems.push(`${at}: source must be an object`); continue; }
      if ('$ref' in src) {
        const ref = src.$ref;
        if (ref.startsWith('#/')) {
          if (seen.includes(ref)) { problems.push(`${at}: circular $ref "${ref}"`); continue; }
          const target = pointerGet(resolver, ref, problems, at);
          if (target && Array.isArray(target.sources)) merged = deepMerge(merged, loadSources(target.sources, `${ref}/sources`, [...seen, ref]));
          else if (target) problems.push(`${at}: $ref "${ref}" must point at a set`);
        } else {
          const file = path.resolve(TOKENS_DIR, ref);
          if (!fs.existsSync(file)) { problems.push(`${at}: file not found: ${ref}`); continue; }
          const doc = readJson(file);
          sources.set(path.relative(ROOT, file), doc);
          merged = deepMerge(merged, doc);
        }
      } else {
        sources.set(`${where}[${i}] (inline)`, src);
        merged = deepMerge(merged, src);
      }
    }
    return merged;
  };

  const modifierNames = new Set();
  let theme;
  const contexts = {};
  const base = (input) => {
    let tree = {};
    for (const [i, item] of resolver.resolutionOrder.entries()) {
      const at = `resolutionOrder[${i}]`;
      const ref = item.$ref;
      const target = ref ? pointerGet(resolver, ref, problems, at) : item;
      const kind = ref ? (ref.startsWith('#/sets/') ? 'set' : ref.startsWith('#/modifiers/') ? 'modifier' : null) : item.type;
      if (kind === 'set') {
        tree = deepMerge(tree, loadSources(target?.sources, `${ref || at}/sources`));
      } else if (kind === 'modifier') {
        const name = ref ? ref.split('/')[2] : item.name;
        modifierNames.add(name);
        const ctx = input[name] ?? target?.default;
        const list = target?.contexts?.[ctx];
        if (!list) { problems.push(`${at}: modifier "${name}" has no context "${ctx}"`); continue; }
        tree = deepMerge(tree, loadSources(list, `${ref || at}/contexts/${ctx}`));
      } else {
        problems.push(`${at}: must reference #/sets/... or #/modifiers/...`);
      }
    }
    return tree;
  };

  const themeMod = resolver.modifiers?.theme;
  if (!themeMod?.contexts) problems.push('resolver: a "theme" modifier with contexts is required');
  else {
    theme = themeMod;
    for (const mode of MODES) {
      if (!themeMod.contexts[mode]) problems.push(`resolver: theme modifier lacks context "${mode}"`);
      else contexts[mode] = base({ theme: mode });
    }
    if (themeMod.default && !themeMod.contexts[themeMod.default]) problems.push(`resolver: theme default "${themeMod.default}" is not a context`);
  }
  return { resolver, contexts, sources };
}

// ---------------------------------------------------------------------------
// Aliases
// ---------------------------------------------------------------------------

const REF_RE = /^\{([^{}]+)\}$/;

function lookup(tree, dotted) {
  let cur = tree;
  for (const seg of dotted.split('.')) {
    if (!isPlainObject(cur) || !(seg in cur)) return undefined;
    cur = cur[seg];
  }
  return isToken(cur) ? cur : undefined;
}

/** Resolves `{a.b}` aliases anywhere in $value, keeping the original in `$raw`. Returns a new tree. */
function resolveAliases(tree, problems, where) {
  const typeOf = (tok) => tok.$type;
  const resolveToken = (token, trail) => {
    const resolveValue = (val, expectedType, at) => {
      if (typeof val === 'string') {
        const m = val.match(REF_RE);
        if (!m) return val;
        const name = m[1];
        if (trail.includes(name)) { problems.push(`${where}: circular reference at ${at}: {${name}}`); return undefined; }
        const target = lookup(tree, name);
        if (!target) { problems.push(`${where}: ${at} references missing token {${name}}`); return undefined; }
        const tType = typeOf(target);
        if (expectedType && tType && tType !== expectedType) {
          problems.push(`${where}: ${at} expects ${expectedType} but {${name}} is ${tType}`);
        }
        return resolveToken(target, [...trail, name]).$value;
      }
      return val;
    };
    const out = { ...token, $raw: token.$value };
    if (token.$type === 'typography' && isPlainObject(token.$value)) {
      out.$value = {};
      for (const [prop, val] of Object.entries(token.$value)) {
        out.$value[prop] = resolveValue(val, TYPOGRAPHY_PROPS[prop], `${token.__path || ''}.${prop}`);
      }
    } else {
      out.$value = resolveValue(token.$value, token.$type, token.__path || '');
    }
    return out;
  };
  const walk = (node, pathParts) => {
    const out = {};
    for (const [key, val] of Object.entries(node)) {
      if (isToken(val)) out[key] = resolveToken({ ...val, __path: [...pathParts, key].join('.') }, [[...pathParts, key].join('.')]);
      else if (isPlainObject(val) && !key.startsWith('$')) out[key] = walk(val, [...pathParts, key]);
      else out[key] = val;
    }
    return out;
  };
  const resolved = walk(tree, []);
  const strip = (node) => {
    for (const val of Object.values(node)) {
      if (isToken(val)) delete val.__path;
      else if (isPlainObject(val)) strip(val);
    }
  };
  strip(resolved);
  return resolved;
}

// ---------------------------------------------------------------------------
// Conformance validation (Format, Color and Resolver modules, 2025.10)
// ---------------------------------------------------------------------------

function validateColorValue(value, where, problems) {
  if (!isPlainObject(value)) { problems.push(`${where}: color $value must be an object {colorSpace, components}`); return; }
  if (!COLOR_SPACES.has(value.colorSpace)) problems.push(`${where}: unknown colorSpace ${JSON.stringify(value.colorSpace)}`);
  if (!Array.isArray(value.components) || value.components.length !== 3
    || !value.components.every((n) => typeof n === 'number' || n === 'none')) {
    problems.push(`${where}: components must be three numbers or "none"`);
    return;
  }
  if ('alpha' in value && !(typeof value.alpha === 'number' && value.alpha >= 0 && value.alpha <= 1)) problems.push(`${where}: alpha must be a number in [0, 1]`);
  if ('hex' in value && !/^#[0-9a-f]{6}$/.test(value.hex)) problems.push(`${where}: hex must be 6-digit lowercase CSS hex`);
  for (const k of Object.keys(value)) if (!['colorSpace', 'components', 'alpha', 'hex'].includes(k)) problems.push(`${where}: unknown colour property "${k}"`);
  if (value.colorSpace === 'oklch') {
    const [l, c, h] = value.components;
    if (typeof l === 'number' && !(l >= 0 && l <= 1)) problems.push(`${where}: oklch L must be in [0, 1]`);
    if (typeof c === 'number' && !(c >= 0)) problems.push(`${where}: oklch chroma must be >= 0`);
    if (typeof h === 'number' && !(h >= 0 && h < 360)) problems.push(`${where}: oklch hue must be in [0, 360)`);
    if (value.hex !== undefined && [l, c, h].every((n) => typeof n === 'number')) {
      const computed = oklchToHex(l, c, h);
      if (computed !== value.hex) problems.push(`${where}: hex ${value.hex} drifted from computed ${computed}`);
    }
  } else if ('hex' in value) {
    problems.push(`${where}: hex is only verified for oklch; remove it or convert`);
  }
}

function validateDimension(value, where, problems) {
  if (!isPlainObject(value) || typeof value.value !== 'number' || !DIMENSION_UNITS.has(value.unit)
    || Object.keys(value).some((k) => k !== 'value' && k !== 'unit')) {
    problems.push(`${where}: dimension must be {"value": number, "unit": "px"|"rem"}`);
  }
}

function validateFontFamily(value, where, problems) {
  const ok = typeof value === 'string' || (Array.isArray(value) && value.length > 0 && value.every((s) => typeof s === 'string'));
  if (!ok) problems.push(`${where}: fontFamily must be a string or an array of strings`);
}

function validateFontWeight(value, where, problems) {
  const ok = (typeof value === 'number' && value >= 1 && value <= 1000) || FONT_WEIGHT_NAMES.has(value);
  if (!ok) problems.push(`${where}: fontWeight must be a number in [1, 1000] or a spec name`);
}

function validateValueOfType(type, value, where, problems) {
  if (typeof value === 'string' && REF_RE.test(value)) return;
  switch (type) {
    case 'color': return validateColorValue(value, where, problems);
    case 'dimension': return validateDimension(value, where, problems);
    case 'number': if (typeof value !== 'number') problems.push(`${where}: number $value must be a JSON number`); return;
    case 'fontFamily': return validateFontFamily(value, where, problems);
    case 'fontWeight': return validateFontWeight(value, where, problems);
    case 'typography': {
      if (!isPlainObject(value)) { problems.push(`${where}: typography $value must be an object`); return; }
      for (const prop of Object.keys(TYPOGRAPHY_PROPS)) {
        if (!(prop in value)) problems.push(`${where}: typography lacks ${prop}`);
        else validateValueOfType(TYPOGRAPHY_PROPS[prop], value[prop], `${where}.${prop}`, problems);
      }
      for (const k of Object.keys(value)) if (!(k in TYPOGRAPHY_PROPS)) problems.push(`${where}: unknown typography property "${k}"`);
      return;
    }
    default: problems.push(`${where}: unknown $type ${JSON.stringify(type)}`);
  }
}

/** Validates one source document: structure, names, types, value shapes, extension keys. */
function validateDocument(doc, file, problems) {
  const walk = (node, parts, inheritedType) => {
    for (const [key, val] of Object.entries(node)) {
      const here = [...parts, key];
      const where = `${file}: ${here.join('.')}`;
      if (key === '$schema' && parts.length === 0) {
        if (typeof val !== 'string' || !val.includes('/schemas/2025.10/')) problems.push(`${file}: $schema must name the 2025.10 schema`);
        continue;
      }
      if (key.startsWith('$')) {
        if (key === '$extensions') {
          if (!isPlainObject(val) || Object.keys(val).some((k) => !k.includes('.'))) problems.push(`${where}: extension keys must be reverse-domain names`);
        } else if (!['$description', '$type', '$deprecated', '$extends', '$root'].includes(key)) {
          problems.push(`${where}: unknown $-property`);
        }
        continue;
      }
      if (/[{}.]/.test(key)) { problems.push(`${where}: names must not contain "{", "}" or "."`); continue; }
      if (!isPlainObject(val)) { problems.push(`${where}: expected a token or group object`); continue; }
      if (isToken(val)) {
        const type = val.$type || inheritedType;
        if (!type) { problems.push(`${where}: token has no $type`); continue; }
        if (!ALLOWED_TYPES.has(type)) { problems.push(`${where}: unknown $type ${JSON.stringify(type)}`); continue; }
        for (const k of Object.keys(val)) {
          if (!['$value', '$type', '$description', '$deprecated', '$extensions'].includes(k)) problems.push(`${where}: "${k}" is not a token property (move it under $extensions["${EXT}"])`);
        }
        if (Object.keys(val).some((k) => !k.startsWith('$'))) continue;
        if ('$extensions' in val && (!isPlainObject(val.$extensions) || Object.keys(val.$extensions).some((k) => !k.includes('.')))) {
          problems.push(`${where}: extension keys must be reverse-domain names`);
        }
        validateValueOfType(type, val.$value, where, problems);
      } else {
        walk(val, here, val.$type || inheritedType);
      }
    }
  };
  walk(doc, [], doc.$type);
}

const ext = (token) => (token && token.$extensions && token.$extensions[EXT]) || {};

function validateResolvedMode(mode, tree, problems) {
  const where = `context ${mode}`;
  const fontSlot = (tok) => (typeof tok.$raw?.fontFamily === 'string' ? tok.$raw.fontFamily.match(REF_RE)?.[1] : undefined);
  if (mode === 'light') {
    for (const [name, tok] of Object.entries(tree.typography || {})) {
      if (name.startsWith('$') || !isToken(tok)) continue;
      const x = ext(tok);
      const rawFamily = tok.$raw?.fontFamily;
      const slot = typeof rawFamily === 'string' ? rawFamily.match(REF_RE)?.[1] : undefined;
      if (slot !== `font.${x.slot}`) problems.push(`${where}: typography.${name} fontFamily must reference font.${x.slot}`);
      const trackRef = typeof x.tracking === 'string' ? x.tracking.match(REF_RE)?.[1] : undefined;
      const track = trackRef && lookup(tree, trackRef);
      if (!track || track.$type !== 'number') { problems.push(`${where}: typography.${name} extension "tracking" must reference a number token`); continue; }
      const size = tok.$value.fontSize?.value;
      const expected = Number((track.$value * size).toFixed(4));
      if (Math.abs(tok.$value.letterSpacing.value - expected) > 1e-6) {
        problems.push(`${where}: typography.${name} letterSpacing ${tok.$value.letterSpacing.value}px must equal tracking ${track.$value}em x ${size}px = ${expected}px`);
      }
      if (x.appleLeading !== 'tight' && x.appleLeading !== 'standard') problems.push(`${where}: typography.${name} extension "appleLeading" must be "tight" or "standard" (got ${JSON.stringify(x.appleLeading)})`);
      const px = tok.$value.lineHeight * size;
      if (Math.abs(px - Math.round(px)) > 1e-6) problems.push(`${where}: typography.${name} lineHeight x fontSize must be whole pixels (got ${px})`);
    }
  }
  void fontSlot;
}

// ---------------------------------------------------------------------------
// Flat view (legacy shape the emitters read)
// ---------------------------------------------------------------------------

const px = (dim) => `${dim.value}${dim.unit}`;

function fontStack(families) {
  const list = Array.isArray(families) ? families : [families];
  return list.map((f) => (/\s/.test(f) ? `"${f}"` : f)).join(', ');
}

function flatDimension(tok) {
  const x = ext(tok);
  const out = { $value: px(tok.$value), $type: 'dimension' };
  if (x.points) out.points = px(x.points);
  for (const k of ['apple', 'web', 'android']) if (x[k] !== undefined) out[k] = x[k];
  return out;
}

function flatColor(tok) {
  const [l, c, h] = tok.$value.components;
  const out = { $value: formatOklch(l, c, h), $type: 'color', hex: tok.$value.hex || oklchToHex(l, c, h) };
  const x = ext(tok);
  if (x.name) out.name = x.name;
  return out;
}

function buildFlat(trees) {
  const light = trees.light;
  const flat = {};

  for (const group of ['space', 'border', 'radius']) {
    flat[group] = {};
    for (const [k, tok] of Object.entries(light[group] || {})) if (isToken(tok)) flat[group][k] = flatDimension(tok);
  }

  flat.measure = {};
  for (const [k, tok] of Object.entries(light.measure || {})) {
    if (!isToken(tok)) continue;
    const x = ext(tok);
    flat.measure[k] = tok.$type === 'number'
      ? { $value: `${tok.$value}${x.unit}`, $type: 'dimension', points: px(x.points) }
      : flatDimension(tok);
  }

  flat.font = {};
  for (const [k, tok] of Object.entries(light.font || {})) {
    if (!isToken(tok)) continue;
    const alias = typeof tok.$raw === 'string' ? tok.$raw.match(REF_RE)?.[1].replace(/^font\./, '') : undefined;
    flat.font[k] = { $value: fontStack(tok.$value), $type: 'fontFamily', ...(alias ? { alias } : {}) };
  }

  flat.tracking = {};
  for (const [k, tok] of Object.entries(light.tracking || {})) if (isToken(tok)) flat.tracking[k] = { $value: `${tok.$value}em`, $type: 'dimension' };

  flat.typography = {};
  for (const [k, tok] of Object.entries(light.typography || {})) {
    if (!isToken(tok)) continue;
    const x = ext(tok);
    const v = tok.$value;
    const size = v.fontSize.value;
    const spec = {
      $type: 'typography',
      fontSize: px(v.fontSize),
      lineHeight: `${Number((v.lineHeight * size).toFixed(6))}px`,
      lineHeightRatio: v.lineHeight,
      appleLeading: x.appleLeading,
      fontWeight: v.fontWeight,
      tracking: `${lookup(light, x.tracking.match(REF_RE)[1]).$value}em`,
      trackingToken: x.tracking.match(REF_RE)[1].split('.').pop(),
      isUppercase: x.isUppercase,
      caseFeature: x.caseFeature,
      tabularNums: x.tabularNums,
      slot: x.slot,
      appleTextStyle: x.appleTextStyle
    };
    if (x.appleTextStyleMacOS !== undefined) spec.appleTextStyleMacOS = x.appleTextStyleMacOS;
    spec.cssColor = x.cssColor;
    spec.textWrap = x.textWrap === undefined ? null : x.textWrap;
    flat.typography[k] = spec;
  }

  flat.color = {};
  for (const mode of MODES) {
    for (const [k, tok] of Object.entries(trees[mode].color || {})) {
      if (!isToken(tok)) continue;
      (flat.color[k] ||= {})[mode] = flatColor(tok);
    }
  }

  flat.theme = {};
  if (light.theme && light.theme.$description) flat.theme.$description = light.theme.$description;
  for (const [key, group] of Object.entries(light.theme || {})) {
    if (key.startsWith('$') || !isPlainObject(group)) continue;
    const meta = ext({ $extensions: group.$extensions });
    const entry = { id: meta.id, title: meta.title };
    for (const [name, tok] of Object.entries(group)) {
      if (!isToken(tok)) continue;
      entry[name] = {};
      for (const base of ['light', 'dark']) {
        const t = trees[base].theme?.[key]?.[name];
        if (t) entry[name][base] = flatColor(t);
      }
    }
    flat.theme[key] = entry;
  }
  return flat;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Loads, validates and flattens the tokens. `problems` lists every non-conformance found. */
function loadTokens() {
  const problems = [];
  const { resolver, contexts, sources } = loadResolver(problems);
  for (const [file, doc] of sources) validateDocument(doc, file, problems);
  if (resolver.$schema && !resolver.$schema.includes('/schemas/2025.10/resolver')) problems.push('resolver: $schema must name the 2025.10 resolver schema');

  const trees = {};
  for (const mode of MODES) {
    if (!contexts[mode]) continue;
    trees[mode] = resolveAliases(contexts[mode], problems, `context ${mode}`);
    validateResolvedMode(mode, trees[mode], problems);
  }
  const complete = MODES.every((m) => trees[m]);
  const flat = complete ? buildFlat(trees) : undefined;
  return { flat, trees, problems, resolver };
}

/** Flat view or throws with every problem listed. */
function loadFlatOrThrow() {
  const { flat, problems } = loadTokens();
  if (problems.length || !flat) throw new Error(`Token conformance failed:\n  - ${problems.join('\n  - ')}`);
  return flat;
}

/**
 * Wraps the flat view so reads are recorded. A token counts as read when any of its properties is
 * accessed; `unreadTokens()` lists the rest (the compiler fails on those).
 */
function trackReads(flat) {
  const all = new Set();
  const read = new Set();
  const leafKeys = (node, parts) => {
    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith('$') && k !== '$value') continue;
      if (v && typeof v === 'object') {
        const here = [...parts, k];
        if ('$value' in v || v.$type === 'typography') all.add(here.join('.'));
        else leafKeys(v, here);
      }
    }
  };
  leafKeys(flat, []);

  const wrap = (node, parts) => new Proxy(node, {
    get(target, key, recv) {
      const val = Reflect.get(target, key, recv);
      if (typeof key !== 'string') return val;
      const here = [...parts, key];
      if (val !== null && typeof val === 'object') return wrap(val, here);
      if (parts.length) read.add(parts.join('.'));
      return val;
    }
  });
  return {
    tokens: wrap(flat, []),
    unreadTokens: () => [...all].filter((p) => !read.has(p)).sort()
  };
}

module.exports = {
  ROOT, MODES, EXT, oklchToLinearSrgbRaw, isInGamut, oklchToLinearSrgb, oklchToHex, formatOklch,
  loadTokens, loadFlatOrThrow, trackReads, validateDocument
};

if (require.main === module) {
  const arg = process.argv[2];
  const { flat, problems } = loadTokens();
  if (problems.length) {
    console.error(`✗ Token conformance failed:\n  - ${problems.join('\n  - ')}`);
    process.exit(1);
  }
  if (arg === '--flat') process.stdout.write(`${JSON.stringify(flat)}\n`);
  else console.log('✓ Tokens conform to Design Tokens Format, Color and Resolver Modules 2025.10.');
}
