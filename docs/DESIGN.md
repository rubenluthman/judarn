# DESIGN.md – Judarn Design System Specifications

> Canonical design rules, for people and for any AI agent. Generated automatically by `scripts/compile-tokens.js` from `tokens/judarn-tokens.json` – do not edit directly. Architecture choices and boundary invariants are codified in [`docs/adr/`](adr/README.md).

---

## 1. Scope & Authority Split

Judarn is a personal design system: general rules for everything its owner makes, plus specific rules for each host. A host is anywhere the work lives: an operating system, a browser, a document editor, a printed page, or an AI tool.

- **General rules** (section 2) hold on every host.
- **Project profiles** record what one project always wants where it differs from Judarn ([`docs/profiles/`](profiles/README.md)).
- **Host rules** (section 3) adapt the general rules to one host, and add what they cannot say. They bind only that host.
- **Token values** (sections 4 to 6) are the source for compiled hosts, and a reference for everything else.

### Defaults and Overrides

Every rule here is the owner's default: how they want things when they ask for nothing else. The owner's word wins without justification.

1. **Precedence**: the owner's request, then the project's profile, then Judarn.
2. **Scope**: an override changes only what it names. Every other rule still applies.
3. **Adaptation**: rules that depend on an overridden choice adapt to it. Tints come from the owner's colors, weight roles map to the nearest weights of the owner's typeface, and ink is resolved on the owner's fills.
4. **Disclosure**: when work departs from a Judarn default at the owner's word, say so once, in one line: Judarn's default and what the work uses instead. Include any measured cost, such as a contrast ratio below its tier. Never argue, recommend reverting, or ask again.
5. **Settled**: record an override the owner approves in the project's profile, and never raise it again in that project. Work without a profile needs no record, and no override needs an ADR.
6. **Agents**: every "never", "only", and "must" binds an agent's own initiative. Depart from a default only at the owner's word.
7. **This repository**: here the rules define the defaults, so Judarn's tokens, compiled code, components, and generated docs follow them without exception.

Judarn provides colors, spatial rhythm, and typography while each host keeps its native curves, motion, and interaction feel.

| Domain | Judarn Owns | Host Owns |
| :--- | :--- | :--- |
| **Space** | 8pt grid, 4pt micro-subgrid, line lengths (`65ch`, `45ch`). | Viewport margins, safe areas, sheet detents. |
| **Color** | OKLCh tokens, light and dark scales, WCAG AA/AAA contrast ratios. | System materials, blur passes, dynamic trait switches. |
| **Data** | Tabular figures, numeric density, table alignment. | Dynamic Type scaling, system font fallbacks, locale parsing. |
| **Shape** | Scale tokens (`radius.card`, `radius.control`, `radius.subtle`, `radius.badge`). | Continuous squircle geometry, hardware corner matching, clipping style. |
| **Motion** | Contrast shifts between resting and active states. | Spring dynamics, touch ripples, gesture tracking, haptics. |
| **Type** | Font weights, line heights, tracking steps, which labels take uppercase. | Case mapping and locale, sentence structure, text layout. |

---

## 2. General Rules

These hold on every host.

1. **Color Roles**:
   - Build surfaces and running text from Judarn's neutrals: a substrate, an elevated surface, a recessed surface, and primary and secondary ink.
   - In light mode, the reading substrate is pure white (`#FFFFFF`), while boxes and cards step down to the subtle elevated surface (`#F8F8F8`) or a light tint of an accent color. Replace the substrate only when the owner asks.
   - Take accent colors from the owner when they give them, through the project's profile or the request. Otherwise the Sanzo Wada dictionary is a source of suggestions (section 7), and a neutral result is valid.
   - Measure every accent color, the owner's or the dictionary's, against the same ratios per use, and report any shortfall to the owner.
   - Colors that must be told apart, such as an accent against its tint, two accents side by side, or a fill against its surround, differ in lightness and not only in hue. Check by comparing their OKLCh `L` or by viewing the work in grayscale. When two such colors blend, say so once, in the disclosure line, and use the owner's colors anyway.
   - Keep the signal color for errors and validation.

