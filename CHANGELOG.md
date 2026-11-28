# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.53] - Unreleased

### Added

- Apple apps that render HTML can load Judarn's CSS variables from `JudarnWebCSS.variables`, including a line height per text style (`--jd-lh-*`).

## [0.8.52] - 2026-11-26

### Fixed

- Searching the color dictionary for a name with an apostrophe, such as Pale King's Blue, works when a phone types a curly apostrophe.

## [0.8.51] - 2026-11-25

### Changed

- The slides template README spells out the number of archetypes in its heading.

## [0.8.50] - 2026-11-24

### Changed

- The Wada explorer README links to the Offentlig Sans repository.

## [0.8.49] - 2026-11-23

### Changed

- `scripts/test-ios.sh` runs through `sim-run` when it is installed, which stops a stalled run and shuts down a simulator it booted, Ctrl+C included; without it, the script falls back to plain `xcodebuild`.

## [0.8.48] - 2026-11-23

### Fixed

- `scripts/test-ios.sh` shuts down the iOS simulator it started once the run ends, pass or fail; a simulator that was already running stays up.

## [0.8.47] - 2026-11-23

### Added

- `judarnFieldWell(focused:equals:)` takes a form's shared focus value, such as an enum, so a field in a form with several fields carries one focus binding.

### Fixed

- The rules for Claude artifacts now carry the text-field focus rules: at most one line on a focused field, and no focus ring where the host shows focus itself.

## [0.8.46] - 2026-11-23

### Changed

- A focused text field shows one line in one color: while its focus ring shows, the ring replaces the edge, in the accent, or in the error color when the field is invalid. This holds on the Mac and on the web; an unfocused invalid field keeps its error edge, and iOS is unchanged.

## [0.8.45] - 2026-11-22

### Changed

- The agent guide no longer repeats the shared decision-record rule; it keeps only that `docs/DESIGN.md` is generated from `scripts/compile-tokens.js`.

## [0.8.44] - 2026-11-22

### Added
- `judarnFieldWell()` for Apple: the text-field look as a view modifier that `TextField`, `SecureField` and `TextEditor` can all use. `JudarnTextField` is built on it.

### Changed
- The Apple text field is quieter: one 2 pt focus ring outside the field on macOS, no Judarn ring on iOS (the caret and keyboard show focus), and 8 pt side padding on macOS.

## [0.8.43] - 2026-11-22

### Changed
- The README now says where the name Judarn comes from.

## [0.8.42] - 2026-11-22

### Changed
- General rules now ask for less text and tighter spacing in dense views: say each thing once, and keep rows and controls close.

## [0.8.41] - 2026-11-22

### Changed
- The Wada explorer is set in Offentlig Sans 0.7.0: round dots by default, a round ring on Å and Ů, and deeper notches in the heavy weights.

## [0.8.40] - 2026-11-21

### Fixed
- Publishing the Wada explorer no longer fails when GitHub is slow to register the uploaded site: building and publishing now run as two jobs.

## [0.8.39] - 2026-11-20

### Changed
- The Wada explorer has a phone layout: below 640 px it fits the screen with a 16 px gutter, 44 px touch targets, one-column grids and a slide that scales down. The desktop layout is unchanged.

## [0.8.38] - 2026-11-20

### Changed
- The roadmap now plans a comparison of Offentlig Sans in the projects that use Judarn, not a switch of the default font.

## [0.8.37] - 2026-11-20

### Changed
- The roadmap plans Offentlig Sans as Judarn's default typeface and a phone layout for the Wada explorer.

## [0.8.36] - 2026-11-20

### Added
- The Wada color explorer is online at https://rubenluthman.github.io/judarn/.

### Changed
- The explorer is set in Offentlig Sans, with tracked uppercase labels.

## [0.8.35] - 2026-11-20

### Changed
- The roadmap no longer plans logo images for package listings.

## [0.8.34] - 2026-11-20

### Changed
- The roadmap no longer plans a Judarn logo, since Judarn has none.

## [0.8.33] - 2026-11-20

### Changed

- The roadmap lists two small fixes for the consumer status command.

## [0.8.32] - 2026-11-20

### Added

- `node scripts/consumers.js` reports, for each app that loads Judarn, which version it holds and whether updating to a newer tag changes anything it loads, with old and new token values on an optional review page.

## [0.8.31] - 2026-11-20

### Changed

- The check script also runs its Swift build through `heavy-run` when it is installed.

## [0.8.30] - 2026-11-20

### Changed

- The check script runs its Apple test suites through `heavy-run` when it is installed, so they queue behind other memory-heavy jobs on the same machine.

## [0.8.29] - 2026-11-19

### Fixed

- The full commit check script passes in linked git worktrees whose hooks path is a full path (commit-checks 0.2.7).

## [0.8.28] - 2026-11-19

### Fixed

- Commits made from a linked git worktree now pass the shared commit checks (commit-checks 0.2.6).

## [0.8.27] - 2026-11-19

### Changed

