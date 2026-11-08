---
status: accepted
date: 2026-11-01
deciders: Ruben Luthman
tags: [elevation, surfaces, visual, hierarchy, color]
---

# Surface Hierarchy Without Card Borders

## Context and Problem Statement

A common visual defect in component design is border bloat: framing every container, card, list item, and panel with explicit 1px strokes. On high-resolution displays and across dark and light mode, excessive borders generate visual noise, compete with content hierarchy, and clash with native material rendering.

The first version of this decision also required boxes to be lighter than the canvas in light mode, which forced the reading canvas down to a darker warm gray (`oklch(0.962 0.006 92)`, `#F5F3EE`) so that boxes could be `#FFFFFF`. In real use across pages, documents, and AI artifacts this produced a grayish reading background with white boxes, the reverse of what the owner prefers. The owner wants to read against a pure white light-mode substrate, with borderless boxes stepping down to a crisp neutral or a light tint of an accent colour.

How should Judarn establish container boundaries and elevation across surfaces without visual clutter, and where does light mode put the canvas and the boxes?

Originally decided 2026-08-25; the light-mode polarity and the box tints were added 2026-11-01, and the owner's defaults rule widened the tints and the scope of the ban 2026-11-02.

## Decision Drivers

- Crisp focus on typographic and data content.
- A surface hierarchy that translates across light and dark appearances.
- Harmony with native materials (`.regularMaterial`, `.ultraThinMaterial`, `backdrop-filter`).
- Unambiguous rules that prevent aesthetic regression.
- The owner's reading preference: a pure white (`#FFFFFF`) light-mode substrate, with borderless boxes separated by a subtle, non-heavy fill step (`#F8F8F8`) or a light tint of a chosen colour.
- Dark mode keeps its carbon hierarchy (`#171717` substrate, `#222222` elevated, `#101010` recessed).
- The 48-pairing contrast checks stay exact for the core neutral tokens ([ADR-0005](0005-compile-time-contrast-checks-and-gamut-mapping.md)).
- Agents reading `docs/DESIGN.md` can use light tints on boxes in general work without a separate opt-in.

## Considered Options

- **Option 1: Fill contrast with no card borders; pure white light substrate, a subtle neutral or light accent tint for boxes.**
- **Option 2: Low-opacity borders on all containers.**
- **Option 3: Elevation through drop shadows exclusively.**
- **Option 4: Boxes lighter than the canvas in light mode** (the first polarity: `substrate` at `#F5F3EE`, `surfaceElevated` at `#FFFFFF`), or the same with `substrate` lightened to `L = 0.985`.
- **Option 5: Card perimeter borders on a pure white canvas, with `substrate` and `surfaceElevated` both white.**
- **Option 6: Limit box tints to colours from the Sanzo Wada dictionary.**

## Decision Outcome

Chosen option: **Option 1**, because it places running prose on a pure white canvas, keeps cards borderless through a subtle neutral fill (`oklch(0.980 0.000 0)`, `#F8F8F8`) or a light tint, preserves dark mode's hierarchy, and keeps all 48 core contrast pairings passing without renaming public tokens.

The card border prohibition binds Judarn's own output and an agent's own initiative; an owner's explicit choice is not a violation ([ADR-0003](0003-judarns-rules-are-the-owners-defaults.md)).

### Invariants & Negative Constraints

1. **Hierarchy by fill contrast:** surface hierarchy is expressed exclusively through substrate background fill contrast. Elevated cards use `surfaceElevated` on `substrate`; primary content rests on `surfaceBase`; interactive controls use `surfaceInteractive`.
2. **No card perimeter borders:** outer borders or perimeter strokes around cards, including `.border(...)` or `.overlay(strokeBorder(...))` in SwiftUI, `border` in CSS, or `border` modifiers in Jetpack Compose, are prohibited in Judarn's output and in an agent's own initiative.
3. **Hairlines are internal:** hairline rules (`rule = 1pt` / `1px`) are restricted to internal division within data matrices, data grids, and semantic partition dividers.
4. **Native materials first:** when host materials are available, elevated cards use native translucent materials (`.regularMaterial`, `.ultraThinMaterial`, `backdrop-filter`) over pure synthetic fills.
5. **Mode-polar surface lightness:** in `tokens/judarn-tokens.json` and `scripts/compile-tokens.js`, light modes (`light`, `lightHighContrast`) must satisfy $L(\text{surfaceRecessed}) < L(\text{surfaceElevated}) < L(\text{substrate})$ with `substrate.light` at pure white ($L = 1.000$), and dark modes (`dark`, `darkHighContrast`) must satisfy $L(\text{surfaceRecessed}) < L(\text{substrate}) < L(\text{surfaceElevated})$.
6. **No hardcoded surface overrides:** `scripts/compile-tokens.js` emits `surfaceElevated` in Swift and CSS directly from `color.surfaceElevated` in `tokens/judarn-tokens.json`. It never hardcodes `pureWhite` for `surfaceElevated.light`.
7. **Light box tints in the general rules:** `docs/DESIGN.md` section 2 permits boxes and cards on the light substrate to use the neutral `surfaceElevated` token or a light tint of any accent colour, the owner's or one from the Sanzo Wada dictionary (`tools/wada-explorer/`), kept within the lightness range that section sets so that secondary ink stays readable.
8. **Check scope unchanged:** the core contrast guarantees and the 48-pairing contrast checks cover only Judarn's core neutral tokens ([ADR-0007](0007-sanzo-wada-dictionary-explorer-and-mcp-server.md)). A full harmony theme that replaces the primary substrate stays opt-in and is not compiled into Swift or CSS APIs.

