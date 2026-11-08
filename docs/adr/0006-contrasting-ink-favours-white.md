---
status: accepted
date: 2026-10-31
deciders: Ruben Luthman
tags: [color, math, verification, accessibility, perceptual-contrast]
---

# Contrasting Ink Favours White

## Context and Problem Statement

The first crossover for `contrastingInk` was the unweighted photopic WCAG threshold:

$$Y^* = \sqrt{1.05 \times 0.05} - 0.05 \approx 0.17912878$$

Surfaces with $Y > Y^*$ received black ink (`ink100`), and $Y \le Y^*$ received white ink. Applied to bounded component fills (badges, pills, chips, accent buttons), that cutoff fails two ways:

1. **Helmholtz–Kohlrausch effect:** saturated chromatic surfaces ($C \ge 0.10$, for example Wada Red Orange `#dd4027`, Coral, Cerulean `#0093a5`, and Cyan at $Y \in [0.18, 0.40]$) mechanically receive black ink. Saturated colours look brighter than their luminance suggests, so black type on them reads heavier and less legible than white.
2. **Negative-polarity asymmetry:** human contrast sensitivity is asymmetric, as psychophysics and the Accessible Perceptual Contrast Algorithm (APCA, WCAG 3) show. On filled surfaces, light text on a dark ground keeps crisp edge definition across middle greys, steel blue, and muted sage up to $Y \approx 0.50$, while black text on mid-tones looks muddy and heavy.

A consuming app showed the failure first: it suddenly rendered black text on many fills that looked right in white. Moving the crossover to 0.50 (2026-10-28) fixed it. On 2026-10-31 the crossover was lowered to 0.30 on WCAG ratios, which sent Coral, Salmon, Vivid Cyan, Deep Sky Blue, Orange, Lime Green, and Muted Sage back to black ink and reintroduced the problem. The ratios behind 0.30 were accurate, but they do not decide this question: contrast math and the human eye disagree on filled components, and the owner's judgment of real interfaces takes priority. The 0.50 crossover was restored the same day.

How do we calibrate `contrastingInk` across Apple and web to match human perception, and stop the reasoning behind 0.30 from returning?

Originally decided 2026-10-28; the 0.30 detour and the restoration happened 2026-10-31.

## Decision Drivers

- Crisp negative polarity (white text) on chromatic fills, muted tones, and mid-greys.
- No chromostereopsis or optical vibration on saturated accents.
- Determinism and zero runtime allocation: an $O(1)$ comparison.
- Identical behaviour on Apple (Swift) and web (JavaScript).
- Verification inside the existing compile-time checks ([ADR-0005](0005-compile-time-contrast-checks-and-gamut-mapping.md)), with no external dependency.
- The owner prefers more white ink than the math suggests, and visual judgment on real interfaces outranks a contrast ratio.

## Considered Options

- **Option 1: Unified perceptual crossover at $Y^* = 0.50$.**
- **Option 2: Chroma-gated piecewise threshold** ($C \ge 0.10 \implies Y^* = 0.50$, else $Y^* = 0.1791$).
- **Option 3: Full APCA runtime equation matrix.**
- **Option 4: Keep the WCAG crossover ($Y^* \approx 0.1791$) and let components override.**
- **Option 5: Lower the crossover to $Y^* = 0.30$ so white ink never falls below 3:1.**
- **Option 6: A value between 0.30 and 0.50.**

## Decision Outcome

Chosen option: **Option 1**, because it is the value the owner reviewed in real interfaces, it models the preference for negative polarity on filled surfaces, and it avoids chroma-boundary artefacts (Muted Sage or Steel Blue forced to muddy black text).

$$\text{contrastingInk} = \begin{cases}
\text{pureWhite} & \text{if } Y \le 0.50 \\
\text{pureBlack} \ (\text{ink100}) & \text{if } Y > 0.50
\end{cases}$$

Black ink is reserved for high-lightness pastel washes and substrates ($Y > 0.50$, including Lemon Yellow $Y = 0.85$, Wada Gold $Y = 0.58$, Pale Amber $Y = 0.84$, Mint Ice $Y = 0.82$, and Substrate Light $Y = 0.94$). The compiler defines the crossover once and emits it into the Swift target. Web's handwritten `getContrastingInk` keeps its own constant, and the compile-time checks fail if the two differ.

### Invariants & Negative Constraints

