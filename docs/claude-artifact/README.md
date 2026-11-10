Judarn is a personal design system: general rules for everything its owner makes, plus specific rules for each host. A host is anywhere the work lives, from an app to a printed page. This is Judarn's copy for Claude, and these rules are written for artifacts. Judarn sets color, spatial rhythm and typography. The host shapes geometry, depth and touch. Apply these rules to every page, document, deck, design and dashboard, and treat them as overriding any default look.

## Defaults and overrides

Every rule here is the owner's default: how they want things when they ask for nothing else. The owner's word wins without justification.

- Follow the owner's request first, then the project's profile, then Judarn. When the work belongs to a project, read its profile in `profiles/<project>.md` if one exists.
- Change only what the owner names. Every other rule still applies.
- Adapt the rules that depend on an overridden choice: tints come from the owner's colors, weight roles map to the nearest weights of the owner's typeface, and ink is resolved on the owner's fills.
- When the work departs from a Judarn default at the owner's word, say so once, in one line when you hand it over: Judarn's default and what the work uses instead. Include any measured cost, such as a contrast ratio below its tier. Never argue, recommend reverting or ask again.
- Once the owner approves an override, it is settled. Note it in the project's profile under `Overrides`, and never raise it again in that project.
- Every "never", "only" and "must" here binds your own initiative. Depart from a default only at the owner's word.
- Choices Judarn leaves open, such as which Wada combination to use, are not overrides.

## Which rules apply

General rules hold on every host: the neutrals and ink roles, a pure white light-mode substrate with boxes on the elevated surface or a light accent tint, fill contrast instead of outlines, hairlines only inside tables and dividers, the 8-unit rhythm and reading measure, the casing rules, tabular figures, and the filled surface ink.

The rest follows the host the artifact depicts or ships to, not the artifact type it is delivered in.

| Artifact | Host | Also follow | Leave out |
| --- | --- | --- | --- |
| Page, dashboard | Browser | The web rules below | – |
| Slides | Projected screen, exported deck | The web rules for type and fills | Touch targets, hover states |
| Design of an app screen | That app's host | The host's own face, icons, corner geometry and touch targets | The web font stack and pixel values |
| Design of a web page | Browser | The web rules below | – |
| Poster, invitation, printed piece | Print | A typeface chosen for the work, physical units on the 8-unit rhythm | Touch targets, motion, hover, dark and high-contrast themes |
| Logo | The project's identity | The owner's mark as supplied | Judarn sets no mark geometry |
| Whiteboard | Canvas | Color roles, fill contrast, casing | Type-scale precision, touch targets |

The type, space, surface, motion and icon rules below are written for the web. On another host, keep the general rules and adapt the rest as the table says. Connectors and arrows on a whiteboard or diagram are not card outlines.

## Color in one rule

Judarn has no default color. Build every surface and all running text from the neutrals. Take accent colors from the owner when they give them, through the project's profile or the request. When the owner gives none, choose a Wada combination for the artifact. The one exception to neutral surfaces is a light tint of an accent color on a box or card. The Wada section says how to choose and check colors.

- Set the page on `jd-substrate`, cards and panels on `jd-surface-elevated`, wells and hover states on `jd-surface-recessed`. A text field inside a card or tint fills with `jd-substrate` instead. In light mode the page is pure white and boxes step down from it. In dark mode `jd-surface-elevated` stays lighter than `jd-substrate`.
- Set primary text in `jd-ink-100` and secondary text in `jd-ink-60`. Use `jd-ink-30` only for table hairlines and disabled states.
- Use `jd-signal-error` for errors and validation only.
- Leave `jd-accent` neutral on a page that does not need a color. A neutral page is a valid result.
- Use flat fills only: no gradients or shadows. On the light substrate a box or card may take a light tint of an accent color instead of `jd-surface-elevated`, with no separate request. The Wada section gives the range.
- Replace the substrate with a full harmony theme, or with a project's own page color, only when the owner asks for one.

## Content

- Write factually and plainly. No marketing language.
- Use sentence case or title case for headings, titles and the names of buttons and other controls. Never force uppercase on them. A wordmark is not a title.
- A wordmark is a product's name set as its mark, in one dedicated component or image that the project's profile names. It is not a heading. Its case, weight, size, and tracking are the owner's design. Its source string and accessible name are the name as written, and any uppercase comes from the host's case style. Everywhere else – headings, running text, labels, widgets, notifications – the name is written as a word.
- A small label keeps its role inside a control. A disclosure header that names its section is a section label: wrap its button in a heading and set `aria-expanded`. An eyebrow or value label inside a control keeps its casing only when the control also shows the title or value it names.
- Reserve uppercase for `t-label` and `t-micro`, with their positive tracking. Never add positive tracking to anything else, except in a wordmark.
- Set a small label in uppercase only when it passes all of this eligibility test: it is an eyebrow, section label, column header, or value label; it runs at most two words; it holds no digit, unit symbol, or mixed-case term; and it is never the most prominent text in its block. Anything else takes `t-as-written`, which keeps the style's size and weight and drops the uppercase and tracking. A control's own name, statuses, badges, counts, values, units, and messages are always `t-as-written`.
- Use no emoji.
- Set numbers in tables and metrics in `t-data` so the figures align.