### Positive Consequences

- Cleaner aesthetics with less visual noise, and compatibility with native vibrancy and blur materials.
- An unambiguous lint and review rule for engineers and agents.
- Long-form reading and page backgrounds in light mode sit on pure white (`#FFFFFF`, `20.79:1` AAA contrast with `ink100`). Borderless cards (`#F8F8F8`, `19.62:1`) and recessed wells (`#F1F1F1`, `18.24:1`) stay clearly separated without a warm-beige cast or heavy darkness.
- Agents building interfaces, documents, and rendered HTML artifacts can use gentle light tints on boxes without violating [ADR-0007](0007-sanzo-wada-dictionary-explorer-and-mcp-server.md).

### Negative Consequences

- **Light-mode `surfaceElevated` is slightly darker than `substrate` despite its name.** Worst case: a consumer assumes `surfaceElevated` is always higher in luminance than `substrate` in both modes (`L = 0.980` against `1.000` in light mode). Set aside: renaming the token across Swift and CSS, which would break downstream consumers verified by `scripts/verify-consumption.js`.
- **The neutral card step is subtle on uncalibrated low-contrast displays.** Worst case: on a washed-out projector, `#F8F8F8` (`ΔL = -0.020` from `#FFFFFF`) is softer than the earlier `#F5F3EE` step (`ΔL = -0.038`). Set aside: darker box fills (`L = 0.962`), because the owner found darker gray boxes visually heavy.
- **Light tints outside the core tokens are verified per use, not by the compile-time checks.** Worst case: an agent picks a tint too dark for `ink60` secondary text if it does not keep the tint light (`L ≈ 0.968 – 0.980`). Set aside: compiling all 159 Wada colours into the core checks, to keep the core contract small.
- **Designers used to perimeter borders must adapt to tonal differentiation,** and clarity in high-glare or accessibility settings depends on high-contrast substrate pairs, which the dual-tier OKLCh tokens govern.

## Pros and Cons of the Options

### Option 1: Fill contrast, white light substrate, neutral or light tint boxes

- Good, because the canvas is pure white and cards stay borderless.
- Good, because all 48 core contrast pairings pass without breaking public token names.
- Bad, because light mode steps down in lightness from canvas to card while dark mode steps up.

### Option 2: Low-opacity borders on all containers

- Good, because boundaries are explicit.
- Bad, because it keeps the border bloat and clashes with native materials.

### Option 3: Drop shadows exclusively

- Good, because depth reads naturally.
- Bad, because shadows are host physics and render differently on every host and in dark mode.

### Option 4: Boxes lighter than the canvas in light mode

- Good, because `surfaceElevated` stays numerically lighter than `substrate` in both modes.
- Bad, because the canvas is a gray or off-white and the boxes are `#FFFFFF`, against the owner's preference. This was the accepted rule until 2026-11-01; OKLCh lightness cannot exceed `1.000`, so white boxes forced the canvas down.

### Option 5: Card borders on a pure white canvas

- Good, because both canvas and cards are `#FFFFFF`.
- Bad, because it reintroduces the border clutter this decision rejects.

### Option 6: Limit box tints to Wada dictionary colours

- Good, because every tint comes from a curated source. This was the rule from 2026-11-01.
- Bad, because the owner's own colours, such as a project's graphic profile, are equally valid, and the limit turned each of them into a justification.