- Decision-record, link, release-tag and house-style checks, and the commit message check, now come from the shared commit-checks package; the copies in this repository are removed.

## [0.8.26] - 2026-11-19

### Changed

- Commits, pushes and GitHub Actions now run the shared secret, home-path, email and private-name checks, and the hook runs on push.

## [0.8.25] - 2026-11-19

### Changed

- Docs and decision records describe the pre-release history and publishing setup in general terms.

## [0.8.24] - 2026-11-17

### Fixed

- The token compiler now fails the build when the web `WCAG_CROSSOVER` in `Badge.jsx` drifts from the compiler's WCAG crossover, as ADR-0005 requires.

## [0.8.23] - 2026-11-16

### Changed

- Standardize terminology across packages, templates, tools, and `AGENTS.md` on "Judarn Design System", reserving "foundation" for the base token and primitive layer.

## [0.8.22] - 2026-11-16

### Changed

- Ignore local `docs/private/` scratch and presentation files in `.gitignore`.

## [0.8.21] - 2026-11-16

### Changed

- Rendered AI artifact rules (`docs/DESIGN.md`, `docs/claude-artifact/README.md`): owner-only visual and HTML artifacts use `"Offentlig Sans"` ahead of the system sans-serif fallback without external font loads, except for native OS mockups and tools that cannot load local fonts.

## [0.8.20] - 2026-11-16

### Changed

- Agent guide: release commits keep the subject within 72 characters and chain the tag to the commit, and Judarn has no logo.

## [0.8.19] - 2026-11-16

### Added

- Web: `getContrastingAccent(accent, surface, minRatio)` clamps an accent used as text to a contrast ratio, matching Apple's `contrastingAccent`.
- `.jd-table` keeps its first column fixed when a wrapper scrolls sideways, and `.num` and `<time>` cells never wrap.

## [0.8.18] - 2026-11-15

### Changed

- The npm publish workflow uses the same checkout and Node setup action versions as CI.

## [0.8.17] - 2026-11-15

### Changed

- The architecture notes name `judarnInCard`, the Apple setting that narrows lists inside cards.

## [0.8.16] - 2026-11-15

### Fixed

- `LogoLockup` accepts `className` and forwards other attributes, and `TextFieldProps` narrows by `as` (input, textarea or select).
- The README Apple example uses `.judarnSmall()`, which compiles.
- The card border and web contrast checks now test the current class names and shared colour maths.

## [0.8.15] - 2026-11-15

### Fixed

- The second high-contrast block on web (matrix, table and field border widths) now respects `data-contrast="normal"` like the blocks around it.
- A server-driven text field with `as: "select"` takes an `options` list of `{ value, label }` strings, so the dropdown is no longer empty.
- The Wada MCP `export_tokens` tool gives dark-mode surfaces no colour tint, matching light mode; only the accents take colour.

## [0.8.14] - 2026-11-15

### Fixed

- The Apple button's focus ring and a flat card's eyebrow now reach their contrast minimum against the surface they actually sit on.
- The Apple text list takes the compact column width inside any card, flat or not, matching web.
- Increase Contrast outlines on Apple buttons, badges and tags are now 2pt, matching text fields and web.

## [0.8.13] - 2026-11-15

### Changed

- Accent color without an owner's choice now comes from a Sanzo Wada combination chosen for the work in every copy of the rules; work with no accent stays neutral, and an existing app's colors are never replaced.
- The architecture guide points to `docs/DESIGN.md` for design rules and lists where each is implemented.
- The README contrast figures now match the compiler's checks, and everything in `templates/` is described as a local variant.

## [0.8.12] - 2026-11-14

### Added

- On macOS, `JudarnTypographyStyle.nsFont()` returns the AppKit font for each typography style, so labels and fields outside SwiftUI can follow the same scale.

## [0.8.11] - 2026-11-13

### Removed

- A project profile whose only departure from Judarn's defaults no longer applies.

## [0.8.10] - 2026-11-13

### Fixed

- On Apple, a disabled `JudarnTextField` now uses disabled ink and, in Increase Contrast, draws a dashed outline, so it no longer looks like an enabled one.

## [0.8.9] - 2026-11-13

### Fixed

- In high contrast, disabled buttons and text fields draw a dashed outline, so they no longer look the same as enabled ones. On Apple this covers buttons.

## [0.8.8] - 2026-11-13

### Changed


- Prose checks use house-style v0.3.4, which flags more promotional and filler wording.

## [0.8.7] - 2026-11-13

### Added

- A color rule: colors that must be told apart differ in lightness, checked by comparing lightness or viewing in grayscale.

## [0.8.6] - 2026-11-13

### Changed


- The iOS simulator test step of the commit check also waits its turn when another project's Apple tests are running.

## [0.8.5] - 2026-11-13

### Changed


- The Swift test step of the commit check waits its turn when another project's Apple tests are running.

## [0.8.4] - 2026-11-13

### Changed


