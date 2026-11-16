#!/usr/bin/env node
/** Renders the built components with react-dom/server and asserts their contracts. Requires `npm run build`. */
const assert = require('assert');
const path = require('path');
const React = require('react');
const { renderToStaticMarkup: render } = require('react-dom/server');

const dist = path.resolve(__dirname, '../dist/index.cjs');
const ui = require(dist);
const { Button, Card, Badge, Tag, DataMatrix, DataTable, TextField, LogoLockup, Footer, Navbar, getContrastingInk, getContrastingAccent } = ui;
const h = React.createElement;

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

console.log('=== Judarn Web Component Unit Verification ===\n');

test('getContrastingInk follows the 0.50 crossover for hex and rgb', () => {
  assert.strictEqual(getContrastingInk('#ffffff'), '#000000');
  assert.strictEqual(getContrastingInk('#000'), '#ffffff');
  assert.strictEqual(getContrastingInk('#ff5353'), '#ffffff');
  assert.strictEqual(getContrastingInk('#bababa'), '#ffffff');
  assert.strictEqual(getContrastingInk('#bdbdbd'), '#000000');
  assert.strictEqual(getContrastingInk('rgb(255, 255, 255)'), '#000000');
  assert.strictEqual(getContrastingInk('rgb(0 0 0)'), '#ffffff');
});

test('getContrastingInk parses oklch()', () => {
  assert.strictEqual(getContrastingInk('oklch(0.98 0 0)'), '#000000');
  assert.strictEqual(getContrastingInk('oklch(0.08 0 0)'), '#ffffff');
  assert.strictEqual(getContrastingInk('oklch(95% 0.02 90)'), '#000000');
  assert.strictEqual(getContrastingInk('oklch(0.45 0.15 12)'), '#ffffff');
  assert.strictEqual(getContrastingInk('oklch(0.9 0.15 100 / 0.5)'), '#000000');
});

test('getContrastingInk throws on unsupported formats instead of guessing white', () => {
  for (const bad of ['hsl(10, 50%, 50%)', 'var(--accent)', 'red', '', '#12', undefined, 42]) {
    assert.throws(() => getContrastingInk(bad), TypeError, `expected a throw for ${String(bad)}`);
  }
});

const lin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const lumHex = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [ya, yb] = [lumHex(a), lumHex(b)];
  return (Math.max(ya, yb) + 0.05) / (Math.min(ya, yb) + 0.05);
};

test('getContrastingAccent returns a passing accent unchanged', () => {
  assert.strictEqual(getContrastingAccent('#0b3d91', '#ffffff'), '#0b3d91');
  assert.strictEqual(getContrastingAccent('oklch(0.4 0.1 250)', '#ffffff'), 'oklch(0.4 0.1 250)');
});

