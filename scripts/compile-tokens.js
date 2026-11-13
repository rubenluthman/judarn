#!/usr/bin/env node
/**
 * Canonical Design Token Compiler for Judarn
 * Translates the Design Tokens Format Module 2025.10 sources (tokens/judarn-tokens.json, resolved
 * through tokens/judarn.resolver.json) into:
 *  - Apple Native Swift (JudarnColors.swift, JudarnSpacing.swift)
 *  - Web CSS custom properties (colors_and_type.css)
 *
 * Usage:
 *   node scripts/compile-tokens.js          # Compiles and overwrites target files
 *   node scripts/compile-tokens.js --check  # Verifies files match tokens with 0 drift
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const {
  MODES, oklchToLinearSrgb, oklchToLinearSrgbRaw, isInGamut, loadTokens, trackReads
} = require('./lib/design-tokens');

// Conformance gate: Format, Color and Resolver modules 2025.10. Runs for compile and --check alike.
const loaded = loadTokens();
if (loaded.problems.length || !loaded.flat) {
  console.error(`✗ Token conformance failed:\n  - ${loaded.problems.join('\n  - ')}`);
  process.exit(1);
}
const tracked = trackReads(loaded.flat);
const tokens = tracked.tokens;

// Gamut-mapped sRGB hex of a colour token, uppercase, for generated comments. `--check` fails when a
// stored `hex` drifts from the computed value, so these comments cannot go stale.
const hx = (name, mode) => tokens.color[name][mode].hex.toUpperCase();

const isCheck = process.argv.includes('--check');

// Luminance where black and white ink reach equal WCAG ratios (ADR-0005). Emitted into the
// Swift target so the compile-time checks verify the value that ships.
const WCAG_LUMINANCE_CROSSOVER = Math.sqrt(1.05 * 0.05) - 0.05;

// Luminance above which filled surfaces take black ink instead of white.
const PERCEPTUAL_LUMINANCE_CROSSOVER = 0.50;

// SwiftUI Font.TextStyle cases that appleTextStyle and appleTextStyleMacOS may name.
const APPLE_TEXT_STYLES = new Set([
  'largeTitle', 'title', 'title2', 'title3', 'headline', 'subheadline',
  'body', 'callout', 'footnote', 'caption', 'caption2'
]);

// Harmonies are optional add-on data (ADR-0007); `$`-prefixed keys are W3C group metadata.
const harmonyEntries = () => Object.entries(tokens.theme || {}).filter(([key]) => !key.startsWith('$'));

function parseOklch(str) {
  const m = str.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/);
  if (!m) throw new Error(`Invalid oklch format: ${str}`);
  return {
    l: parseFloat(m[1]),
    c: parseFloat(m[2]),
    h: parseFloat(m[3]),
    raw: str
  };
}

function parsePx(str) {
  const m = str.match(/^([\d.]+)px$/);
  if (!m) throw new Error(`Expected px dimension: ${str}`);
  return parseFloat(m[1]);
}

function parseDp(str) {
  const m = str.match(/^([\d.]+)(?:dp|px)$/);
  if (!m) throw new Error(`Expected dp/px dimension: ${str}`);
  return parseFloat(m[1]);
}

function parseEm(str) {
  const m = str.match(/^(-?[\d.]+)em$/);
  if (!m) throw new Error(`Expected em dimension: ${str}`);
  return parseFloat(m[1]);
}

// ---------------------------------------------------------------------------
// 0. Perceptual OKLCh Color Math & Compile-Time Checks
//    (OKLCh to sRGB conversion and gamut mapping live in scripts/lib/design-tokens.js)
// ---------------------------------------------------------------------------

function relativeLuminance(rgb) {
  return 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
}

function contrastRatio(fgOklch, bgOklch) {
  const y1 = relativeLuminance(oklchToLinearSrgb(fgOklch.l, fgOklch.c, fgOklch.h));
  const y2 = relativeLuminance(oklchToLinearSrgb(bgOklch.l, bgOklch.c, bgOklch.h));
  const lighter = Math.max(y1, y2);
  const darker = Math.min(y1, y2);
  return (lighter + 0.05) / (darker + 0.05);
}

function resolveColorMode(colorToken, mode) {
  if (colorToken[mode]) return parseOklch(colorToken[mode].$value);
  const baseMode = mode.startsWith('dark') ? 'dark' : 'light';
  return parseOklch(colorToken[baseMode].$value);
}

function runCompilerProofGate() {
  const c = tokens.color;
  const modes = MODES;
  const surfaces = ['substrate', 'surfaceElevated', 'surfaceRecessed'];
  const foregrounds = ['ink100', 'ink60', 'ink30', 'signalError'];

  // 1. Strict Surface Lightness Ordering (ADR-0005):
  //    Light modes: L(surfaceRecessed_m) < L(surfaceElevated_m) < L(substrate_m)
  //    Dark modes:  L(surfaceRecessed_m) < L(substrate_m) < L(surfaceElevated_m)
  for (const mode of modes) {
    const isDark = mode.startsWith('dark');
    const lRec = resolveColorMode(c.surfaceRecessed, mode).l;
    const lSub = resolveColorMode(c.substrate, mode).l;
    const lElv = resolveColorMode(c.surfaceElevated, mode).l;
    const valid = isDark
      ? (lRec < lSub && lSub < lElv)
      : (lRec < lElv && lElv < lSub);
    if (!valid) {
      const expectedOrder = isDark
        ? `L(surfaceRecessed)=${lRec} < L(substrate)=${lSub} < L(surfaceElevated)=${lElv}`
        : `L(surfaceRecessed)=${lRec} < L(surfaceElevated)=${lElv} < L(substrate)=${lSub}`;
      console.error(
        `✗ Surface elevation invariant failed in mode "${mode}": expected ${expectedOrder}`
      );
      process.exit(1);
    }
  }

  for (const [themeKey, theme] of harmonyEntries()) {
    for (const baseMode of ['light', 'dark']) {
      const lRec = theme.surfaceRecessed?.[baseMode]
        ? parseOklch(theme.surfaceRecessed[baseMode].$value).l
        : parseOklch(c.surfaceRecessed[baseMode].$value).l;
      const lSub = parseOklch(theme.substrate[baseMode].$value).l;
      const lElv = parseOklch(theme.surfaceElevated[baseMode].$value).l;
      const valid = baseMode === 'dark'
        ? (lRec < lSub && lSub < lElv)
        : (lRec < lSub && lRec < lElv && lSub !== lElv);
      if (!valid) {
        console.error(
          `✗ Theme surface elevation invariant failed in "${themeKey}.${baseMode}": ` +
          `expected L(surfaceRecessed)=${lRec} below distinct L(substrate)=${lSub} and L(surfaceElevated)=${lElv}`
        );
        process.exit(1);
      }
    }
  }

  // 1b. Accessible foregrounds must sit inside sRGB, so per-channel clipping in browsers
  //     computes the same contrast as the gate (web ships raw oklch()).
  for (const mode of modes) {
    for (const fgName of foregrounds) {
      const fg = resolveColorMode(c[fgName], mode);
      if (!isInGamut(oklchToLinearSrgbRaw(fg.l, fg.c, fg.h), 1e-4)) {
        console.error(`✗ ${fgName}.${mode} lies outside sRGB: lower its chroma so clipped and mapped contrast agree`);
        process.exit(1);
      }
    }
  }

  // 2. Contrast matrix (4 modes × 3 surfaces × 4 foregrounds)
  let checkedPairings = 0;
  for (const mode of modes) {
    const isHC = mode.endsWith('HighContrast');
    for (const surf of surfaces) {
      const bg = resolveColorMode(c[surf], mode);
      for (const fgName of foregrounds) {
        const fg = resolveColorMode(c[fgName], mode);
        const ratio = contrastRatio(fg, bg);
        checkedPairings++;

        let minRequired = 0;
        if (fgName === 'ink100') {
          minRequired = 7.0;
        } else if (fgName === 'ink60' || fgName === 'signalError') {
          minRequired = isHC ? 7.0 : 4.5;
        } else if (fgName === 'ink30') {
          minRequired = isHC ? 7.0 : 1.25;
        }

        if (ratio < minRequired) {
          console.error(
            `✗ WCAG contrast check failed for ${fgName}.${mode} on ${surf}.${mode}: ` +
            `${ratio.toFixed(2)}:1 < ${minRequired.toFixed(2)}:1`
          );
          process.exit(1);
        }
      }
    }
  }

  // 3. Typographic and spatial lattice arithmetic
  const tScale = tokens.typography;
  if (!tScale) {
    console.error('✗ Missing canonical typography scale in tokens/judarn-tokens.json');
    process.exit(1);
  }

  const orderedHierarchy = ['display', 'h1', 'h2', 'h3', 'h4', 'bodyLg', 'body', 'small', 'label', 'micro'];
  for (let i = 0; i < orderedHierarchy.length - 1; i++) {
    const currKey = orderedHierarchy[i];
    const nextKey = orderedHierarchy[i + 1];
    const currPx = parsePx(tScale[currKey].fontSize);
    const nextPx = parsePx(tScale[nextKey].fontSize);
    if (!(currPx > nextPx)) {
      console.error(
        `✗ Typographic monotonicity failed: ${currKey} (${currPx}px) must be > ${nextKey} (${nextPx}px)`
      );
      process.exit(1);
    }
  }
  if (!(parsePx(tScale.data.fontSize) > parsePx(tScale.mono.fontSize))) {
    console.error('✗ Typographic monotonicity failed: data must be > mono');
    process.exit(1);
  }

  for (const [styleKey, spec] of Object.entries(tScale)) {
    if (!APPLE_TEXT_STYLES.has(spec.appleTextStyle)) {
      console.error(`✗ Unknown Apple text style for typography.${styleKey}: appleTextStyle=${spec.appleTextStyle}`);
      process.exit(1);
    }
    if (spec.appleTextStyleMacOS !== undefined
      && (!APPLE_TEXT_STYLES.has(spec.appleTextStyleMacOS) || spec.appleTextStyleMacOS === spec.appleTextStyle)) {
      console.error(
        `✗ appleTextStyleMacOS for typography.${styleKey} must name another Apple text style: appleTextStyleMacOS=${spec.appleTextStyleMacOS}`
      );
      process.exit(1);
    }

    const expectedUpper = styleKey === 'label' || styleKey === 'micro';
    if (Boolean(spec.isUppercase) !== expectedUpper) {
      console.error(
        `✗ Uppercase biconditional failed for typography.${styleKey}: isUppercase=${spec.isUppercase}, expected ${expectedUpper}`
      );
      process.exit(1);
    }
    const trackEm = parseEm(spec.tracking);
    if (spec.isUppercase) {
      if (!(trackEm >= 0.06 && spec.caseFeature === 1)) {
        console.error(
          `✗ Uppercase tracking/case invariant failed for typography.${styleKey}: tracking=${spec.tracking}, caseFeature=${spec.caseFeature}`
        );
        process.exit(1);
      }
    } else if (trackEm > 0 || spec.caseFeature !== 0) {
      console.error(
        `✗ Sentence-case tracking/case invariant failed for typography.${styleKey}: tracking=${spec.tracking}, caseFeature=${spec.caseFeature}`
      );
      process.exit(1);
    }

    const lhPx = parsePx(spec.lineHeight);
    if (lhPx % 4 !== 0) {
      console.error(
        `✗ 4pt baseline grid divisibility failed for typography.${styleKey}: lineHeight=${lhPx}px`
      );
      process.exit(1);
    }
    if (spec.appleLeading !== 'tight' && spec.appleLeading !== 'standard') {
      console.error(`✗ appleLeading must be "tight" or "standard" for typography.${styleKey} (got ${spec.appleLeading})`);
      process.exit(1);
    }
  }

  const s = tokens.space;
  if (parsePx(s.half.$value) !== 4) {
    console.error(`✗ Micro subgrid space.half must equal 4px (got ${s.half.$value})`);
    process.exit(1);
  }
  for (const macroKey of ['1', '2', '3', '4', '6', '8', '12', '16']) {
    const px = parsePx(s[macroKey].$value);
    if (px % 8 !== 0) {
      console.error(`✗ 8pt macro grid divisibility failed for space.${macroKey}: ${px}px`);
      process.exit(1);
    }
  }
  const touchApple = parsePx(s.touch.apple || s.touch.$value);
  const touchAndroid = parseDp(s.touch.android);
  if (touchApple % 4 !== 0 || touchAndroid % 4 !== 0) {
    console.error(`✗ Touch target floor 4pt divisibility failed: apple=${touchApple}, android=${touchAndroid}`);
    process.exit(1);
  }

  // 4. Perceptual contrasting ink
  const badgeSource = fs.readFileSync(path.join(rootDir, 'platforms/web/src/Badge/Badge.jsx'), 'utf8');
  const webCrossover = badgeSource.match(/perceptualCrossover = ([\d.]+)/);
  if (!webCrossover || Number(webCrossover[1]) !== PERCEPTUAL_LUMINANCE_CROSSOVER) {
    console.error(`✗ Web getContrastingInk crossover must equal ${PERCEPTUAL_LUMINANCE_CROSSOVER}`);
    process.exit(1);
  }

  const benchmarkSwatches = [
    { name: 'Wada Red Orange', hex: '#dd4027', expected: 'white' },
    { name: 'Wada Cerulean', hex: '#0093a5', expected: 'white' },
    { name: 'Coral Red', hex: '#ff5353', expected: 'white' },
    { name: 'Crimson', hex: '#dc143c', expected: 'white' },
    { name: 'Steel Blue', hex: '#4682b4', expected: 'white' },
    { name: 'Neutral Gray 128', hex: '#808080', expected: 'white' },
    { name: 'Achromatic 118', hex: '#767676', expected: 'white' },
    { name: 'Muted Sage', hex: '#84a98c', expected: 'white' },
    { name: 'Coral', hex: '#ff7f50', expected: 'white' },
    { name: 'Vivid Cyan', hex: '#00bcd4', expected: 'white' },
    { name: 'Crossover Gray 186', hex: '#bababa', expected: 'white' },
    { name: 'Crossover Gray 189', hex: '#bdbdbd', expected: 'black' },
    { name: 'Lemon Yellow', hex: '#fff176', expected: 'black' },
    { name: 'Wada Gold', hex: '#fbc02d', expected: 'black' },
    { name: 'Light Substrate', hex: '#f8f8f7', expected: 'black' },
    { name: 'Pure Black', hex: '#000000', expected: 'white' },
    { name: 'Pure White', hex: '#ffffff', expected: 'black' }
  ];

  for (const swatch of benchmarkSwatches) {
    const hex = swatch.hex.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const linearize = (val) => (val <= 0.04045 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4));
    const lum = 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
    const actual = lum > PERCEPTUAL_LUMINANCE_CROSSOVER ? 'black' : 'white';
    if (actual !== swatch.expected) {
      console.error(
        `✗ Perceptual contrasting ink check failed for ${swatch.name} (${swatch.hex}): ` +
        `luminance Y=${lum.toFixed(4)}, expected ink=${swatch.expected}, got ink=${actual}`
      );
      process.exit(1);
    }
  }

  console.log(`✓ Compile-time checks: ${checkedPairings} contrast pairings (4 modes × 3 surfaces × 4 foregrounds), ink polarity on ${benchmarkSwatches.length} swatches, surface elevation polarity, and typographic and spatial lattice invariants.`);
}

runCompilerProofGate();

// ---------------------------------------------------------------------------
// 1. Generate Apple Native (Swift)
// ---------------------------------------------------------------------------

function generateSwiftSpacing() {
  const s = tokens.space;
  const m = tokens.measure;
  const b = tokens.border;
  const r = tokens.radius;

  return `import CoreGraphics

/// Strict 8pt base grid and spatial rules for the Judarn design system.
/// Generated from tokens/judarn-tokens.json  –  do not edit directly.
public enum JudarnSpacing {
    /// 4pt micro spacing / hairline offset / typographic leading sub-step
    public static let spaceHalf: CGFloat = ${parsePx(s.half.$value)}
    /// 8pt tight spacing / gap (macro base unit)
    public static let space1: CGFloat = ${parsePx(s['1'].$value)}
    /// 16pt standard padding / gap
    public static let space2: CGFloat = ${parsePx(s['2'].$value)}
    /// 24pt medium frame padding
    public static let space3: CGFloat = ${parsePx(s['3'].$value)}
    /// 32pt large frame padding
    public static let space4: CGFloat = ${parsePx(s['4'].$value)}
    /// 44pt touch target floor from Apple's HIG (11 * 4pt)
    public static let spaceTouch: CGFloat = ${parsePx(s.touch.apple || s.touch.$value)}
    /// 48pt extra large spacing
    public static let space6: CGFloat = ${parsePx(s['6'].$value)}
    /// 64pt layout section spacing
    public static let space8: CGFloat = ${parsePx(s['8'].$value)}
    /// 96pt display header spacing
    public static let space12: CGFloat = ${parsePx(s['12'].$value)}
    /// 128pt extreme layout spacing
    public static let space16: CGFloat = ${parsePx(s['16'].$value)}
    
    // Semantic aliases
    public static let padDefault: CGFloat = ${parsePx(s['2'].$value)}
    public static let padLarge: CGFloat = ${parsePx(s['4'].$value)}
    public static let gapTight: CGFloat = ${parsePx(s['1'].$value)}
    public static let gapNormal: CGFloat = ${parsePx(s['2'].$value)}
    
    // Border weights
    public static let rule: CGFloat = ${parsePx(b.rule.$value)}
    public static let ruleBold: CGFloat = ${parsePx(b.ruleBold.$value)}
    public static let ruleHeavy: CGFloat = ${parsePx(b.ruleHeavy.$value)}
    
    // Typographic reading measures
    /// 640pt maximum column measure for continuous body reading (~65ch)
    public static let measureBody: CGFloat = ${parsePx(m.body.points)}
    /// 440pt compact column measure for cards and sidebars (~45ch)
    public static let measureCompact: CGFloat = ${parsePx(m.compact.points)}
    /// 260pt compact desktop pane and sidebar column measure
    public static let measureSidebar: CGFloat = ${parsePx(m.sidebar.points || m.sidebar.$value)}
}

/// Host platform corner radius tokens for Apple Native environments.
/// Generated from tokens/judarn-tokens.json  –  do not edit directly.
public enum JudarnRadius {
    /// 6pt subtle rounding for micro elements
    public static let subtle: CGFloat = ${parsePx(r.subtle.$value)}
    /// 10pt continuous corner radius for functional interactive controls, text fields, and buttons
    public static let control: CGFloat = ${parsePx(r.control.$value)}
    /// 16pt continuous corner radius for content cards, grouping tiles, and sheets
    public static let card: CGFloat = ${parsePx(r.card.$value)}
    /// 9999pt full pill shape for badges, tags, and status chips
    public static let badge: CGFloat = ${parsePx(r.badge.$value)}
}
`;
}

// Exact linear sRGB to linear Display P3 from the D65 primaries, composed with Ottosson's
// LMS-cubed to linear sRGB matrix. Both share the D65 white, so each row sums to 1.
function deriveOklabLmsToLinearDisplayP3() {
  const inv3 = (m) => {
    const [[a, b, c], [d, e, f], [g, h, i]] = m;
    const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
    return [
      [(e * i - f * h) / det, (c * h - b * i) / det, (b * f - c * e) / det],
      [(f * g - d * i) / det, (a * i - c * g) / det, (c * d - a * f) / det],
      [(d * h - e * g) / det, (b * g - a * h) / det, (a * e - b * d) / det]
    ];
  };
  const mul = (x, y) => x.map((row) => y[0].map((_, j) => row.reduce((acc, v, k) => acc + v * y[k][j], 0)));
  const rgbToXyz = (prim, white) => {
    const xyz = (x, y) => [x / y, 1, (1 - x - y) / y];
    const cols = prim.map(([x, y]) => xyz(x, y));
    const base = [0, 1, 2].map((r) => cols.map((col) => col[r]));
    const w = xyz(white[0], white[1]);
    const inv = inv3(base);
    const scale = inv.map((row) => row.reduce((acc, v, k) => acc + v * w[k], 0));
    return base.map((row) => row.map((v, k) => v * scale[k]));
  };
  const white = [0.3127, 0.3290];
  const srgb = rgbToXyz([[0.64, 0.33], [0.30, 0.60], [0.15, 0.06]], white);
  const p3 = rgbToXyz([[0.680, 0.320], [0.265, 0.690], [0.150, 0.060]], white);
  const srgbToP3 = mul(inv3(p3), srgb);
  const lmsToSrgb = [
    [4.0767416621, -3.3077115913, 0.2309699292],
    [-1.2684380046, 2.6097574011, -0.3413193965],
    [-0.0041960863, -0.7034186147, 1.7076147010]
  ];
  return mul(srgbToP3, lmsToSrgb);
}

function generateSwiftColors() {
  const c = tokens.color;
  const subL = parseOklch(c.substrate.light.$value);
  const subD = parseOklch(c.substrate.dark.$value);

  const elvL = parseOklch(c.surfaceElevated.light.$value);
  const elvD = parseOklch(c.surfaceElevated.dark.$value);

  const recL = parseOklch(c.surfaceRecessed.light.$value);
  const recD = parseOklch(c.surfaceRecessed.dark.$value);

  const ink100L = parseOklch(c.ink100.light.$value);
  const ink100D = parseOklch(c.ink100.dark.$value);

  const ink60L = parseOklch(c.ink60.light.$value);
  const ink60D = parseOklch(c.ink60.dark.$value);

  const ink30L = parseOklch(c.ink30.light.$value);
  const ink30D = parseOklch(c.ink30.dark.$value);

  const sigL = parseOklch(c.signalError.light.$value);
  const sigD = parseOklch(c.signalError.dark.$value);
  const sigLHC = parseOklch(c.signalError.lightHighContrast.$value);
  const sigDHC = parseOklch(c.signalError.darkHighContrast.$value);

  function fmtOklch(parsed) {
    return `Color(oklchL: ${parsed.l.toFixed(3)}, c: ${parsed.c.toFixed(3)}, h: ${parsed.h.toFixed(1)})`;
  }

  const p3Rows = deriveOklabLmsToLinearDisplayP3()
    .map((row) => `        [${row.map((v) => (v < 0 ? '' : '+') + v.toFixed(12)).join(', ')}]`)
    .join(',\n');

  return `import SwiftUI
#if canImport(UIKit)
import UIKit
#elseif canImport(AppKit)
import AppKit
#endif

/// Color definitions and token scope for the Judarn design system.
/// Generated from tokens/judarn-tokens.json with OKLCh conversion (sRGB-gamut chroma, Display P3 container).
public enum JudarnColors {
    // Absolute Static Neutrals (never invert)
    public static let pureBlack = Color(red: 0.0, green: 0.0, blue: 0.0)
    public static let pureWhite = Color(red: 1.0, green: 1.0, blue: 1.0)
    
    // Dynamic Semantic Neutrals (automatically adapt to light/dark color scheme)
    
    /// Base canvas substrate (Light: Pure White ${hx('substrate', 'light')}, Dark: Deep Carbon ${hx('substrate', 'dark')})
    public static let substrate = Color.dynamic(
        light: ${fmtOklch(subL)},
        dark: ${fmtOklch(subD)}
    )
    
    /// Tier 1 Elevated surface: Cards, sheets, popovers (Light: Crisp Neutral ${hx('surfaceElevated', 'light')}, Dark: ${hx('surfaceElevated', 'dark')})
    public static let surfaceElevated = Color.dynamic(
        light: ${fmtOklch(elvL)},
        dark: ${fmtOklch(elvD)}
    )
    
    /// Tier 2 Recessed surface: Text field wells on the substrate, sunken canvas, matrix hovers (Light: ${hx('surfaceRecessed', 'light')}, Dark: ${hx('surfaceRecessed', 'dark')}).
    /// A field inside a card fills with \`substrate\` instead. Fields draw no outline at rest; the fill's low ratio is an accepted cost (DESIGN.md, Surface Hierarchy).
    public static let surfaceRecessed = Color.dynamic(
        light: ${fmtOklch(recL)},
        dark: ${fmtOklch(recD)}
    )
    
    /// Primary high-contrast ink (Light: Optical Black ${hx('ink100', 'light')}, Dark: Optical White ${hx('ink100', 'dark')}, >=15.0:1 AAA)
    public static let ink100 = Color.dynamic(
        light: ${fmtOklch(ink100L)},
        dark: ${fmtOklch(ink100D)}
    )
    
    /// Backward-compatible alias for primary ink (dynamically inverting)
    public static var black: Color { ink100 }
    
    /// Reverse-contrast surface (Light: Surface Elevated ${hx('surfaceElevated', 'light')}, Dark: Surface Elevated ${hx('surfaceElevated', 'dark')})
    public static let white = surfaceElevated
    
    /// Primary canvas substrate (Light: Pure White ${hx('substrate', 'light')}, Dark: Deep Carbon ${hx('substrate', 'dark')})
    public static let paper = substrate
    
    /// Secondary ink / flat grey (Light: ${hx('ink60', 'light')}, Dark: ${hx('ink60', 'dark')}, guaranteed >=4.8:1 AA contrast; promotes to AAA under high contrast)
    public static let ink60 = Color.dynamic(
        light: ${fmtOklch(ink60L)},
        dark: ${fmtOklch(ink60D)},
        lightHighContrast: ink100,
        darkHighContrast: ink100
    )
    
    /// Hairline / disabled grey (Light: ${hx('ink30', 'light')}, Dark: ${hx('ink30', 'dark')}; elevates to high contrast for accessible boundaries)
    public static let ink30 = Color.dynamic(
        light: ${fmtOklch(ink30L)},
        dark: ${fmtOklch(ink30D)},
        lightHighContrast: ink100,
        darkHighContrast: ink100
    )
    
    /// Accessible functional signal red for errors and validation (Light: ${hx('signalError', 'light')}, Dark: ${hx('signalError', 'dark')}, >=5.0:1 AA; calibrated AAA under high contrast)
    public static let signalError = Color.dynamic(
        light: ${fmtOklch(sigL)},
        dark: ${fmtOklch(sigD)},
        lightHighContrast: ${fmtOklch(sigLHC)},
        darkHighContrast: ${fmtOklch(sigDHC)}
    )
    
    // Semantic Colors (Default context)
    public static var fg1: Color { ink100 }
    public static var fg2: Color { ink60 }
    public static var fg3: Color { ink30 }
    
    // Default backgrounds (4-tier taxonomy)
    public static var bg1: Color { substrate }
    public static var bg2: Color { surfaceElevated }
}

public extension Color {
    /// Create a dynamic SwiftUI Color that adapts automatically between light and dark mode,
    /// with optional high-contrast overrides for accessibility.
    static func dynamic(
        light: Color,
        dark: Color,
        lightHighContrast: Color? = nil,
        darkHighContrast: Color? = nil
    ) -> Color {
        #if canImport(UIKit)
        return Color(UIColor { trait in
            let isDark = trait.userInterfaceStyle == .dark
            let isHighContrast = trait.accessibilityContrast == .high
            if isHighContrast {
                if isDark, let darkHighContrast { return UIColor(darkHighContrast) }
                if !isDark, let lightHighContrast { return UIColor(lightHighContrast) }
            }
            return isDark ? UIColor(dark) : UIColor(light)
        })
        #elseif canImport(AppKit)
        return Color(NSColor(name: nil) { appearance in
            // Only AppKit's own appearance names exist. A made-up name never matches a real appearance.
            let match = appearance.bestMatch(from: [
                .accessibilityHighContrastDarkAqua,
                .accessibilityHighContrastAqua,
                .darkAqua,
                .aqua
            ])
            switch match {
            case .accessibilityHighContrastDarkAqua:
                return NSColor(darkHighContrast ?? dark)
            case .accessibilityHighContrastAqua:
                return NSColor(lightHighContrast ?? light)
            case .darkAqua:
                return NSColor(dark)
            default:
                return NSColor(light)
            }
        })
        #else
        return light
        #endif
    }

    /// Perceptual relative luminance crossover Y* = ${PERCEPTUAL_LUMINANCE_CROSSOVER.toFixed(2)}.
    /// Surfaces at or below it receive pureWhite, a deliberate preference over WCAG ratios: lighter surfaces receive pureBlack.
    private static let perceptualLuminanceCrossover: Double = ${PERCEPTUAL_LUMINANCE_CROSSOVER.toFixed(2)}

    /// WCAG luminance crossover Y* = sqrt(1.05 * 0.05) - 0.05, where black and white reach equal ratios (ADR-0005).
    /// Non-Negotiable Invariant: \`contrastingAccent\` clamps by this crossover, never the perceptual one.
    /// Only the direction with the higher reachable ratio can meet \`minRatio\` on mid-tone surfaces.
    private static let wcagLuminanceCrossover: Double = ${WCAG_LUMINANCE_CROSSOVER}

    private static func linearizeSrgbChannel(_ c: Double) -> Double {
        let clamped = max(0.0, min(1.0, c))
        return clamped <= 0.04045 ? (clamped / 12.92) : pow((clamped + 0.055) / 1.055, 2.4)
    }

    private static func srgbRelativeLuminance(r: Double, g: Double, b: Double) -> Double {
        0.2126 * linearizeSrgbChannel(r) + 0.7152 * linearizeSrgbChannel(g) + 0.0722 * linearizeSrgbChannel(b)
    }

    /// Resolves the foreground ink (pureBlack or pureWhite) for a filled surface from its linearized relative luminance and the perceptual crossover.
    var contrastingInk: Color {
        #if canImport(UIKit)
        return Color(UIColor { trait in
            let uiColor = UIColor(self).resolvedColor(with: trait)
            var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
            guard uiColor.getRed(&r, green: &g, blue: &b, alpha: &a) else {
                return UIColor(JudarnColors.pureWhite)
            }
            let lum = Self.srgbRelativeLuminance(r: Double(r), g: Double(g), b: Double(b))
            return lum > Self.perceptualLuminanceCrossover ? UIColor(JudarnColors.pureBlack) : UIColor(JudarnColors.pureWhite)
        })
        #elseif canImport(AppKit)
        return Color(NSColor(name: nil) { appearance in
            var resolvedColor = NSColor(self)
            appearance.performAsCurrentDrawingAppearance {
                resolvedColor = NSColor(self)
            }
            guard let rgb = resolvedColor.usingColorSpace(.sRGB) ?? resolvedColor.usingColorSpace(.extendedSRGB) else {
                return NSColor(JudarnColors.pureWhite)
            }
            var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
            rgb.getRed(&r, green: &g, blue: &b, alpha: &a)
            let lum = Self.srgbRelativeLuminance(r: Double(r), g: Double(g), b: Double(b))
            return lum > Self.perceptualLuminanceCrossover ? NSColor(JudarnColors.pureBlack) : NSColor(JudarnColors.pureWhite)
        })
        #else
        return JudarnColors.pureWhite
        #endif
    }

    /// Returns a contrast-clamped foreground color that reaches \`minRatio\` (default 4.5:1 WCAG AA) against \`surface\`.
    /// Reachability peaks at about 4.58:1 on surfaces near the WCAG crossover, so a higher \`minRatio\` can resolve to the strongest reachable ink instead.
    func contrastingAccent(against surface: Color = JudarnColors.surfaceElevated, minRatio: Double = 4.5) -> Color {
        #if canImport(UIKit)
        return Color(UIColor { trait in
            let fgUIColor = UIColor(self).resolvedColor(with: trait)
            let bgUIColor = UIColor(surface).resolvedColor(with: trait)
            var fr: CGFloat = 0, fg: CGFloat = 0, fb: CGFloat = 0, fa: CGFloat = 0
            var br: CGFloat = 0, bg: CGFloat = 0, bb: CGFloat = 0, ba: CGFloat = 0
            guard fgUIColor.getRed(&fr, green: &fg, blue: &fb, alpha: &fa),
                  bgUIColor.getRed(&br, green: &bg, blue: &bb, alpha: &ba) else {
                return UIColor(JudarnColors.ink100).resolvedColor(with: trait)
            }
            let yFg = Self.srgbRelativeLuminance(r: Double(fr), g: Double(fg), b: Double(fb))
            let yBg = Self.srgbRelativeLuminance(r: Double(br), g: Double(bg), b: Double(bb))
            let ratio = (max(yFg, yBg) + 0.05) / (min(yFg, yBg) + 0.05)
            if ratio >= minRatio { return fgUIColor }
            let targetDarker = yBg > Self.wcagLuminanceCrossover
            var low = 0.0, high = 1.0
            for _ in 0..<20 {
                let mid = 0.5 * (low + high)
                let cr = targetDarker ? Double(fr) * (1.0 - mid) : Double(fr) + (1.0 - Double(fr)) * mid
                let cg = targetDarker ? Double(fg) * (1.0 - mid) : Double(fg) + (1.0 - Double(fg)) * mid
                let cb = targetDarker ? Double(fb) * (1.0 - mid) : Double(fb) + (1.0 - Double(fb)) * mid
                let yCand = Self.srgbRelativeLuminance(r: cr, g: cg, b: cb)
                let candRatio = (max(yCand, yBg) + 0.05) / (min(yCand, yBg) + 0.05)
                if candRatio >= minRatio { high = mid } else { low = mid }
            }
            let t = high
            let rr = targetDarker ? Double(fr) * (1.0 - t) : Double(fr) + (1.0 - Double(fr)) * t
            let rg = targetDarker ? Double(fg) * (1.0 - t) : Double(fg) + (1.0 - Double(fg)) * t
            let rb = targetDarker ? Double(fb) * (1.0 - t) : Double(fb) + (1.0 - Double(fb)) * t
            return UIColor(red: CGFloat(rr), green: CGFloat(rg), blue: CGFloat(rb), alpha: fa)
        })
        #elseif canImport(AppKit)
        return Color(NSColor(name: nil) { appearance in
            var fgNS = NSColor(self)
            var bgNS = NSColor(surface)
            appearance.performAsCurrentDrawingAppearance {
                fgNS = NSColor(self)
                bgNS = NSColor(surface)
            }
            guard let fgRgb = fgNS.usingColorSpace(.sRGB) ?? fgNS.usingColorSpace(.extendedSRGB),
                  let bgRgb = bgNS.usingColorSpace(.sRGB) ?? bgNS.usingColorSpace(.extendedSRGB) else {
                return NSColor(JudarnColors.ink100)
            }
            var fr: CGFloat = 0, fg: CGFloat = 0, fb: CGFloat = 0, fa: CGFloat = 0
            var br: CGFloat = 0, bg: CGFloat = 0, bb: CGFloat = 0, ba: CGFloat = 0
            fgRgb.getRed(&fr, green: &fg, blue: &fb, alpha: &fa)
            bgRgb.getRed(&br, green: &bg, blue: &bb, alpha: &ba)
            let yFg = Self.srgbRelativeLuminance(r: Double(fr), g: Double(fg), b: Double(fb))
            let yBg = Self.srgbRelativeLuminance(r: Double(br), g: Double(bg), b: Double(bb))
            let ratio = (max(yFg, yBg) + 0.05) / (min(yFg, yBg) + 0.05)
            if ratio >= minRatio { return fgRgb }
            let targetDarker = yBg > Self.wcagLuminanceCrossover
            var low = 0.0, high = 1.0
            for _ in 0..<20 {
                let mid = 0.5 * (low + high)
                let cr = targetDarker ? Double(fr) * (1.0 - mid) : Double(fr) + (1.0 - Double(fr)) * mid
                let cg = targetDarker ? Double(fg) * (1.0 - mid) : Double(fg) + (1.0 - Double(fg)) * mid
                let cb = targetDarker ? Double(fb) * (1.0 - mid) : Double(fb) + (1.0 - Double(fb)) * mid
                let yCand = Self.srgbRelativeLuminance(r: cr, g: cg, b: cb)
                let candRatio = (max(yCand, yBg) + 0.05) / (min(yCand, yBg) + 0.05)
                if candRatio >= minRatio { high = mid } else { low = mid }
            }
            let t = high
            let rr = targetDarker ? Double(fr) * (1.0 - t) : Double(fr) + (1.0 - Double(fr)) * t
            let rg = targetDarker ? Double(fg) * (1.0 - t) : Double(fg) + (1.0 - Double(fg)) * t
            let rb = targetDarker ? Double(fb) * (1.0 - t) : Double(fb) + (1.0 - Double(fb)) * t
            return NSColor(srgbRed: CGFloat(rr), green: CGFloat(rg), blue: CGFloat(rb), alpha: fa)
        })
        #else
        return self
        #endif
    }
}

public extension Color {
    struct JudarnColorScope: Sendable {
        public var substrate: Color { JudarnColors.substrate }
        public var surfaceElevated: Color { JudarnColors.surfaceElevated }
        public var surfaceRecessed: Color { JudarnColors.surfaceRecessed }
        public var pureBlack: Color { JudarnColors.pureBlack }
        public var pureWhite: Color { JudarnColors.pureWhite }
        public var black: Color { JudarnColors.black }
        public var white: Color { JudarnColors.white }
        public var paper: Color { JudarnColors.paper }
        public var ink100: Color { JudarnColors.ink100 }
        public var ink60: Color { JudarnColors.ink60 }
        public var ink30: Color { JudarnColors.ink30 }
        public var signalError: Color { JudarnColors.signalError }
        public var fg1: Color { JudarnColors.fg1 }
        public var fg2: Color { JudarnColors.fg2 }
        public var fg3: Color { JudarnColors.fg3 }
        public var bg1: Color { JudarnColors.bg1 }
        public var bg2: Color { JudarnColors.bg2 }
        public var accent: Color { JudarnColors.ink100 }
        public var accent2: Color { JudarnColors.ink60 }
    }
    
    static let judarn = JudarnColorScope()
}

// System Accent Color Inheritance: Honor the user's system accent color when no app-specific brand accent is configured.
public struct JudarnAccentKey: EnvironmentKey {
    public static let defaultValue: Color = Color.accentColor
}

public struct JudarnAccent2Key: EnvironmentKey {
    public static let defaultValue: Color = JudarnColors.ink60
}

public extension EnvironmentValues {
    /// Primary project accent color
    var judarnAccent: Color {
        get { self[JudarnAccentKey.self] }
        set { self[JudarnAccentKey.self] = newValue }
    }
    
    /// Optional secondary project accent color
    var judarnAccent2: Color {
        get { self[JudarnAccent2Key.self] }
        set { self[JudarnAccent2Key.self] = newValue }
    }
}

public extension View {
    /// Set the project-specific accent colors for this view hierarchy.
    /// The secondary accent defaults to \`JudarnColors.ink60\`, the same value as \`Color.judarn.accent2\` and the \`judarnAccent2\` environment default.
    func judarnAccent(_ accent: Color, secondaryAccent: Color = JudarnColors.ink60) -> some View {
        self
            .environment(\\.judarnAccent, accent)
            .environment(\\.judarnAccent2, secondaryAccent)
    }
}

extension Color {
    /// Cubed OKLab LMS to linear Display P3. Derived as the sRGB to Display P3 matrix (D65 primaries) times Ottosson's LMS to linear sRGB matrix, so every row sums to 1.0 and neutrals stay neutral.
    static let oklabLmsToLinearDisplayP3: [[Double]] = [
${p3Rows}
    ]
}

public extension Color {
    /// Initialize a SwiftUI Color from OKLCh coordinates.
    /// Chroma is reduced by bisection until the color fits the sRGB gamut (the CSS Color 4 approach), so wide-gamut chroma is never used.
    /// The result is expressed in the Display P3 color space, where it reads as the same color as the sRGB original on any display.
    /// - Parameters:
    ///   - l: Lightness (0.0 to 1.0)
    ///   - c: Chroma (typically 0.0 to 0.4)
    ///   - h: Hue in degrees (0.0 to 360.0)
    ///   - opacity: Opacity (0.0 to 1.0)
    init(oklchL l: Double, c: Double, h: Double, opacity: Double = 1.0) {
        if l <= 0.0 {
            self.init(.displayP3, red: 0.0, green: 0.0, blue: 0.0, opacity: opacity)
            return
        }
        if l >= 1.0 {
            self.init(.displayP3, red: 1.0, green: 1.0, blue: 1.0, opacity: opacity)
            return
        }

        let hRad = h * Double.pi / 180.0
        let cosH = cos(hRad)
        let sinH = sin(hRad)

        let toLinearSrgb: (Double) -> (r: Double, g: Double, b: Double) = { chroma in
            let a = chroma * cosH
            let b = chroma * sinH
            let l_lms = l + 0.3963377774 * a + 0.2158037573 * b
            let m_lms = l - 0.1055613458 * a - 0.0638541728 * b
            let s_lms = l - 0.0894841775 * a - 1.2914855480 * b
            let l_ = l_lms * l_lms * l_lms
            let m_ = m_lms * m_lms * m_lms
            let s_ = s_lms * s_lms * s_lms
            return (
                r: +4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
                g: -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
                b: -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_
            )
        }

        let inSrgbGamut: ((r: Double, g: Double, b: Double)) -> Bool = { rgb in
            let eps = 1e-6
            return rgb.r >= -eps && rgb.r <= 1.0 + eps &&
                   rgb.g >= -eps && rgb.g <= 1.0 + eps &&
                   rgb.b >= -eps && rgb.b <= 1.0 + eps
        }

        var mappedC = max(0.0, c)
        if !inSrgbGamut(toLinearSrgb(mappedC)) {
            var low = 0.0
            var high = mappedC
            for _ in 0..<24 {
                let mid = 0.5 * (low + high)
                if inSrgbGamut(toLinearSrgb(mid)) {
                    low = mid
                } else {
                    high = mid
                }
            }
            mappedC = low
        }

        let a = mappedC * cosH
        let b = mappedC * sinH
        let l_lms = l + 0.3963377774 * a + 0.2158037573 * b
        let m_lms = l - 0.1055613458 * a - 0.0638541728 * b
        let s_lms = l - 0.0894841775 * a - 1.2914855480 * b

        let l_ = l_lms * l_lms * l_lms
        let m_ = m_lms * m_lms * m_lms
        let s_ = s_lms * s_lms * s_lms

        let p3 = Color.oklabLmsToLinearDisplayP3
        let rLinear = p3[0][0] * l_ + p3[0][1] * m_ + p3[0][2] * s_
        let gLinear = p3[1][0] * l_ + p3[1][1] * m_ + p3[1][2] * s_
        let bLinear = p3[2][0] * l_ + p3[2][1] * m_ + p3[2][2] * s_

        let f: (Double) -> Double = { val in
            let clamped = max(0.0, min(1.0, val))
            if clamped <= 0.0031308 {
                return 12.92 * clamped
            } else {
                return 1.055 * pow(clamped, 1.0 / 2.4) - 0.055
            }
        }

        let r = max(0.0, min(1.0, f(rLinear)))
        let g = max(0.0, min(1.0, f(gLinear)))
        let blue = max(0.0, min(1.0, f(bLinear)))

        self.init(.displayP3, red: r, green: g, blue: blue, opacity: opacity)
    }
}
`;
}

function generateSwiftTypography() {
  const t = tokens.typography;
  const swiftWeightMap = {
    400: '.regular',
    500: '.medium',
    600: '.semibold',
    700: '.bold',
    800: '.heavy',
    900: '.black'
  };

  const cases = Object.entries(t).map(([key, spec]) => {
    const sizePx = parsePx(spec.fontSize);
    const trackEm = parseEm(spec.tracking);
    const weight = swiftWeightMap[spec.fontWeight] || '.regular';
    const monoArg = spec.tabularNums ? ', isMonospacedDigit: true' : '';
    const modifier = (textStyle) => `return JudarnTypographyModifier(textStyle: .${textStyle}, weight: ${weight}, trackingEm: ${trackEm}, leading: .${spec.appleLeading}, isUppercase: ${spec.isUppercase}, slot: .${spec.slot}${monoArg}, usesCaseForms: ${spec.caseFeature === 1})`;
    if (spec.appleTextStyleMacOS) {
      return `        case .${key}:\n            #if os(macOS)\n            ${modifier(spec.appleTextStyleMacOS)}\n            #else\n            ${modifier(spec.appleTextStyle)}\n            #endif`;
    }
    return `        case .${key}:\n            ${modifier(spec.appleTextStyle)}`;
  }).join('\n');
  const bodyTrackEm = parseEm(tokens.tracking.body.$value);

  return `import SwiftUI
import CoreText

/// Typography styles conforming to the Judarn modular typographic scale.
/// Generated from tokens/judarn-tokens.json  –  do not edit directly.
public enum JudarnTypographyStyle: Sendable, CaseIterable {
    case display
    case h1
    case h2
    case h3
    case h4
    case bodyLg
    case body
    case small
    case label
    case micro
    case data
    case mono
}

/// Casing for the uppercase label styles, label and micro.
/// uppercase is for eyebrows, section labels, column headers, and value labels of at most two words
/// with no digit, unit symbol, or mixed-case term. asWritten keeps size and weight with body tracking,
/// for statuses, counts, values, units, messages, and controls.
public enum JudarnTextCasing: Sendable {
    case uppercase
    case asWritten
}

extension JudarnTypographyStyle {
    @MainActor var typographyModifier: JudarnTypographyModifier {
        switch self {
${cases}
        }
    }
}

/// Semantic typographic font slot roles.
public enum JudarnFontSlot: Sendable {
    case display
    case body
    case data
    case mono
}

/// Pluggable font configuration allowing projects to override display or data fonts while falling back to sans.
public struct JudarnFontConfig: Sendable, Equatable {
    public let sans: String?
    public let display: String?
    public let data: String?
    
    public init(sans: String? = nil, display: String? = nil, data: String? = nil) {
        self.sans = sans
        self.display = display
        self.data = data
    }
    
    public static let \`default\` = JudarnFontConfig()
}

private struct JudarnFontConfigKey: EnvironmentKey {
    static let defaultValue: JudarnFontConfig = .default
}

public extension EnvironmentValues {
    var judarnFontConfig: JudarnFontConfig {
        get { self[JudarnFontConfigKey.self] }
        set { self[JudarnFontConfigKey.self] = newValue }
    }
}

// Platform Preferred Point Sizes: macOS desktop uses denser baseline metrics (13pt body, 11pt subhead, 10pt caption) compared to iOS touch standards (17pt body, 15pt subhead, 11pt caption).
#if os(macOS)
import AppKit

private func preferredPointSize(for style: Font.TextStyle, dynamicTypeSize: DynamicTypeSize? = nil) -> CGFloat {
    let nsStyle: NSFont.TextStyle
    switch style {
    case .largeTitle: nsStyle = .largeTitle
    case .title: nsStyle = .title1
    case .title2: nsStyle = .title2
    case .title3: nsStyle = .title3
    case .headline: nsStyle = .headline
    case .subheadline: nsStyle = .subheadline
    case .body: nsStyle = .body
    case .callout: nsStyle = .callout
    case .footnote: nsStyle = .footnote
    case .caption: nsStyle = .caption1
    case .caption2: nsStyle = .caption2
    @unknown default: nsStyle = .body
    }
    return NSFont.preferredFont(forTextStyle: nsStyle).pointSize
}

private func platformWeight(_ weight: Font.Weight) -> NSFont.Weight {
    switch weight {
    case .ultraLight: return .ultraLight
    case .thin: return .thin
    case .light: return .light
    case .medium: return .medium
    case .semibold: return .semibold
    case .bold: return .bold
    case .heavy: return .heavy
    case .black: return .black
    default: return .regular
    }
}
#elseif canImport(UIKit)
import UIKit

private func preferredPointSize(for style: Font.TextStyle, dynamicTypeSize: DynamicTypeSize? = nil) -> CGFloat {
    let uiStyle: UIFont.TextStyle
    switch style {
    case .largeTitle: uiStyle = .largeTitle
    case .title: uiStyle = .title1
    case .title2: uiStyle = .title2
    case .title3: uiStyle = .title3
    case .headline: uiStyle = .headline
    case .subheadline: uiStyle = .subheadline
    case .body: uiStyle = .body
    case .callout: uiStyle = .callout
    case .footnote: uiStyle = .footnote
    case .caption: uiStyle = .caption1
    case .caption2: uiStyle = .caption2
    @unknown default: uiStyle = .body
    }
    guard let dynamicTypeSize else { return UIFont.preferredFont(forTextStyle: uiStyle).pointSize }
    let traits = UITraitCollection(preferredContentSizeCategory: UIContentSizeCategory(dynamicTypeSize))
    return UIFont.preferredFont(forTextStyle: uiStyle, compatibleWith: traits).pointSize
}

private func platformWeight(_ weight: Font.Weight) -> UIFont.Weight {
    switch weight {
    case .ultraLight: return .ultraLight
    case .thin: return .thin
    case .light: return .light
    case .medium: return .medium
    case .semibold: return .semibold
    case .bold: return .bold
    case .heavy: return .heavy
    case .black: return .black
    default: return .regular
    }
}
#else
private func preferredPointSize(for style: Font.TextStyle, dynamicTypeSize: DynamicTypeSize? = nil) -> CGFloat {
    16
}
#endif

/// Typographic scale modifiers for the Judarn design system with native text style scaling and pluggable font slots.
public struct JudarnTypographyModifier: ViewModifier {
    @Environment(\\.judarnFontConfig) private var fontConfig
    @Environment(\\.dynamicTypeSize) private var dynamicTypeSize
    @Environment(\\.judarnEditorialNumerals) private var editorialNumerals
    private let explicitSize: CGFloat?
    public let textStyle: Font.TextStyle
    public let weight: Font.Weight
    /// Tracking in em, as in the tokens. Points follow the rendered size, so Apple matches the web.
    public let trackingEm: CGFloat
    /// Font leading from the role's \`appleLeading\` token: tight removes the open gap Apple's standard leading adds between wrapped lines.
    public let leading: Font.Leading
    public let isUppercase: Bool
    public let slot: JudarnFontSlot
    public let isMonospacedDigit: Bool
    /// Applies the OpenType case-sensitive forms (\`case\` feature, token \`caseFeature\`) so punctuation and figures sit on the cap height. Meant for uppercase styles.
    public let usesCaseForms: Bool

    public var size: CGFloat {
        explicitSize ?? preferredPointSize(for: textStyle)
    }

    /// Tracking in points at the current preferred size.
    public var tracking: CGFloat {
        trackingEm * size
    }

    /// Tracking in points at a Dynamic Type size; macOS has no Dynamic Type and uses its preferred size.
    func resolvedTracking(at dynamicTypeSize: DynamicTypeSize) -> CGFloat {
        trackingEm * (explicitSize ?? preferredPointSize(for: textStyle, dynamicTypeSize: dynamicTypeSize))
    }

    /// Base size for a custom font. Font.custom(_:size:relativeTo:) scales from the default Dynamic Type
    /// size itself, so the base must be the default size, not the current preferred size.
    var customFontBaseSize: CGFloat {
        explicitSize ?? preferredPointSize(for: textStyle, dynamicTypeSize: .large)
    }

    public init(
        size: CGFloat? = nil,
        textStyle: Font.TextStyle = .body,
        weight: Font.Weight,
        trackingEm: CGFloat = 0,
        leading: Font.Leading = .standard,
        isUppercase: Bool = false,
        slot: JudarnFontSlot = .body,
        isMonospacedDigit: Bool = false,
        usesCaseForms: Bool = false
    ) {
        self.explicitSize = size
        self.textStyle = textStyle
        self.weight = weight
        self.trackingEm = trackingEm
        self.leading = leading
        self.isUppercase = isUppercase
        self.slot = slot
        self.isMonospacedDigit = isMonospacedDigit
        self.usesCaseForms = usesCaseForms
    }

    private var customFontName: String? {
        switch slot {
        case .display: return fontConfig.display ?? fontConfig.sans
        case .body:    return fontConfig.sans
        case .data:    return fontConfig.data ?? fontConfig.sans
        case .mono:    return nil
        }
    }

    /// True when the font must be built from a CoreText descriptor to carry OpenType features.
    private var needsFeatureFont: Bool {
        #if os(macOS) || canImport(UIKit)
        return usesCaseForms || editorialNumerals
        #else
        return false
        #endif
    }

    #if os(macOS) || canImport(UIKit)
    /// Font with OpenType features, sized from the current Dynamic Type size so scaling and style composition survive.
    private var featureFont: Font {
        let pointSize = explicitSize ?? preferredPointSize(for: textStyle, dynamicTypeSize: dynamicTypeSize)
        #if os(macOS)
        let base: NSFont
        if let name = customFontName, let custom = NSFont(name: name, size: pointSize) {
            base = custom
        } else if slot == .mono {
            base = NSFont.monospacedSystemFont(ofSize: pointSize, weight: platformWeight(weight))
        } else {
            base = NSFont.systemFont(ofSize: pointSize, weight: platformWeight(weight))
        }
        #else
        let base: UIFont
        if let name = customFontName, let custom = UIFont(name: name, size: pointSize) {
            base = custom
        } else if slot == .mono {
            base = UIFont.monospacedSystemFont(ofSize: pointSize, weight: platformWeight(weight))
        } else {
            base = UIFont.systemFont(ofSize: pointSize, weight: platformWeight(weight))
        }
        #endif
        var descriptor = CTFontCopyFontDescriptor(base)
        if usesCaseForms {
            descriptor = CTFontDescriptorCreateCopyWithFeature(
                descriptor,
                kCaseSensitiveLayoutType as CFNumber,
                kCaseSensitiveLayoutOnSelector as CFNumber
            )
        }
        if editorialNumerals {
            descriptor = CTFontDescriptorCreateCopyWithFeature(
                descriptor,
                kNumberCaseType as CFNumber,
                kLowerCaseNumbersSelector as CFNumber
            )
            descriptor = CTFontDescriptorCreateCopyWithFeature(
                descriptor,
                kNumberSpacingType as CFNumber,
                kProportionalNumbersSelector as CFNumber
            )
        }
        let font = Font(CTFontCreateWithFontDescriptor(descriptor, pointSize, nil))
        return customFontName == nil ? font : font.weight(weight)
    }
    #endif

    private var resolvedFont: Font {
        #if os(macOS) || canImport(UIKit)
        if needsFeatureFont { return featureFont }
        #endif
        if let fontName = customFontName {
            return Font.custom(fontName, size: customFontBaseSize, relativeTo: textStyle).weight(weight)
        }

        let design: Font.Design = (slot == .mono) ? .monospaced : .default
        if let explicitSize {
            return Font.system(size: explicitSize, weight: weight, design: design)
        }
        return Font.system(textStyle, design: design).weight(weight)
    }

    public func body(content: Content) -> some View {
        let base = content
            .font(resolvedFont.leading(leading))
            .tracking(resolvedTracking(at: dynamicTypeSize))
            .textCase(isUppercase ? .uppercase : nil)

        if isMonospacedDigit {
            base.monospacedDigit()
        } else {
            base
        }
    }

    /// Body tracking in em, from tracking.body in the tokens.
    static let bodyTrackingEm: CGFloat = ${bodyTrackEm}

    /// Returns this style with the given casing. As written drops the uppercase transform and the
    /// positive tracking that pairs only with it; uppercase never adds caps to a style without them.
    public func casing(_ casing: JudarnTextCasing) -> JudarnTypographyModifier {
        guard casing == .asWritten else { return self }
        return JudarnTypographyModifier(
            size: explicitSize,
            textStyle: textStyle,
            weight: weight,
            trackingEm: Self.bodyTrackingEm,
            leading: leading,
            isUppercase: false,
            slot: slot,
            isMonospacedDigit: isMonospacedDigit,
            usesCaseForms: false
        )
    }
}

/// Environment switch behind \`judarnEditorialNumerals()\`.
struct JudarnEditorialNumeralsKey: EnvironmentKey {
    static let defaultValue = false
}

extension EnvironmentValues {
    var judarnEditorialNumerals: Bool {
        get { self[JudarnEditorialNumeralsKey.self] }
        set { self[JudarnEditorialNumeralsKey.self] = newValue }
    }
}

public extension View {
    /// Injects a custom Judarn font configuration into the view hierarchy.
    func judarnFontConfig(_ config: JudarnFontConfig) -> some View {
        environment(\\.judarnFontConfig, config)
    }

    // Semantic Text Style Mapping: Uses Apple system text styles to preserve platform density, optical variant selection (SF Pro Text vs SF Pro Display), and accessibility Dynamic Type scaling. A role takes a different style on macOS only where its own style would match a smaller role's size there: label is .footnote on iOS but .subheadline on macOS, where .footnote equals micro's .caption2. Apple has fewer sizes above .body than Judarn has roles above body, so some roles share a size; a shared size goes to roles of different weights, as bodyLg (regular) shares .title3 with h4 (heavy) and display (black) shares .largeTitle with h1 (heavy). Token weights map to the matching Font.Weight, so 800 is .heavy and 900 is .black, as in CSS.
    /// Applies a Judarn typographic style mapped to native platform text styles.
    func judarnTypography(_ style: JudarnTypographyStyle) -> some View {
        modifier(style.typographyModifier)
    }

    /// Poster-scale headline (mapped to .largeTitle, black; shares h1's size and differs by weight)
    func judarnDisplay() -> some View {
        judarnTypography(.display)
    }

    /// H1 header (mapped to .largeTitle, heavy)
    func judarnH1() -> some View {
        judarnTypography(.h1)
    }

    /// H2 header (mapped to .title, heavy)
    func judarnH2() -> some View {
        judarnTypography(.h2)
    }

    /// H3 header (mapped to .title2, heavy)
    func judarnH3() -> some View {
        judarnTypography(.h3)
    }

    /// H4 header (mapped to .title3, heavy)
    func judarnH4() -> some View {
        judarnTypography(.h4)
    }

    /// Large body copy (mapped to .title3, regular; shares h4's size and differs by weight)
    func judarnBodyLg() -> some View {
        judarnTypography(.bodyLg)
    }

    /// Standard body copy (mapped to .body, regular)
    func judarnBody() -> some View {
        judarnTypography(.body)
    }

    /// Small descriptive copy (mapped to .callout, regular)
    func judarnSmall() -> some View {
        judarnTypography(.small)
    }

    /// Small bold label (mapped to .footnote, .subheadline on macOS, heavy). Uppercase by default; pass .asWritten
    /// for statuses, counts, values, units, messages, and controls.
    func judarnLabel(casing: JudarnTextCasing = .uppercase) -> some View {
        modifier(JudarnTypographyStyle.label.typographyModifier.casing(casing))
    }

    /// Micro label (mapped to .caption2, medium). Uppercase by default; pass .asWritten
    /// for statuses, counts, values, units, messages, and controls.
    func judarnMicro(casing: JudarnTextCasing = .uppercase) -> some View {
        modifier(JudarnTypographyStyle.micro.typographyModifier.casing(casing))
    }

    /// Tabular numeric figures (mapped to .callout, tabular digits)
    func judarnData() -> some View {
        judarnTypography(.data)
    }

    /// Monospaced technical copy (mapped to .caption, monospaced)
    func judarnMono() -> some View {
        judarnTypography(.mono)
    }

    /// Applies proportional old-style figures to every Judarn typography style in this view subtree, for narrative editorial prose.
    /// Apply it after the style or on a container; the styles read it from the environment, so the size, weight, tracking,
    /// Dynamic Type scaling and any configured font family stay those of the style. Text without a Judarn style is unchanged.
    func judarnEditorialNumerals(_ enabled: Bool = true) -> some View {
        environment(\\.judarnEditorialNumerals, enabled)
    }
}
`;
}

// ---------------------------------------------------------------------------
// 2. Generate Web CSS (colors_and_type.css)
// ---------------------------------------------------------------------------

function generateWebCss() {
  const s = tokens.space;
  const m = tokens.measure;
  const b = tokens.border;
  const r = tokens.radius;
  const c = tokens.color;
  const t = tokens.typography;
  const cssWeightVar = {
    400: 'var(--jd-weight-regular)',
    500: 'var(--jd-weight-medium)',
    800: 'var(--jd-weight-bold)',
    900: 'var(--jd-weight-black)'
  };
  const cssFontVar = {
    display: 'var(--jd-font-display)',
    body: 'var(--jd-font-body)',
    data: 'var(--jd-font-data)',
    mono: 'var(--jd-font-mono)'
  };
  const cssKey = (k) => (k === 'bodyLg' ? 'body-lg' : k);

  // Font stacks come from the font tokens. A slot that aliases another token is emitted as a
  // reference to that token's custom property, so the cascade stays pluggable per slot.
  const fontSans = tokens.font.sans.$value;
  const fontSlot = (slot) => {
    const f = tokens.font[slot];
    return f.alias ? `var(--jd-font-${f.alias})` : f.$value;
  };

  // Static accent ink: a literal from the perceptual crossover, never `var(--white)`,
  // which follows the colour scheme. The default accent follows ink100, so the ink flips with it.
  const inkOn = (oklchValue) => {
    const p = parseOklch(oklchValue);
    const y = relativeLuminance(oklchToLinearSrgb(p.l, p.c, p.h));
    return y > PERCEPTUAL_LUMINANCE_CROSSOVER ? '#000000' : '#ffffff';
  };
  const accentInkLight = inkOn(c.ink100.light.$value);
  const accentInkDark = inkOn(c.ink100.dark.$value);

  // Aliases are resolved where they are declared, so every scoped theme selector redeclares them.
  // The accent hooks (--jd-accent, -fg, -ink, -2) are project settings and are never declared here.
  // The resolved --accent, --accent-fg and --accent-ink are redeclared in every scope, each reading the
  // hook with a scheme default as fallback, so a nested scope picks its own default and keeps a project accent.
  const scopedAliases = (inkDefault) => `  --jd-ink100:    var(--jd-ink-100);
  --jd-ink60:     var(--jd-ink-60);
  --jd-ink30:     var(--jd-ink-30);
  --jd-black:     var(--jd-ink-100);
  --jd-white:     var(--jd-surface-elevated);
  --jd-paper:     var(--jd-substrate);
  --jd-line:      var(--jd-ink-100);
  --black:        var(--jd-black);
  --white:        var(--jd-white);
  --paper:        var(--jd-paper);
  --ink-100:      var(--jd-ink-100);
  --ink-60:       var(--jd-ink-60);
  --ink-30:       var(--jd-ink-30);
  --signal-error: var(--jd-signal-error);
  --line:         var(--jd-line);
  --rule:         var(--jd-rule);
  --accent:       var(--jd-accent, var(--jd-ink-100));
  --accent-fg:    var(--jd-accent-fg, var(--accent));
  --accent-2:     var(--jd-accent-2, oklch(0.520 0.005 92));${inkDefault ? `
  --accent-ink:   var(--jd-accent-ink, ${inkDefault});` : ''}
  --jd-primary:   var(--accent);
  --jd-secondary: var(--jd-ink-60);
  --jd-tertiary:  var(--jd-ink-30);
  --primary:      var(--jd-primary);
  --secondary:    var(--jd-secondary);
  --tertiary:     var(--jd-tertiary);
  --jd-fg1: var(--jd-ink-100);
  --jd-fg2: var(--jd-ink-60);
  --jd-fg3: var(--jd-ink-30);
  --jd-bg1: var(--jd-substrate);
  --jd-bg2: var(--jd-surface-elevated);
  --fg1: var(--jd-fg1);
  --fg2: var(--jd-fg2);
  --fg3: var(--jd-fg3);
  --bg1: var(--jd-bg1);
  --bg2: var(--jd-bg2);`;

  const typeClasses = Object.entries(t).map(([key, spec]) => {
    const k = cssKey(key);
    const lines = [
      `.t-${k} {`,
      `  font-family: ${cssFontVar[spec.slot] || 'var(--jd-font-body)'};`,
      `  font-weight: ${cssWeightVar[spec.fontWeight] || 'var(--jd-weight-regular)'};`,
      `  font-size: var(--jd-size-${k});`,
      `  line-height: ${spec.lineHeightRatio};`,
      `  letter-spacing: ${key === 'mono' ? '0em' : `var(--jd-track-${spec.trackingToken})`};`
    ];
    if (spec.textWrap) lines.push(`  text-wrap: ${spec.textWrap};`);
    if (spec.isUppercase) lines.push(`  text-transform: uppercase;`);
    if (spec.caseFeature === 1) lines.push(`  font-feature-settings: "case" 1;`);
    if (spec.tabularNums) {
      lines.push(`  font-variant-numeric: tabular-nums lining-nums;`);
      lines.push(`  font-feature-settings: "tnum" 1, "lnum" 1;`);
    }
    if (key === 'mono') lines.push(`  font-variant-ligatures: none;`);
    lines.push(`  color: ${spec.cssColor};`);
    lines.push(`}`);
    return lines.join('\n');
  }).join('\n') + '\n' + [
    `/* As-written casing for the uppercase label styles: statuses, counts, values, units, messages, controls. */`,
    Object.entries(t).filter(([, spec]) => spec.isUppercase).map(([key]) => `.t-${cssKey(key)}.t-as-written`).join(',\n') + ' {',
    `  text-transform: none;`,
    `  letter-spacing: var(--jd-track-body);`,
    `  font-feature-settings: normal;`,
    `}`,
    `/* Flow: space between the direct children of a container, from the space tokens. A heading belongs to the text below it. Never combine with gap. */`,
    `.flow {`,
    `  display: flow-root;`,
    `}`,
    `.flow > * + * {`,
    `  margin-block-start: var(--jd-space-2);`,
    `}`,
    `.flow > * + :is(h1, h2, h3, h4, h5, h6, .t-display, .t-h1, .t-h2, .t-h3, .t-h4) {`,
    `  margin-block-start: var(--jd-space-4);`,
    `}`,
    `.flow > :is(h1, h2, h3, h4, h5, h6, .t-display, .t-h1, .t-h2, .t-h3, .t-h4) + * {`,
    `  margin-block-start: var(--jd-space-1);`,
    `}`
  ].join('\n');

  return `/* =========================================================================
   JUDARN DESIGN SYSTEM
   colors_and_type.css  –  design tokens (color + type + grid)
   Generated from tokens/judarn-tokens.json  –  do not edit directly.
   Flat color only. No gradients, no shadows, no tints unless explicit.
   ========================================================================= */

