---
status: accepted
date: 2026-11-01
deciders: Ruben Luthman
tags: [scope, platforms, native, agents, boundaries]
---

# General Rules and Host Rules

## Context and Problem Statement

Cross-platform design systems fail by forcing a lowest-common-denominator look or by simulating another operating system's mechanics (iOS-like navigation bars on Android, Material 3 elevation shadows on macOS). Unconstrained native implementations drift apart in brand identity, spatial hierarchy, and contrast. The owner also uses Judarn as the design judgment for more or less everything made on a computer, including AI artifacts, written documents, presentations, and printed work.

On 2026-11-01 an agent read the Google Docs and Slides templates as a contradiction of the core, because they use IBM Plex and Wada #119. Those choices exist because Google Docs needs its fonts and colours chosen beforehand; they are liable to change often, and the colours will probably go. Judarn is also shared between AI agents, so a rule written for one agent reaches the others or misses them.

How should Judarn divide authority with the place the work lives, and state its scope so that it can guide anything while a choice forced by one tool stays in that tool?

Originally decided 2026-08-20 as an authority split between Judarn and the host operating system. The scope rules were added 2026-11-01.

## Decision Drivers

- Preserve native expectations and interaction models on every host.
- Unified mathematical rhythm, readable contrast, and colour fidelity.
- No non-native physics, alien corner curves, or broken gesture handling.
- A clear division of responsibility for developers and agents.
- A choice forced by one tool must not bind any other host.
- Compiled hosts keep their zero-drift guarantee ([ADR-0001](0001-design-tokens-are-the-single-source-of-truth.md)).
- Judarn is shared between agents, so its core must not favour one of them.

## Considered Options

- **Option 1: Authority split, with general rules plus host rules** (Judarn: space, colour, rhythm, type; the host: geometry, depth, physics).
- **Option 2: Unified canvas simulation** (custom rendering engine, the Flutter model).
- **Option 3: Strict lowest common denominator** (primitive tokens only).
- **Option 4: Extend tokens to every medium.**
- **Option 5: Keep three platforms and leave the rest out of scope.**

## Decision Outcome

Chosen option: **Option 1**, because it keeps native behaviour, covers new media without naming them in advance, and keeps a tool's constraints inside that tool. Judarn does not list what it covers: its scope is anything visual or designed.

Judarn sets colour, spatial rhythm, and typography. The host shapes geometry, depth, and touch mechanics. A host is anywhere the work lives: an operating system, a browser, a document editor, a printed page, or an AI tool.

| Domain | Judarn owns | Host owns |
| :--- | :--- | :--- |
| **Space** | 8pt grid, 4pt micro-subgrid, line lengths (`65ch`, `45ch`). | Viewport margins, safe areas, sheet detents. |
| **Color** | OKLCh tokens, light and dark scales, WCAG AA/AAA contrast ratios. | System materials, blur passes, dynamic trait switches. |
| **Data** | Tabular figures, numeric density, table alignment. | Dynamic Type scaling, system font fallbacks, locale parsing. |
| **Shape** | Scale tokens (`radiusCard`, `radiusControl`). | Continuous squircle geometry, hardware corner matching, clipping style (`.continuous`). |
| **Motion** | Contrast shifts between resting and active states. | Spring dynamics, touch ripples, gesture tracking, haptics. |
| **Type** | Font weights, line heights, tracking steps, and which labels take uppercase ([ADR-0009](0009-uppercase-only-for-bounded-labels.md)). | Case mapping, locale, sentence structure, text layout. |

Host rules come in two kinds:

- **Compiled hosts** take their values from the token files. Apple and web are compiled hosts, and everything [ADR-0001](0001-design-tokens-are-the-single-source-of-truth.md) says about them stands.
- **Local variants** keep their own values, because the tool requires choices up front or cannot read Judarn's output. The `templates/` directory is a local variant.

General rules are the owner's defaults ([ADR-0003](0003-judarns-rules-are-the-owners-defaults.md)), and a project profile sits between the general rules and the host rules.

