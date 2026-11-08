# DESIGN.md – Judarn Design System Specifications

> Canonical design rules, for people and for any AI agent. Generated automatically by `scripts/compile-tokens.js` from `tokens/judarn-tokens.json` – do not edit directly. Architecture choices and boundary invariants are codified in [`docs/adr/`](adr/README.md).

---

## 1. Scope & Authority Split

Judarn is a personal design system: general rules for everything its owner makes, plus specific rules for each host. A host is anywhere the work lives: an operating system, a browser, a document editor, a printed page, or an AI tool ([ADR-0002](adr/0002-general-rules-and-host-rules.md)).

- **General rules** (section 2) hold on every host.
- **Project profiles** record what one project always wants where it differs from Judarn ([`docs/profiles/`](profiles/README.md)).
- **Host rules** (section 3) adapt the general rules to one host, and add what they cannot say. They bind only that host.
- **Token values** (sections 4 to 6) are the source for compiled hosts, and a reference for everything else.

### Defaults and Overrides

Every rule here is the owner's default: how they want things when they ask for nothing else. The owner's word wins without justification ([ADR-0003](adr/0003-judarns-rules-are-the-owners-defaults.md)).

1. **Precedence**: the owner's request, then the project's profile, then Judarn.
2. **Scope**: an override changes only what it names. Every other rule still applies.
3. **Adaptation**: rules that depend on an overridden choice adapt to it. Tints come from the owner's colors, weight roles map to the nearest weights of the owner's typeface, and ink is resolved on the owner's fills.
4. **Disclosure**: when work departs from a Judarn default at the owner's word, say so once, in one line: Judarn's default and what the work uses instead. Include any measured cost, such as a contrast ratio below its tier. Never argue, recommend reverting, or ask again.
5. **Settled**: record an override the owner approves in the project's profile, and never raise it again in that project. Work without a profile needs no record, and no override needs an ADR.
6. **Agents**: every "never", "only", and "must" binds an agent's own initiative. Depart from a default only at the owner's word.
7. **This repository**: here the rules define the defaults, so Judarn's tokens, compiled code, components, and generated docs follow them without exception.

Judarn provides colors, spatial rhythm, and typography while each host keeps its native curves, motion, and interaction feel (see [ADR-0002](adr/0002-general-rules-and-host-rules.md)).

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
   - In light mode, the reading substrate is pure white (`#FFFFFF`), while boxes and cards step down to the subtle elevated surface (`#F8F8F8`) or a light tint of an accent color ([ADR-0004](adr/0004-surface-hierarchy-without-card-borders.md), [ADR-0003](adr/0003-judarns-rules-are-the-owners-defaults.md)). Replace the substrate only when the owner asks.
   - Take accent colors from the owner when they give them, through the project's profile or the request. Otherwise the Sanzo Wada dictionary is a source of suggestions (section 7), and a neutral result is valid.
   - Measure every accent color, the owner's or the dictionary's, against the same ratios per use, and report any shortfall to the owner.
   - Keep the signal color for errors and validation.

2. **Surface Hierarchy** ([ADR-0004](adr/0004-surface-hierarchy-without-card-borders.md), [ADR-0004](adr/0004-surface-hierarchy-without-card-borders.md)):
   - Group surfaces by fill contrast: an elevated surface (or a light tint of an accent color) on the substrate.
   - **Never outline a card.**
   - Hairlines belong strictly inside tables and divider rules.

3. **Rhythm**:
   - Space things on an 8-unit grid, with a 4-unit subgrid for fine offsets.
   - Keep running text near 65 characters per line, and text in narrow columns near 45.

4. **Typography**:
   - Use the typefaces the owner or the project's profile names. Otherwise use the host's own typeface when it has one, and where it has none, choose one for the work.
   - Headings, titles, and the names of buttons and other controls use **sentence case** or **title case** – never forced uppercase, and a wordmark is not a title ([ADR-0009](adr/0009-uppercase-only-for-bounded-labels.md), [ADR-0009](adr/0009-uppercase-only-for-bounded-labels.md)).
   - A wordmark is a product's name set as its mark, in one dedicated component or image that the project's profile names. It is not a heading. Its case, weight, size, and tracking are the owner's design. Its source string and accessible name are the name as written, and any uppercase comes from the host's case style. Everywhere else – headings, running text, labels, widgets, notifications – the name is written as a word ([ADR-0009](adr/0009-uppercase-only-for-bounded-labels.md)).
   - Write every string as it reads in a sentence. Capitalize acronyms and codes as they are written (RPE, 1RM, e1RM) and keep unit symbols in their standard case (kg, km, min, kcal). Uppercase is a style, never typed into the text.
   - A heading is the most prominent text in its block. An eyebrow sits on a larger title or value, and a section label names a group of rows or fields when nothing larger does. Eyebrows and section labels are small labels; section labels keep the host's heading semantics.
   - Set a small label in uppercase only when it is an eyebrow, section label, column header, or value label, runs at most two words, and holds no digit, unit, or mixed-case term. A control's own name (what it does or which option it picks), statuses, counts, values, units, and messages in a small style are set as written.
   - A small label keeps its role inside a control. A disclosure header that names its section is a section label: it keeps heading semantics and exposes whether it is expanded. An eyebrow or value label inside a control keeps its casing only when the control also shows the title or value it names.
   - Pair positive tracking only with uppercase labels, outside a wordmark. Where a host has no case style, write small labels in sentence case.
   - Numbers in tables and metrics **must use tabular lining figures**.

