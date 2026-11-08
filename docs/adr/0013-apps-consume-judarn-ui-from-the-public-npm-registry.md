---
status: accepted
date: 2026-11-08
deciders: Ruben Luthman
tags: [web, packaging, distribution, ci]
---

# Apps Consume @judarn/ui from the Public npm Registry

## Context and Problem Statement

Apps depended on `@judarn/ui` as `file:../../Packages/judarn/platforms/web`. npm records that as a symlink with no version or integrity hash, so an app build used whatever the Judarn working tree held, including uncommitted changes, and resolved only on the owner's Mac. The first app to deploy from GitHub Actions, a SvelteKit site on Cloudflare Workers, cannot resolve that path, and npm git dependencies cannot address a package in a repository subdirectory.

How should apps that build elsewhere consume `@judarn/ui`?

## Decision Drivers

- A deployed app must match one app commit, and that commit must pin one immutable Judarn release.
- CI holds as few long-lived secrets as possible.
- Apps consume shared code from the Judarn package instead of copying it.
- No recurring cost.
- Local co-development of Judarn and an app stays possible.

## Considered Options

- **Option 1: Publish to GitHub Packages as a private, versioned npm package.**
- **Option 2: CI checks out Judarn at a pinned tag with a read-only key and builds against it.**
- **Option 3: Publish to the public npm registry with trusted publishing.**
- **Option 4: npm git dependency on the repository.**

## Decision Outcome

Chosen option: **Option 3**, because it is the only option where neither app CI nor the publish job stores a secret, apps pin an exact version with a lockfile integrity hash, and installs need no credential on any machine. It requires a public repository, which [ADR-0014](0014-public-repository-starts-from-a-fresh-history.md) establishes.

### Invariants & Negative Constraints

1. **Registry versions only:** committed app manifests and lockfiles depend on `@judarn/ui` by exact version from the npm registry. No committed manifest or lockfile carries a `file:`, `link:`, or git specifier for it. Each app's verification script enforces this.
2. **Transient local overrides:** co-developing Judarn and an app uses an override that never reaches the lockfile (`npm link`, or `npm install --no-save <path>`); the next `npm ci` restores the pinned release.
3. **Publish from tags:** a release publishes only from a `vX.Y.Z` tag equal to `platforms/web/package.json`'s version, after `./scripts/verify_commit.sh` passed on that commit. Published versions are immutable, like tags.
4. **No stored publish token:** `publish-npm.yml` publishes through npm trusted publishing (OIDC). No npm token is stored in the repository, its secrets, or the owner's machine. The workflow's toolchain meets the npm CLI and Node minimums npm documents for trusted publishing.
5. **Tarball contents** stay as [ADR-0011](0011-web-package-ships-compiled-javascript.md) defines them.

### Positive Consequences

- App CI installs `@judarn/ui` with no secret.
- Every published version carries a provenance attestation linking it to its tag and workflow run.
- Builds are reproducible: the lockfile hash pins the exact tarball.

### Negative Consequences

- **Publishing cannot be undone** beyond npm's short unpublish window. Set aside: a registry where versions can be withdrawn.
- **Co-developing needs a manual override,** and a change reaches the app's CI only after a release. Set aside: a live `file:` link in committed manifests.
- **The `@judarn` scope depends on an npm organisation named `judarn`.** If that name is unavailable, the package name and every reference to it change.
- **The source and every published version are public.** Set aside: keeping the package private.

## Pros and Cons of the Options

### Option 1: GitHub Packages as a private, versioned npm package

- Good, because apps pin exact versions with integrity hashes and the source stays private, and app CI can install with `GITHUB_TOKEN` once the package grants the app repository read access.
- Bad, because GitHub Packages requires the scope to equal the owning account, so `@judarn/ui` needs a rename, an npm alias, or a `judarn` organisation.
- Bad, because every local install needs a classic personal access token with `read:packages`, which reads every package the account can see.
- Bad, because private transfer outside Actions is capped monthly and blocked, not billed, without a payment method.

### Option 2: CI checks out Judarn at a pinned tag

- Good, because local development is unchanged and a read-only deploy key is a narrow credential.
- Bad, because the pin lives in a workflow variable while the lockfile records only a symlink, so local builds test the working tree and CI deploys the tag.
- Bad, because the workflow must recreate the owner's folder layout for the relative path to resolve, and must build the gitignored `dist/`.

### Option 3: Public npm registry with trusted publishing

- Good, because no secret exists for install or publish, and provenance is automatic.
- Bad, because the source and every published version are public.

### Option 4: npm git dependency on the repository

- Bad, because npm cannot install from a repository subdirectory, `dist/` is not committed, and a private repository still needs a CI credential.
