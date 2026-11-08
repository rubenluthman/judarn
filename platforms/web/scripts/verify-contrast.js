#!/usr/bin/env node
/**
 * JudarnContrastVerifier – WCAG 2.1 / 2.2 AAA and AA contrast audit engine.
 * Mathematical relative luminance and contrast ratio verification for OKLCh Display P3 tokens.
 */

const fs = require('fs');
const path = require('path');

const tokens = require(path.resolve(__dirname, '../../../scripts/lib/design-tokens.js')).loadFlatOrThrow();

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

/**
 * Converts OKLCh coordinates (L, C, H) to Display P3 wide gamut with CSS Color 4 perceptual chroma bisection.
 */
function oklchToDisplayP3(l, c, h) {
  if (l <= 0) return [0, 0, 0];
  if (l >= 1) return [1, 1, 1];

  const hRad = (h * Math.PI) / 180.0;
  const cosH = Math.cos(hRad);
  const sinH = Math.sin(hRad);

  const toLinearSrgb = (chroma) => {
    const a = chroma * cosH;
    const b = chroma * sinH;
    const l_lms = l + 0.3963377774 * a + 0.2158037573 * b;
    const m_lms = l - 0.1055613458 * a - 0.0638541728 * b;
    const s_lms = l - 0.0894841775 * a - 1.2914855480 * b;
    const l_ = l_lms * l_lms * l_lms;
    const m_ = m_lms * m_lms * m_lms;
    const s_ = s_lms * s_lms * s_lms;
    return [
      +4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
      -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
      -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_
    ];
  };

  const inSrgbGamut = (rgb) => {
    const eps = 1e-6;
    return (
      rgb[0] >= -eps && rgb[0] <= 1 + eps &&
      rgb[1] >= -eps && rgb[1] <= 1 + eps &&
      rgb[2] >= -eps && rgb[2] <= 1 + eps
    );
  };

  let mappedC = Math.max(0, c);
  if (!inSrgbGamut(toLinearSrgb(mappedC))) {
    let low = 0;
    let high = mappedC;
    for (let i = 0; i < 24; i++) {
      const mid = 0.5 * (low + high);
      if (inSrgbGamut(toLinearSrgb(mid))) {
        low = mid;
      } else {
        high = mid;
      }
    }
    mappedC = low;
  }

  const a = mappedC * cosH;
  const b = mappedC * sinH;

  const l_lms = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_lms = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_lms = l - 0.0894841775 * a - 1.2914855480 * b;

  const l_ = l_lms * l_lms * l_lms;
  const m_ = m_lms * m_lms * m_lms;
  const s_ = s_lms * s_lms * s_lms;

  const rLinear = +3.1281105291 * l_ - 2.2570750184 * m_ + 0.1293047884 * s_;
  const gLinear = -1.0911281610 * l_ + 2.4132667618 * m_ - 0.3221681709 * s_;
  const bLinear = -0.0260136497 * l_ - 0.5080276490 * m_ + 1.5333166822 * s_;

  const gamma = (val) => (val <= 0.0031308 ? 12.92 * val : 1.055 * Math.pow(Math.max(0, val), 1.0 / 2.4) - 0.055);

  const r = Math.max(0.0, Math.min(1.0, gamma(rLinear)));
  const g = Math.max(0.0, Math.min(1.0, gamma(gLinear)));
  const bl = Math.max(0.0, Math.min(1.0, gamma(bLinear)));

  return [r, g, bl];
}

/**
 * Resolves Display P3 components to standard sRGB space (matching AppKit / UIKit color space conversion).
 */
function p3ToSrgb(rP3, gP3, bP3) {
  const rLin = linearize(rP3);
  const gLin = linearize(gP3);
  const bLin = linearize(bP3);

  const rSRGB = 1.22494 * rLin - 0.22494 * gLin + 0.0 * bLin;
  const gSRGB = -0.04206 * rLin + 1.04206 * gLin - 0.0 * bLin;
  const bSRGB = -0.01964 * rLin - 0.07865 * gLin + 1.09829 * bLin;

  const gamma = (val) => (val <= 0.0031308 ? 12.92 * val : 1.055 * Math.pow(Math.max(0, val), 1.0 / 2.4) - 0.055);

  return [
    Math.max(0.0, Math.min(1.0, gamma(rSRGB))),
    Math.max(0.0, Math.min(1.0, gamma(gSRGB))),
    Math.max(0.0, Math.min(1.0, gamma(bSRGB)))
  ];
}

function oklchToResolvedSrgb(l, c, h) {
  const [rP3, gP3, bP3] = oklchToDisplayP3(l, c, h);
  return p3ToSrgb(rP3, gP3, bP3);
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
  const [r, g, b] = oklchToResolvedSrgb(coords[0], coords[1], coords[2]);
  return relativeLuminance(r, g, b);
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
  oklchToDisplayP3,
  p3ToSrgb,
  oklchToResolvedSrgb,
  auditCoreMatrix,
  verifyContrast
};
