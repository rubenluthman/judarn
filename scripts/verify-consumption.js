#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

console.log('=== Judarn Cross-Platform External Consumption Validation ===\n');

// 1. Web Platform (@judarn/ui) Consumption Contracts
console.log('1. Validating Web Platform (@judarn/ui) Package Surface...');
const webPkgPath = path.join(rootDir, 'platforms/web/package.json');
if (!fs.existsSync(webPkgPath)) {
  console.error('✗ Missing platforms/web/package.json');
  process.exit(1);
}

const webPkg = JSON.parse(fs.readFileSync(webPkgPath, 'utf8'));

// Verify export targets exist on disk
if (!webPkg.exports) {
  console.error('✗ @judarn/ui missing package exports map');
  process.exit(1);
}

for (const [subpath, target] of Object.entries(webPkg.exports)) {
  const filePaths = [];
  if (typeof target === 'string') {
    filePaths.push(target);
  } else if (typeof target === 'object') {
    for (const condition of ['types', 'import', 'require', 'default']) {
      if (target[condition]) filePaths.push(target[condition]);
    }
  }

  for (const relativeFile of filePaths) {
    const resolved = path.join(rootDir, 'platforms/web', relativeFile);
    if (!fs.existsSync(resolved)) {
      console.error(`✗ Export target for "${subpath}" missing: ${relativeFile} (run npm --prefix platforms/web run build)`);
      process.exit(1);
    }
    if (/\.jsx$/.test(relativeFile)) {
      console.error(`✗ Export target for "${subpath}" is uncompiled JSX: ${relativeFile} (ADR-0011)`);
      process.exit(1);
    }
  }
  console.log(`  ✓ Export "${subpath}" resolves cleanly.`);
}

// The published entry points are compiled JavaScript in dist/ (ADR-0011).
for (const field of ['main', 'module', 'types']) {
  if (!webPkg[field] || !webPkg[field].startsWith('dist/')) {
    console.error(`✗ @judarn/ui "${field}" must point into dist/ (got ${webPkg[field]})`);
    process.exit(1);
  }
}
if (webPkg.peerDependencies && webPkg.peerDependencies['react-dom']) {
  console.error('✗ @judarn/ui declares a react-dom peer, but no source imports it.');
  process.exit(1);
}

// The packed tarball carries compiled output and the license, and no raw JSX or previews.
const packJson = require('child_process').execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
  cwd: path.join(rootDir, 'platforms/web'),
  encoding: 'utf8',
});
const packedFiles = JSON.parse(packJson)[0].files.map((f) => f.path);
for (const required of ['LICENSE', 'README.md', 'dist/index.mjs', 'dist/index.cjs', 'dist/index.d.ts', 'dist/sdui/index.cjs', 'styles/styles.css']) {
  if (!packedFiles.includes(required)) {
    console.error(`✗ @judarn/ui tarball is missing ${required}`);
    process.exit(1);
  }
}
const stray = packedFiles.filter((f) => /\.jsx$|\.card\.html$|^scripts\/|^examples\/|_ds_bundle/.test(f));
if (stray.length > 0) {
  console.error(`✗ @judarn/ui tarball contains files that must not ship: ${stray.join(', ')}`);
  process.exit(1);
}
console.log('  ✓ Tarball ships compiled dist/, declarations, styles and LICENSE only.');

// Verify index TypeScript declarations export core components
const indexDts = fs.readFileSync(path.join(rootDir, 'platforms/web/dist/index.d.ts'), 'utf8');
const expectedWebExports = ['Card', 'Button', 'DataMatrix', 'DataTable', 'Badge', 'TextField'];
for (const symbol of expectedWebExports) {
  if (!indexDts.includes(symbol)) {
    console.error(`✗ index.d.ts missing export symbol: ${symbol}`);
    process.exit(1);
  }
}
console.log('  ✓ Web TypeScript declarations export all primary UI components.');

// 2. Apple Native (Swift Package) Consumption Contracts
console.log('\n2. Validating Apple Native (Judarn) Package Surface...');
const packageSwiftPath = path.join(rootDir, 'Package.swift');
if (!fs.existsSync(packageSwiftPath)) {
  console.error('✗ Missing root Package.swift');
  process.exit(1);
}

