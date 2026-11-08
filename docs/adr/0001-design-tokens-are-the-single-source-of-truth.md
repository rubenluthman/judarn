---
status: accepted
date: 2026-11-08
deciders: Ruben Luthman
tags: [tokens, design-tokens, architecture, compiler, platforms]
---

# Design Tokens Are the Single Source of Truth

## Context and Problem Statement

Judarn's compiled hosts, Apple (Swift / SwiftUI on iOS and macOS) and web (React and CSS custom properties), use different syntax, colour models, layout abstractions, and unit representations. Letting people or AI agents define or tweak tokens by hand in Swift or CSS leads straight to drift between hosts, diverging colour spaces, broken WCAG contrast parity, and a hard audit of the design invariants.

How do we keep the compiled hosts in parity without drift, while engineers consume native, idiomatic types, and where does the agent-facing contract live?

Originally decided 2026-08-16. The record absorbs three later changes: the contract moved to `docs/DESIGN.md` (2026-11-01), the token files moved to Design Tokens Format Module 2025.10 with the Color and Resolver modules (2026-11-06), and Android left the compiled hosts while parked (2026-11-08).

## Decision Drivers

- Zero drift across the compiled hosts.
- A standardised, vendor-agnostic specification format that stays true to its claim.
- Automated generation of strongly typed host code and of the agent-facing specification.
- Fast verification in local pre-commit hooks.
- Compiled outputs stay byte-identical across a format migration, except hex comments that now come from computed values.
- Every guarantee Judarn states is one its verification enforces, and no unbuilt code is presented as working.
- Root Markdown stays limited to the documented set, with no exception to maintain.

## Considered Options

- **Option 1: Design Tokens Community Group format 2025.10 with the Color and Resolver modules, compiled by a custom zero-dependency Node compiler.**
- **Option 2: Style Dictionary multi-file architecture.**
- **Option 3: Swift code as the source of truth, transpiled to the other hosts.**
- **Option 4: Decentralised host tokens with manual review.**
- **Option 5: Keep a non-conforming file and document the deviations.**
- **Option 6: Keep Android as a compiled host, with or without its hand-written code.**
- **Option 7: Keep the agent contract at the repository root, or fold it into the agent skill.**

## Decision Outcome

Chosen option: **Option 1**, because it makes the claim of a standard format true while keeping a compiler with no dependencies. A check of current tools on 2026-11-06 found Style Dictionary's documentation stating that 2025.10 "does not have full support yet" (work in progress in v5, releases through v5.8.0 mention only `duration` and `$root` for 2025.10 and nothing on colour objects or resolvers). Tokens Studio and Figma documentation pages did not state support for 2025.10 colours or resolver documents. Option 2 would have lost features to gain a dependency.

`tokens/judarn-tokens.json` is the foundation set, colour values live in `tokens/modes/`, and `tokens/judarn.resolver.json` orders them. `scripts/compile-tokens.js` runs the compile-time checks ([ADR-0005](0005-compile-time-contrast-checks-and-gamut-mapping.md)) and then writes:

- `platforms/apple/Sources/Judarn/JudarnColors.swift`, `JudarnSpacing.swift`, and `JudarnTypography.swift`;
- `platforms/web/styles/colors_and_type.css`, `tailwind-theme.css`, and `src/tailwind.js`;
- `docs/DESIGN.md`, the agent-facing contract. `docs/DESIGN.md` is the only copy, because nothing depends on a root location and an exemption would keep a rule exception that serves no consumer.

Android is not a compiled host while it is parked: no Kotlin in the repository was ever compiled, the hand-written Compose components did not compile, the publishing configuration targeted a Maven endpoint Sonatype has retired, and the generator drifted (font weight 800 mapped to Compose `FontWeight.Bold`, 700, while Swift and CSS use 800). The Android code lives in the owner's offline Git bundle of the pre-release history ([ADR-0014](0014-public-repository-starts-from-a-fresh-history.md)).

### Invariants & Negative Constraints