:root {
  font-optical-sizing: auto;

  /* ---------------------------------------------------------------------
     GRID & SPACING  –  8pt macro grid + 4pt micro subgrid.
     --------------------------------------------------------------------- */
  --jd-space-half: ${s.half.$value};     /* micro spacing / leading / hairline offset */
  --jd-space-1: ${s['1'].$value};
  --jd-space-2: ${s['2'].$value};
  --jd-space-3: ${s['3'].$value};
  --jd-space-4: ${s['4'].$value};
  --jd-space-touch: ${s.touch.web || s.touch.$value};   /* Touch target floor (11 * 4px) */
  --jd-space-6: ${s['6'].$value};
  --jd-space-8: ${s['8'].$value};
  --jd-space-12: ${s['12'].$value};
  --jd-space-16: ${s['16'].$value};

  --jd-pad-default: ${s['2'].$value};   /* standard frame padding, H & V */
  --jd-pad-large: ${s['4'].$value};     /* larger frames: 24–32 */
  --jd-gap-tight: ${s['1'].$value};
  --jd-gap-normal: ${s['2'].$value};

  --jd-rule: ${b.rule.$value};           /* hairline rules  –  the only "decoration" allowed */
  --jd-rule-bold: ${b.ruleBold.$value};
  --jd-rule-heavy: ${b.ruleHeavy.$value};

  --jd-measure-body: ${m.body.$value};   /* max column measure for continuous body reading */
  --jd-measure-compact: ${m.compact.$value}; /* max column measure for cards / sidebars */
  --jd-measure-sidebar: ${m.sidebar?.$value || '260px'}; /* compact desktop pane and sidebar measure */

  --jd-radius-subtle: ${r.subtle.$value};
  --jd-radius-control: ${r.control.$value};
  --jd-radius-card: ${r.card.$value};
  --jd-radius-badge: ${r.badge.$value};

  /* Backward-compatible aliases */
  --space-half: var(--jd-space-half);
  --space-1: var(--jd-space-1);
  --space-2: var(--jd-space-2);
  --space-3: var(--jd-space-3);
  --space-4: var(--jd-space-4);
  --space-touch: var(--jd-space-touch);
  --space-6: var(--jd-space-6);
  --space-8: var(--jd-space-8);
  --space-12: var(--jd-space-12);
  --space-16: var(--jd-space-16);
  --pad-default: var(--jd-pad-default);
  --pad-large: var(--jd-pad-large);
  --gap-tight: var(--jd-gap-tight);
  --gap-normal: var(--jd-gap-normal);
  --rule: var(--jd-rule);
  --rule-bold: var(--jd-rule-bold);
  --rule-heavy: var(--jd-rule-heavy);
  --measure-body: var(--jd-measure-body);
  --measure-compact: var(--jd-measure-compact);
  --measure-sidebar: var(--jd-measure-sidebar);
  --radius-subtle: var(--jd-radius-subtle);
  --radius-control: var(--jd-radius-control);
  --radius-card: var(--jd-radius-card);
  --radius-badge: var(--jd-radius-badge);

  /* ---------------------------------------------------------------------
     4-TIER SURFACE TAXONOMY & DYNAMIC OKLCH NEUTRALS
     Authored strictly in OKLCH: oklch(L C H).
     Light scheme defaults:
     --------------------------------------------------------------------- */
  --jd-substrate:        ${c.substrate.light.$value};  /* ${hx('substrate', 'light')} Pure White */
  --jd-surface-elevated: ${c.surfaceElevated.light.$value};  /* ${hx('surfaceElevated', 'light')} Crisp Neutral Box */
  --jd-surface-recessed: ${c.surfaceRecessed.light.$value};  /* ${hx('surfaceRecessed', 'light')} Sunken Well / Hover */

  --jd-ink-100:          ${c.ink100.light.$value};       /* ${hx('ink100', 'light')} Optical Black */
  --jd-ink-60:           ${c.ink60.light.$value};  /* ${hx('ink60', 'light')} Secondary Ink (>=4.8:1 AA) */
  --jd-ink-30:           ${c.ink30.light.$value};  /* ${hx('ink30', 'light')} Hairline / Disabled */
  --jd-ink100:           var(--jd-ink-100);
  --jd-ink60:            var(--jd-ink-60);
  --jd-ink30:            var(--jd-ink-30);
  --jd-signal-error:     ${c.signalError.light.$value};  /* ${hx('signalError', 'light')} Accessible Error */
  --jd-signal-error-hc:  ${c.signalError.lightHighContrast.$value};

  /* Aliases dynamically mapped to active scheme */
  --jd-black:   var(--jd-ink-100);
  --jd-white:   var(--jd-surface-elevated);
  --jd-paper:   var(--jd-substrate);
  --jd-line:    var(--jd-ink-100);

  --black:        var(--jd-black);
  --white:        var(--jd-white);
  --paper:        var(--jd-paper);
  --ink-100:      var(--jd-ink-100);
  --ink-60:       var(--jd-ink-60);
  --ink-30:       var(--jd-ink-30);
  --signal-error: var(--jd-signal-error);
  --line:         var(--jd-line);

  /* ---------------------------------------------------------------------
     PROJECT ACCENT  –  single per-project hook. Authored in OKLCH.
     --------------------------------------------------------------------- */
  /* Project hooks, unset by default: --jd-accent, --jd-accent-fg, --jd-accent-ink, --jd-accent-2.
     The resolved --accent, --accent-fg, --accent-ink and --accent-2 are declared in every theme
     scope so a nested scope resolves its own default; a hook set on :root survives nesting.
     --accent defaults to ink-100 and --accent-fg to --accent. --accent-ink is static ink on an
     accent fill; a project that sets --jd-accent sets --jd-accent-ink too. */
  --accent:       var(--jd-accent, var(--jd-ink-100));
  --accent-fg:    var(--jd-accent-fg, var(--accent));
  --accent-ink:   var(--jd-accent-ink, ${accentInkLight});
  --accent-2:     var(--jd-accent-2, oklch(0.520 0.005 92));

  /* ---------------------------------------------------------------------
     THREE-COLOR PALETTE (optional)  –  primary / secondary / tertiary.
     --------------------------------------------------------------------- */
  --jd-primary:   var(--accent);
  --jd-secondary: var(--jd-ink-60);
  --jd-tertiary:  var(--jd-ink-30);
  --primary:      var(--jd-primary);
  --secondary:    var(--jd-secondary);
  --tertiary:     var(--jd-tertiary);

  /* ---------------------------------------------------------------------
     SEMANTIC ROLES  –  default (neutral) context
     --------------------------------------------------------------------- */
  --jd-fg1: var(--jd-ink-100);   /* primary text */
  --jd-fg2: var(--jd-ink-60);   /* secondary text / labels */
  --jd-fg3: var(--jd-ink-30);   /* disabled / hairline ink */
  --jd-bg1: var(--jd-substrate); /* primary surface / canvas */
  --jd-bg2: var(--jd-surface-elevated); /* secondary field / elevated */

  --fg1: var(--jd-fg1);
  --fg2: var(--jd-fg2);
  --fg3: var(--jd-fg3);
  --bg1: var(--jd-bg1);
  --bg2: var(--jd-bg2);

  /* ---------------------------------------------------------------------
     TYPE  –  System sans-serif by default (e.g. San Francisco, Segoe UI).
     --------------------------------------------------------------------- */
  --jd-font-sans: ${fontSans};
  --jd-font-bold: var(--jd-font-sans);
  --font-sans: var(--jd-font-sans);
  --font-bold: var(--jd-font-bold);

  /* Pluggable Font Slots */
  --jd-font-display: ${fontSlot('display')};
  --jd-font-body:    ${fontSlot('body')};
  --jd-font-data:    ${fontSlot('data')};
  --jd-font-mono:    ${fontSlot('mono')};
  --font-display:    var(--jd-font-display);
  --font-body:       var(--jd-font-body);
  --font-data:       var(--jd-font-data);
  --font-mono:       var(--jd-font-mono);

  --jd-weight-regular: 400;  /* Roman */
  --jd-weight-medium: 500;   /* Medium */
  --jd-weight-bold: 800;     /* Heavy  –  headings / display */
  --jd-weight-black: 900;    /* Black  –  large display only */

  --weight-regular: var(--jd-weight-regular);
  --weight-medium: var(--jd-weight-medium);
  --weight-bold: var(--jd-weight-bold);
  --weight-black: var(--jd-weight-black);

  /* Tracking */
  --jd-track-display: ${tokens.tracking.display.$value};
  --jd-track-head: ${tokens.tracking.head.$value};
  --jd-track-body: ${tokens.tracking.body.$value};
  --jd-track-label: ${tokens.tracking.label.$value};
  --jd-track-micro: ${tokens.tracking.micro.$value};

  --track-display: var(--jd-track-display);
  --track-head: var(--jd-track-head);
  --track-body: var(--jd-track-body);
  --track-label: var(--jd-track-label);
  --track-micro: var(--jd-track-micro);

  /* Type scale */
  --jd-size-display: ${t.display.fontSize};
  --jd-size-h1: ${t.h1.fontSize};
  --jd-size-h2: ${t.h2.fontSize};
  --jd-size-h3: ${t.h3.fontSize};
  --jd-size-h4: ${t.h4.fontSize};
  --jd-size-body-lg: ${t.bodyLg.fontSize};
  --jd-size-body: ${t.body.fontSize};
  --jd-size-small: ${t.small.fontSize};
  --jd-size-label: ${t.label.fontSize};
  --jd-size-micro: ${t.micro.fontSize};
  --jd-size-data: ${t.data.fontSize};
  --jd-size-mono: ${t.mono.fontSize};

  --size-display: var(--jd-size-display);
  --size-h1: var(--jd-size-h1);
  --size-h2: var(--jd-size-h2);
  --size-h3: var(--jd-size-h3);
  --size-h4: var(--jd-size-h4);
  --size-body-lg: var(--jd-size-body-lg);
  --size-body: var(--jd-size-body);
  --size-small: var(--jd-size-small);
  --size-label: var(--jd-size-label);
  --size-micro: var(--jd-size-micro);
  --size-data: var(--jd-size-data);
  --size-mono: var(--jd-size-mono);

  --lh-tight: ${t.display.lineHeightRatio};
  --lh-head: ${t.h1.lineHeightRatio};
  --lh-body: ${t.body.lineHeightRatio};
}

