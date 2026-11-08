---
status: accepted
date: 2026-11-06
deciders: Ruben Luthman
tags: [typography, casing, accessibility, controls, identity]
---

# Uppercase Only for Bounded Labels

## Context and Problem Statement

Judarn's `label` and `micro` styles uppercased every string they received, and the general rule restricted uppercase to "small labels" without saying which. The first app built on Judarn shows the cost: many `label` and `micro` call sites and about 150 all-caps source strings. The transform rendered `e1RM` as E1RM and the `kg` column header as KG, put statuses, counts, and chips in caps, and forced one source string into odd casing so the transform would restore an acronym. The host owned "casing conventions" while `docs/DESIGN.md` already set casing, so the boundary was ambiguous.

Two follow-up questions surfaced in the same app. A small label whose role is a section label or eyebrow and that sits inside a control read as written between uppercase section labels, and none of the app's disclosure headers exposed heading semantics or an expanded state. And a product's wordmark, drawn as `Text("KROPP")` until the casing rollout changed it to `Text("Kropp")`, was read as a title, although the owner wants the mark to read KROPP while the product is called Kropp everywhere else, including all text in the app.

Which text may be uppercase, through which mechanism, how are acronyms and units protected, does a control change a label's casing, and is a wordmark covered by the casing rules?

Originally decided 2026-11-02; the control rule was added the same day and the wordmark rule 2026-11-06.

## Decision Drivers

- Small labels stay distinct from the values they name at `caption2` and `subheadline` sizes.
- Unit symbols and mixed-case terms carry meaning in their letter case (SI `kg`, `min`, `t`; `e1RM`).
- VoiceOver and translators receive the source string, and on WebKit, VoiceOver reads the transformed text (WebKit bug 165088).
- The rule holds on every host, including hosts with no case style.
- Token values and the token-level uppercase biconditional of [ADR-0005](0005-compile-time-contrast-checks-and-gamut-mapping.md) survive.
- Labels with the same role read the same on one screen, and a control's own name reaches VoiceOver and translators in its reading case.
- A source guard can tell the cases apart without runtime roles, and the rule holds on the web, where an accordion header is a heading that wraps a button.
- The owner's mark reads as designed, the product name stays a word in reading case elsewhere, and Judarn owns no logo.

## Considered Options

Uppercase:

- **Option 1: Bounded uppercase by role and length, with an as-written casing.**
- **Option 2: Uppercase every `label` and `micro` string.**
- **Option 3: No transformed uppercase.**
- **Option 4: Small caps instead of full caps.**
- **Option 5: Hard-coded caps for codes and units.**

Labels inside controls:

- **Option 6: Casing by role, not container.**
- **Option 7: Everything inside a control as written.**
- **Option 8: Disclosure headers only.**
- **Option 9: Labels outside the control.**

Wordmarks:

- **Option 10: Wordmarks as their own category.**
- **Option 11: A project-only profile override.**
- **Option 12: Caps typed into the source string.**
- **Option 13: A Judarn wordmark component or token.**
- **Option 14: No change.**

## Decision Outcome

Chosen options: **Option 1, Option 6, and Option 10**. Bounded uppercase keeps the label texture where it helps scanning and sets every string whose letters carry meaning as written; a study that rendered a consuming app's real strings under all five options, in light and dark, with dense screen mocks, informed it. Casing by role tracks a label's role, and the WAI-ARIA accordion pattern already treats a disclosure header as a heading that holds a button; a second study over four options informed it. A mark is a different kind of text from a heading or a label, and the question recurs with every product. Its reasons for casing do not apply to a one-word mark: garbled terms such as `e1RM` and `kg`, statuses that shout, and loss of word shape past two words.

Casing follows prominence, not the outline:

- **Heading:** the most prominent text in its block. Never uppercase.
- **Section label:** names a group of list rows or form fields when nothing larger does. A small label that keeps the host's heading semantics.
- **Eyebrow:** sits on a larger title or value and gives it context.
- **Column or value label:** names a column of values or one value.

Judarn decides which labels take uppercase; the host keeps case mapping, locale, sentence structure, and text layout ([ADR-0002](0002-general-rules-and-host-rules.md)).

### Invariants & Negative Constraints

