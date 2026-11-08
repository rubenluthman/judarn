#!/usr/bin/env node
/**
 * Renders the built components and checks the shipped CSS against the invariants they rely on.
 * Requires `npm run build`. A broken component or a CSS regression fails this script.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const React = require('react');
const { renderToStaticMarkup: render } = require('react-dom/server');
const ui = require('../dist/index.cjs');

const styles = (name) => fs.readFileSync(path.resolve(__dirname, '../styles', name), 'utf8');
const colors = styles('colors_and_type.css');
const components = styles('components.css');
const theme = styles('tailwind-theme.css');
const h = React.createElement;

console.log('=== Judarn CSS and Tailwind Export Checks ===\n');

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

const rule = (css, selector) => {
  const start = css.indexOf(`${selector} {`);
  assert.ok(start >= 0, `selector ${selector} not found`);
  return css.slice(start, css.indexOf('}', start));
};

test('every component renders the markup the stylesheet targets', () => {
  const html = render(h('div', null,
    h(ui.Navbar, { links: ['A'], current: 'A', actions: h(ui.Button, { variant: 'accent' }, 'Go') }),
    h(ui.Card, { eyebrow: 'Status', title: 'T', media: h('i') }, 'Body'),
    h(ui.Badge, { variant: 'accent' }, 'ok'), h(ui.Tag, null, 'tag'),
    h(ui.DataMatrix, { columns: [{ key: 'a', label: 'A', numeric: true }], rows: [{ a: 1 }, { a: null }] }),
    h(ui.DataTable, { columns: ['a'], rows: [{ a: 1 }] }),
    h(ui.TextField, { label: 'Name', hint: 'Hint' }),
    h(ui.LogoLockup, { tagline: 'Tools' }),
    h(ui.Footer, { columns: [{ head: 'Product', links: ['A'] }] }),
  ));
  for (const needle of [
    'class="navbar"', 'aria-current="page"', 'class="card"', 'class="card__media"', 'class="badge badge--accent"',
    'class="tag"', 'class="matrix"', 'role="columnheader"', 'aria-colindex', '​', 'class="table"',
    'class="field__input"', 'class="lockup"', 'class="footer"',
  ]) assert.ok(html.includes(needle), `missing ${JSON.stringify(needle)}`);
});

test('every class the components emit has a rule in components.css', () => {
  const html = render(h('div', null,
    h(ui.Button, { variant: 'accent', size: 'lg', block: true }, 'x'), h(ui.Button, { variant: 'outline' }, 'x'),
    h(ui.Card, { eyebrow: 'e', media: h('i'), flat: true, compact: true }, 'x'), h(ui.LogoLockup, { variant: 'reversed', tagline: 't' }),
    h(ui.Footer, { columns: [{ head: 'h', links: ['a'] }] }),
  ));
  const used = new Set([...html.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(' ')));
  const typeClasses = new Set(['t-label', 't-as-written']);
  for (const cls of used) {
    if (typeClasses.has(cls)) assert.ok(colors.includes(`.${cls}`), `.${cls} missing from colors_and_type.css`);
    else assert.ok(components.includes(`.${cls}`), `.${cls} has no rule in components.css`);
  }
});

test('accent fills take a static ink, never the scheme-following --white (ADR-0006)', () => {
  assert.match(rule(components, '.btn--accent'), /color: var\(--accent-ink\)/);
  assert.match(rule(components, '.badge--accent'), /color: var\(--accent-ink\)/);
  assert.match(colors, /--accent-ink:\s+var\(--jd-accent-ink, #(ffffff|000000)\);/);
  assert.match(colors, /--accent:\s+var\(--jd-accent, var\(--jd-ink-100\)\);/);
  assert.ok(!/≥ 4\.5:1 clamp|contrast-clamped/.test(colors), 'the false clamp comment must stay removed');
});

// Custom properties resolve where they are declared, so a default declared on :root as
// `--jd-accent` or `--jd-accent-ink` would be inherited by nested scopes and ignore their scheme.
// Structural check (no browser in the gate): the hooks stay undeclared, and every scope that swaps
// the scheme redeclares the resolved accent with the hook as an override and its own ink default.
test('the default accent resolves per theme scope and a project accent survives nesting', () => {
  const bare = colors.replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks = [...bare.matchAll(/(^|\n)\s*([^{}@\n][^{}]*)\{([^{}]*)\}/g)].map((m) => ({ sel: m[2].trim(), body: m[3] }));
  for (const b of blocks) {
    assert.ok(!/(^|\n)\s*--jd-accent(-fg|-ink)?:/.test(b.body) || b.sel === '.palette-pastel',
      `${b.sel} declares a hook default; hooks are project-owned`);
  }
  const ink = { light: /--accent-ink:\s+var\(--jd-accent-ink, #ffffff\)/, dark: /--accent-ink:\s+var\(--jd-accent-ink, #000000\)/ };
  const scopes = [
    ['[data-theme="dark"],\n.palette-dark', 'dark'],
    ['[data-theme="light"]', 'light'],
    [':root', 'light'],
  ];
  for (const [sel, scheme] of scopes) {
    const b = blocks.find((x) => x.sel === sel && /--accent:/.test(x.body));
    assert.ok(b, `${sel} must redeclare --accent`);
    assert.match(b.body, /--accent:\s+var\(--jd-accent, var\(--jd-ink-100\)\);/, `${sel}: --accent must read the hook, falling back to its own ink-100`);
    assert.match(b.body, /--accent-fg:\s+var\(--jd-accent-fg, var\(--accent\)\);/, `${sel}: --accent-fg`);
    assert.match(b.body, ink[scheme], `${sel}: --accent-ink needs the ${scheme} default`);
  }
  const mediaDark = blocks.find((x) => x.sel === ':root:not([data-theme="light"])' && /--accent-ink/.test(x.body));
  assert.ok(mediaDark && ink.dark.test(mediaDark.body), 'the prefers-color-scheme dark root needs the dark ink default');
  assert.ok(!/\[data-theme="dark"\]\[data-contrast="high"\][^{]*\{[^}]*--jd-accent/.test(colors), 'high-contrast blocks must not touch the accent hooks');
  for (const f of ['Badge', 'Card', 'LogoLockup', 'Navbar']) {
    const card = fs.readFileSync(path.join(__dirname, '..', 'src', f, `${f}.card.html`), 'utf8');
    assert.ok(!/--jd-accent-ink/.test(card), `${f}.card.html must not hard-code the hook`);
  }
});

// A downstream bundler can build a bundle.css from this file after three strips: the first :root
// block loses the properties tokens.json declares, the prefers-color-scheme dark block goes, and
// `[data-theme="dark"],` leaves the .palette-dark selector. A page that sets <html data-theme="dark">
// must still get the dark accent ink from what remains.
test('a dark html page keeps its dark accent ink after the design-system bundle strips', () => {
  let css = colors.replace(/\/\*[\s\S]*?\*\//g, '');
  const media = css.indexOf('@media (prefers-color-scheme: dark)');
  assert.ok(media >= 0, 'prefers-color-scheme dark block not found');
  let depth = 0, end = media;
  for (let i = css.indexOf('{', media); i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) { end = i + 1; break; }
  }
  css = css.slice(0, media) + css.slice(end);
  css = css.replace('[data-theme="dark"],\n.palette-dark', '.palette-dark');
  css = css.replace(/(:root\s*\{)([^}]*)\}/, (m, open, body) =>
    `${open}${body.split('\n').filter((l) => !/^\s*--jd-(substrate|surface-|ink-|signal-error)/.test(l)).join('\n')}}`);
  const dark = [...css.matchAll(/(^|\n)\s*([^{}@\n][^{}]*)\{([^{}]*)\}/g)]
    .find((m) => m[2].split(',').map((x) => x.trim()).includes(':root[data-theme="dark"]') && /--accent-ink:/.test(m[3]));
  assert.ok(dark, ':root[data-theme="dark"] must set --accent-ink on its own after the strips');
  assert.match(dark[3], /--accent-ink:\s+var\(--jd-accent-ink, #000000\);/);
});

test('cards and matrices draw no perimeter border (ADR-0004)', () => {
  assert.ok(!/border:\s*var\(--rule\)/.test(rule(components, '.card__media')));
  assert.ok(!/(^|\n)\s*border:/.test(rule(components, '.matrix')));
  assert.ok(!/\[data-contrast="high"\] \.matrix \{/.test(components));
});

test('fields keep a visible focus indicator and a native select', () => {
  assert.match(components, /\.field__input::placeholder \{ color: var\(--ink-60\); \}/, 'placeholder uses secondary ink, not the ink-30 hairline token');
  assert.ok(!/outline:\s*none/.test(components));
  assert.match(components, /\.field__input:focus-visible \{ outline:/);
  assert.ok(!/select\.field__input \{[^}]*appearance:\s*none/.test(components));
});

test('uppercase eyebrows route through t-label, not hand-rolled text-transform (ADR-0009)', () => {
  for (const sel of ['.card__eyebrow', '.footer__head', '.lockup__tag']) {
    assert.ok(!/text-transform/.test(rule(components, sel)), `${sel} must not set text-transform`);
  }
});

test('high-contrast rules match the dark-mode specificity and cover the scoped themes', () => {
  assert.match(colors, /:root\[data-contrast="high"\],/);
  assert.match(colors, /\[data-contrast="high"\] \.palette-dark,/);
  assert.match(colors, /:root:not\(\[data-contrast="normal"\]\),\s*\[data-theme\]:not\(\[data-contrast="normal"\]\)/);
  assert.match(colors, /--jd-signal-error: var\(--jd-signal-error-hc\);/);
  for (const scope of ['[data-theme="dark"],\n.palette-dark {', '[data-theme="light"] {', '.palette-pastel {']) {
    const block = colors.slice(colors.indexOf(scope), colors.indexOf('\n}', colors.indexOf(scope)));
    for (const alias of ['--white:', '--fg1:', '--bg1:', '--accent:', '--black:']) {
      assert.ok(block.includes(alias), `${scope.split('\n')[0]} must redeclare ${alias}`);
    }
  }
});

test('Tailwind v4 theme keeps white and black at their defaults and has no self-referential radius', () => {
  for (const prop of ['@theme', '--color-substrate', '--color-surface-elevated', '--color-ink-100', '--color-accent-ink', '--font-display', '--spacing-touch', '--border-width-rule', '--radius-card', '--radius-control']) {
    assert.ok(theme.includes(prop), `tailwind-theme.css missing ${prop}`);
  }
  assert.ok(!/^\s*--color-(white|black):/m.test(theme), '--color-white/--color-black must not be remapped');
  for (const m of theme.matchAll(/^\s*(--radius-[a-z0-9]+):\s*var\((--radius-[a-z0-9]+)/gm)) {
    assert.notStrictEqual(m[1], m[2], `${m[1]} refers to itself`);
  }
});

test('card previews link files that exist and render on a page that contrasts with the card', () => {
  const srcDir = path.resolve(__dirname, '../src');
  const cards = fs.readdirSync(srcDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) => fs.readdirSync(path.join(srcDir, d.name)).filter((f) => f.endsWith('.card.html')).map((f) => path.join(srcDir, d.name, f)));
  assert.ok(cards.length >= 9, 'expected a preview per component');
  for (const card of cards) {
    const html = fs.readFileSync(card, 'utf8');
    for (const m of html.matchAll(/(?:href|src)="(\.\.\/[^"]+)"/g)) {
      assert.ok(fs.existsSync(path.resolve(path.dirname(card), m[1])), `${path.basename(card)} links missing file ${m[1]}`);
    }
  }
  const card = fs.readFileSync(path.join(srcDir, 'Card/Card.card.html'), 'utf8');
  assert.ok(!/background:\s*var\(--bg2\)/.test(card), 'the Card preview page must not match the card fill');
});

test('Tailwind JS preset exposes the substrate color', () => {
  const plugin = require('../src/tailwind.js');
  assert.ok(plugin.theme?.extend?.colors?.substrate);
  assert.ok(plugin.theme.extend.colors['accent-ink']);
});

if (failures > 0) {
  console.error(`\n✗ Visual & Tailwind verification failed with ${failures} failure(s).`);
  process.exit(1);
}
console.log('\n✓ All CSS and Tailwind export checks passed.');