/* =========================================================================
   SEMANTIC TYPE CLASSES
   ========================================================================= */
${typeClasses}
.t-editorial-nums {
  font-variant-numeric: oldstyle-nums proportional-nums;
  font-feature-settings: "onum" 1, "pnum" 1;
}

/* =========================================================================
   DYNAMIC SCHEME: DUAL-TIER CARBON (DARK MODE)
   ========================================================================= */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --jd-substrate:        ${c.substrate.dark.$value};  /* ${hx('substrate', 'dark')} Deep Carbon */
    --jd-surface-elevated: ${c.surfaceElevated.dark.$value};  /* ${hx('surfaceElevated', 'dark')} Carbon Surface */
    --jd-surface-recessed: ${c.surfaceRecessed.dark.$value};  /* ${hx('surfaceRecessed', 'dark')} Sunken Well / Hover */

    --jd-ink-100:          ${c.ink100.dark.$value};       /* ${hx('ink100', 'dark')} Optical White (>=15.0:1 AAA) */
    --jd-ink-60:           ${c.ink60.dark.$value};  /* ${hx('ink60', 'dark')} Secondary Ink (>6.4:1 AA) */
    --jd-ink-30:           ${c.ink30.dark.$value};  /* ${hx('ink30', 'dark')} Hairline / Disabled */
    --jd-signal-error:     ${c.signalError.dark.$value};  /* ${hx('signalError', 'dark')} Accessible Error */
    --jd-signal-error-hc:  ${c.signalError.darkHighContrast.$value};
    --accent-ink:          var(--jd-accent-ink, ${accentInkDark});
  }
}