test('getContrastingAccent reaches 4.5:1 by darkening on light surfaces and lightening on dark ones', () => {
  for (const surface of ['#ffffff', '#f8f8f8', '#808080', '#1a1a1a', '#000000']) {
    for (const accent of ['#ff5353', '#2f80ed', '#e8c200', '#6b6b6b', '#33cc99']) {
      const out = getContrastingAccent(accent, surface);
      assert.match(out, /^#[0-9a-f]{6}$|^#[0-9a-f]{3,8}$/);
      assert.ok(ratio(out, surface) >= 4.5 - 0.02, `${accent} on ${surface} gave ${out} at ${ratio(out, surface).toFixed(2)}`);
    }
  }
  assert.ok(lumHex(getContrastingAccent('#e8c200', '#ffffff')) < lumHex('#e8c200'));
  assert.ok(lumHex(getContrastingAccent('#2f4f8f', '#1a1a1a')) > lumHex('#2f4f8f'));
});

test('getContrastingAccent honours minRatio and rejects unsupported formats', () => {
  assert.ok(ratio(getContrastingAccent('#ff5353', '#ffffff', 7), '#ffffff') >= 6.95);
  assert.throws(() => getContrastingAccent('var(--accent)', '#fff'), TypeError);
  assert.throws(() => getContrastingAccent('#fff', 'red'), TypeError);
});

test('table CSS keeps the first column sticky and figures unwrapped', () => {
  const css = require('node:fs').readFileSync(path.resolve(__dirname, '../styles/components.css'), 'utf8');
  assert.match(css, /\.jd-table :is\(th, td\):first-child \{ position: sticky; left: 0; background: var\(--jd-table-fill\)/);
  assert.match(css, /\.jd-table \.num, \.jd-table time \{ white-space: nowrap; \}/);
});

test('consumer className extends the base classes', () => {
  assert.match(render(h(Button, { className: 'extra', variant: 'accent' }, 'x')), /class="jd-btn jd-btn--accent extra"/);
  assert.match(render(h(Card, { className: 'extra', compact: true })), /class="jd-card jd-card--compact extra"/);
  assert.match(render(h(Badge, { className: 'extra', variant: 'solid' }, 'x')), /class="jd-badge jd-badge--solid extra"/);
  assert.match(render(h(Tag, { className: 'extra' }, 'x')), /class="jd-tag extra"/);
  assert.match(render(h(DataMatrix, { className: 'extra', columns: ['a'], rows: [] })), /class="jd-matrix extra"/);
  assert.match(render(h(DataTable, { className: 'extra', columns: ['a'], rows: [] })), /class="jd-table extra"/);
});

test('Button has no outline variant, and Badge defaults to the neutral fill', () => {
  assert.match(render(h(Button, { variant: 'outline' }, 'x')), /class="jd-btn"/);
  assert.match(render(h(Badge, null, 'x')), /class="jd-badge"/);
});

test('an accent-tint Badge passes its color to the stylesheet, not a fill or stroke', () => {
  const html = render(h(Badge, { variant: 'accent-tint', accentColor: '#3366ff' }, 'x'));
  assert.match(html, /class="jd-badge jd-badge--accent-tint"/);
  assert.match(html, /style="--jd-badge-accent:#3366ff"/);
  assert.ok(!/border-color|background-color/.test(html), html);
});

test('TextField ids are unique and hint and error are linked with aria-describedby', () => {
  const html = render(h('div', null,
    h(TextField, { label: 'Name', hint: 'Shown on receipts' }),
    h(TextField, { label: 'Name', error: 'Required' }),
  ));
  const ids = [...html.matchAll(/<input[^>]* id="([^"]+)"/g)].map((m) => m[1]);
  assert.strictEqual(ids.length, 2);
  assert.notStrictEqual(ids[0], ids[1], 'duplicate labels must not share an id');
  for (const id of ids) {
    assert.ok(html.includes(`for="${id}"`), `label points at ${id}`);
  }
  assert.ok(html.includes(`aria-describedby="${ids[0]}-hint"`));
  assert.ok(html.includes(`aria-describedby="${ids[1]}-error"`));
  assert.ok(html.includes(`id="${ids[0]}-hint"`) && html.includes(`id="${ids[1]}-error"`));
  assert.ok(/<input[^>]*aria-invalid="true"/.test(html), 'an error marks the control invalid');
});

test('TextField select renders its options', () => {
  const html = render(h(TextField, { as: 'select', label: 'Size' }, h('option', { value: 'a' }, 'A')));
  assert.match(html, /<select[^>]*class="jd-field__input"[^>]*><option value="a">A<\/option><\/select>/);
});

test('LogoLockup merges className and forwards other attributes', () => {
  const html = render(h(LogoLockup, { name: 'Acme', className: 'x', id: 'brand', 'data-k': '1' }));
  assert.match(html, /class="jd-lockup x"/);
  assert.match(html, /id="brand"/);
  assert.match(html, /data-k="1"/);
  assert.match(render(h(LogoLockup, { name: 'Acme', variant: 'icon', className: 'x' })), /class="jd-lockup__mark x"/);
});

test('LogoLockup exposes an image role with a name', () => {
  assert.match(render(h(LogoLockup, { name: 'Acme', tagline: 'Tools' })), /role="img" aria-label="Acme – Tools"/);
  assert.match(render(h(LogoLockup, { name: 'Acme', variant: 'icon' })), /role="img" aria-label="Acme"/);
});

test('Card eyebrow, footer head and lockup tagline route through t-label with an as-written option', () => {
  assert.match(render(h(Card, { eyebrow: 'Status' })), /class="jd-card__eyebrow t-label"/);
  assert.match(render(h(Card, { eyebrow: 'e1RM', eyebrowCasing: 'asWritten' })), /class="jd-card__eyebrow t-label t-as-written"/);
  assert.match(render(h(Footer, { columns: [{ head: 'Product', links: ['A'] }] })), /<h2 class="jd-footer__head t-label">Product<\/h2>/);
  assert.match(render(h(Footer, { headCasing: 'asWritten', columns: [{ head: 'Q&A', links: [] }] })), /footer__head t-label t-as-written/);
  assert.match(render(h(LogoLockup, { tagline: 'T' })), /class="jd-lockup__tag t-label"/);
  assert.match(render(h(LogoLockup, { tagline: 'T', taglineCasing: 'asWritten' })), /lockup__tag t-label t-as-written/);
});

test('Navbar marks the current link', () => {
  assert.match(render(h(Navbar, { links: ['A', 'B'], current: 'B' })), /<a class="jd-navbar__link" href="#" aria-current="page">B<\/a>/);
});

test('DataMatrix keeps empty cells on the baseline', () => {
  assert.ok(render(h(DataMatrix, { columns: ['a'], rows: [{ a: null }] })).includes('​'));
});

test('every component folder has a guideline README that names each variant', () => {
  const fs = require('fs');
  const src = path.resolve(__dirname, '../src');
  const folders = fs.readdirSync(src, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== 'internal' && d.name !== 'sdui')
    .map((d) => d.name);
  assert.ok(folders.length > 0);
  for (const name of folders) {
    const readmePath = path.join(src, name, 'README.md');
    assert.ok(fs.existsSync(readmePath), `${name} is missing README.md`);
    const readme = fs.readFileSync(readmePath, 'utf8');
    const dts = fs.readFileSync(path.join(src, name, `${name}.d.ts`), 'utf8');
    for (const m of dts.matchAll(/\bvariant\?:\s*([^;]+);/g)) {
      for (const v of m[1].matchAll(/"([^"]+)"/g)) {
        assert.ok(readme.includes(`\`${v[1]}\``), `${name}/README.md does not mention variant \`${v[1]}\``);
      }
    }
  }
});

if (failures > 0) {
  console.error(`\n✗ Component unit verification failed with ${failures} failure(s).`);
  process.exit(1);
}
console.log('\n✓ All component unit checks passed.');