const packageSwift = fs.readFileSync(packageSwiftPath, 'utf8');
if (!packageSwift.includes('name: "Judarn"') || !packageSwift.includes('targets: ["Judarn"]')) {
  console.error('✗ Package.swift missing public Judarn library product');
  process.exit(1);
}
if (!packageSwift.includes('path: "platforms/apple/Sources/Judarn"')) {
  console.error('✗ Package.swift missing path to Judarn target sources');
  process.exit(1);
}

const appleSourcesDir = path.join(rootDir, 'platforms/apple/Sources/Judarn');
const expectedAppleSources = [
  'JudarnColors.swift',
  'JudarnSpacing.swift',
  'JudarnTypography.swift',
  'JudarnButton.swift',
  'JudarnCard.swift',
  'JudarnDataMatrix.swift',
  'JudarnTextField.swift',
  'JudarnBadge.swift',
  'JudarnContrastVerifier.swift'
];

for (const sourceFile of expectedAppleSources) {
  if (!fs.existsSync(path.join(appleSourcesDir, sourceFile))) {
    console.error(`✗ Missing Apple source file: ${sourceFile}`);
    process.exit(1);
  }
}

// Verify key exported symbols
const spacingSrc = fs.readFileSync(path.join(appleSourcesDir, 'JudarnSpacing.swift'), 'utf8');
if (!spacingSrc.includes('enum JudarnSpacing') || !spacingSrc.includes('enum JudarnRadius')) {
  console.error('✗ JudarnSpacing.swift missing JudarnSpacing or JudarnRadius declarations');
  process.exit(1);
}
console.log('  ✓ Swift package targets and public symbol source manifests verified.');

// 3. Negative Invariant & Anti-Pattern Audits
console.log('\n3. Validating Negative Architectural Invariants & Anti-Patterns...');

// Pattern 1: 0px Tailwind radius overrides
const tailwindCssPath = path.join(rootDir, 'platforms/web/styles/tailwind-theme.css');
if (fs.existsSync(tailwindCssPath)) {
  const tailwindCss = fs.readFileSync(tailwindCssPath, 'utf8');
  if (/--radius-card:\s*0px|--radius-control:\s*0px/.test(tailwindCss)) {
    console.error('✗ Invariant violation: 0px radius override found in tailwind-theme.css (violates the shape rules in docs/DESIGN.md).');
    process.exit(1);
  }
}
const tailwindJsPath = path.join(rootDir, 'platforms/web/src/tailwind.js');
if (fs.existsSync(tailwindJsPath)) {
  const tailwindJs = fs.readFileSync(tailwindJsPath, 'utf8');
  if (/'--radius-card':\s*'0px'|'--radius-control':\s*'0px'/.test(tailwindJs)) {
    console.error('✗ Invariant violation: 0px radius override found in tailwind.js (violates the shape rules in docs/DESIGN.md).');
    process.exit(1);
  }
}
console.log('  ✓ Tailwind presets preserve platform corner radii (zero 0px radius overrides).');

// Pattern 2: Perimeter card borders
const appleCardPath = path.join(appleSourcesDir, 'JudarnCard.swift');
const appleCard = fs.readFileSync(appleCardPath, 'utf8');
if (/\.overlay\(RoundedRectangle|\.border\(/.test(appleCard)) {
  console.error('✗ Invariant violation: Perimeter stroke border found on JudarnCard in Swift (violates the card border rule in docs/DESIGN.md).');
  process.exit(1);
}
const webCardCssPath = path.join(rootDir, 'platforms/web/styles/components.css');
const webCardCss = fs.readFileSync(webCardCssPath, 'utf8');
const cardBlockMatch = webCardCss.match(/\.card\s*\{[^}]+\}/);
if (cardBlockMatch) {
  const borderMatch = cardBlockMatch[0].match(/border(?:-color|-width|-style)?\s*:\s*([^;]+);/);
  if (borderMatch) {
    const val = borderMatch[1].trim();
    if (val !== 'none' && val !== '0' && val !== 'transparent') {
      console.error('✗ Invariant violation: Perimeter stroke border found in .card CSS (violates the card border rule in docs/DESIGN.md).');
      process.exit(1);
    }
  }
}
console.log('  ✓ Card components group via background fill contrast (zero perimeter card borders).');

console.log('\n✓ Cross-platform external consumption validation passed successfully.');