/* Standalone so a bundle that drops the dark scope selector below (a downstream bundler may strip
   the [data-theme="dark"] list entry and the prefers-color-scheme block) still gives a dark page its dark ink. */
:root[data-theme="dark"] {
  --accent-ink: var(--jd-accent-ink, ${accentInkDark});
}

[data-theme="dark"],
.palette-dark {
  --jd-substrate:        ${c.substrate.dark.$value};
  --jd-surface-elevated: ${c.surfaceElevated.dark.$value};
  --jd-surface-recessed: ${c.surfaceRecessed.dark.$value};

  --jd-ink-100:          ${c.ink100.dark.$value};
  --jd-ink-60:           ${c.ink60.dark.$value};
  --jd-ink-30:           ${c.ink30.dark.$value};
  --jd-signal-error:     ${c.signalError.dark.$value};
  --jd-signal-error-hc:  ${c.signalError.darkHighContrast.$value};
${scopedAliases(accentInkDark)}
}

/* Nested light subtree inside a dark page. */
[data-theme="light"] {
  --jd-substrate:        ${c.substrate.light.$value};
  --jd-surface-elevated: ${c.surfaceElevated.light.$value};
  --jd-surface-recessed: ${c.surfaceRecessed.light.$value};

  --jd-ink-100:          ${c.ink100.light.$value};
  --jd-ink-60:           ${c.ink60.light.$value};
  --jd-ink-30:           ${c.ink30.light.$value};
  --jd-signal-error:     ${c.signalError.light.$value};
  --jd-signal-error-hc:  ${c.signalError.lightHighContrast.$value};
${scopedAliases(accentInkLight)}
}

