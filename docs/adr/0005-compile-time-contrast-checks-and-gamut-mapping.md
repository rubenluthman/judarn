# Compile-time contrast checks and gamut mapping
Status: Active · 2026-10-31

## Decision

`scripts/compile-tokens.js` checks contrast exhaustively before it generates any host code, in plain Node with no solver and no native dependency.

- The checked domain is 48 pairings: 4 modes (`light`, `dark`, `lightHighContrast`, `darkHighContrast`) × 3 surfaces (`substrate`, `surfaceElevated`, `surfaceRecessed`) × 4 foregrounds (`ink100`, `ink60`, `ink30`, `signalError`). `ink30` is a hairline and disabled tone: 1.25:1 in standard modes, 7.0:1 under high contrast. A non-compliant token aborts compilation.
- The gate also proves surface lightness order (light modes: recessed < elevated < substrate; dark modes: recessed < substrate < elevated), typography scale monotonicity, 4pt and 8pt spacing divisibility, and the uppercase rule (only `label` and `micro` are uppercase, with tracking of at least +0.06em).
- Luminance is computed on linearised sRGB with the same formulas in Swift and JavaScript.
- Out-of-gamut OKLCh colours are mapped to sRGB by a 24-step binary search along chroma at constant lightness and hue. Never clamp channels.
- Two crossovers coexist and must not be swapped. `contrastingInk` uses the perceptual crossover (white ink up to luminance 0.50, see `docs/DESIGN.md` section 2). `contrastingAccent` uses the WCAG crossover √(1.05 × 0.05) − 0.05 ≈ 0.1791, the point where black and white reach equal ratios, and the gate proves it reaches 4.5:1 on every surface. The WCAG crossover is defined once in the compiler and emitted into Swift.
- Documentation never promises a contrast ratio above the reachable ceiling of about 4.58:1 on surfaces near the crossover.
- Harmonies are outside the contrast gate ([ADR-0007](0007-sanzo-wada-dictionary-explorer-and-mcp-server.md)).

## Why

Contrast on gamma-encoded values inverts ink choices around mid-greys, and clamping out-of-gamut colours shifts hue. Checking a small finite domain in the compiler catches both at build time with no toolchain to install. A solver (Z3) would add native tooling and still need non-linear arithmetic for OKLCh and the sRGB curve. A single shared crossover failed: `contrastingAccent` lightened toward white on mid-tones, where it cannot reach 4.5:1 (on `#808080` it gave 3.95:1 while black gives 5.3:1), so each function keeps the threshold that answers its own question.

## What we gave up

- **Formal proof.** Exhaustive testing of a finite domain is not proof for unbounded ones.
- **Free tuning.** Every new or retuned token must pass the 48-pairing matrix before it compiles.
- **One crossover.** On mid-tone surfaces `contrastingAccent` can return a darker foreground than the white `contrastingInk` picks. Readers must know which question each answers.

## Revisit if

The colour domain grows past what exhaustive checking covers in a few seconds, or a dependency-free verifier appears that proves it symbolically.