1. **Reading case in source:** UI strings are written as they read in a sentence: sentence or title case, acronyms and codes in their own case, unit symbols in their standard case. No other word is capitalised in source.
2. **One mechanism:** uppercase comes only from the `label` and `micro` styles, through the host's case transform. No hand-rolled tracking or case transform exists outside Judarn. A wordmark's case style is outside this rule.
3. **Eligibility:** the uppercase casing applies only to eyebrows, section labels, column headers, and value labels that hold no digit, unit symbol, or mixed-case term, stay within the word limit in `docs/DESIGN.md` section 2, and are never the most prominent text in their block.
4. **As-written casing:** a control's own name, statuses, badges, counts, values, units, and messages in a small style use the as-written casing (`JudarnTextCasing.asWritten`, `.t-as-written`), which keeps the style's size and weight and takes `tracking.body`.
5. **Protection by routing:** unit symbols and mixed-case terms are never passed to the uppercase casing. A cell that holds one is its own as-written text; no API splits a string into transformed and protected runs.
6. **Section label semantics:** section labels keep the host's heading semantics (`.isHeader`, `role="heading"`).
7. **Hosts without a case style:** small labels are written in sentence case.
8. **Token defaults unchanged:** `label` and `micro` keep `isUppercase` and their tracking tokens; the casing is a call-site option, so the token-level biconditional of [ADR-0005](0005-compile-time-contrast-checks-and-gamut-mapping.md) holds.
9. **Role, not container:** a small label's casing follows its role above. Placing it inside a control does not change the role.
10. **Control names as written:** text that says what a control does or which option it selects is set as written. A small label that is a control's only text is its name.
11. **Disclosure headers:** a control whose label names the section it shows or hides is a section label. It carries the host's heading semantics and exposes its expanded state, through the host's disclosure state or, where the host has none, an accessibility value.
12. **Eyebrows in controls:** an eyebrow or value label inside a control takes the uppercase casing only when the same control shows the title or value it names.
13. **Eligibility unchanged in controls:** invariant 3 still decides whether a label is eligible for uppercase.
14. **Explicit request:** uppercase inside a control is requested at the call site, never by a style's default, so a source guard can find it.
15. **Label stays in the toggle:** a section's visible label is the toggle's label. On the web it is a heading that wraps one button with `aria-expanded`, or a `<summary>`. A chevron-only button beside a static label is not used.
16. **Wordmark definition:** a wordmark is a product's name set as its mark, in one dedicated component or image that the project's profile names. A heading, title, or label is never a wordmark.
17. **Owner's design:** a wordmark's case, weight, size, and tracking come from the owner. The roles, the eligibility test, and the uppercase-only tracking rule do not apply to it.
18. **Name as written:** the source string and the accessible name of a wordmark hold the name in reading case. Uppercase comes from the host's case style, never typed into the source. Where the host's case style may reach assistive technology, the accessible name is set explicitly.
19. **Everywhere else as written:** in headings, running text, labels, system surfaces, and store text, the product name is written as a word. A wordmark never sits inside a sentence.
20. **Agents and marks:** an agent never creates a wordmark or changes its case on its own initiative.

### Positive Consequences

- Labels read apart from values: an uppercase "Duration" label over "42 min". `e1RM`, `kg`, and LLM render as written on every host.
- Uppercase runs are bounded: a dense screen mock drops from 27 transformed runs to 10. Statuses, units, and counts reach VoiceOver and translators in their reading case.
- Section labels read alike whether their section is fixed or collapsible, disclosure headers gain heading navigation and an announced state, and chips, segments, and buttons keep their as-written names.
- The mark reads as the owner designed it, agents have a named category and a profile entry to check, and the next product that has a mark needs no new decision.

### Negative Consequences