5. **Filled Surface Ink** ([ADR-0006](adr/0006-contrasting-ink-favours-white.md)):
   - Resolve ink on a filled surface with `contrastingInk`.
   - Judarn deliberately favors white ink beyond what contrast ratios suggest, because contrast math and the human eye disagree on filled components, and black ink turns saturated and mid-tone fills muddy. White ink falls to 1.91:1 at the crossover, an accepted cost rather than a defect.
   - **Never override the resolved ink or add a local ink helper on ratios alone.** The crossover changes only in Judarn, after the owner reviews rendered examples.

---

## 3. Host Rules

These bind only the host they name. A host gets rules when something is made there, and a host with no rules here follows section 2. Instructions for one AI exist only for what other agents cannot reach, and never in section 2 or in the tokens.

### Compiled Hosts

Apple and web take their values from `tokens/judarn-tokens.json`, with zero drift ([ADR-0001](adr/0001-design-tokens-are-the-single-source-of-truth.md)).

- **Shape** ([ADR-0002](adr/0002-general-rules-and-host-rules.md)):
  - Never clip cards with sharp rectangles (`Rectangle()`).
  - SwiftUI: Cards use `RoundedRectangle(cornerRadius: 16, style: .continuous)`, Controls use `RoundedRectangle(cornerRadius: 10, style: .continuous)` on iOS and `cornerRadius: 6` on macOS, Tags use `Capsule()`.
  - Web CSS: Cards use `var(--jd-radius-card, 16px)`, Controls use `var(--jd-radius-control, 10px)`.
- **Surfaces** ([ADR-0004](adr/0004-surface-hierarchy-without-card-borders.md)):
  - Contrast surfaces by background fill (`surfaceElevated` on `substrate`).
  - **Never apply `.border(...)` or `.overlay(strokeBorder(...))` around card perimeters.**
  - Hairlines use `rule = 1px`.
- **Type**:
  - Use the 12-step scale in section 5, and the system font stack in the tokens.
  - Restrict uppercase transformations to `label` and `micro`, with tracking of `+0.06em` on label and `+0.08em` on micro. Both styles take an as-written casing (`judarnLabel(casing: .asWritten)`, `.t-as-written`) that keeps size and weight with body tracking, for every string the general rule does not let uppercase.
  - Never pass a unit symbol or mixed-case term to the uppercase casing. A header row that mixes them sets each cell on its own.
  - Data matrices use `tabular-nums` or `.monospacedDigit()`.
- **Ink**:
  - `contrastingInk` is `getContrastingInk` on web.
  - `contrastingAccent` (Apple) answers a different question: it clamps an accent color used as a foreground to a ratio against a surface ([ADR-0005](adr/0005-compile-time-contrast-checks-and-gamut-mapping.md)).
- **Touch**: Keep touch targets at or above `spaceTouch`.
- **Rendered AI artifacts**: An artifact follows the rules of the host it depicts or ships to, not the container it is delivered in. A page, deck, or dashboard rendered in a browser follows the web rules, a mockup of an app screen follows that app's host, and a poster or invitation follows print.

### Local Variants

A local variant keeps its own values, because the tool needs choices made up front or cannot read Judarn's output. It depends on Judarn, and Judarn never depends on it. Its differences from the tokens are not defects, its choices never become general rules or tokens, and it can change at any time ([ADR-0002](adr/0002-general-rules-and-host-rules.md)).

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
| `surfaceRecessed` | `oklch(0.958 0.000 0)` | `oklch(0.173 0.000 0)` | Input wells & hovers |
| `ink100` | `oklch(0.080 0.000 0)` | `oklch(0.980 0.000 0)` | Primary text (`>= 15.0:1` AAA) |
| `ink60` | `oklch(0.520 0.005 92)` | `oklch(0.720 0.005 92)` | Secondary text (`>= 4.8:1` AA) |
| `ink30` | `oklch(0.780 0.005 92)` | `oklch(0.350 0.004 92)` | Hairlines & disabled |
| `signalError` | `oklch(0.530 0.214 25)` | `oklch(0.680 0.200 25)` | Error & validation |

## 7. Optional Sanzo Wada Harmonies

Optional Sanzo Wada color harmonies: an opt-in add-on, not part of Judarn's core identity. Core contrast guarantees cover only Judarn's own surfaces. See [ADR-0007](adr/0007-sanzo-wada-dictionary-explorer-and-mcp-server.md) and [ADR-0004](adr/0004-surface-hierarchy-without-card-borders.md).

- The dictionary suggests accent colors when the owner gives none. Colors the owner gives take precedence and are equally valid ([ADR-0003](adr/0003-judarns-rules-are-the-owners-defaults.md)).
- Light tints of accent colors, the owner's or the dictionary's (for example, `L ≈ 0.968 – 0.980` at the color's hue or mixing `10% – 18%` of the color with white in OKLCh), are welcome in general work as box and card fills on the white light-mode substrate ([ADR-0004](adr/0004-surface-hierarchy-without-card-borders.md)).
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