1. **Single source:** the token files (`tokens/judarn-tokens.json`, `tokens/modes/`, `tokens/judarn.resolver.json`) are the sole authoritative source for colours, spatial scale, typography measures, and radii. Handwritten edits to token definitions in Swift or CSS are prohibited.
2. **Zero drift:** `./scripts/verify_commit.sh` runs `node scripts/compile-tokens.js --check`, which enforces zero drift between the token files and the generated host code. Zero drift binds the compiled hosts, and a local variant ([ADR-0002](0002-general-rules-and-host-rules.md)) is outside it.
3. **Generated outputs:** `docs/DESIGN.md` and every file listed above stay generated. Never edit them directly, and never emit or commit a second copy of the contract at the root. Links in the generated contract resolve from `docs/`, so the compiler writes them relative to that directory.
4. **Conformance:** every token file validates against the 2025.10 Format schema, and `tokens/judarn.resolver.json` against the 2025.10 Resolver schema. `--check` fails on a non-conforming token, an unknown `$type`, a unit other than `px` or `rem` in a dimension, a colour whose `hex` differs from the compile-time checks' gamut-mapped sRGB value, or a token no emitter reads.
5. **Foundation and contexts:** `tokens/judarn-tokens.json` stays the foundation set (space, measure, border, radius, font, tracking, typography, harmony metadata). Colour values live only in `tokens/modes/`, one file per `theme` context: `light`, `dark`, `lightHighContrast`, `darkHighContrast`. A high-contrast file overrides only what differs from its base context. The resolver is the only place that orders them.
6. **Colours:** `{"colorSpace": "oklch", "components": [L, C, H], "hex": "#rrggbb"}`. OKLCh is the authored value and `hex` is derived from it, never the reverse.
7. **Relative units stay numbers:** a reading measure is a `number` token holding the character count (its unit `ch` sits in the Judarn extension), and tracking is a `number` token holding the em multiplier. They are not converted to px.
8. **Typography:** composite `$value` with `fontFamily` (a reference to a font token), `fontSize`, `fontWeight`, `letterSpacing` (px at the role's base size), and `lineHeight` (a multiplier). A role's `letterSpacing` must equal its referenced tracking times its font size, and `lineHeight` times `fontSize` must be whole pixels.
9. **Extensions:** everything the format does not define sits under `$extensions["design.judarn"]`. No Judarn property sits beside `$value`.
10. **One reader:** `scripts/lib/design-tokens.js` is the only code that reads token files. Emitters and tools read its flat view, never the source files.
11. **Compiler stays:** the custom zero-dependency compiler stays. Standard tools may read the files; none is a build dependency.
12. **Compiled hosts are the ones that build:** a host is a compiled host only while the token compiler emits its output and `./scripts/verify_commit.sh` builds and tests that output. Apple and web meet this today.
13. **Android needs a record to return:** Android becomes a compiled host again only through a new ADR that restores its emitter, builds its output in `verify_commit.sh`, and records the change. The Kotlin emitter, the Compose components, the Gradle build, and Android publishing are not in this repository.
14. **Host-neutral tokens stay:** token values for Android host physics, such as the touch-target floor, stay in `tokens/judarn-tokens.json`, because they are data that the host rules of [ADR-0002](0002-general-rules-and-host-rules.md) use, not compiled output.

### Positive Consequences

- A single edit in the token files propagates to the compiled hosts atomically.
- Agents and developers read canonical rules from the tokens and the generated `docs/DESIGN.md`.
- Any tool that reads 2025.10 can read the tokens without a Judarn-specific parser, and the conformance claim is enforced on every `--check`.
- Adding a mode (for example a P3 context) is a new file and a resolver entry, not a schema change.
- Hex comments in generated Swift and CSS cannot go stale.
- The root holds only the documented files, and every stated drift guarantee is enforced by a build.

### Negative Consequences

- **Changes need a compile run, and the emitters are Judarn code.** Worst case: a custom transformation must be supported in the Swift and CSS emitters of `scripts/compile-tokens.js`, and the loader and validator are maintained here. Set aside: Style Dictionary, whose 2025.10 support is incomplete and which would still leave the compile-time checks, gamut mapping, and Swift 6 emitters custom.
- **Numbers, not px, for relative units.** Converting `65ch` or `-0.02em` to px would freeze a value that depends on the rendered font size. Verified worst case: `display` tracking is `-0.02em` and would become `-1.92px`, correct at 96px only. The format has no relative-length type, so numbers with an extension unit are the least lossy form. Standard tools read them as plain numbers and ignore the unit.
- **A resolver instead of nested modes.** A mode is a context applied across tokens, not a property of a token. Nested `light` and `dark` keys made every colour token a group and required a Judarn-specific reader. The cost is 4 colour files and one loader that tools without resolver support cannot replace.
- **Generated hex comments changed.** They now show computed values (`ink100` is `#020202` and `#F8F8F8`, not `#0C0C0C` and `#FAFAFA`). Three `wada264` colours (`#b7c2a9`, `#0093a5`, `#dd4027`) print as `#b3bda5`, `#00879e`, `#ce4100` in `docs/DESIGN.md` because their stored OKLCh never matched their dictionary hex. The OKLCh values are unchanged; correcting them is a separate decision.
- **Tokens removed in the migration:** `typographyFeature.*` (the format has no string type; the compiler already emits the feature strings) and the dark `accent` and `accentSecondary` of both harmonies (no emitter read them).
- **Line height as a multiplier.** Roles whose pixel line height is not a divisor of the font size (28/24) store a repeating decimal. The validator requires the product to be whole pixels.
- **Anything outside the repository that hard-codes the old root path breaks.** Worst case: an agent configuration nobody updated names a file that no longer exists, and that agent works without the contract. The known consumers are the shared agent skill ([ADR-0008](0008-agent-skill-lives-outside-the-repository.md)), the owner's global rules for each harness, and the design system sync task. A tool that looks for a root `DESIGN.md` will not find it. Set aside: discoverability, because one review on 2026-11-01 found no tool that discovers the file and only consumers that name its exact path, which covers the tools that review could verify, not every tool.
- **Android apps cannot consume Judarn from this repository.** Verified worst case: no Android app consumes Judarn today. Returning means restoring the emitter from the offline bundle and making it compile, including the weight-mapping drift. Set aside: shipping uncompiled Kotlin for future consumers, and keeping an uncompiled emitter current in the meantime.

## Pros and Cons of the Options

### Option 1: Format 2025.10 with a custom compiler

- Good, because the standard-format claim is true with no new dependency, and outputs stay byte-identical, which the compiler proves.
- Bad, because the loader and validator are Judarn code to maintain.

### Option 2: Style Dictionary

- Good, because the transform layer is maintained elsewhere.
- Bad, because 2025.10 support is incomplete, and the compile-time checks, gamut mapping, and Swift 6 emitters would still be custom.

### Option 3: Swift code as the source of truth

- Good, because Apple types would be authored directly.
- Bad, because the web host and the contract would depend on a transpiler from Swift.

### Option 4: Decentralised host tokens

- Good, because each host edits its own files.
- Bad, because drift is certain and parity rests on manual review.

### Option 5: Keep a non-conforming file and document the deviations

- Good, because no file changes.
- Bad, because the file stays unreadable by standard tools and the record would carry a known gap. The original decision claimed conformance the file did not have: colours were CSS strings, dimensions were strings with `ch` and `em` units, typography tokens had no `$value`, metadata sat beside `$value`, two tokens used an undefined `string` type, and `$schema` named a retired location.

### Option 6: Keep Android as a compiled host

- Good, because Android would need no restoration work, and no record would change.
- Bad, because the zero-drift guarantee would still cover Kotlin that nothing compiles, and the generator already drifts. Keeping only the generated Kotlin token files and dropping the hand-written code has the same flaw. This position was accepted at the start, when three compiled hosts were named as a driver, and lost once Android work was parked.

### Option 7: Root `DESIGN.md`, or folding the contract into the agent skill

- Good, because nothing would have to change at once.
- Bad, because the root copy needs an exemption that serves no consumer, and folding the contract into the skill would either lose rules found only there or turn generated rules into hand-written copies.