2. **Surface Hierarchy**:
   - Group surfaces by fill contrast: an elevated surface (or a light tint of an accent color) on the substrate.
   - A deeper **highlight tint** of the same color, about `L ≈ 0.90 – 0.95` at the color's hue with chroma of 0.04 or less, may mark a highlighted item or a header row inside a white or light-tinted area. Set its lightness directly, because the right mix with white depends on how light the color is.
   - Use at most two tint steps per color, the light tint and the highlight tint. Lightness carries the hierarchy and the hue says which color family or section it is. `ink100` sits on both, and the ratio is measured per use like any accent use.
   - Tints belong to light mode. Dark mode keeps its order through neutral fills.
   - **Never outline a card.**
   - Hairlines belong strictly inside tables and divider rules.
   - Where the host offers native translucent materials, elevated cards use them over synthetic fills.
   - Why: an outline breaks the white reading canvas and competes with the fill hierarchy, and dark mode keeps its order through fill alone.
   - **Text fields** are wells, set apart by fill alone: `substrate` inside an elevated surface or tint, and `surfaceRecessed` directly on the substrate. The label, the field's place in the form, and its focus ring identify it, so it draws no outline at rest.
   - Every field has a visible label, and a placeholder is not a label. The focus ring and the invalid ring each reach 3:1 against the surface around the field. High-contrast modes add an `ink100` outline.
   - The fill sits at 1.06 – 1.13:1 against its surroundings, below the 3:1 that WCAG's Understanding document for 1.4.11 gives for fill-only inputs. That is an accepted cost, like white ink: **never darken a field fill or add an outline on ratios alone.** A project that must claim formal WCAG conformance records an outline in its profile.
   - **Buttons, badges, and tags** are set apart by fill alone too, with no outline at rest and no outlined variant. A quiet control or a neutral badge is a well like a text field, an accent badge may take the light tint of its color, and high-contrast modes add an `ink100` outline. High contrast turns disabled ink to `ink100`, so a disabled button or field keeps its fill and ink and draws that outline dashed. Never fade its text.

3. **Rhythm**:
   - Space things on an 8-unit grid, with a 4-unit subgrid for fine offsets.
   - Keep running text near 65 characters per line, and text in narrow columns near 45.

4. **Typography**:
   - Use the typefaces the owner or the project's profile names. Otherwise use the host's own typeface when it has one, and where it has none, choose one for the work.
   - Headings, titles, and the names of buttons and other controls use **sentence case** or **title case** – never forced uppercase, and a wordmark is not a title.
   - A wordmark is a product's name set as its mark, in one dedicated component or image that the project's profile names. It is not a heading. Its case, weight, size, and tracking are the owner's design. Its source string and accessible name are the name as written, and any uppercase comes from the host's case style. Everywhere else – headings, running text, labels, widgets, notifications – the name is written as a word.
   - Write every string as it reads in a sentence. Capitalize acronyms and codes as they are written (RPE, 1RM, e1RM) and keep unit symbols in their standard case (kg, km, min, kcal). Uppercase is a style, never typed into the text, because a blanket transform garbles terms such as e1RM and the kg column header.
   - A heading is the most prominent text in its block. An eyebrow sits on a larger title or value, and a section label names a group of rows or fields when nothing larger does. Eyebrows and section labels are small labels; section labels keep the host's heading semantics.
   - Set a small label in uppercase only when it is an eyebrow, section label, column header, or value label, runs at most two words, and holds no digit, unit, or mixed-case term. A control's own name (what it does or which option it picks), statuses, counts, values, units, and messages in a small style are set as written.
   - A small label keeps its role inside a control. A disclosure header that names its section is a section label: it keeps heading semantics and exposes whether it is expanded. An eyebrow or value label inside a control keeps its casing only when the control also shows the title or value it names.
   - Pair positive tracking only with uppercase labels, outside a wordmark. Where a host has no case style, write small labels in sentence case.
   - Wrapped lines in one paragraph or label add no space beyond the role's line height, because the owner reads open leading as gaps inside a paragraph. Space between paragraphs comes from spacing tokens, never from line height. Never set an open line height such as 1.5 on running text.
   - A heading belongs to the text it introduces. The space below a heading is smaller than the space between paragraphs, and the space above a heading is at least twice the space between paragraphs.
   - Numbers in tables and metrics **must use tabular lining figures**.