- **Header rows can mix cases.** Worst case: a unit-heavy table header reads SET, kg, REPS, and every unit column is set as written. Set aside: a per-token API that uppercases around protected runs, which SwiftUI cannot do because `textCase` is a view modifier that applies to a whole concatenated `Text`.
- **Longer eyebrows lose caps.** Worst case: a three-word eyebrow renders as written. Set aside: a longer limit, because caps with label tracking set 36 – 43% wider at `micro` size and lose word shape past two words. An eyebrow can also change case between states: a card eyebrow reads in capitals when collapsed and as written when expanded, because the expanded eyebrow has three words. Set aside: a longer word limit inside controls.
- **Guards need role knowledge.** Worst case: a status or count string resolved at runtime (an enum title, a model label) reaches the uppercase default unchecked, because a lint can inspect literal call sites but not runtime values. The guard also trusts a declared marker: an author who requests uppercase on a status beside a count passes the structural check. Set aside: a role-typed disclosure component on every host.
- **VoiceOver is unverified for uppercase text on a device.** Apple documents `textCase` as a transform applied when displayed; whether VoiceOver hears the source string has not been checked on a device. Worst case: a short uppercase label, or a wordmark, is spelled letter by letter. Invariant 18's explicit accessible name guards the mark. On WebKit, VoiceOver reads the transformed text of a section label inside a button (WebKit bug 165088), the exposure accepted for labels outside controls.
- **SwiftUI has no expanded trait.** Worst case: on iOS 17 the state is an accessibility value string that must be localised, not a system state. `AccessibilityTraits` lists no expanded trait, and UIKit's `UIAccessibility.ExpandedStatus` starts at iOS 18.
- **"It's a wordmark" as a loophole.** A source check cannot tell a wordmark from a hand-styled title. Worst case: an agent uppercases a screen title and calls it a wordmark. Invariants 16 and 20 limit this. Set aside: a Judarn wordmark component that would enforce it. The mark also gives one app two spellings (KROPP as the mark, Kropp in running text), which the owner intends.

## Pros and Cons of the Options

### Option 1: Bounded uppercase by role and length, with an as-written casing

- Good, because labels keep a texture that separates them from values, and units, mixed-case terms, statuses, and controls appear as written.
- Bad, because it adds a casing option and needs role knowledge in guards.

### Option 2: Uppercase every `label` and `micro` string

- Good, because it needs no API and maps case with the locale.
- Bad, because it breaks `e1RM` and units, uppercases controls the general rule exempts, and puts no limit on caps per screen. This was the behaviour before the decision.

### Option 3: No transformed uppercase

- Good, because every string is correct as written and VoiceOver and locales need no special handling.
- Bad, because hierarchy rests on weight and ink alone, so tile labels and set table headers read like data, and it changes `label` and `micro` on every host at once and orphans their tracking tokens.

### Option 4: Small caps instead of full caps

- Good, because capitals stay full height, so acronyms stand out and the string is unchanged.
- Bad, because small capitals at `caption2` are about 6 pt tall, units become capitals again, and document hosts may lack true small caps.

### Option 5: Hard-coded caps for codes and units

- Good, because codes such as MEV are already caps in correct writing.
- Bad, because KG, KCAL, and MIN are not SI symbols, mixed-case terms still break, and caps reach VoiceOver and translators as typed.

### Option 6: Casing by role, not container

- Good, because labels with one role read the same on a screen, and it matches the web accordion structure.
- Bad, because a guard needs an explicit request and a structural check.

### Option 7: Everything inside a control as written

- Good, because a guard needs no role knowledge.
- Bad, because a section label reads differently when its section can collapse, next to fixed section labels. This was the first application of the casing rule, by container.

### Option 8: Disclosure headers only

- Good, because a guard can key on heading semantics alone.
- Bad, because eyebrows in tappable stats and card headers stay mixed with the labels beside them.

### Option 9: Labels outside the control

- Good, because no label sits in a control, so no guard changes.
- Bad, because the tap target shrinks to the chevron, VoiceOver gets two elements per section, and the web loses `<details>`.

### Option 10: Wordmarks as their own category

- Good, because the profile names the one component, so the exception stays findable.
- Bad, because a source check cannot verify that a component is a real mark.

### Option 11: A project-only profile override

- Good, because it changes nothing in Judarn's rules.
- Bad, because the next product raises the same question and agents keep reading marks as titles.

### Option 12: Caps typed into the source string

- Good, because it needs no case style.
- Bad, because it breaks reading case, accessibility, search, and translation. It is what the casing rollout removed.

### Option 13: A Judarn wordmark component or token

- Good, because it could enforce the definition.
- Bad, because a mark is each project's own design, and Judarn has no logo.

### Option 14: No change

- Good, because no rule changes.
- Bad, because the mark stays in title case against the owner's design, and the same misreading recurs.