- Documentation now matches the code: the compiler emits Swift and CSS only, Android is parked, and the Apple component list includes `JudarnBadge`, `JudarnTextField` and `JudarnTextList`.

## [0.8.2] - 2026-11-13

### Added

- A guideline page (`README.md`) beside each web component, checked against its variants by the unit tests. The Claude design system copies these pages from the repository.

## [0.8.1] - 2026-11-13

### Added

- List rules in `DESIGN.md`: items of text get bullets, or numbers when order matters, in secondary ink with a hanging indent, 8 px apart, at the reading measure; rows of links, data or controls get no markers; capitals and punctuation for Swedish and English; at most one nested level.
- `.jd-list` in the web package for `ul` and `ol`, with a `.jd-list--plain` variant for rows. It sits inside `.flow` as one block.
- `JudarnTextList` on Apple for bulleted or numbered items of text, with a marker column that scales with Dynamic Type.

## [0.8.0] - 2026-11-13

### Changed


- **Breaking:** every web component class now carries the `jd-` prefix (`.btn` is `.jd-btn`, `.card` is `.jd-card`, `.table` is `.jd-table`, and so on), so `@judarn/ui/styles` no longer styles a project's own classes.
- **Breaking:** buttons, badges, and tags are set apart by fill, with no outline at rest, on web and Apple. The outline button is gone, the outline badge is now `neutral`, and `accent-outline` is now `accent-tint`. High-contrast modes still add an outline.

## [0.7.12] - 2026-11-13

### Added

- A general rule for the space around headings: a heading belongs to the text it introduces, with less space below it than between paragraphs and at least twice the paragraph space above it.
- A `.flow` class in the web package, generated from the space tokens: 16 px between the direct children of a container, 32 px above a heading and 8 px below one. Never combine it with `gap`.

## [0.7.11] - 2026-11-12

### Added

- Named a deeper highlight tint (`L ≈ 0.90 – 0.95`) next to the light tint, for a highlighted item or a header row. At most two tint steps per color, in light mode only.

## [0.7.10] - 2026-11-10

### Changed


- Pinned house-style v0.3.0: Markdown headings now use sentence case, with the generated `docs/DESIGN.md` left as compiled.

## [0.7.9] - 2026-11-10

### Changed


- Vale now checks only Markdown and Swift, because the repository has no .txt files.

## [0.7.8] - 2026-11-10

### Changed


- Pin the shared Vale package house-style to v0.2.1 and use its reworded house style paragraph in `docs/house-style.md`. No rules change.

## [0.7.7] - 2026-11-10

### Added

- A rule for text fields in `docs/DESIGN.md`: a field is a well set apart by fill alone, `surfaceRecessed` on the page and `substrate` inside a card, with a visible label and no outline at rest. The fill's 1.06 – 1.13:1 ratio is an accepted cost, like white ink, not a claim of WCAG conformance; a project that needs formal conformance records an outline in its profile.

### Changed


- The web and Apple text fields drop their resting outline and fill by context. High-contrast modes (`prefers-contrast: more`, `data-contrast="high"`, Apple's Increase Contrast) add an `ink100` outline. The focus and invalid rings stay, and on Apple the focus ring is clamped to 3:1.
- `JudarnCard` sets the new `judarnOnElevatedSurface` environment value, so fields inside it fill with `substrate`.

## [0.7.6] - 2026-11-10

### Changed


- Decision records follow the four-heading format (Decision, Why, What we gave up, Revisit if) and are edited in place. Seven records remain; the design rules of the others now live in `docs/DESIGN.md`.

## [0.7.5] - 2026-11-09

### Changed


- On Apple hosts, tight leading shortens text by 2pt per line break, not per line, and single-line text keeps its height. ADR-0016 corrects the figures in ADR-0012.

## [0.7.4] - 2026-11-09

### Changed


- Repository checks run on GitHub for every push to `main` that changes code, on current macOS runners and Xcode.
- A decision record explains why the first npm version, 0.7.1, was published by hand and has no provenance attestation (ADR-0015).
- There is no 0.7.3 release: tag `v0.7.3` was created by mistake on the 0.7.2 commit and is kept unchanged.

## [0.7.2] - 2026-11-09

### Changed


- `@judarn/ui` releases publish from GitHub Actions through npm trusted publishing, with a provenance attestation that links each version to its source commit.

### Fixed

- The version check now also covers `platforms/web/package-lock.json`, which had kept an older version.

## [0.7.1] - 2026-11-08

### Added

- First public release. Judarn was developed in a private repository before this version, so earlier versions are not listed here ([ADR-0014](docs/adr/0014-public-repository-starts-from-a-fresh-history.md)).
- `@judarn/ui` is published to the npm registry ([ADR-0013](docs/adr/0013-apps-consume-judarn-ui-from-the-public-npm-registry.md)).

### Changed


- Apple and web are the compiled hosts. Android is parked outside this repository ([ADR-0001](docs/adr/0001-design-tokens-are-the-single-source-of-truth.md)).