/* =========================================================================
   ACCESSIBILITY: HIGH CONTRAST (PREFERS-CONTRAST: MORE & DATA-CONTRAST="HIGH")
   Promotes secondary ink to AAA (>=7.0:1) and calibrates signalError to AAA.
   Scales hairline rules to 2px bold rules.
   The scheme-specific AAA error colour lives in --jd-signal-error-hc, set by the scheme
   rules above, so one high-contrast rule serves light and dark. Every selector below has
   specificity equal to or above the matching scheme rule and appears after it.
   ========================================================================= */
@media (prefers-contrast: more) {
  :root:not([data-contrast="normal"]),
  [data-theme]:not([data-contrast="normal"]),
  .palette-dark:not([data-contrast="normal"]) {
    --jd-rule: var(--jd-rule-bold);
    --rule: var(--jd-rule-bold);
    --jd-ink-60: var(--jd-ink-100);
    --jd-ink-30: var(--jd-ink-100);
    --jd-signal-error: var(--jd-signal-error-hc);
  }
}

:root[data-contrast="high"],
[data-contrast="high"],
[data-contrast="high"] [data-theme],
[data-contrast="high"] .palette-dark,
[data-theme][data-contrast="high"],
.palette-dark[data-contrast="high"] {
  --jd-rule: var(--jd-rule-bold);
  --rule: var(--jd-rule-bold);
  --jd-ink-60: var(--jd-ink-100);
  --jd-ink-30: var(--jd-ink-100);
  --jd-signal-error: var(--jd-signal-error-hc);
}