### Invariants & Negative Constraints

1. **Host physics stay native:** host platform physics, hardware curves, and native interaction states must never be overridden.
2. **SwiftUI shapes:** cards use `RoundedRectangle(cornerRadius: 16, style: .continuous)` (`JudarnRadius.card`), controls use platform-calibrated continuous radii (`JudarnRadius.subtle = 6pt` on macOS; `JudarnRadius.control = 10pt` on iOS), and badges use `Capsule()`. Cards and controls are never clipped with `Rectangle()`.
3. **Web shapes:** cards use `var(--radius-card, 16px)` and controls use `var(--radius-control, 10px)`.
4. **Jetpack Compose shapes (parked):** cards use `RoundedCornerShape(16.dp)`, controls use `RoundedCornerShape(10.dp)`, and badges use `CircleShape`. No compiled output binds this rule until Android returns ([ADR-0001](0001-design-tokens-are-the-single-source-of-truth.md)).
5. **General rules name no platform:** rules in the general section of `docs/DESIGN.md` hold for any host and carry no platform API.
6. **Scope is not enumerated:** Judarn's description states what it is, not a list of the platforms it covers.
7. **One-way dependency:** local variants depend on Judarn, and Judarn never depends on them. Never derive a general rule, token, or default from a local variant.
8. **Variants are not drift:** a local variant differing from the tokens is not a defect. Never rebuild a variant to match the tokens, or report its fonts, colours, or scale as a violation. A change to a variant affects only that host.
9. **Rules follow real work:** a host gets rules when something is made there, not in advance.
10. **Agent-neutral core:** general rules, tokens, and compiled host rules are written for any agent and name none. Instructions for one AI are allowed only for what other agents cannot reach, and are labelled as that AI's. Claude's copy of the rules lives in `docs/claude-artifact/`.

### Positive Consequences

- Applications feel native on every host, and host accessibility features (Dynamic Type, Reduce Motion, VoiceOver) work without impedance.
- A new medium needs no change to Judarn's scope, and needs host rules only if it differs from the general rules.
- A template can change at any time without review against the tokens, and no agent should report Google Docs choices as defects again.

### Negative Consequences

- **Platform wrappers and a boundary to learn.** Card, button, and data-matrix components need host-specific wrappers, and developers must understand that tokens define values while hosts define geometry and physics. Set aside: one shared rendering layer.
- **Local variants can diverge without limit.** Worst case: a document made from a template no longer looks like Judarn, and no check notices. Set aside: the consistency of extending the tokens to every medium, because the owner prefers to control those choices per tool.
- **No machine checks the general rules outside compiled hosts.** Worst case: a printed piece breaks a general rule and only the owner sees it.
- **Documents and print have no shared size scale.** Worst case: every new document host sets its own sizes. The 12-step scale stays a compiled-host scale in pixels.
- **An AI-specific copy of the rules can lag behind.** Worst case: an AI tool applies a stale rule until its copy is next synced. Accepted because that copy is the only way to reach a tool that cannot read this repository.
- **The split between general and host rules depends on judgment.**

## Pros and Cons of the Options

### Option 1: Authority split with general rules plus host rules

- Good, because it matches the owner's intent and compiled hosts lose nothing.
- Bad, because the split between general and host rules depends on judgment.

### Option 2: Unified canvas simulation

- Good, because every host would look identical.
- Bad, because it replaces native physics, accessibility, and corner geometry with a custom engine.

### Option 3: Strict lowest common denominator

- Good, because nothing host-specific is ever needed.
- Bad, because the result matches no host's conventions.

### Option 4: Extend tokens to every medium

- Good, because every host would share one verified source.
- Bad, because choices Google Docs forces would become Judarn's, frequent template changes would become token changes, and each new medium would need tokens before it could be used.

### Option 5: Keep three platforms and leave the rest out of scope

- Good, because it needs no change.
- Bad, because it contradicts how the owner uses Judarn and leaves documents and print without guidance. It also reads the host as an operating system only, which is how the first version of this decision defined it.
