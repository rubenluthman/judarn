---
status: accepted
date: 2026-11-03
deciders: Ruben Luthman
tags: [typography, tokens, platforms, apple]
---

# Per-Platform Apple Text Styles

## Context and Problem Statement

Each typography role in `tokens/judarn-tokens.json` names one `appleTextStyle`, and the Apple host scales it with Dynamic Type. `label` (12px on the web) mapped to `.subheadline`, chosen in October 2026 for macOS row density and for the rank of status badges (`label`) over keyword tags (`micro`). On iOS `.subheadline` is 15pt, so every `label` call site rendered 3pt above the web size and 1pt below `small`. On macOS `.footnote`, `.caption`, and `.caption2` all render at 10pt, so no single style below `.subheadline` keeps `label` above `micro` there.

How should a role map to Apple text styles when no single style keeps its size rank on both iOS and macOS?

## Decision Drivers

- Each role keeps its size rank against the next smaller role on every Apple host.
- iOS sizes keep the web scale's proportions where Apple's styles allow it.
- The host keeps Dynamic Type scaling and its native metrics ([ADR-0002](0002-general-rules-and-host-rules.md)).
- Tokens stay the single source ([ADR-0001](0001-design-tokens-are-the-single-source-of-truth.md)), and the compiler catches a bad style name before Swift does.

## Considered Options

- **Option 1: A macOS override field where one style cannot hold the rank.**
- **Option 2: Keep `.subheadline` on both hosts.**
- **Option 3: `.footnote` on both hosts.**
- **Option 4: `.caption` on both hosts.**
- **Option 5: A fixed size scaled relative to a text style.**

## Decision Outcome

Chosen option: **Option 1**, because it is the only option that brings iOS `label` to the web proportion and keeps it above `micro` on macOS. On the web `label` is 0.75 of `body`; on iOS `.footnote` is 13/17 = 0.76 of `.body`.

Sizes at the default content size, measured with `NSFont.preferredFont(forTextStyle:)` on macOS and taken from Apple's HIG typography tables for iOS:

| Style | iOS | macOS |
| :--- | :--- | :--- |
| `.callout` | 16 | 12 |
| `.subheadline` | 15 | 11 |
| `.footnote` | 13 | 10 |
| `.caption` | 12 | 10 |
| `.caption2` | 11 | 10 |

### Invariants & Negative Constraints

1. **One style by default:** a role names one Apple text style in `appleTextStyle`. The compiled Apple hosts other than macOS use it.
2. **Override only to keep the rank:** a role names `appleTextStyleMacOS` only when its own style would render at the same size on macOS as a smaller role. Each role's styles live in `tokens/judarn-tokens.json`.
3. **Compiler validation:** the compile-time checks in `scripts/compile-tokens.js` reject a style name that is not a SwiftUI `Font.TextStyle` and an override equal to the role's own style.
4. **Rank verified with real metrics:** a test asserts that `label` renders larger than `micro` with the running platform's preferred sizes, on macOS and on iOS.
5. **No fixed sizes:** Apple roles never set a fixed point size; the host's text style scales them.
6. **Generated docs show both:** `docs/DESIGN.md` lists a role's macOS style beside its default style.

### Positive Consequences

- iOS `label` drops from 15pt to 13pt, close to the web proportion, while macOS keeps 11pt and the badge-over-tag rank.
- A mistyped or redundant style name fails the compile-time checks instead of the Swift build.
- The override field is opt-in, so every other role and host output is unchanged.

### Negative Consequences

- **Two Apple values for one role.** Worst case: a later change edits `appleTextStyle` for `label` and leaves the macOS override stale, so the two hosts drift apart in rank. Set aside: per-role Apple styles for every host, which would double the Apple fields for roles that need no override.
- **macOS `label` stays off the web proportion.** Worst case: on macOS `label` is 11/13 = 0.85 of `body` against 0.75 on the web, because the smaller styles all match `micro`. Set aside: Option 3, which would match the proportion and collapse `label` into `micro`.
- **Every iOS consumer shrinks at once.** Worst case: a consuming app picks up the change on its next build through a local package path, with no version pin to hold it back: every `.judarnLabel()` call and the `JudarnCard`, `JudarnBadge`, `JudarnTextField`, and `JudarnDataMatrix` labels it renders. Set aside: a new role for the smaller size, which would leave the 15pt mapping in place.
- **Mac Catalyst follows iOS.** `os(macOS)` is false under Catalyst, so a Catalyst app gets `.footnote` with Catalyst's scaled metrics. Unverified on a device.

## Pros and Cons of the Options

### Option 1: A macOS override field

- Good, because each host gets the closest native style that keeps the rank.
- Bad, because the token schema gains an optional Apple field.

### Option 2: Keep `.subheadline` on both hosts

- Good, because nothing changes.
- Bad, because iOS `label` stays 15pt, 3pt above the web size and 1pt below `small`.

### Option 3: `.footnote` on both hosts

- Good, because iOS reaches 13pt with one field.
- Bad, because macOS `label` falls to 10pt, the same size as `micro`, and status badges no longer rank above keyword tags.

### Option 4: `.caption` on both hosts

- Good, because iOS matches the web's 12pt exactly.
- Bad, because `label` matches `micro` on macOS and `mono` on both hosts.

### Option 5: A fixed size scaled relative to a text style

- Good, because the size can match the web exactly.
- Bad, because it reverses the native-metrics mapping that removed row-height inflation on macOS, and loses the text style's own optical sizing and leading.
