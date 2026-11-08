---
status: accepted
date: 2026-10-31
deciders: Ruben Luthman
tags: [color, math, verification, compiler, accessibility, oklch]
---

# Compile-Time Contrast Checks and Gamut Mapping

## Context and Problem Statement

Cross-platform design systems face three risks in colour science and contract verification:

1. **Colour math accuracy:** computing contrast or contrasting foreground ink directly against gamma-encoded sRGB values causes severe contrast regressions and inverted black and white ink choices around middle greys.
2. **Gamut mapping distortion:** truncating out-of-gamut OKLCh colours by clamping channels (`clamp(0, 1)`) produces unpredictable hue shifts and lightness drift on sRGB displays.
3. **Verification fragility:** validating accessibility and surface relationships through disconnected test mirrors or heavy external engines (SMT solvers such as Z3, provers such as Lean or Coq, phantom or role-indexed type systems) adds friction, slow loops, and brittle toolchains.

A later review found two further gaps. `contrastingAccent` answers a different question than `contrastingInk`: which direction can reach a numeric contrast ratio. When it shared the perceptual crossover of [ADR-0006](0006-contrasting-ink-favours-white.md) it lightened toward white on surfaces with $Y \in (0.1791, 0.50]$, which cannot reach 4.5:1 there. On `#808080` it returned white at 3.95:1 while black reaches 5.3:1, and no test exercised it. Separately, the checked domain was written with three foregrounds (36 pairings) while the compile-time checks verified 48 pairings over four foregrounds.

How do we guarantee precise colour conversion and contrast compliance across all appearance modes with no external verification dependency, and state which threshold governs which function?

Originally decided 2026-10-27; the verification scope was added 2026-10-31.

## Decision Drivers

- WCAG AA/AAA compliance across all combinations of appearance, surface, and foreground.
- Perceptual uniformity during gamut mapping, with no hue or lightness shift.
- No external verification dependencies.
- A deterministic, fast pre-commit set of compile-time checks in plain Node.js with no native bindings.
- Mathematical parity across Apple (Swift) and web (JavaScript / CSS).
- A function that returns a ratio-clamped colour must pick a direction that can reach the ratio.
- The compile-time checks verify the same constant that ships, and accepted records describe the domain the gate actually checks.

## Considered Options

- **Option 1: Exhaustive finite-domain verification and chroma bisection inside the compiler, with separate crossovers per question.**
- **Option 2: External SMT solver (Z3) pipeline.**
- **Option 3: Type-level role and contrast encoding** (phantom or role types in Swift).
- **Option 4: Naive clamping with runtime contrast audits.**
- **Option 5: Choose the `contrastingAccent` clamp direction by comparing reachable ratios at runtime.**
- **Option 6: Keep one perceptual crossover and weaken the `contrastingAccent` contract.**

## Decision Outcome

Chosen option: **Option 1**, because it needs no dependency, runs anywhere Node.js runs, and checks every case in a small finite domain. It is exhaustive testing, not a solver-backed proof. Separate crossovers fit because the WCAG crossover is the exact point where the reachable ratio flips, so it answers the reachability question with one constant comparison.

The compiler defines the WCAG crossover $Y^* = \sqrt{1.05 \times 0.05} - 0.05 \approx 0.1791$ once and emits it into the Swift target. `contrastingAccent` clamps toward black on surfaces above it and toward white on surfaces at or below it. `contrastingInk` keeps the perceptual crossover of [ADR-0006](0006-contrasting-ink-favours-white.md).

The compile-time contrast checks' domain is the 48-pairing Cartesian matrix:

$$\text{Modes} \in \{\text{light}, \text{dark}, \text{lightHC}, \text{darkHC}\} \times \text{Surfaces} \in \{\text{substrate}, \text{surfaceElevated}, \text{surfaceRecessed}\} \times \text{Foregrounds} \in \{\text{ink100}, \text{ink60}, \text{ink30}, \text{signalError}\}$$

`ink30` is a hairline and disabled tone, so it requires 1.25:1 in standard appearances and 7.0:1 under high contrast.

### Invariants & Negative Constraints

