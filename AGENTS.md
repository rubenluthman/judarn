# Agent operating invariants & workflow guide

## Commands & verification suites
- **Token Compilation**: `node scripts/compile-tokens.js` (or `node scripts/compile-tokens.js --check`)
- **Token Conformance Tests**: `node --test scripts/lib/design-tokens.test.js`
- **Wada Explorer Build**: `node scripts/build-wada-explorer.js` (or `--check`). `tools/wada-explorer/index.html` is generated; edit the script, never the HTML.
- **Apple Build & Test**: `swift build && swift test`
- **Apple DocC Documentation**: `swift package generate-documentation --target Judarn`
- **Web Test**: `npm --prefix platforms/web test`
- **Web Packaging Hygiene**: `(cd platforms/web && npm pack --dry-run)`
- **Cross-Platform Version Sync**: `node scripts/sync-version.js --check`
- **Conventional Version Bump & Analysis**: `node scripts/bump-version.js --check` (or `--auto`)
- **External Consumption Audit**: `node scripts/verify-consumption.js`
- **Token Presence Check**: `node platforms/web/scripts/verify-token-presence.js`
- **Shared commit checks** (decision records, links, version guard, house style, secrets): `scripts/commit-checks verify`
- **Consumer Status** (read-only; needs the private list `docs/private/consumers.json`, see ARCHITECTURE.md): `node scripts/consumers.js [--to vX.Y.Z] [--json] [--page build/consumers.html]`. Tests: `node --test scripts/consumers.test.js`
- **Docs-only fast path**: when every changed file is a doc (`docs_only` in `.commit-checks.json`), `./scripts/verify_commit.sh` skips the Swift, iOS and web suites. Every doc a build reads or a package ships must sit under `docs_only.except`.
- **Hook Test**: `.githooks/commit-msg <msg-file>`
- **Monorepo Pre-Commit Suite**: `./scripts/verify_commit.sh` (requires `vale` and `gitleaks`: `brew install vale gitleaks`; the house-style package is fetched on first run). Run `scripts/install-hooks.sh` once after cloning. Generic commit checks (secrets, home paths, emails, private names) come from the shared commit-checks package at the release pinned in `.commit-checks.json`; `commit-checks.yml` runs them on GitHub

## Project invariants
1. Follow Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, etc.). Release commits keep the subject at 72 characters or fewer (the commit-msg hook rejects longer ones), and the tag is created and pushed only after the commit succeeds, chained with `&&` on the same line.
2. Swift 6 strict concurrency (`@MainActor`, `@Sendable`).
3. Maintain at most four root documentation files besides `AGENTS.md` (`README.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `CHANGELOG.md`, `AGENTS.md`) plus `LICENSE`.
4. Co-evolve documentation and code atomically in the same commit.
5. **Host Invariant**: Judarn sets color, spatial rhythm, and typography. The host shapes geometry, depth, and touch mechanics. A host is anywhere the work lives, not only an operating system. Never override host physics, hardware curves, or native interaction states.
6. **Surface Hierarchy Invariant**: Group surfaces with substrate background contrast (`surfaceElevated` or a light accent tint on `substrate`; in light mode `substrate` is `#FFFFFF` and `surfaceElevated` is `#F8F8F8`). Never apply `.border(...)` or `.overlay(strokeBorder(...))` around card perimeters.
7. **Single Source of Truth**: Design tokens follow Design Tokens Format Module 2025.10 (with the Color and Resolver modules) and originate in `tokens/judarn-tokens.json`, `tokens/modes/`, and `tokens/judarn.resolver.json`. They propagate without drift to compiled hosts (Apple and web; Android is parked, ADR-0001). Read them through `scripts/lib/design-tokens.js`, never as raw JSON (ADR-0001).
8. **Agent Skill Boundary**: The `judarn` skill lives in the owner's agent configuration, outside this repository, as a pointer to `docs/DESIGN.md`. Nothing in this repository writes to agent global configuration (ADR-0008).
9. **Generated design rules**: Design rules (casing, surfaces, leading, ink) belong in `docs/DESIGN.md`, which `scripts/compile-tokens.js` generates, so edit the template there.
10. **Optional Wada Harmonies**: Full Sanzo Wada harmony themes replacing the substrate are an opt-in add-on (ADR-0007), while light tints of any accent color, the owner's or the Wada dictionary's, are welcome as box/card fills on the white light-mode substrate in general work. Core contrast guarantees cover only Judarn's own surfaces.
11. **White Ink Preference**: Judarn favors white ink on fills beyond what contrast math suggests, because the math and the human eye disagree. Never lower the `contrastingInk` crossover on ratios alone.
12. **Local Verification**: `./scripts/verify_commit.sh` is the full gate, so run it before every commit. GitHub Actions adds a clean-machine check: `ci.yml` runs on pushes to `main` that change code (and by hand), and a red run on `main` is a failure to fix. `documentation.yml` runs only by hand, and `publish-npm.yml` runs when a GitHub release is published (or by hand with a tag) and publishes through npm trusted publishing (ADR-0013).
13. **General Rules and Local Variants**: Judarn guides anything visual or designed, through general rules plus rules per host. Never list the platforms it covers. Everything in `templates/` (the Google Docs and Slides files, `.docx` and `.pptx` templates, HTML starters, and the implementation prompt) is a local variant: its fonts, colors, and scale are choices the host tool forces, so never report them as violations, rebuild them from the tokens, or derive a general rule from them.
14. **Agent-Neutral Core**: Judarn is shared between AI agents. General rules, tokens, and compiled host rules name no agent. Instructions for one AI are allowed only for what other agents cannot reach, and are labelled as that AI's. Claude's artifact copy of the rules lives in `docs/claude-artifact/`; edit it there, never only in the artifact.
15. **Owner Defaults**: Judarn's rules are the owner's defaults. Outside this repository the owner's request and the project's profile (`docs/profiles/`) win, an override changes only what it names, and an agent discloses each departure once and never argues. Inside this repository every rule binds Judarn's own output.
16. **No logo**: Judarn has no logo. Never add a logo or logo-like graphic without asking the owner.
17. **Terminology**: Judarn is a personal design system (`Judarn Design System`), never a "design foundation" or "design language" as a whole. Reserve `foundation` (`foundations`) strictly for the base token set and core color, spatial, and typography primitives.
