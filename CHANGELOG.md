# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
