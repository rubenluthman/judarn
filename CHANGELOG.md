# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