/* =========================================================================
   EXAMPLE PALETTES
   ========================================================================= */
.palette-pastel {
${scopedAliases(null)}
  --jd-bg1: var(--jd-paper);
  --jd-bg2: oklch(0.93 0.012 92);
  --jd-fg1: oklch(0.20 0 0);
  --jd-fg2: var(--jd-ink-60);
  --jd-line: oklch(0.20 0 0);
  --jd-primary:   oklch(0.88 0.05 250);
  --jd-secondary: oklch(0.88 0.06 30);
  --jd-tertiary:  oklch(0.88 0.05 150);
  --jd-accent: var(--jd-primary);
}
`;
}

function generateTailwindCss() {
  const r = tokens.radius;

  return `/**
 * Judarn Design System – Tailwind CSS v4 Theme Preset
 * Bridges Judarn dual-tier OKLCh tokens and 8/4 grid hierarchy directly into Tailwind v4.
 * Generated from tokens/judarn-tokens.json  –  do not edit directly.
 */
@import "./colors_and_type.css";

@theme {
  /* Surface & Color Tokens */
  --color-substrate: var(--jd-substrate);
  --color-surface-elevated: var(--jd-surface-elevated);
  --color-surface-recessed: var(--jd-surface-recessed);
  --color-ink-100: var(--jd-ink-100);
  --color-ink-60: var(--jd-ink-60);
  --color-ink-30: var(--jd-ink-30);
  --color-signal-error: var(--jd-signal-error);
  --color-accent: var(--accent);
  --color-accent-fg: var(--accent-fg);
  --color-accent-ink: var(--accent-ink);

  /* Semantic Aliases. --color-white and --color-black stay at Tailwind's defaults:
     remapping them to scheme-following colours breaks every white-on-fill utility. */
  --color-paper: var(--jd-substrate);

  /* Typography Font Slots */
  --font-display: var(--jd-font-display);
  --font-body: var(--jd-font-body);
  --font-data: var(--jd-font-data);
  --font-mono: var(--jd-font-mono);

  /* 8/4 Spatial Hierarchy Grid */
  --spacing-half: var(--jd-space-half);
  --spacing-1: var(--jd-space-1);
  --spacing-2: var(--jd-space-2);
  --spacing-3: var(--jd-space-3);
  --spacing-4: var(--jd-space-4);
  --spacing-touch: var(--jd-space-touch);
  --spacing-6: var(--jd-space-6);
  --spacing-8: var(--jd-space-8);
  --spacing-12: var(--jd-space-12);
  --spacing-16: var(--jd-space-16);

  /* Hairline Border Rules */
  --border-width-rule: var(--jd-rule);
  --border-width-rule-bold: var(--jd-rule-bold);
  --border-width-rule-heavy: var(--jd-rule-heavy);

  /* Platform Authority Radii */
  --radius-subtle: var(--jd-radius-subtle, ${r.subtle.$value});
  --radius-control: var(--jd-radius-control, ${r.control.$value});
  --radius-card: var(--jd-radius-card, ${r.card.$value});
  --radius-badge: var(--jd-radius-badge, ${r.badge.$value});
  --radius-sm: var(--jd-radius-subtle, ${r.subtle.$value});
  --radius-md: var(--jd-radius-control, ${r.control.$value});
  --radius-lg: var(--jd-radius-card, ${r.card.$value});
  --radius-xl: var(--jd-radius-card, ${r.card.$value});
  --radius-2xl: var(--jd-radius-card, ${r.card.$value});
  --radius-full: var(--jd-radius-badge, ${r.badge.$value});
}
`;
}

function generateTailwindJs() {
  const r = tokens.radius;

  return `/**
 * Judarn Design Foundation – Tailwind CSS Plugin & Preset
 * Generated from tokens/judarn-tokens.json  –  do not edit directly.
 */
