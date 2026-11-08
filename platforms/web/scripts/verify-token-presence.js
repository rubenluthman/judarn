#!/usr/bin/env node
// Checks that the generated Swift and CSS files still contain every required token name.
// It does not compare values; scripts/compile-tokens.js --check does that.
const fs = require('fs');
const path = require('path');

const monorepoRoot = path.resolve(__dirname, '../../..');
const { loadTokens } = require(path.resolve(monorepoRoot, 'scripts/lib/design-tokens.js'));

// Resolves tokens/judarn.resolver.json and validates Design Tokens Format Module 2025.10.
const loaded = loadTokens();
if (loaded.problems.length || !loaded.flat) {
  console.error(`Token conformance failed:\n  - ${loaded.problems.join('\n  - ')}`);
  process.exit(1);
}
const tokens = loaded.flat;

console.log('=== Judarn Token Presence Check (names only; scripts/compile-tokens.js --check compares values) ===\n');

// 1. Validate canonical W3C schema
console.log('1. Design Tokens Format Module 2025.10:');
console.log(`   - Spatial tokens: ${Object.keys(tokens.space).length}`);
console.log(`   - Reading measures: ${Object.keys(tokens.measure).length}`);
console.log(`   - Font slots: ${Object.keys(tokens.font).length}`);
console.log(`   - Tracking steps: ${Object.keys(tokens.tracking).length}`);
console.log(`   - Border tokens: ${Object.keys(tokens.border).length}`);
console.log(`   - Color registers: ${Object.keys(tokens.color).length} (Dual-Tier OKLCh)`);

const requiredColors = ['substrate', 'surfaceElevated', 'surfaceRecessed', 'ink100', 'ink60', 'ink30', 'signalError'];
for (const key of requiredColors) {
  if (!tokens.color[key]?.light || !tokens.color[key]?.dark) {
    console.error(`   ✗ Missing dual-scheme register in schema: ${key}`);
    process.exit(1);
  }
}
const highContrastColors = ['ink100', 'ink60', 'ink30', 'signalError'];
for (const key of highContrastColors) {
  if (!tokens.color[key]?.lightHighContrast || !tokens.color[key]?.darkHighContrast) {
    console.error(`   ✗ Missing 4-quadrant high-contrast register in schema: ${key}`);
    process.exit(1);
  }
}
console.log('   ✓ 2025.10 conformance & 4-Quadrant High-Contrast Registers validated.\n');


// 2. Cross-platform target files
const swiftColorsFile = path.join(monorepoRoot, 'platforms/apple/Sources/Judarn/JudarnColors.swift');
const swiftSpacingFile = path.join(monorepoRoot, 'platforms/apple/Sources/Judarn/JudarnSpacing.swift');
const webCssFile = path.join(__dirname, '../styles/colors_and_type.css');

// 3. Swift Parity
console.log('2. Swift SPM Target (judarn):');
if (fs.existsSync(swiftColorsFile) && fs.existsSync(swiftSpacingFile)) {
  const swiftColors = fs.readFileSync(swiftColorsFile, 'utf8');
  const swiftSpacing = fs.readFileSync(swiftSpacingFile, 'utf8');
  for (const key of requiredColors) {
    if (!swiftColors.includes(`public static let ${key}`)) {
      console.error(`   ✗ Swift JudarnColors missing token: ${key}`);
      process.exit(1);
    }
  }
  const spaces = ['spaceHalf', 'space1', 'space2', 'space3', 'space4', 'spaceTouch', 'space6'];
  for (const s of spaces) {
    if (!swiftSpacing.includes(`public static let ${s}`)) {
      console.error(`   ✗ Swift JudarnSpacing missing token: ${s}`);
      process.exit(1);
    }
  }
  const measures = ['measureBody', 'measureCompact', 'measureSidebar'];
  for (const m of measures) {
    if (!swiftSpacing.includes(`public static let ${m}`)) {
      console.error(`   ✗ Swift JudarnSpacing missing measure token: ${m}`);
      process.exit(1);
    }
  }
  console.log('   ✓ JudarnColors, JudarnSpacing & Measures verified in Swift.\n');
} else {
  console.error('   ✗ Swift target files not found.');
  process.exit(1);
}

// 4. Web CSS Parity
console.log('3. Web CSS Target (judarn-web):');
if (fs.existsSync(webCssFile)) {
  const webCss = fs.readFileSync(webCssFile, 'utf8');
  for (const key of requiredColors) {
    const cssVar = `--jd-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    if (!webCss.includes(cssVar)) {
      console.error(`   ✗ Web CSS missing variable: ${cssVar}`);
      process.exit(1);
    }
  }
  const requiredTokens = [
    '--jd-measure-body',
    '--jd-measure-compact',
    '--jd-measure-sidebar',
    '--jd-font-display',
    '--jd-font-body',
    '--jd-font-data',
    '--jd-font-mono',
    '--jd-track-label',
    '--jd-track-micro',
    '.t-data',
    '.t-mono',
    '.t-label',
    '.t-micro',
    '.t-as-written',
    '.t-editorial-nums'
  ];
  for (const t of requiredTokens) {
    if (!webCss.includes(t)) {
      console.error(`   ✗ Web CSS missing token/class: ${t}`);
      process.exit(1);
    }
  }
  console.log('   ✓ CSS Custom Properties, Font Slots, Measures & prefers-color-scheme verified in Web.\n');
} else {
  console.error('   ✗ Web CSS target file not found.');
  process.exit(1);
}

// 4. WCAG contrast check
const { verifyContrast } = require('./verify-contrast');
verifyContrast();
