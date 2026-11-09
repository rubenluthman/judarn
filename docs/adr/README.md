# Architectural Decision Records

This directory contains the Architectural Decision Records (ADRs) for the Judarn design system and monorepo codebase. Decisions follow the lean Markdown Architectural Decision Records ([MADR](https://adr.github.io/madr/)) format.

Historical architecture choices and negative constraints belong here. Before proposing structural refactors, schema migrations, or framework replacements, consult these records. Never contradict an `Accepted` ADR without explicit authorization.

## Decision Lifecycle

Decisions move through the following lifecycle states:

- **Proposed**: Under evaluation; feedback and verification in progress.
- **Accepted**: Approved and codified in the codebase. Invariants must be respected.
- **Rejected**: Evaluated and explicitly dismissed. Rationale documented to prevent recurring debate.
- **Deprecated**: Previously accepted but no longer applicable or actively maintained.
- **Superseded**: Wholly replaced by a newer decision, linked explicitly via `status: superseded by [ADR-XXXX]` and a top-level alert callout (`> [!WARNING]`).
- **Amended**: Partially evolved or superseded in scope, marked via `status: accepted (amended by ADR-XXXX)`, listing several records as `ADR-XXXX, ADR-YYYY`, with a top-level alert callout (`> [!NOTE]`) detailing surviving vs. superseded invariants.

`scripts/verify-adrs.js` enforces this lifecycle in the `pre-commit` hook and `scripts/verify_commit.sh`. Accepted records are immutable outside their status and callout: any other change to a decision requires a new ADR in the same commit as the predecessor's status change, callout, and index update.

## Index

| ADR | Title | Date | Status | Tags |
| :--- | :--- | :--- | :--- | :--- |
| [0001](0001-design-tokens-are-the-single-source-of-truth.md) | Design Tokens Are the Single Source of Truth | 2026-11-08 | Accepted | tokens, design-tokens, architecture, compiler, platforms |
| [0002](0002-general-rules-and-host-rules.md) | General Rules and Host Rules | 2026-11-01 | Accepted | scope, platforms, native, agents, boundaries |
| [0003](0003-judarns-rules-are-the-owners-defaults.md) | Judarn's Rules Are the Owner's Defaults | 2026-11-02 | Accepted | scope, authority, color, typography, agents, boundaries |
| [0004](0004-surface-hierarchy-without-card-borders.md) | Surface Hierarchy Without Card Borders | 2026-11-01 | Accepted | elevation, surfaces, visual, hierarchy, color |
| [0005](0005-compile-time-contrast-checks-and-gamut-mapping.md) | Compile-Time Contrast Checks and Gamut Mapping | 2026-10-31 | Accepted | color, math, verification, compiler, accessibility, oklch |
| [0006](0006-contrasting-ink-favours-white.md) | Contrasting Ink Favours White | 2026-10-31 | Accepted | color, math, verification, accessibility, perceptual-contrast |
| [0007](0007-sanzo-wada-dictionary-explorer-and-mcp-server.md) | Sanzo Wada Dictionary, Explorer, and MCP Server | 2026-10-31 | Accepted | color, wada, mcp, tooling, boundaries |
| [0008](0008-agent-skill-lives-outside-the-repository.md) | Agent Skill Lives Outside the Repository | 2026-10-31 | Accepted | agents, skills, tooling, boundaries |
| [0009](0009-uppercase-only-for-bounded-labels.md) | Uppercase Only for Bounded Labels | 2026-11-06 | Accepted | typography, casing, accessibility, controls, identity |
| [0010](0010-per-platform-apple-text-styles.md) | Per-Platform Apple Text Styles | 2026-11-03 | Accepted | typography, tokens, platforms, apple |
| [0011](0011-web-package-ships-compiled-javascript.md) | Web Package Ships Compiled JavaScript | 2026-11-06 | Accepted | web, packaging, react, build |
| [0012](0012-tight-leading-within-paragraphs.md) | Tight Leading Within Paragraphs | 2026-11-08 | Accepted | typography, leading, tokens, apple, web, accessibility |
| [0013](0013-apps-consume-judarn-ui-from-the-public-npm-registry.md) | Apps Consume @judarn/ui from the Public npm Registry | 2026-11-08 | Accepted (amended by ADR-0015) | web, packaging, distribution, ci |
| [0014](0014-public-repository-starts-from-a-fresh-history.md) | Public Repository Starts from a Fresh History | 2026-11-08 | Accepted | repository, visibility, history, adr-governance |
| [0015](0015-first-npm-publish-of-a-new-package-is-manual.md) | First npm Publish of a New Package Is Manual | 2026-11-09 | Accepted | web, packaging, distribution, security |

## Consolidation and Former Numbers

The records were consolidated for the first public release: 25 records became 14, each active decision appears once in its current form, and reversed positions are kept as considered options. The originals live in the owner's offline Git bundle of the pre-release history ([ADR-0014](0014-public-repository-starts-from-a-fresh-history.md)). Other repositories cite the former numbers, so this table maps each of them to the record that now holds it.

| Former | Former title | Now |
| :--- | :--- | :--- |
| 0001 | W3C Design Tokens as Single Source of Truth | [0001](0001-design-tokens-are-the-single-source-of-truth.md) |
| 0002 | Platform Authority Split Between Judarn and Host OS | [0002](0002-general-rules-and-host-rules.md) |
| 0003 | Surface Elevation Hierarchy and Card Border Prohibition | [0004](0004-surface-hierarchy-without-card-borders.md) |
| 0004 | Sanzo Wada Color Dictionary Calibration and MCP Server | [0007](0007-sanzo-wada-dictionary-explorer-and-mcp-server.md) |
| 0005 | Finite-Domain Verification Proof Gate and Perceptual Gamut Mapping | [0005](0005-compile-time-contrast-checks-and-gamut-mapping.md) |
| 0006 | Perceptual Polarity Contrasting Ink Calibration | [0006](0006-contrasting-ink-favours-white.md) |
| 0007 | Contrast Verification Scope | [0005](0005-compile-time-contrast-checks-and-gamut-mapping.md) |
| 0008 | Optional Status of Wada Harmonies | [0007](0007-sanzo-wada-dictionary-explorer-and-mcp-server.md) |
| 0009 | Agent Skill Lives Outside the Repository | [0008](0008-agent-skill-lives-outside-the-repository.md) |
| 0010 | Perceptual Crossover Recalibration to 0.30 | [0006](0006-contrasting-ink-favours-white.md) |
| 0011 | Restore Perceptual Crossover to 0.50 | [0006](0006-contrasting-ink-favours-white.md) |
| 0012 | Design Contract Lives in docs/ | [0001](0001-design-tokens-are-the-single-source-of-truth.md) |
| 0013 | General Rules and Hosts | [0002](0002-general-rules-and-host-rules.md) |
| 0014 | Light-Mode Surface Polarity and Sanzo Wada Box Tints | [0004](0004-surface-hierarchy-without-card-borders.md) |
| 0015 | Bounded Uppercase Labels | [0009](0009-uppercase-only-for-bounded-labels.md) |
| 0016 | Judarn Rules Are the Owner's Defaults | [0003](0003-judarns-rules-are-the-owners-defaults.md) |
| 0017 | Labels Inside Controls | [0009](0009-uppercase-only-for-bounded-labels.md) |
| 0018 | Per-Platform Apple Text Styles | [0010](0010-per-platform-apple-text-styles.md) |
| 0019 | Web Package Ships Compiled JavaScript | [0011](0011-web-package-ships-compiled-javascript.md) |
| 0020 | Conform Tokens to Design Tokens 2025.10 with a Resolver | [0001](0001-design-tokens-are-the-single-source-of-truth.md) |
| 0021 | Wordmarks Are Marks, Not Headings | [0009](0009-uppercase-only-for-bounded-labels.md) |
| 0022 | Tight Leading Within Paragraphs | [0012](0012-tight-leading-within-paragraphs.md) |
| 0023 | Apps Consume @judarn/ui from the Public npm Registry | [0013](0013-apps-consume-judarn-ui-from-the-public-npm-registry.md) |
| 0024 | Public Repository Starts from a Fresh History | [0014](0014-public-repository-starts-from-a-fresh-history.md) |
| 0025 | Android Leaves the Compiled Hosts While Parked | [0001](0001-design-tokens-are-the-single-source-of-truth.md) |

## Authoring Guidelines

- **Numbering & File Naming:** 4-digit sequential zero-padded identifiers in `kebab-case` (`####-title.md`).
- **Typography:** Spaced en dashes (" – ") strictly; never em dashes (U+2014).
- **Frontmatter & Invariants:** Lean MADR YAML frontmatter with `status`, `date`, `deciders: Ruben Luthman`, and `tags: [tag1, tag2]`. Prohibit corporate RACI fields (`consulted`, `informed`). Codify all hard boundaries under mandatory `### Invariants & Negative Constraints`.
- **Structure:** Follow the standard template below:

```markdown
---
status: accepted
date: YYYY-MM-DD
deciders: Ruben Luthman
tags: [subsystem, domain]
---

# Title Case Decision Name

## Context and Problem Statement

[2 – 4 concise sentences describing the architectural tension, performance constraint, or trade-off.]

## Decision Drivers

* [Key constraint 1: e.g. cross-platform parity, zero drift]
* [Key constraint 2]

## Considered Options

* **Option 1:** [Title]
* **Option 2:** [Title]

## Decision Outcome

Chosen option: **Option 1**, because [active technical justification].

### Invariants & Negative Constraints

1. **[Boundary Name]:** [Explicit prohibition or mandatory constraint].
2. **[Boundary Name]:** [Explicit prohibition or mandatory constraint].

### Positive Consequences

* [Gains, capabilities unlocked, invariants established]

### Negative Consequences

* [Accepted trade-offs, added complexity, workarounds accepted]

## Pros and Cons of the Options

### Option 1: [Title]

* Good, because [...]
* Bad, because [...]

### Option 2: [Title]

* Good, because [...]
* Bad, because [...]
```
