---
status: accepted
date: 2026-11-09
deciders: Ruben Luthman
tags: [typography, leading, apple, measurement]
---

# Tight Leading Saves Two Points per Line Break

## Context and Problem Statement

[ADR-0012](0012-tight-leading-within-paragraphs.md) records that Apple's tight leading makes text "2pt shorter per line" and that a consuming app's tight roles "shrink by about 2pt per line". Its samples, 44px against 48px on macOS and 61px against 65px on the iOS simulator, are described as a two-line body. A consuming app (Kropp) then measured 108 cases on iOS and found that tight leading removes 2pt per line break and leaves single-line text unchanged. A brief written from ADR-0012's wording assumed that single-line rows and buttons would move, and they did not.

What does tight leading cost in height on Apple hosts?

## Decision Drivers

- ADR-0012's decision stands; only its measured figures were wrong.
- A consuming app plans layout from these figures, so they must state the unit and what is counted.

## Considered Options

- **Option 1: Record the measured per-line-break figures in a new record that amends ADR-0012.**
- **Option 2: Leave ADR-0012's figures uncorrected.**

## Decision Outcome

Chosen option: **Option 1**, because accepted records cannot be edited and the wrong figures already misled a consuming app.

Measured on 2026-11-09 for `.body` with and without `.leading(.tight)`, with `UIHostingController` and `NSHostingController` `sizeThatFits` and checked with `ImageRenderer` at `scale` 1. Lines were forced with line breaks at 2000pt width and wrapped at 140pt width; both give the same heights for the same line count. Heights are in points.

| Lines | iOS simulator (iPhone 17, iOS 27.2) | macOS | Saved |
| :--- | :--- | :--- | :--- |
| 1 | 20.33 and 20.33 | 16 and 16 | 0 |
| 2 | 42.33 and 40.33 | 32 and 30 | 2 |
| 3 | 64.33 and 60.33 | 48 and 44 | 4 |
| 4 | 86.33 and 80.33 | 64 and 58 | 6 |

ADR-0012's samples match three-line text at `scale` 1, where one pixel is one point: 4pt saved across two line breaks.

### Invariants & Negative Constraints

1. **ADR-0012's decision and invariants survive unchanged:** this record replaces only the figures in its Negative Consequences bullets "Apple's tight leading is a platform variant, not a number" and "A consuming app's real use".
2. **Cost per line break:** on Apple hosts, tight leading shortens text by 2pt per line break. Single-line text, including `monospacedDigit` text, keeps its exact height on both hosts. A bare `TextField` keeps its height on iOS and is 2pt shorter on macOS.

### Positive Consequences

- A consuming app can predict layout changes: only wrapped text moves, by 2pt for each line break.

### Negative Consequences

- **The figures change if Apple retunes its fonts.** Worst case: a later OS changes the per-break saving and this record is wrong again. Set aside: re-measuring on every OS release.
- **Only `.body` was re-measured in Judarn.** The other tight roles rest on the consuming app's iOS measurement across text styles from `caption2` to `title`, and on the same per-break mechanism. `JudarnTextField` on macOS was not measured.

## Pros and Cons of the Options

### Option 1: Amend with measured figures

- Good, because the record matches what hosts render and the lifecycle stays intact.
- Bad, because the correct figures live in a second record.

### Option 2: Leave the figures

- Good, because no record is added.
- Bad, because consuming apps keep planning for layout changes that do not happen.