1. **Linearised luminance:** all luminance computations in Swift and JavaScript linearise gamma-encoded sRGB channels before calculating $Y = 0.2126 R_{\text{lin}} + 0.7152 G_{\text{lin}} + 0.0722 B_{\text{lin}}$. The formulas stay identical on every host.
2. **Bisection gamut mapping:** out-of-gamut OKLCh colours are mapped to sRGB by a 24-step binary search along the chroma axis at constant lightness ($L$) and hue ($H$). Naive channel clamping and empirical tolerance offsets are prohibited.
3. **Exhaustive compile-time checks:** `scripts/compile-tokens.js` runs as a zero-dependency finite-domain check in Node.js before any host code is generated or verified, and evaluates the full 48-pairing matrix above.
4. **Mode-polar surface ordering:** the gate proves the surface lightness ordering of [ADR-0004](0004-surface-hierarchy-without-card-borders.md) in every appearance mode: $L(\text{surfaceRecessed}) < L(\text{surfaceElevated}) < L(\text{substrate})$ in the light modes, and $L(\text{surfaceRecessed}) < L(\text{substrate}) < L(\text{surfaceElevated})$ in the dark modes.
5. **Scale checks:** the gate asserts typography scale monotonicity ($S_i < S_{i+1}$), spatial lattice divisibility (4pt / 8pt), and the tracking and casing biconditional: $\text{isUppercase}(t) \iff t \in \{\text{label}, \text{micro}\}$, and uppercase roles carry tracking of at least $+0.06\text{em}$.
6. **No shadow literals:** typography descriptors, reading measures, and spatial touch-target floors (`spaceTouch`) originate in the token files and compile directly into the Swift, CSS, and documentation targets, without disconnected test mirrors.
7. **Crossover separation:** `contrastingInk` uses only the perceptual crossover ([ADR-0006](0006-contrasting-ink-favours-white.md)). `contrastingAccent` uses only the WCAG crossover. Neither function may adopt the other's threshold.
8. **Single definition:** the WCAG crossover is defined once in `scripts/compile-tokens.js`. Host targets must not hardcode their own value.
9. **Reachability proof:** the gate verifies that the `contrastingAccent` clamp direction reaches at least 4.5:1 on every surface luminance.
10. **No unreachable promises:** documentation must not guarantee a `minRatio` above the reachable ceiling of about 4.58:1 on surfaces near the crossover. Above that ceiling, `contrastingAccent` resolves to the strongest reachable ink.

### Positive Consequences

- Contrast is computed on linearised luminance, which removes gamma-encoding errors and ambiguous crossover decisions in standard and high-contrast modes.
- CSS Color 4 chroma bisection preserves perceived colour character during sRGB mapping.
- The gate checks all 48 pairings, surface ordering, and typographic scales with no native binaries or external packages.
- `contrastingAccent` reaches 4.5:1 on every surface, including the mid-tones that Wada colours often occupy, and the ink selection of [ADR-0006](0006-contrasting-ink-favours-white.md) is unchanged.

### Negative Consequences

- **Bisection overhead.** 1D chroma bisection takes 24 iterations per out-of-gamut conversion against one cycle for clamping. Worst case: negligible for compilation and token caching. Set aside: clamping, for its hue distortion.
- **Strict calibration requirement.** Introducing or tuning a token requires compliance with the Cartesian matrix, and a non-compliant token aborts compilation. Set aside: runtime audits that would find the defect later.
- **Manual algorithms in the build script.** The gate and the mapping are maintained in `scripts/compile-tokens.js`. Set aside: an SMT solver, which would add native Python or C++ toolchains and need non-linear arithmetic theories for OKLCh cube roots and the sRGB transfer function.
- **Two luminance crossovers coexist.** Readers must know which question each answers. Worst case: on mid-tone surfaces `contrastingAccent` returns a darker foreground than the white `contrastingInk` selects on the same surface. The divergence is accepted.
- **Exhaustive testing over a small finite domain is not a proof for unbounded domains.** Set aside: formal symbolic verification.

## Pros and Cons of the Options

### Option 1: Finite-domain verification and bisection in the compiler, separate crossovers

- Good, because it has zero dependencies, converges deterministically in $O(\log_2(1/\epsilon))$ time, and checks $N = 48$ cases.
- Good, because the crossover answer is $O(1)$ with no extra luminance evaluation, and the gate can prove reachability over the whole luminance range.
- Bad, because manual algorithms must be maintained, and a second named constant exists.

### Option 2: External SMT solver (Z3)

- Good, because it provides formal symbolic verification across unbounded domains.
- Bad, because it adds native toolchain dependencies, slows CI, and complicates local setup.

### Option 3: Type-level role and contrast encoding

- Good, because the Swift compiler could enforce role pairings at API boundaries.
- Bad, because it pollutes consumer APIs with generic signatures (`InkToken<Level>`, `SurfaceToken<T>`) and cannot bridge into web CSS or declarative templates.

### Option 4: Naive clamping with runtime contrast audits

- Good, because implementation is trivial.
- Bad, because clipping distorts hue and lightness, and defects surface in downstream runtime suites instead of at compilation.

### Option 5: Runtime comparison of reachable ratios

- Good, because it needs no named crossover.
- Bad, because it computes the same answer with more arithmetic and duplicates the comparison across hosts.

### Option 6: Keep the perceptual crossover and weaken the contract

- Good, because no code changes.
- Bad, because a contrast function would return 1.91:1 on some surfaces while black is available, leaving the defect in place.