5. **Lists**:
   - Items of text – facts, steps, conditions – get markers: bullets, or numbers when the order matters. Rows of links, data, or controls – navigation, a list of books, settings – get none, and are set apart by spacing or fill, never borders. Why: a marker says "read these together as text", while a row's own content already marks where it starts, so a marker there is noise.
   - Bullets are solid round discs, and numbers are plain figures with a full stop ("1.") in tabular figures, so 9 and 10 line up. Markers take secondary ink (`ink60`), never an accent. Why: the marker is structure, not content, so it steps back, and an accent would read as a link or a status.
   - Items hang: wrapped lines align with the item's text, not with its marker, so the text keeps one clean left edge.
   - Items sit `space1` (8px) apart, half the space between paragraphs, so the list reads as one block. The list is one block among the paragraphs around it, with their spacing before and after, and a heading above it follows the heading rule. The indent is `space3` (24px) for bullets and `space4` (32px) for numbers, so two-digit numbers fit.
   - A list keeps the reading measure of the paragraphs around it: `measureBody` in running text, `measureCompact` in a card or sidebar. Why: a list wider than its paragraphs breaks the column.
   - A lead-in sentence ends with a colon. Items that finish it start lowercase. Items under a heading, or that stand alone, start with a capital.
   - Fragments take no punctuation after each item and no "and" or "or" at the end of an item. Full sentences end with a full stop each. Never mix fragments and full sentences in one list.
   - In Swedish, a list that finishes a lead-in sentence ends with a full stop after its last item (Språkrådet, *Svenska skrivregler*). In English it ends without one.
   - Nest at most one level, for sub-points that belong to one item. Nested bullets are hollow circles, with the same ink, spacing, and indent. A third level means the content wants headings. Why: deeper nesting stops reading as a list and starts reading as an outline.

6. **Filled Surface Ink**:
   - Resolve ink on a filled surface with `contrastingInk`.
   - Judarn deliberately favors white ink beyond what contrast ratios suggest, because contrast math and the human eye disagree on filled components, and black ink turns saturated and mid-tone fills muddy. White ink falls to 1.91:1 at the crossover, an accepted cost rather than a defect.
   - **Never override the resolved ink or add a local ink helper on ratios alone.** The crossover changes only in Judarn, after the owner reviews rendered examples.

---

## 3. Host Rules

These bind only the host they name. A host gets rules when something is made there, and a host with no rules here follows section 2. Instructions for one AI exist only for what other agents cannot reach, and never in section 2 or in the tokens.

### Compiled Hosts

Apple and web take their values from `tokens/judarn-tokens.json`, with zero drift ([ADR-0001](adr/0001-design-tokens-are-the-single-source-of-truth.md)).

- **Shape**: host physics, hardware curves, and native interaction states are never overridden.
  - Never clip cards with sharp rectangles (`Rectangle()`).
  - SwiftUI: Cards use `RoundedRectangle(cornerRadius: 16, style: .continuous)`, Controls use `RoundedRectangle(cornerRadius: 10, style: .continuous)` on iOS and `cornerRadius: 6` on macOS, Tags use `Capsule()`.
  - Web CSS: Cards use `var(--jd-radius-card, 16px)`, Controls use `var(--jd-radius-control, 10px)`.
- **Surfaces**:
  - Contrast surfaces by background fill (`surfaceElevated` on `substrate`).
  - **Never apply `.border(...)` or `.overlay(strokeBorder(...))` around card perimeters.**
  - Hairlines use `rule = 1px`.
  - Text fields fill with `surfaceRecessed`, or `substrate` inside a card (`.jd-card` on web, `JudarnCard` on Apple). At rest they keep a transparent border on web, so Windows high-contrast mode can still draw it, and no stroke on Apple. `prefers-contrast: more`, `data-contrast="high"`, and Apple's Increase Contrast turn it into an `ink100` outline.
  - Buttons, badges, and tags follow the same rule: a transparent resting border on web, no stroke on Apple, and an `ink100` outline in the same high-contrast modes. The ghost button stays text with its hover underline. A disabled control dashes that outline: `border-style: dashed` on web buttons and fields, a dashed stroke on Apple buttons and fields.
  - Web component classes carry the `jd-` prefix (`.jd-btn`, `.jd-card`, `.jd-table`), so a project's own class names never pick up Judarn's styles.
  - The focus ring takes the accent and the invalid ring `signalError`. Apple clamps the focus ring to 3:1 with `contrastingAccent`; on web a project that sets `--jd-accent` measures it.
- **Type**:
  - Use the 12-step scale in section 5, and the system font stack in the tokens.
  - Apple takes leading from the role's `appleLeading` through `Font.leading`, never `lineSpacing`, so text styles and Dynamic Type stay intact. Roles for running text and headings are `tight`, and `label`, `micro`, `data`, and `mono` are `standard`. Tight leading removes 2pt per line break and leaves single-line text unchanged (measured on iOS 27.2 and macOS, 2026-11-09).
  - Apple roles never set a fixed point size. A role names `appleTextStyleMacOS` only where its own style would render at the same size on macOS as a smaller role (`.footnote`, `.caption`, and `.caption2` are all 10pt there), so each role keeps its size rank on every Apple host.
  - Web sets the space around headings with `.flow`, a class on the container that spaces its direct children: `space2` (16px) between items, `space4` (32px) above a heading, and `space1` (8px) below a heading, which wins when a heading follows a heading. Headings are `h1` to `h6` and the `.t-display` and `.t-h1` to `.t-h4` classes. Top-level sections sit `space6` (48px) apart. Never combine `.flow` with `gap` on the same container, because the two add up.
  - Restrict uppercase transformations to `label` and `micro`, with tracking of `+0.06em` on label and `+0.08em` on micro. Both styles take an as-written casing (`judarnLabel(casing: .asWritten)`, `.t-as-written`) that keeps size and weight with body tracking, for every string the general rule does not let uppercase.
  - Never pass a unit symbol or mixed-case term to the uppercase casing. A header row that mixes them sets each cell on its own.
  - Data matrices use `tabular-nums` or `.monospacedDigit()`.