module.exports = function judarnTailwindPlugin({ addBase, theme }) {
  // Do not override global border radius to 0px; adhere to the shape rules in docs/DESIGN.md
};

module.exports.theme = {
  extend: {
    colors: {
      substrate: 'var(--jd-substrate)',
      'surface-elevated': 'var(--jd-surface-elevated)',
      'surface-recessed': 'var(--jd-surface-recessed)',
      'ink-100': 'var(--jd-ink-100)',
      'ink-60': 'var(--jd-ink-60)',
      'ink-30': 'var(--jd-ink-30)',
      'signal-error': 'var(--jd-signal-error)',
      accent: 'var(--accent)',
      'accent-fg': 'var(--accent-fg)',
      'accent-ink': 'var(--accent-ink)',
      paper: 'var(--jd-substrate)',
    },
    fontFamily: {
      display: 'var(--jd-font-display)',
      body: 'var(--jd-font-body)',
      data: 'var(--jd-font-data)',
      mono: 'var(--jd-font-mono)',
    },
    spacing: {
      half: 'var(--jd-space-half)',
      '1': 'var(--jd-space-1)',
      '2': 'var(--jd-space-2)',
      '3': 'var(--jd-space-3)',
      '4': 'var(--jd-space-4)',
      touch: 'var(--jd-space-touch)',
      '6': 'var(--jd-space-6)',
      '8': 'var(--jd-space-8)',
      '12': 'var(--jd-space-12)',
      '16': 'var(--jd-space-16)',
    },
    borderWidth: {
      rule: 'var(--jd-rule)',
      'rule-bold': 'var(--jd-rule-bold)',
      'rule-heavy': 'var(--jd-rule-heavy)',
    },
    borderRadius: {
      subtle: 'var(--jd-radius-subtle, ${r.subtle.$value})',
      control: 'var(--jd-radius-control, ${r.control.$value})',
      card: 'var(--jd-radius-card, ${r.card.$value})',
      badge: 'var(--jd-radius-badge, ${r.badge.$value})',
      DEFAULT: 'var(--jd-radius-control, ${r.control.$value})',
      sm: 'var(--jd-radius-subtle, ${r.subtle.$value})',
      md: 'var(--jd-radius-control, ${r.control.$value})',
      lg: 'var(--jd-radius-card, ${r.card.$value})',
      xl: 'var(--jd-radius-card, ${r.card.$value})',
      '2xl': 'var(--jd-radius-card, ${r.card.$value})',
      full: 'var(--jd-radius-badge, ${r.badge.$value})',
    },
  },
};
`;
}

function generateDesignMarkdown() {
  const s = tokens.space;
  const b = tokens.border;
  const r = tokens.radius;
  const c = tokens.color;
  const t = tokens.typography;
  const describeColor = (spec, fallback) => {
    const name = spec.name || fallback;
    return spec.name ? `${name}, \`${spec.hex}\`` : name;
  };

  let themesSection = '';
  for (const [key, theme] of harmonyEntries()) {
    themesSection += `### ${theme.title || key}
- **Substrate (Light)**: \`${theme.substrate.light.$value}\` (${describeColor(theme.substrate.light, 'Tint')})
- **Surface Elevated (Light)**: \`${theme.surfaceElevated.light.$value}\` (${describeColor(theme.surfaceElevated.light, 'Surface')})
- **Primary Accent**: \`${theme.accent.light.$value}\` (${describeColor(theme.accent.light, 'Accent')})
- **Secondary Accent**: \`${theme.accentSecondary.light.$value}\` (${describeColor(theme.accentSecondary.light, 'Accent 2')})
\n`;
  }

  // Field fill against what surrounds it: substrate in surfaceElevated, surfaceRecessed on substrate.
  const fieldRatios = ['light', 'dark'].flatMap((m) => [
    contrastRatio(parseOklch(c.substrate[m].$value), parseOklch(c.surfaceElevated[m].$value)),
    contrastRatio(parseOklch(c.surfaceRecessed[m].$value), parseOklch(c.substrate[m].$value))
  ]);
  const fieldRange = `${Math.min(...fieldRatios).toFixed(2)} – ${Math.max(...fieldRatios).toFixed(2)}:1`;

  const typeRows = Object.entries(t).map(([key, spec]) => {
    const appleStyle = spec.appleTextStyleMacOS
      ? `\`.${spec.appleTextStyle}\` (macOS \`.${spec.appleTextStyleMacOS}\`)`
      : `\`.${spec.appleTextStyle}\``;
    return `| \`${key}\` | \`${spec.fontSize}\` | \`${spec.lineHeight}\` | \`${spec.appleLeading}\` | \`${spec.fontWeight}\` | \`${spec.tracking}\` | ${appleStyle} |`;
  }).join('\n');

  return `# DESIGN.md – Judarn Design System Specifications

> Canonical design rules, for people and for any AI agent. Generated automatically by \`scripts/compile-tokens.js\` from \`tokens/judarn-tokens.json\` – do not edit directly. Architecture choices and boundary invariants are codified in [\`docs/adr/\`](adr/README.md).

---

## 1. Scope & Authority Split

Judarn is a personal design system: general rules for everything its owner makes, plus specific rules for each host. A host is anywhere the work lives: an operating system, a browser, a document editor, a printed page, or an AI tool.

- **General rules** (section 2) hold on every host.
- **Project profiles** record what one project always wants where it differs from Judarn ([\`docs/profiles/\`](profiles/README.md)).
- **Host rules** (section 3) adapt the general rules to one host, and add what they cannot say. They bind only that host.
- **Token values** (sections 4 to 6) are the source for compiled hosts, and a reference for everything else.

### Defaults and Overrides

Every rule here is the owner's default: how they want things when they ask for nothing else. The owner's word wins without justification.

1. **Precedence**: the owner's request, then the project's profile, then Judarn.
2. **Scope**: an override changes only what it names. Every other rule still applies.
3. **Adaptation**: rules that depend on an overridden choice adapt to it. Tints come from the owner's colors, weight roles map to the nearest weights of the owner's typeface, and ink is resolved on the owner's fills.
4. **Disclosure**: when work departs from a Judarn default at the owner's word, say so once, in one line: Judarn's default and what the work uses instead. Include any measured cost, such as a contrast ratio below its tier. Never argue, recommend reverting, or ask again.
5. **Settled**: record an override the owner approves in the project's profile, and never raise it again in that project. Work without a profile needs no record, and no override needs an ADR.
6. **Agents**: every "never", "only", and "must" binds an agent's own initiative. Depart from a default only at the owner's word.
7. **This repository**: here the rules define the defaults, so Judarn's tokens, compiled code, components, and generated docs follow them without exception.

Judarn provides colors, spatial rhythm, and typography while each host keeps its native curves, motion, and interaction feel.

| Domain | Judarn Owns | Host Owns |
| :--- | :--- | :--- |
| **Space** | 8pt grid, 4pt micro-subgrid, line lengths (\`65ch\`, \`45ch\`). | Viewport margins, safe areas, sheet detents. |
| **Color** | OKLCh tokens, light and dark scales, WCAG AA/AAA contrast ratios. | System materials, blur passes, dynamic trait switches. |
| **Data** | Tabular figures, numeric density, table alignment. | Dynamic Type scaling, system font fallbacks, locale parsing. |
| **Shape** | Scale tokens (\`radius.card\`, \`radius.control\`, \`radius.subtle\`, \`radius.badge\`). | Continuous squircle geometry, hardware corner matching, clipping style. |
| **Motion** | Contrast shifts between resting and active states. | Spring dynamics, touch ripples, gesture tracking, haptics. |
| **Type** | Font weights, line heights, tracking steps, which labels take uppercase. | Case mapping and locale, sentence structure, text layout. |

---

## 2. General Rules

These hold on every host.

1. **Color Roles**:
   - Build surfaces and running text from Judarn's neutrals: a substrate, an elevated surface, a recessed surface, and primary and secondary ink.
   - In light mode, the reading substrate is pure white (\`${hx('substrate', 'light')}\`), while boxes and cards step down to the subtle elevated surface (\`${hx('surfaceElevated', 'light')}\`) or a light tint of an accent color. Replace the substrate only when the owner asks.
   - Take accent colors from the owner when they give them, through the project's profile or the request. Otherwise the Sanzo Wada dictionary is a source of suggestions (section 7), and a neutral result is valid.
   - Measure every accent color, the owner's or the dictionary's, against the same ratios per use, and report any shortfall to the owner.
   - Keep the signal color for errors and validation.

2. **Surface Hierarchy**:
   - Group surfaces by fill contrast: an elevated surface (or a light tint of an accent color) on the substrate.
   - A deeper **highlight tint** of the same color, about \`L ≈ 0.90 – 0.95\` at the color's hue with chroma of 0.04 or less, may mark a highlighted item or a header row inside a white or light-tinted area. Set its lightness directly, because the right mix with white depends on how light the color is.
   - Use at most two tint steps per color, the light tint and the highlight tint. Lightness carries the hierarchy and the hue says which color family or section it is. \`ink100\` sits on both, and the ratio is measured per use like any accent use.
   - Tints belong to light mode. Dark mode keeps its order through neutral fills.
   - **Never outline a card.**
   - Hairlines belong strictly inside tables and divider rules.
   - Where the host offers native translucent materials, elevated cards use them over synthetic fills.
   - Why: an outline breaks the white reading canvas and competes with the fill hierarchy, and dark mode keeps its order through fill alone.
   - **Text fields** are wells, set apart by fill alone: \`substrate\` inside an elevated surface or tint, and \`surfaceRecessed\` directly on the substrate. The label, the field's place in the form, and its focus ring identify it, so it draws no outline at rest.
   - Every field has a visible label, and a placeholder is not a label. The focus ring and the invalid ring each reach 3:1 against the surface around the field. High-contrast modes add an \`ink100\` outline.
   - The fill sits at ${fieldRange} against its surroundings, below the 3:1 that WCAG's Understanding document for 1.4.11 gives for fill-only inputs. That is an accepted cost, like white ink: **never darken a field fill or add an outline on ratios alone.** A project that must claim formal WCAG conformance records an outline in its profile.
   - **Buttons, badges, and tags** are set apart by fill alone too, with no outline at rest and no outlined variant. A quiet control or a neutral badge is a well like a text field, an accent badge may take the light tint of its color, and high-contrast modes add an \`ink100\` outline.

3. **Rhythm**:
   - Space things on an 8-unit grid, with a 4-unit subgrid for fine offsets.
   - Keep running text near 65 characters per line, and text in narrow columns near 45.

4. **Typography**:
   - Use the typefaces the owner or the project's profile names. Otherwise use the host's own typeface when it has one, and where it has none, choose one for the work.
   - Headings, titles, and the names of buttons and other controls use **sentence case** or **title case** – never forced uppercase, and a wordmark is not a title.
   - A wordmark is a product's name set as its mark, in one dedicated component or image that the project's profile names. It is not a heading. Its case, weight, size, and tracking are the owner's design. Its source string and accessible name are the name as written, and any uppercase comes from the host's case style. Everywhere else – headings, running text, labels, widgets, notifications – the name is written as a word.
   - Write every string as it reads in a sentence. Capitalize acronyms and codes as they are written (RPE, 1RM, e1RM) and keep unit symbols in their standard case (kg, km, min, kcal). Uppercase is a style, never typed into the text, because a blanket transform garbles terms such as e1RM and the kg column header.
   - A heading is the most prominent text in its block. An eyebrow sits on a larger title or value, and a section label names a group of rows or fields when nothing larger does. Eyebrows and section labels are small labels; section labels keep the host's heading semantics.
   - Set a small label in uppercase only when it is an eyebrow, section label, column header, or value label, runs at most two words, and holds no digit, unit, or mixed-case term. A control's own name (what it does or which option it picks), statuses, counts, values, units, and messages in a small style are set as written.
   - A small label keeps its role inside a control. A disclosure header that names its section is a section label: it keeps heading semantics and exposes whether it is expanded. An eyebrow or value label inside a control keeps its casing only when the control also shows the title or value it names.
   - Pair positive tracking only with uppercase labels, outside a wordmark. Where a host has no case style, write small labels in sentence case.
   - Wrapped lines in one paragraph or label add no space beyond the role's line height, because the owner reads open leading as gaps inside a paragraph. Space between paragraphs comes from spacing tokens, never from line height. Never set an open line height such as 1.5 on running text.
   - A heading belongs to the text it introduces. The space below a heading is smaller than the space between paragraphs, and the space above a heading is at least twice the space between paragraphs.
   - Numbers in tables and metrics **must use tabular lining figures**.

5. **Filled Surface Ink**:
   - Resolve ink on a filled surface with \`contrastingInk\`.
   - Judarn deliberately favors white ink beyond what contrast ratios suggest, because contrast math and the human eye disagree on filled components, and black ink turns saturated and mid-tone fills muddy. White ink falls to ${(1.05 / (PERCEPTUAL_LUMINANCE_CROSSOVER + 0.05)).toFixed(2)}:1 at the crossover, an accepted cost rather than a defect.
   - **Never override the resolved ink or add a local ink helper on ratios alone.** The crossover changes only in Judarn, after the owner reviews rendered examples.

---

## 3. Host Rules

These bind only the host they name. A host gets rules when something is made there, and a host with no rules here follows section 2. Instructions for one AI exist only for what other agents cannot reach, and never in section 2 or in the tokens.

### Compiled Hosts

Apple and web take their values from \`tokens/judarn-tokens.json\`, with zero drift ([ADR-0001](adr/0001-design-tokens-are-the-single-source-of-truth.md)).

- **Shape**: host physics, hardware curves, and native interaction states are never overridden.
  - Never clip cards with sharp rectangles (\`Rectangle()\`).
  - SwiftUI: Cards use \`RoundedRectangle(cornerRadius: ${parsePx(r.card.$value)}, style: .continuous)\`, Controls use \`RoundedRectangle(cornerRadius: ${parsePx(r.control.$value)}, style: .continuous)\` on iOS and \`cornerRadius: ${parsePx(r.subtle.$value)}\` on macOS, Tags use \`Capsule()\`.
  - Web CSS: Cards use \`var(--jd-radius-card, ${r.card.$value})\`, Controls use \`var(--jd-radius-control, ${r.control.$value})\`.
- **Surfaces**:
  - Contrast surfaces by background fill (\`surfaceElevated\` on \`substrate\`).
  - **Never apply \`.border(...)\` or \`.overlay(strokeBorder(...))\` around card perimeters.**
  - Hairlines use \`rule = 1px\`.
  - Text fields fill with \`surfaceRecessed\`, or \`substrate\` inside a card (\`.jd-card\` on web, \`JudarnCard\` on Apple). At rest they keep a transparent border on web, so Windows high-contrast mode can still draw it, and no stroke on Apple. \`prefers-contrast: more\`, \`data-contrast="high"\`, and Apple's Increase Contrast turn it into an \`ink100\` outline.
  - Buttons, badges, and tags follow the same rule: a transparent resting border on web, no stroke on Apple, and an \`ink100\` outline in the same high-contrast modes. The ghost button stays text with its hover underline.
  - Web component classes carry the \`jd-\` prefix (\`.jd-btn\`, \`.jd-card\`, \`.jd-table\`), so a project's own class names never pick up Judarn's styles.
  - The focus ring takes the accent and the invalid ring \`signalError\`. Apple clamps the focus ring to 3:1 with \`contrastingAccent\`; on web a project that sets \`--jd-accent\` measures it.
- **Type**:
  - Use the 12-step scale in section 5, and the system font stack in the tokens.
  - Apple takes leading from the role's \`appleLeading\` through \`Font.leading\`, never \`lineSpacing\`, so text styles and Dynamic Type stay intact. Roles for running text and headings are \`tight\`, and \`label\`, \`micro\`, \`data\`, and \`mono\` are \`standard\`. Tight leading removes 2pt per line break and leaves single-line text unchanged (measured on iOS 27.2 and macOS, 2026-11-09).
  - Apple roles never set a fixed point size. A role names \`appleTextStyleMacOS\` only where its own style would render at the same size on macOS as a smaller role (\`.footnote\`, \`.caption\`, and \`.caption2\` are all 10pt there), so each role keeps its size rank on every Apple host.
  - Web sets the space around headings with \`.flow\`, a class on the container that spaces its direct children: \`space2\` (${s['2'].$value}) between items, \`space4\` (${s['4'].$value}) above a heading, and \`space1\` (${s['1'].$value}) below a heading, which wins when a heading follows a heading. Headings are \`h1\` to \`h6\` and the \`.t-display\` and \`.t-h1\` to \`.t-h4\` classes. Top-level sections sit \`space6\` (${s['6'].$value}) apart. Never combine \`.flow\` with \`gap\` on the same container, because the two add up.
  - Restrict uppercase transformations to \`label\` and \`micro\`, with tracking of \`+0.06em\` on label and \`+0.08em\` on micro. Both styles take an as-written casing (\`judarnLabel(casing: .asWritten)\`, \`.t-as-written\`) that keeps size and weight with body tracking, for every string the general rule does not let uppercase.
  - Never pass a unit symbol or mixed-case term to the uppercase casing. A header row that mixes them sets each cell on its own.
  - Data matrices use \`tabular-nums\` or \`.monospacedDigit()\`.
- **Ink**:
  - \`contrastingInk\` is \`getContrastingInk\` on web.
  - \`contrastingAccent\` (Apple) answers a different question: it clamps an accent color used as a foreground to a ratio against a surface ([ADR-0005](adr/0005-compile-time-contrast-checks-and-gamut-mapping.md)).
- **Touch**: Keep touch targets at or above \`spaceTouch\`.
- **Rendered AI artifacts**: An artifact follows the rules of the host it depicts or ships to, not the container it is delivered in. A page, deck, or dashboard rendered in a browser follows the web rules, a mockup of an app screen follows that app's host, and a poster or invitation follows print.

### Local Variants

A local variant keeps its own values, because the tool needs choices made up front or cannot read Judarn's output. It depends on Judarn, and Judarn never depends on it. Its differences from the tokens are not defects, its choices never become general rules or tokens, and it can change at any time.

| Variant | Where | Why it differs |
| :--- | :--- | :--- |
| Google Docs, Google Slides, Word, and PowerPoint | \`templates/\` | Google Docs needs its fonts and colors chosen beforehand. |

---

## 4. Spatial Grid & Dimensions

- **Micro Subgrid**: \`spaceHalf\` = ${s.half.$value} (hairlines, leading adjustments, micro offsets).
- **Touch Target Floor**: \`spaceTouch\` = ${s.touch.apple} (Apple / Web).
- **Macro Grid**:
  - \`space1\` = ${s['1'].$value}
  - \`space2\` = ${s['2'].$value}
  - \`space3\` = ${s['3'].$value}
  - \`space4\` = ${s['4'].$value}
  - \`space6\` = ${s['6'].$value}
  - \`space8\` = ${s['8'].$value}
  - \`space12\` = ${s['12'].$value}
  - \`space16\` = ${s['16'].$value}
- **Reading Measures**:
  - \`measureBody\` = ${tokens.measure.body.$value} (${tokens.measure.body.points})
  - \`measureCompact\` = ${tokens.measure.compact.$value} (${tokens.measure.compact.points})
  - \`measureSidebar\` = ${tokens.measure.sidebar.$value}
- **Dividers & Rules**:
  - \`rule\` = ${b.rule.$value}
  - \`ruleBold\` = ${b.ruleBold.$value}
  - \`ruleHeavy\` = ${b.ruleHeavy.$value}

---

## 5. Typographic Scale (12-Step Canonical Descriptors)

| Style | Size | Line Height | Apple Leading | Weight | Tracking | Apple TextStyle |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${typeRows}

---

## 6. Color System (Perceptually Uniform OKLCh)

### Core Neutrals (Dual-Tier Light & Dark)
| Token | Light (sRGB / OKLCh) | Dark (Carbon) | Accessibility Contract |
| :--- | :--- | :--- | :--- |
| \`substrate\` | \`${c.substrate.light.$value}\` | \`${c.substrate.dark.$value}\` | Canvas substrate |
| \`surfaceElevated\` | \`${c.surfaceElevated.light.$value}\` | \`${c.surfaceElevated.dark.$value}\` | Card substrate |
| \`surfaceRecessed\` | \`${c.surfaceRecessed.light.$value}\` | \`${c.surfaceRecessed.dark.$value}\` | Text field wells on the substrate & hovers (fill only, ${fieldRange} accepted, section 2) |
| \`ink100\` | \`${c.ink100.light.$value}\` | \`${c.ink100.dark.$value}\` | Primary text (\`>= 15.0:1\` AAA) |
| \`ink60\` | \`${c.ink60.light.$value}\` | \`${c.ink60.dark.$value}\` | Secondary text (\`>= 4.8:1\` AA) |
| \`ink30\` | \`${c.ink30.light.$value}\` | \`${c.ink30.dark.$value}\` | Hairlines & disabled |
| \`signalError\` | \`${c.signalError.light.$value}\` | \`${c.signalError.dark.$value}\` | Error & validation |

${themesSection ? `## 7. Optional Sanzo Wada Harmonies