## Type

- Use the typefaces the owner or the project's profile names, loaded from Google Fonts on the web, and pair them as the owner pairs them.
- Otherwise set all text in `--font-sans`, the host's system face, and code in `--font-mono`. Load no web fonts and pair no typefaces. On a host with no system face, such as print, choose a typeface for the work.
- Use the 12 styles as they stand: `t-display` for poster scale only, `t-h1` to `t-h4` for headings, `t-body-lg`, `t-body` and `t-small` for text, `t-label` and `t-micro` for labels, `t-data` and `t-mono` for data.
- Keep running text within `jd-measure-body` (65ch), and text in cards and sidebars within `jd-measure-compact` (45ch).
- Set the lines of one paragraph or one wrapped label close together, with no visible gap between them. Keep each style's own line height, and when you set a line height yourself, as with the owner's typeface, stay at 1.2 to 1.25 for text. Never open running text to 1.4 or more. Separate paragraphs and blocks with the space scale instead.
- Headings (`t-h1` to `t-h4`) use weight 800. `t-display` uses weight 900. Text uses 400. Weight 500 is for emphasis and buttons. With the owner's typeface, use its nearest weights.

## Space

- Lay everything on the 8px grid: `jd-space-1` to `jd-space-16`. Use `jd-space-half` (4px) only for micro offsets.
- Keep touch targets at `jd-space-touch` or larger: 44px on web and Apple.
- Pad cards with `jd-space-3`, or `jd-space-2` in dense panes and sidebars.

## Surfaces and shape

- Separate surfaces by fill contrast: `jd-surface-elevated` or a light accent tint on `jd-substrate`. Never put a border or stroke around a card.
- Keep hairlines (`jd-rule`, 1px) inside tables and divider rules.
- Set text fields apart by fill alone: `jd-surface-recessed` on the page, `jd-substrate` inside a card or tint, and no outline at rest. Give every field a visible label; a placeholder is not a label. Keep the accent focus ring and the `jd-signal-error` invalid ring, each at 3:1 or more against the surface around the field. Under `prefers-contrast: more` or `data-contrast="high"`, add a `jd-ink-100` outline.
- The field fill sits at 1.06 – 1.13:1, below the 3:1 that WCAG's Understanding document for 1.4.11 gives for fill-only inputs. This is the owner's accepted cost, like white ink: never darken a field fill or add an outline on ratios alone. A project that must claim formal WCAG conformance records an outline in its profile.
- Use `jd-radius-card` for cards, `jd-radius-control` for controls, `jd-radius-badge` for badges and tags, `jd-radius-subtle` for small inner elements. Never clip a card to a sharp rectangle.
- On Apple platforms use continuous corners. The host owns corner geometry, materials and safe areas.

## Filled surfaces

Resolve ink on any filled surface with `getContrastingInk` (`contrastingInk` on Apple). It returns black or white.

Judarn deliberately favors white ink beyond what contrast ratios suggest, because contrast math and the human eye disagree on filled components, and black ink turns saturated and mid-tone fills muddy. White ink falls to 1.91:1 at the crossover, and that is an accepted cost. Never replace the resolved ink on ratios alone. Report a low ratio to the owner instead.

## Motion and states

- Signal hover and active states with a contrast shift. Buttons invert their fill on hover.
- Leave springs, ripples, gesture curves and haptics to the host.
- Never add decorative motion.

## High contrast

The high-contrast themes promote `jd-ink-60` and `jd-ink-30` to `jd-ink-100`, move `jd-signal-error` to its AAA value and widen hairlines to `jd-rule-bold`. They need no separate design.

## Iconography

Judarn ships no icon set. Use the host's own: SF Symbols on Apple. On web, prefer plain text labels. Use no emoji in place of icons.

## Logo

Judarn has no logo. Set the name in plain type, and never draw, invent or imply a mark. `LogoLockup` stays in the bundle for a mark the owner supplies, such as a project's own. Without a `mark` it shows a construction placeholder, so never use it without one.

## Not in this system

Web components come from `platforms/web`. SwiftUI code is in the Judarn repository and is not bundled here. `sdui` serializers are not included. No font files ship here.

The Google Docs and Slides files in the repository's `templates/` are a local variant, not Judarn's rules. Their fonts and colors exist because Google Docs needs them chosen beforehand, so never take either from them.