- **Lists**:
  - Web: `.jd-list` on a `ul` gives bullets and on an `ol` numbers, with the marker in `ink60`, a hanging indent, items `space1` apart, at most `measureBody` wide (`measureCompact` inside `.jd-card`), and one nested level of hollow bullets. It spaces items with margins, never `gap`, so it sits inside `.flow` as one block. `.jd-list.jd-list--plain` is the row variant: no markers, no indent, items still `space1` apart. Give a plain list `role="list"`, because Safari and VoiceOver drop list semantics when the markers go (WebKit bug 170179).
  - Apple: `JudarnTextList` sets items of text as bullets or numbers, with the marker in `ink60` in a column that scales with Dynamic Type, so wrapped lines hang under the text. It takes one level; nest on web only. Rows use the system's `List` and `Form`, with their own separators and insets, because that geometry belongs to the host. Judarn adds no row component on Apple.
- **Ink**:
  - `contrastingInk` is `getContrastingInk` on web.
  - `contrastingAccent` (Apple) answers a different question: it clamps an accent color used as a foreground to a ratio against a surface ([ADR-0005](adr/0005-compile-time-contrast-checks-and-gamut-mapping.md)).
- **Touch**: Keep touch targets at or above `spaceTouch`.
- **Rendered AI artifacts**: An artifact follows the rules of the host it depicts or ships to, not the container it is delivered in. A page, deck, or dashboard rendered in a browser follows the web rules, a mockup of an app screen follows that app's host, and a poster or invitation follows print.

### Local Variants

A local variant keeps its own values, because the tool needs choices made up front or cannot read Judarn's output. It depends on Judarn, and Judarn never depends on it. Its differences from the tokens are not defects, its choices never become general rules or tokens, and it can change at any time.

| Variant | Where | Why it differs |
| :--- | :--- | :--- |
| Google Docs, Google Slides, Word, and PowerPoint | `templates/` | Google Docs needs its fonts and colors chosen beforehand. |

---

## 4. Spatial Grid & Dimensions

- **Micro Subgrid**: `spaceHalf` = 4px (hairlines, leading adjustments, micro offsets).
- **Touch Target Floor**: `spaceTouch` = 44px (Apple / Web).
- **Macro Grid**:
  - `space1` = 8px
  - `space2` = 16px
  - `space3` = 24px
  - `space4` = 32px
  - `space6` = 48px
  - `space8` = 64px
  - `space12` = 96px
  - `space16` = 128px
- **Reading Measures**:
  - `measureBody` = 65ch (640px)
  - `measureCompact` = 45ch (440px)
  - `measureSidebar` = 260px
- **Dividers & Rules**:
  - `rule` = 1px
  - `ruleBold` = 2px
  - `ruleHeavy` = 4px

---

## 5. Typographic Scale (12-Step Canonical Descriptors)

| Style | Size | Line Height | Apple Leading | Weight | Tracking | Apple TextStyle |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `display` | `96px` | `96px` | `tight` | `900` | `-0.02em` | `.largeTitle` |
| `h1` | `64px` | `68px` | `tight` | `800` | `-0.01em` | `.largeTitle` |
| `h2` | `44px` | `48px` | `tight` | `800` | `-0.01em` | `.title` |
| `h3` | `32px` | `36px` | `tight` | `800` | `-0.01em` | `.title2` |
| `h4` | `24px` | `28px` | `tight` | `800` | `-0.01em` | `.title3` |
| `bodyLg` | `20px` | `24px` | `tight` | `400` | `0em` | `.title3` |
| `body` | `16px` | `20px` | `tight` | `400` | `0em` | `.body` |
| `small` | `14px` | `16px` | `tight` | `400` | `0em` | `.callout` |
| `label` | `12px` | `16px` | `standard` | `800` | `0.06em` | `.footnote` (macOS `.subheadline`) |
| `micro` | `10px` | `12px` | `standard` | `500` | `0.08em` | `.caption2` |
| `data` | `14px` | `20px` | `standard` | `400` | `0em` | `.callout` |
| `mono` | `12px` | `16px` | `standard` | `400` | `0em` | `.caption` |

