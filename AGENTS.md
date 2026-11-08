# Agent Operating Invariants & Workflow Guide

## Commands & Verification Suites
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
- **ADR Governance**: `node scripts/verify-adrs.js` (or `--staged`, `--range <base>..<head>`)
- **ADR Governance Tests**: `node --test scripts/verify-adrs.test.js`
- **Hook Test**: `.githooks/commit-msg <msg-file>`
- **Monorepo Pre-Commit Suite**: `./scripts/verify_commit.sh` (requires `vale`: `brew install vale`; the house-style package is fetched on first run)

## Project Invariants
1. Follow Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, etc.).
2. Swift 6 strict concurrency (`@MainActor`, `@Sendable`).
3. Maintain at most four root documentation files besides `AGENTS.md` (`README.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `CHANGELOG.md`, `AGENTS.md`) plus `LICENSE`.
4. Co-evolve documentation and code atomically in the same commit.
5. **Host Invariant**: Judarn sets color, spatial rhythm, and typography. The host shapes geometry, depth, and touch mechanics. A host is anywhere the work lives, not only an operating system. Never override host physics, hardware curves, or native interaction states.
6. **Surface Hierarchy Invariant**: Group surfaces with substrate background contrast (`surfaceElevated` or a light accent tint on `substrate`; in light mode `substrate` is `#FFFFFF` and `surfaceElevated` is `#F8F8F8`, per ADR-0004 and ADR-0003). Never apply `.border(...)` or `.overlay(strokeBorder(...))` around card perimeters.
7. **Single Source of Truth**: Design tokens follow Design Tokens Format Module 2025.10 (with the Color and Resolver modules) and originate in `tokens/judarn-tokens.json`, `tokens/modes/`, and `tokens/judarn.resolver.json`. They propagate without drift to compiled hosts (Apple and web; Android is parked, ADR-0001). Read them through `scripts/lib/design-tokens.js`, never as raw JSON (ADR-0001).
8. **Agent Skill Boundary**: The `judarn` skill lives in the owner's agent configuration, outside this repository, as a pointer to `docs/DESIGN.md`. Nothing in this repository writes to agent global configuration (ADR-0008).
9. **Architectural Decisions & Invariants**: Historical architecture choices and negative constraints belong in `docs/adr/` following the lean [MADR](https://adr.github.io/madr/) format with YAML frontmatter (`status`, `date`, `deciders: Ruben Luthman`; zero RACI `consulted`/`informed` fields). Proactively evaluate and nominate an ADR whenever introducing or altering architectural invariants, negative constraints, persistence schemas, engine trade-offs, or boundary abstractions; never wait for the user to ask. Consult `docs/adr/README.md` before planning structural refactors, schema migrations, or framework replacements. Never contradict an `Accepted` ADR without explicit authorization. Keep `ARCHITECTURE.md` strictly steady-state. When a decision evolves or is superseded, never silently overwrite or leave prior records ambiguously active: author a new ADR, update the predecessor's frontmatter status (`superseded by [ADR-XXXX]` or `accepted (amended by ADR-XXXX)`), insert a top-level alert callout (`> [!WARNING]` or `> [!NOTE]`) specifying superseded vs. surviving invariants, and reflect the lifecycle transition in `docs/adr/README.md`.
10. **Optional Wada Harmonies**: Full Sanzo Wada harmony themes replacing the substrate are an opt-in add-on (ADR-0007), while light tints of any accent color, the owner's or the Wada dictionary's, are welcome as box/card fills on the white light-mode substrate in general work (ADR-0004, ADR-0003). Core contrast guarantees cover only Judarn's own surfaces.
11. **White Ink Preference**: Judarn favors white ink on fills beyond what contrast math suggests, because the math and the human eye disagree. Never lower the `contrastingInk` crossover on ratios alone (ADR-0006).
12. **Local Verification**: GitHub Actions does not run automatically for this repository: `ci.yml` and `documentation.yml` are `workflow_dispatch` only, and the one exception is `publish-npm.yml`, which runs when a GitHub release is published (or by hand with a tag) and publishes through npm trusted publishing (ADR-0013). A red workflow says nothing about the code. `./scripts/verify_commit.sh` is the full gate, so run it before every commit.
13. **General Rules and Local Variants**: Judarn guides anything visual or designed, through general rules plus rules per host. Never list the platforms it covers. The Google Docs and Slides files in `templates/` are a local variant: their fonts, colors, and scale are choices that tool forces, so never report them as violations, rebuild them from the tokens, or derive a general rule from them (ADR-0002).
14. **Agent-Neutral Core**: Judarn is shared between AI agents. General rules, tokens, and compiled host rules name no agent. Instructions for one AI are allowed only for what other agents cannot reach, and are labelled as that AI's (ADR-0002). Claude's artifact copy of the rules lives in `docs/claude-artifact/`; edit it there, never only in the artifact.
15. **Owner Defaults**: Judarn's rules are the owner's defaults. Outside this repository the owner's request and the project's profile (`docs/profiles/`) win, an override changes only what it names, and an agent discloses each departure once and never argues. Inside this repository every rule binds Judarn's own output (ADR-0003).
