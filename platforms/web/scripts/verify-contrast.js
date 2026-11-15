#!/usr/bin/env node
/**
 * JudarnContrastVerifier – WCAG 2.1 / 2.2 AAA and AA contrast audit engine.
 * Mathematical relative luminance and contrast ratio verification for OKLCh Display P3 tokens.
 */

const fs = require('fs');
const path = require('path');

const designTokens = require(path.resolve(__dirname, '../../../scripts/lib/design-tokens.js'));
const tokens = designTokens.loadFlatOrThrow();

function parseOklchCoords(str) {
  const m = str.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/);
  if (!m) throw new Error(`Invalid oklch token: ${str}`);
  return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])];
}

// 1. Math formulas
function linearize(c) {
  const clamped = Math.max(0.0, Math.min(1.0, c));
  if (clamped <= 0.04045) {
    return clamped / 12.92;
  }
  return Math.pow((clamped + 0.055) / 1.055, 2.4);
}

function relativeLuminance(r, g, b) {
  const rLin = linearize(r);
  const gLin = linearize(g);
  const bLin = linearize(b);
  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

function contrastRatio(l1, l2) {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function resolveTokenCoords(tokenName, appearance) {
  const entry = tokens.color[tokenName];
  if (!entry) throw new Error(`Unknown color token: ${tokenName}`);
  if (entry[appearance]) return parseOklchCoords(entry[appearance].$value);
  const fallback = appearance.startsWith('dark') ? 'dark' : 'light';
  return parseOklchCoords(entry[fallback].$value);
}

function getLuminance(tokenName, appearance) {
  const coords = resolveTokenCoords(tokenName, appearance);
  // The shared maths (ADR-0005): gamut-mapped linear sRGB, so luminance needs no gamma round trip.
  const { r, g, b } = designTokens.oklchToLinearSrgb(coords[0], coords[1], coords[2]);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function auditCoreMatrix() {
  const appearances = ['light', 'dark', 'lightHighContrast', 'darkHighContrast'];
  const surfaces = ['substrate', 'surfaceElevated', 'surfaceRecessed'];
  const foregrounds = ['ink100', 'ink60', 'ink30', 'signalError'];

  const results = [];

  for (const appearance of appearances) {
    for (const bg of surfaces) {
      const bgLum = getLuminance(bg, appearance);
      for (const fg of foregrounds) {
        const fgLum = getLuminance(fg, appearance);
        const ratio = contrastRatio(fgLum, bgLum);
        results.push({
          appearance,
          backgroundName: bg,
          foregroundName: fg,
          contrastRatio: Math.round(ratio * 100) / 100,
          normalTextAAA: ratio >= 7.0,
          normalTextAA: ratio >= 4.5,
          largeTextAAA: ratio >= 4.5,
          largeTextAA: ratio >= 3.0,
          graphicalAA: ratio >= 3.0
        });
      }
    }
  }

  return results;
}

function verifyContrast() {
  console.log('=== Judarn WCAG Contrast Check ===\n');

  // Verify formula boundaries
  if (Math.abs(linearize(0.0) - 0.0) > 0.0001 || Math.abs(linearize(1.0) - 1.0) > 0.0001) {
    console.error('✗ Linearization formula failure at endpoints');
    process.exit(1);
  }

  const blackLum = relativeLuminance(0, 0, 0);
  const whiteLum = relativeLuminance(1, 1, 1);
  const maxRatio = contrastRatio(whiteLum, blackLum);
  if (Math.abs(maxRatio - 21.0) > 0.01) {
    console.error(`✗ Black/White contrast ratio expected 21.0, got ${maxRatio}`);
    process.exit(1);
  }
  console.log('✓ WCAG Relative Luminance & Contrast Formulas Verified.');

  const audits = auditCoreMatrix();
  console.log(`✓ Computed ${audits.length} surface/foreground pairings across 4 appearances; asserting the ink100, ink60, and signalError rows. ink30 is a hairline color and has no text contrast requirement.`);

  let errors = 0;
  const asserted = audits.filter((a) => a.foregroundName !== 'ink30').length;

  // Assertions:
  // 1. ink100 on all surfaces across all appearances must achieve >= 7.0:1 (AAA)
  const ink100Pairings = audits.filter(a => a.foregroundName === 'ink100');
  for (const a of ink100Pairings) {
    if (!a.normalTextAAA) {
      console.error(`✗ ink100 on ${a.backgroundName} in ${a.appearance} failed AAA: got ${a.contrastRatio}:1 (required >= 7.0:1)`);
      errors++;
    }
  }

  // 2. ink60 and signalError on all 3 surfaces: AA (>=4.5:1) in standard modes, AAA (>=7.0:1) in high-contrast modes
  for (const fg of ['ink60', 'signalError']) {
    for (const a of audits.filter(x => x.foregroundName === fg)) {
      const isHC = a.appearance.endsWith('HighContrast');
      const ok = isHC ? a.normalTextAAA : a.normalTextAA;
      const req = isHC ? '7.0:1 (AAA)' : '4.5:1 (AA)';
      if (!ok) {
        console.error(`✗ ${fg} on ${a.backgroundName} in ${a.appearance} failed: got ${a.contrastRatio}:1 (required >= ${req})`);
        errors++;
      }
    }
  }

  if (errors > 0) {
    console.error(`\n✗ Contrast audit failed with ${errors} violation(s).`);
    process.exit(1);
  }

  console.log(`✓ ${asserted} pairings meet their WCAG thresholds.`);
  console.log('  - ink100: Guaranteed WCAG AAA (>= 7.0:1) across all surfaces and appearances.');
  console.log('  - ink60: WCAG AA (>= 4.5:1) in standard, reaching AAA (>= 7.0:1) in high contrast.');
  console.log('  - signalError: WCAG AA (>= 4.5:1) in standard, reaching AAA (>= 7.0:1) in high contrast.\n');
}

if (require.main === module) {
  verifyContrast();
}

module.exports = {
  linearize,
  relativeLuminance,
  contrastRatio,
  auditCoreMatrix,
  verifyContrast
};