---

## 6. Color System (Perceptually Uniform OKLCh)

### Core Neutrals (Dual-Tier Light & Dark)
| Token | Light (sRGB / OKLCh) | Dark (Carbon) | Accessibility Contract |
| :--- | :--- | :--- | :--- |
| `substrate` | `oklch(1.000 0.000 0)` | `oklch(0.205 0.000 0)` | Canvas substrate |
| `surfaceElevated` | `oklch(0.980 0.000 0)` | `oklch(0.252 0.000 0)` | Card substrate |
| `surfaceRecessed` | `oklch(0.958 0.000 0)` | `oklch(0.173 0.000 0)` | Text field wells on the substrate & hovers (fill only, 1.06 – 1.13:1 accepted, section 2) |
| `ink100` | `oklch(0.080 0.000 0)` | `oklch(0.980 0.000 0)` | Primary text (`>= 15.0:1` AAA) |
| `ink60` | `oklch(0.520 0.005 92)` | `oklch(0.720 0.005 92)` | Secondary text (`>= 4.8:1` AA) |
| `ink30` | `oklch(0.780 0.005 92)` | `oklch(0.350 0.004 92)` | Hairlines & disabled |
| `signalError` | `oklch(0.530 0.214 25)` | `oklch(0.680 0.200 25)` | Error & validation |

## 7. Optional Sanzo Wada Harmonies

Optional Sanzo Wada color harmonies: an opt-in add-on, not part of Judarn's core identity. Core contrast guarantees cover only Judarn's own surfaces. See [ADR-0007](adr/0007-sanzo-wada-dictionary-explorer-and-mcp-server.md).

- The dictionary suggests accent colors when the owner gives none. Colors the owner gives take precedence and are equally valid.
- Light tints of accent colors, the owner's or the dictionary's (for example, `L ≈ 0.968 – 0.980` at the color's hue or mixing `10% – 18%` of the color with white in OKLCh), are welcome in general work as box and card fills on the white light-mode substrate. The deeper highlight tint in section 2 (`L ≈ 0.90 – 0.95`) follows the same rule, with at most two tint steps per color.
- Use a full harmony theme (replacing the substrate) only when a project or its owner asks for one ([ADR-0007](adr/0007-sanzo-wada-dictionary-explorer-and-mcp-server.md)).
- Core inks are not guaranteed on a harmony's surfaces. Resolve foregrounds with `contrastingInk` (`getContrastingInk` on web) or `contrastingAccent` (Apple), then verify the resulting ratio per use, because the compile-time checks do not cover harmony contrast.
- That check does not relax the filled surface ink invariant in section 2. A low ratio from `contrastingInk` is a finding to report to the project's owner, not a reason to replace the ink.
- These palettes derive from Sanzo Wada's 1930s dictionary (*Haishoku Sōkan*), calibrated in OKLCh. The full 348-combination dictionary is queryable via the `tools/wada-explorer/` MCP server.
- Harmony #264 carries calibration offsets from the dictionary hex: the substrate (dictionary `#b7c2a9`), Cerulian Blue (`#0093a5`) and Red Orange (`#dd4027`) are hand-tuned in OKLCh, and the two accents are pulled into sRGB (ADR-0007). Each token's `hex` is the sRGB value of its own OKLCh components, so values and `hex` agree; the dictionary hex survives only in `tools/wada-explorer/data/`.

### Sanzo Wada Harmony #119
- **Substrate (Light)**: `oklch(1.000 0.000 0)` (Tint)
- **Surface Elevated (Light)**: `oklch(0.980 0.000 0)` (Surface)
- **Primary Accent**: `oklch(0.810 0.039 215.1)` (Light Glaucous Blue, `#a5c8d1`)
- **Secondary Accent**: `oklch(0.317 0.060 243.1)` (Dark Tyrian Blue, `#12354e`)

### Sanzo Wada Harmony #264
- **Substrate (Light)**: `oklch(0.784 0.035 125.6)` (Dark Greenish Glaucous, `#b3bda5`)
- **Surface Elevated (Light)**: `oklch(0.838 0.077 14.8)` (Corinthian Pink, `#f8b6ba`)
- **Primary Accent**: `oklch(0.575 0.118 214.5)` (Cerulian Blue, `#00879e`)
- **Secondary Accent**: `oklch(0.574 0.219 38.2)` (Red Orange, `#ce4100`)


