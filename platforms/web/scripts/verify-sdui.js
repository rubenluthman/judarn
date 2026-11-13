#!/usr/bin/env node
/** Verifies the SDUI serializer by rendering real components from the built dist/. Requires `npm run build`. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { renderToStaticMarkup: render } = require('react-dom/server');

const {
  serializeTokens,
  serializeComponent,
  deserializeComponent,
  validateSDUINode,
  SDUI_PROP_ALLOWLIST,
  VALID_TOKEN_NAMES,
} = require('../dist/sdui/index.cjs');

console.log('=== Judarn Server-Driven UI (SDUI) Serializer Verification ===\n');

let failures = 0;
const test = (name, fn) => {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    failures++;
    console.error(`✗ ${name}\n  ${e.message}`);
  }
};
const rejects = (node, pattern) => assert.throws(() => validateSDUINode(node), pattern);

const rawTokens = require(path.resolve(__dirname, '../../../scripts/lib/design-tokens.js')).loadFlatOrThrow();

test('token registry serializes every register and every token reference resolves', () => {
  const t = serializeTokens(rawTokens);
  assert.ok(t.color.substrate.light && t.color.substrate.dark);
  assert.ok(t.color.signalError.lightHighContrast);
  assert.ok(t.space['4'] && t.space['1'] && t.space.touch);
  const wire = new Set([
    ...Object.keys(t.color), ...Object.keys(t.radius), ...Object.keys(t.space), ...Object.keys(t.measure),
  ]);
  for (const name of VALID_TOKEN_NAMES) assert.ok(wire.has(name), `token "${name}" is not in the serialized registry`);
  assert.ok(wire.has('touch') && VALID_TOKEN_NAMES.has('touch'), 'space.touch must be a valid reference');
});

const matrixNode = serializeComponent('data-matrix', {
  label: 'Latency',
  columns: [{ key: 'metric', label: 'Metric', width: 140 }, { key: 'val', label: 'ms', numeric: true, casing: 'asWritten' }],
  rows: [{ metric: 'Read', val: '12' }, { metric: 'Idle', val: null }],
});
const tree = serializeComponent('card', { eyebrow: 'System', title: 'Performance' }, [
  matrixNode,
  serializeComponent('button', { variant: 'accent', size: 'sm' }, [], 'Run'),
  serializeComponent('badge', { variant: 'accent', accentColor: '#ff5353' }, [], 'Active'),
  serializeComponent('text-field', { label: 'Name', hint: 'Required', placeholder: 'Ada' }),
]);

test('a nested tree hydrates into the real components', () => {
  const html = render(deserializeComponent(tree));
  for (const expected of [
    'class="jd-card"', 'class="jd-card__eyebrow t-label"', 'class="jd-matrix"', 'aria-label="Latency"',
    'class="jd-btn jd-btn--accent jd-btn--sm"', 'class="jd-badge jd-badge--accent"', 'color:#ffffff', 'class="jd-field__input"',
    'aria-describedby=', '​',
  ]) {
    assert.ok(html.includes(expected), `rendered markup is missing ${JSON.stringify(expected)}\n${html}`);
  }
});

test('a payload cannot inject style, class, handlers or raw HTML', () => {
  for (const type of Object.keys(SDUI_PROP_ALLOWLIST)) {
    for (const props of [
      { style: { borderRadius: '16px' } },
      { className: 'evil' },
      { dangerouslySetInnerHTML: { __html: '<img src=x onerror=alert(1)>' } },
      { onClick: 'alert(1)' },
      { 'data-x': '1' },
      { id: 'x' },
      { href: 'javascript:alert(1)' },
    ]) {
      rejects({ type, props }, /Unsupported SDUI prop/);
    }
  }
  rejects({ type: 'container', props: JSON.parse('{"__proto__":{"x":1}}') }, /Unsupported SDUI prop/);
});

test('prop values are validated per type', () => {
  rejects({ type: 'button', props: { variant: 'accent-outline' } }, /Unsupported SDUI button prop "variant"/);
  rejects({ type: 'badge', props: { variant: 'ghost' } }, /Unsupported SDUI badge prop "variant"/);
  rejects({ type: 'button', props: { size: 'xl' } }, /size/);
  rejects({ type: 'badge', props: { accentColor: 'url(javascript:1)' } }, /colour/);
  rejects({ type: 'data-table', props: { rows: [{ a: { nested: 1 } }] } }, /row cells/);
  rejects({ type: 'data-table', props: { columns: [{ key: 'a', label: 'A', onClick: 'x' }] } }, /column key/);
  rejects({ type: 'container', props: { token: 'neon' } }, /token/);
  assert.ok(validateSDUINode({ type: 'container', props: { token: 'touch' } }));
});

test('unknown node types and malformed nodes are rejected', () => {
  rejects({ type: 'floating-action-blob' }, /Unsupported SDUI node type/);
  rejects({ type: 'card', children: 'x' }, /children must be an array/);
  rejects({ type: 'card', children: [{ type: 'nope' }] }, /Unsupported SDUI node type/);
  rejects(null, /non-null object/);
});

test('schema.json mirrors the validator allowlist per node type', () => {
  const schema = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/sdui/schema.json'), 'utf8'));
  assert.deepStrictEqual([...schema.properties.type.enum].sort(), Object.keys(SDUI_PROP_ALLOWLIST).sort());
  assert.strictEqual(schema.additionalProperties, false);
  for (const branch of schema.allOf) {
    const type = branch.if.properties.type.const;
    const props = branch.then.properties.props;
    assert.strictEqual(props.additionalProperties, false, `${type} props must set additionalProperties:false`);
    assert.deepStrictEqual(Object.keys(props.properties).sort(), Object.keys(SDUI_PROP_ALLOWLIST[type]).sort(), `${type} props differ from the validator`);
  }
  assert.strictEqual(schema.allOf.length, Object.keys(SDUI_PROP_ALLOWLIST).length);
});

test('a custom component override replaces the default', () => {
  const html = render(deserializeComponent(serializeComponent('button', {}, [], 'Go'), {
    Button: ({ children }) => require('react').createElement('i', null, children),
  }));
  assert.strictEqual(html, '<i>Go</i>');
});

if (failures > 0) {
  console.error(`\n✗ SDUI verification failed with ${failures} failure(s).`);
  process.exit(1);
}
console.log('\n✓ All Server-Driven UI (SDUI) Serialization & Invariant Checks Passed.');
