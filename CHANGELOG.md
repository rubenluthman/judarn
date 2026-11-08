# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.7.1] - 2026-11-08

### Added

- First public release. Judarn was developed in a private repository before this version, so earlier versions are not listed here ([ADR-0014](docs/adr/0014-public-repository-starts-from-a-fresh-history.md)).
- `@judarn/ui` is published to the npm registry through trusted publishing ([ADR-0013](docs/adr/0013-apps-consume-judarn-ui-from-the-public-npm-registry.md)).

### Changed

- Apple and web are the compiled hosts. Android is parked outside this repository ([ADR-0001](docs/adr/0001-design-tokens-are-the-single-source-of-truth.md)).