1. **Perception over ratios:** the `contrastingInk` crossover must not be lowered on the basis of contrast ratios alone. Any change requires the owner to review rendered examples, including every common colour that would change ink.
2. **Negative polarity:** surfaces with $Y \le 0.50$ receive white ink, and `contrastingInk` never resolves to black ink on them. All chromatic accents and mid-tones receive white ink.
3. **Positive polarity reservation:** black ink (`ink100` / `pureBlack`) is prohibited on filled surfaces unless linearised relative luminance strictly exceeds $0.50$.
4. **Parity:** the linearisation formulas ($c \le 0.04045 \implies c/12.92$, else $((c+0.055)/1.055)^{2.4}$) and the crossover must stay identical across the Swift and JavaScript implementations.
5. **Single definition:** the crossover is defined once in `scripts/compile-tokens.js`. Web's constant must match it, and no host may carry another value.
6. **Static inks:** `contrastingInk` and `getContrastingInk` return absolute black and white. They never return tokens that invert with colour scheme, because a filled surface does not invert.
7. **Boundary coverage:** benchmarks include a swatch on each side of the crossover, and the compile-time checks exhaustively verify the crossover across canonical tokens and the benchmark swatches.
8. **No component overrides:** components such as badges, chips, and buttons never keep custom contrast workarounds (ad-hoc hero ink helpers). Every filled component consumes canonical `contrastingInk`.

### Positive Consequences

- White type is sharp and balanced on all primary accents, muted colours (Muted Sage, Steel Blue), and mid-greys (Neutral Gray 128, Achromatic 118).
- White ink replaces black on vivid fills (Wada Red Orange, Coral, Cerulean, Crimson, Vivid Cyan); lighter accents such as Coral, cyan, and orange return to white ink.
- Selection needs one comparison, with no OKLab projection or matrix transform at runtime.
- Badges, chips, and buttons behave predictably with no per-component heuristics, and future agents have a recorded reason not to repeat the 0.30 change.

### Negative Consequences

- **White ink falls to 1.91:1 at the crossover.** The cost was first recorded as 4.0:1 on `#808080`, which is not the worst case: white reaches $1.05 / (0.50 + 0.05) \approx 1.91:1$ at $Y = 0.50$, and 2.12:1 on Lime Green `#32cd32`, where black reaches 9.9:1. Colours with $Y \in (0.183, 0.50]$ fall below the 4.5:1 AA floor for small text. On `#808080` ($Y \approx 0.216$) white reaches 3.95:1 while black reaches 5.3:1. Accepted as a deliberate design choice. Set aside: WCAG 2.x ratios as the criterion on filled components.
- **No white-ink floor.** The 3:1 floor of the 0.30 option does not apply, so the compile-time checks do not check it. Set aside: a provable floor.
- **Benchmarks once missed the boundary.** The original 13 swatches tested no colour near it, so nothing showed the ratio cost. Invariant 7 closes that gap.

## Pros and Cons of the Options

### Option 1: Perceptual crossover at 0.50

- Good, because it matches the owner's intent and the interfaces reviewed, and costs $O(1)$ with no allocation.
- Bad, because it accepts low WCAG ratios on lighter fills in exchange for readability to the eye.

### Option 2: Chroma-gated piecewise threshold

- Good, because it keeps the WCAG threshold for near-zero chroma neutrals.
- Bad, because intermediate colours (Steel Blue $C \approx 0.099$, Muted Sage $C \approx 0.058$) fall below the gate and keep muddy black text, and computing OKLab chroma at runtime needs forward LMS and cube-root projections.

### Option 3: Full APCA runtime equation matrix

- Good, because it implements the complete WCAG 3 psychophysical model.
- Bad, because APCA depends on font size, weight, and polarity, which complicates token-level colour APIs and risks host divergence.

### Option 4: WCAG crossover with component overrides

- Good, because no core tokens change.
- Bad, because consumers accumulate fragmented workarounds, and it restores black ink on Red Orange and Cerulean.

### Option 5: Crossover at 0.30

- Good, because white ink never falls below $1.05 / 0.35 = 3:1$, the deep accents (Red Orange `#dd4027`, $Y = 0.19$; Cerulean `#0093a5`, $Y = 0.24$; Coral Red `#ff5353`, $Y = 0.28$; Steel Blue; Neutral Gray 128) keep white ink, and lighter accents gain black labels at 7:1 or better.
- Bad, because saturated colours with $Y \in (0.30, 0.50]$ move to black ink (Coral `#ff7f50`, Salmon, Vivid Cyan `#00bcd4`, Deep Sky Blue, Orange `#ff9800`, Lime Green, Muted Sage), the black-on-saturated look this decision exists to avoid. It was accepted on 2026-10-31 and reversed the same day. 3:1 also meets WCAG only for large text and UI components, not the 4.5:1 floor for small text.

### Option 6: A value between 0.30 and 0.50

- Good, because it could trade some of each.
- Bad, because no reviewed interface supports a specific value, and it would restore black ink on some of these colours.
