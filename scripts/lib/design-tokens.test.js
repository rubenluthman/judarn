const test = require('node:test');
const assert = require('node:assert');
const { validateDocument, loadTokens, trackReads, oklchToHex } = require('./design-tokens');

const problemsFor = (doc) => {
  const problems = [];
  validateDocument(doc, 'test.json', problems);
  return problems;
};
const color = (value) => ({ c: { $type: 'color', $value: value } });

test('the committed token set conforms and resolves all four contexts', () => {
  const { problems, flat } = loadTokens();
  assert.deepStrictEqual(problems, []);
  assert.ok(flat.color.ink60.darkHighContrast && flat.typography.display.tracking === '-0.02em');
});

test('a conforming oklch colour passes and a drifted hex fails', () => {
  const good = { colorSpace: 'oklch', components: [0.52, 0.005, 92], hex: oklchToHex(0.52, 0.005, 92) };
  assert.deepStrictEqual(problemsFor(color(good)), []);
  assert.match(problemsFor(color({ ...good, hex: '#000000' }))[0], /drifted/);
});

test('legacy forms are rejected', () => {
  assert.match(problemsFor(color('oklch(0.5 0 0)'))[0], /color \$value must be an object/);
  assert.match(problemsFor({ d: { $type: 'dimension', $value: '16px' } })[0], /dimension must be/);
  assert.match(problemsFor({ d: { $type: 'dimension', $value: { value: 1, unit: 'em' } } })[0], /dimension must be/);
  assert.match(problemsFor({ d: { $type: 'string', $value: 'x' } })[0], /unknown \$type/);
  assert.match(problemsFor({ d: { $type: 'dimension', $value: { value: 1, unit: 'px' }, apple: '1px' } })[0], /not a token property/);
  assert.match(problemsFor({ d: { $type: 'typography', fontSize: '1px' } })[0], /expected a token or group object/);
  assert.match(problemsFor({ d: { $type: 'number', $value: 1, $extensions: { judarn: {} } } })[0], /reverse-domain/);
});

test('names with reserved characters and untyped tokens are rejected', () => {
  assert.match(problemsFor({ 'a.b': { $type: 'number', $value: 1 } })[0], /names must not contain/);
  assert.match(problemsFor({ a: { $value: 1 } })[0], /no \$type/);
});

test('reads are tracked per token', () => {
  const view = { space: { a: { $value: '1px' }, b: { $value: '2px' } } };
  const t = trackReads(view);
  void t.tokens.space.a.$value;
  assert.deepStrictEqual(t.unreadTokens(), ['space.b']);
});

test('every role keeps web line-height and Apple leading from its token (ADR-0012)', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const { flat } = loadTokens();
  const css = fs.readFileSync(path.join(__dirname, '../../platforms/web/styles/colors_and_type.css'), 'utf8');
  const kebab = (k) => k.replace(/([A-Z])/g, '-$1').toLowerCase();
  for (const [key, spec] of Object.entries(flat.typography)) {
    const block = css.match(new RegExp(`\\.t-${kebab(key)} \\{([^}]*)\\}`));
    assert.ok(block, `.t-${kebab(key)} exists`);
    const lh = Number(block[1].match(/line-height:\s*([\d.]+);/)[1]);
    assert.ok(Math.abs(lh - spec.lineHeightRatio) < 1e-9, `${key} line-height ${lh} equals token ${spec.lineHeightRatio}`);
    assert.ok(['tight', 'standard'].includes(spec.appleLeading), `${key} appleLeading`);
  }
  for (const [k, v] of Object.entries({ tight: 'display', head: 'h1', body: 'body' })) {
    assert.match(css, new RegExp(`--lh-${k}: ${flat.typography[v].lineHeightRatio};`));
  }
});
