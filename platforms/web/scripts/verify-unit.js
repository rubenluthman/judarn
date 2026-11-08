#!/usr/bin/env node
/** Renders the built components with react-dom/server and asserts their contracts. Requires `npm run build`. */
const assert = require('assert');
const path = require('path');
const React = require('react');
const { renderToStaticMarkup: render } = require('react-dom/server');

const dist = path.resolve(__dirname, '../dist/index.cjs');
const ui = require(dist);
const { Button, Card, Badge, Tag, DataMatrix, DataTable, TextField, LogoLockup, Footer, Navbar, getContrastingInk } = ui;
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

test('consumer className extends the base classes', () => {
  assert.match(render(h(Button, { className: 'extra', variant: 'accent' }, 'x')), /class="btn btn--accent extra"/);
  assert.match(render(h(Card, { className: 'extra', compact: true })), /class="card card--compact extra"/);
  assert.match(render(h(Badge, { className: 'extra', variant: 'solid' }, 'x')), /class="badge badge--solid extra"/);
  assert.match(render(h(Tag, { className: 'extra' }, 'x')), /class="tag extra"/);
  assert.match(render(h(DataMatrix, { className: 'extra', columns: ['a'], rows: [] })), /class="matrix extra"/);
  assert.match(render(h(DataTable, { className: 'extra', columns: ['a'], rows: [] })), /class="table extra"/);
});

test('Button supports the outline variant', () => {
  assert.match(render(h(Button, { variant: 'outline' }, 'x')), /class="btn btn--outline"/);
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
  assert.match(html, /<select[^>]*class="field__input"[^>]*><option value="a">A<\/option><\/select>/);
});

test('LogoLockup exposes an image role with a name', () => {
  assert.match(render(h(LogoLockup, { name: 'Acme', tagline: 'Tools' })), /role="img" aria-label="Acme – Tools"/);
  assert.match(render(h(LogoLockup, { name: 'Acme', variant: 'icon' })), /role="img" aria-label="Acme"/);
});

test('Card eyebrow, footer head and lockup tagline route through t-label with an as-written option', () => {
  assert.match(render(h(Card, { eyebrow: 'Status' })), /class="card__eyebrow t-label"/);
  assert.match(render(h(Card, { eyebrow: 'e1RM', eyebrowCasing: 'asWritten' })), /class="card__eyebrow t-label t-as-written"/);
  assert.match(render(h(Footer, { columns: [{ head: 'Product', links: ['A'] }] })), /<h2 class="footer__head t-label">Product<\/h2>/);
  assert.match(render(h(Footer, { headCasing: 'asWritten', columns: [{ head: 'Q&A', links: [] }] })), /footer__head t-label t-as-written/);
  assert.match(render(h(LogoLockup, { tagline: 'T' })), /class="lockup__tag t-label"/);
  assert.match(render(h(LogoLockup, { tagline: 'T', taglineCasing: 'asWritten' })), /lockup__tag t-label t-as-written/);
});

test('Navbar marks the current link', () => {
  assert.match(render(h(Navbar, { links: ['A', 'B'], current: 'B' })), /<a class="navbar__link" href="#" aria-current="page">B<\/a>/);
});

test('DataMatrix keeps empty cells on the baseline', () => {
  assert.ok(render(h(DataMatrix, { columns: ['a'], rows: [{ a: null }] })).includes('​'));
});

if (failures > 0) {
  console.error(`\n✗ Component unit verification failed with ${failures} failure(s).`);
  process.exit(1);
}
console.log('\n✓ All component unit checks passed.');
