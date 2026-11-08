---
status: accepted
date: 2026-11-08
deciders: Ruben Luthman
tags: [typography, leading, tokens, apple, web, accessibility]
---

# Tight Leading Within Paragraphs

## Context and Problem Statement

The owner reads open leading, Apple's standard leading included, as gaps inside a paragraph. Two cases showed it: a two-line toggle label in a consuming app, and a 1.5 line height in a hand-written Claude artifact. Before this decision the hosts disagreed about leading. Apple added `lineSpacing` on top of the text style's own leading, the web compiler hard-coded the `--lh-*` variables instead of reading the tokens, and the parked Android host followed `lineHeight`.

How should wrapped lines sit within one paragraph or label, and where does each host read that from?

## Decision Drivers

- Lines of one paragraph read as one block. Space between paragraphs comes from spacing tokens.
- The tokens stay the single source ([ADR-0001](0001-design-tokens-are-the-single-source-of-truth.md)) and no host keeps its own leading literal.
- Apple keeps its text styles and Dynamic Type ([ADR-0002](0002-general-rules-and-host-rules.md), [ADR-0010](0010-per-platform-apple-text-styles.md)).

## Considered Options

- **Option 1: Tight leading from tokens on every host.**
- **Option 2: Keep open leading, tune the numbers (1.4 to 1.5).**
- **Option 3: Negative `lineSpacing` on Apple.**
- **Option 4: Fixed line-height frames on Apple.**

## Decision Outcome

Chosen option: **Option 1**, because it removes the gap at its source and is expressible per host from one token set: `lineHeight` for the web, and an `appleLeading` extension (`tight` or `standard`) for Apple, applied as `Font.leading` so the text style and Dynamic Type stay intact.

### Invariants & Negative Constraints

1. **No gap inside a paragraph:** wrapped lines in one paragraph or label add no space beyond the role's line height. Space between paragraphs comes from spacing tokens, never from line height.
2. **Leading lives in the role's token:** the web reads it from `lineHeight`, Apple from the `appleLeading` extension. No host keeps its own leading literal, and a host that returns reads the same tokens. The compiler derives the web `--lh-*` variables from the `display`, `h1`, and `body` tokens.
3. **Apple keeps style and Dynamic Type:** only the leading variant changes. Roles for running text and headings use `tight`. Roles for short single-line text (`label`, `micro`, `data`, `mono`) use `standard`.
4. **Negative constraints:** no `lineSpacing` on Apple text roles. No open `line-height` such as 1.5 on running text in Judarn output.
5. **Proof:** the compiler rejects any role whose `appleLeading` is not `tight` or `standard`. `scripts/lib/design-tokens.test.js` checks that every role's web `line-height` equals its token. `TypographyTests` checks on macOS and on the iOS simulator that wrapped body text at tight leading is shorter than at standard.

### Positive Consequences

- Wrapped text reads as a block on every host, and the hosts agree because they read one token.
- The web no longer disagrees with the tokens.

### Negative Consequences

- **Fails WCAG 2.2 SC 1.4.8 (AAA), line spacing.** Worst case: a long-form reader who needs a line height of 1.5 gets less than that from Judarn text by default. Set aside: keeping 1.4 to 1.5 for long-form reading. AA criterion 1.4.12 (text spacing) is not affected, because no Judarn text container has a fixed height. Fixed heights exist only on decorative rules, and text containers use `minHeight`.
- **Long `small` paragraphs are dense.** Worst case: a multi-paragraph block at the `small` role reads tightly. The role's line height is one step above its font size by design.
- **Apple's tight leading is a platform variant, not a number.** Measured with `ImageRenderer` on a two-line body at 140pt width: macOS renders 44px against 48px, and the iOS simulator (iPhone 17, iOS 27.2) renders 61px against 65px, so tight is 2pt shorter per line on both. The figures change if Apple retunes its fonts.
- **A consuming app's real use.** Its calls on the tight roles (`.judarnBody()`, `.judarnSmall()`, `.judarnH4()`, `.judarnH3()`) shrink by about 2pt per line. Its `.judarnLabel()` and `.judarnMicro()` calls do not change.

## Pros and Cons of the Options

### Option 1: Tight leading from tokens on every host

- Good, because one token set drives all hosts and the gap disappears.
- Bad, because it fails SC 1.4.8 and Apple's tight leading is the platform's own variant.

### Option 2: Keep open leading, tune the numbers

- Good, because it satisfies SC 1.4.8.
- Bad, because the owner reads it as the gap the owner rejects.

### Option 3: Negative `lineSpacing` on Apple

- Good, because it reaches any value.
- Bad, because it fights the platform, can clip glyphs, and a host-side literal breaks invariant 2.

### Option 4: Fixed line-height frames on Apple

- Good, because the height is exact.
- Bad, because it clips text under Dynamic Type and under user spacing (SC 1.4.12).
