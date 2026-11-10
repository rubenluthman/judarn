# Apps consume @judarn/ui from the public npm registry
Status: Active · 2026-11-08

## Decision

Apps depend on `@judarn/ui` by exact version from the public npm registry, and releases publish through npm trusted publishing.

- Committed app manifests and lockfiles never use a `file:`, `link:`, or git specifier for it. Local co-development uses `npm link` or `npm install --no-save <path>`, which never reaches the lockfile.
- A release publishes only from a `vX.Y.Z` tag equal to `platforms/web/package.json`'s version, after `./scripts/verify_commit.sh` passed on that commit. Published versions are immutable.
- `publish-npm.yml` publishes through OIDC. No npm token is stored in the repository, its secrets, or on the owner's machine, except as the first-version rule below allows. The tarball contents follow [ADR-0011](0011-web-package-ships-compiled-javascript.md).
- **A package's first version is published by hand.** npm only offers trusted publishing for a package that already exists, and an unused trusted-publisher setup expires. The owner publishes the first version from a clean checkout at its tag, after the gate passed, with two-factor authentication. Every later version publishes through the workflow. After the first workflow publish succeeds, the owner runs `npm logout`, and the package's publishing access requires two-factor authentication and disallows tokens. The trusted publisher is saved on npmjs.com only when a release is ready to publish through it.
- Every version after a package's first carries a provenance attestation. `@judarn/ui` 0.7.1, published by hand on 2026-11-09, is the one version without. 0.7.2 was the first through the workflow.

## Why

Apps used to depend on `file:../../Packages/judarn/platforms/web`, a symlink with no version or hash, so a build used whatever the working tree held and resolved only on the owner's Mac. The public registry with trusted publishing is the only option where neither app CI nor the publish job stores a secret, apps pin an immutable release with an integrity hash, and installs need no credential. It requires a public repository ([ADR-0014](0014-public-repository-starts-from-a-fresh-history.md)). A placeholder first version would sit in the registry forever and still need a manual publish. A temporary repository token would be a secret that outlives its use.

## What we gave up

- **Undoing a publish** beyond npm's short unpublish window.
- **Live local linking.** A change reaches an app's CI only after a release.
- **Provenance on 0.7.1.** A consumer that requires attestations must start at 0.7.2.
- **A short token window.** A login token sits on the owner's Mac between the first manual publish and `npm logout`, though npm still asks for the second factor on every publish.
- **A private package.** Source and every version are public, and the scope depends on an npm organisation named `judarn`.

## Revisit if

npm allows a trusted publisher before a package exists, or the package needs to be private again.
