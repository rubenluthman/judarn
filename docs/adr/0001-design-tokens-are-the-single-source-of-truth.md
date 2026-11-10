# Design Tokens Are the Single Source of Truth
Status: Active · 2026-11-08

## Decision

The token files (`tokens/judarn-tokens.json`, `tokens/modes/`, `tokens/judarn.resolver.json`) are the only source for colours, spacing, typography measures, and radii. They follow Design Tokens Format Module 2025.10 with the Color and Resolver modules. A zero-dependency Node compiler, `scripts/compile-tokens.js`, writes everything else: the Swift and CSS files, the Tailwind preset, and `docs/DESIGN.md` (the design rules that agents read).

- Never edit a generated file or a token value in Swift or CSS by hand. `node scripts/compile-tokens.js --check`, run by `./scripts/verify_commit.sh`, fails on any drift.
- `scripts/lib/design-tokens.js` is the only code that reads the token files. Emitters and tools read its flat view.
- `docs/DESIGN.md` is the only copy of the contract. No second copy sits at the repository root.
- Colours are authored in OKLCh, and `hex` is derived from them, never the reverse. Colour values live only in `tokens/modes/`, one file per context: `light`, `dark`, `lightHighContrast`, `darkHighContrast`. A high-contrast file overrides only what differs from its base.
- Relative units stay numbers: reading measure is a character count, tracking is an em multiplier. They are not converted to px.
- Anything the format does not define sits under `$extensions["design.judarn"]`.
- A host is a compiled host only while the compiler emits its output and `./scripts/verify_commit.sh` builds and tests it. Apple and web are compiled hosts. Android is parked: it returns only through a new record that restores its emitter and builds its output in the gate.

## Why

Apple and web use different syntax, colour models, and units, so hand-edited values drift apart and break contrast parity. One source with a compiler keeps the hosts identical and lets a script prove it. A custom compiler stays because Style Dictionary's 2025.10 support was incomplete when checked on 2026-11-06, and it would still have left the contrast checks, gamut mapping, and Swift emitters custom. Android was parked because no Kotlin in the repository was ever compiled, its publishing target is retired, and its generator had already drifted. Its code lives in the owner's offline bundle of the earlier history ([ADR-0014](0014-public-repository-starts-from-a-fresh-history.md)).

## What we gave up

- **A third-party transform layer.** The loader, validator, and emitters are Judarn code to maintain.
- **Px values for relative units.** `-0.02em` as px would be correct at one font size only.
- **Android as a consumer.** No Android app uses Judarn today. Returning means restoring the emitter from the bundle and making it compile.
- **A root `DESIGN.md`.** A tool that looks for one will not find it. Agent configurations that hard-code the old path must name `docs/DESIGN.md`, including the shared agent skill ([ADR-0008](0008-agent-skill-lives-outside-the-repository.md)).

## Revisit if

A standard token tool supports the 2025.10 colour and resolver modules fully, or an Android app needs Judarn.