${tokens.theme.$description} See [ADR-0007](adr/0007-sanzo-wada-dictionary-explorer-and-mcp-server.md).

- The dictionary suggests accent colors when the owner gives none. Colors the owner gives take precedence and are equally valid.
- Light tints of accent colors, the owner's or the dictionary's (for example, \`L ≈ 0.968 – 0.980\` at the color's hue or mixing \`10% – 18%\` of the color with white in OKLCh), are welcome in general work as box and card fills on the white light-mode substrate. The deeper highlight tint in section 2 (\`L ≈ 0.90 – 0.95\`) follows the same rule, with at most two tint steps per color.
- Use a full harmony theme (replacing the substrate) only when a project or its owner asks for one ([ADR-0007](adr/0007-sanzo-wada-dictionary-explorer-and-mcp-server.md)).
- Core inks are not guaranteed on a harmony's surfaces. Resolve foregrounds with \`contrastingInk\` (\`getContrastingInk\` on web) or \`contrastingAccent\` (Apple), then verify the resulting ratio per use, because the compile-time checks do not cover harmony contrast.
- That check does not relax the filled surface ink invariant in section 2. A low ratio from \`contrastingInk\` is a finding to report to the project's owner, not a reason to replace the ink.
- These palettes derive from Sanzo Wada's 1930s dictionary (*Haishoku Sōkan*), calibrated in OKLCh. The full 348-combination dictionary is queryable via the \`tools/wada-explorer/\` MCP server.
- Harmony #264 carries calibration offsets from the dictionary hex: the substrate (dictionary \`#b7c2a9\`), Cerulian Blue (\`#0093a5\`) and Red Orange (\`#dd4027\`) are hand-tuned in OKLCh, and the two accents are pulled into sRGB (ADR-0007). Each token's \`hex\` is the sRGB value of its own OKLCh components, so values and \`hex\` agree; the dictionary hex survives only in \`tools/wada-explorer/data/\`.

${themesSection}` : ''}
`;
}

// -------------------------------------------------------------
// Targets Mapping
// -------------------------------------------------------------

const targets = [
  {
    path: path.join(rootDir, 'docs/DESIGN.md'),
    name: 'docs/DESIGN.md (AI Specification)',
    generate: generateDesignMarkdown
  },
  {
    path: path.join(rootDir, 'platforms/apple/Sources/Judarn/JudarnSpacing.swift'),
    name: 'Apple Native JudarnSpacing.swift',
    generate: generateSwiftSpacing
  },
  {
    path: path.join(rootDir, 'platforms/apple/Sources/Judarn/JudarnColors.swift'),
    name: 'Apple Native JudarnColors.swift',
    generate: generateSwiftColors
  },
  {
    path: path.join(rootDir, 'platforms/apple/Sources/Judarn/JudarnTypography.swift'),
    name: 'Apple Native JudarnTypography.swift',
    generate: generateSwiftTypography
  },
  {
    path: path.join(rootDir, 'platforms/web/styles/colors_and_type.css'),
    name: 'Web colors_and_type.css',
    generate: generateWebCss
  },
  {
    path: path.join(rootDir, 'platforms/web/styles/tailwind-theme.css'),
    name: 'Web tailwind-theme.css',
    generate: generateTailwindCss
  },
  {
    path: path.join(rootDir, 'platforms/web/src/tailwind.js'),
    name: 'Web src/tailwind.js',
    generate: generateTailwindJs
  }
];

console.log('=== Judarn Automated Design Token Compilation Pipeline ===\n');

let hasDrift = false;

for (const target of targets) {
  const content = target.generate();

  if (isCheck) {
    if (!fs.existsSync(target.path)) {
      console.error(`✗ Missing target file: ${target.name} (${target.path})`);
      hasDrift = true;
      continue;
    }
    const current = fs.readFileSync(target.path, 'utf8');
    if (current !== content) {
      console.error(`✗ Token drift detected in ${target.name}`);
      hasDrift = true;
    } else {
      console.log(`✓ ${target.name} matches canonical schema.`);
    }
  } else {
    fs.writeFileSync(target.path, content, 'utf8');
    console.log(`✓ Compiled ${target.name}`);
  }
}

// Every token must feed an output; an unread token is dead data and fails the build.
const unread = tracked.unreadTokens();
if (unread.length) {
  console.error(`✗ Tokens no emitter reads (consume them or remove them):\n  - ${unread.join('\n  - ')}`);
  process.exit(1);
}

if (isCheck) {
  if (hasDrift) {
    console.error('\nToken drift check failed! Run `node scripts/compile-tokens.js` to re-sync targets.');
    process.exit(1);
  }
  console.log('\n✓ All targets match canonical tokens with 0 drift.');
} else {
  console.log('\n✓ All platform targets successfully compiled from tokens/judarn-tokens.json.');
}
