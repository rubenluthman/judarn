---
status: accepted
date: 2026-11-09
deciders: Ruben Luthman
tags: [web, packaging, distribution, security]
---

# First npm Publish of a New Package Is Manual

## Context and Problem Statement

[ADR-0013](0013-apps-consume-judarn-ui-from-the-public-npm-registry.md) publishes `@judarn/ui` through npm trusted publishing. It states that no npm token is stored on the owner's machine and that every published version carries a provenance attestation. npm adds a trusted publisher in the settings of a package that already exists, and a new trusted publisher configuration expires unless a publish uses it within the window npm documents. A package's first version therefore cannot come from `publish-npm.yml`.

`@judarn/ui` 0.7.1, its first version, was published by hand from the owner's Mac on 2026-11-09, after `npm login` with two-factor authentication. It has no provenance attestation. 0.7.2 then published through the workflow with an attestation, and the owner ran `npm logout`, which revoked the login token.

How does a package that does not exist on npm yet get its first version?

## Decision Drivers

- No long-lived npm secret anywhere: not in the repository, its secrets, or on a machine.
- Every published version is a real release; none exists only to create the package.
- Published versions are immutable, so a first version cannot be redone.

## Considered Options

- **Option 1: The owner publishes the first version by hand with two-factor authentication, then logs out once the workflow publishes.**
- **Option 2: Publish a placeholder version first, then the real release through the workflow.**
- **Option 3: Store a temporary granular token as a repository secret for the first workflow publish.**

## Decision Outcome

Chosen option: **Option 1**, because it publishes only real releases and leaves no secret behind once the workflow has taken over.

### Invariants & Negative Constraints

1. **Manual only for a first version:** a hand publish happens only for the first version of a package name that does not exist on npm yet. It runs from a clean checkout at that version's release tag, after `./scripts/verify_commit.sh` passed on that commit, with two-factor authentication. Every later version publishes through `publish-npm.yml`.
2. **Logout after takeover:** once the first workflow publish succeeds, the owner runs `npm logout`, so no npm token stays on the machine.
3. **Publisher saved at release time:** the trusted publisher is saved on npmjs.com only when a release is ready to publish through it, because an unused configuration expires.
4. **Tokens disallowed after takeover:** once the workflow has published, the package's publishing access requires two-factor authentication and disallows tokens. Trusted publishing is unaffected by that setting.
5. **Provenance from the second version:** every version after a package's first carries a provenance attestation. `@judarn/ui` 0.7.1 is the one version without.

### Positive Consequences

- The first version is a real, verified release, and no placeholder version exists.
- No secret is ever stored in the repository or its settings.

### Negative Consequences

- **The first version has no provenance attestation.** Verified worst case: `npm view @judarn/ui@0.7.1 dist.attestations` returns nothing, so a consumer that requires attestations must skip 0.7.1 and start at 0.7.2. Set aside: a placeholder version, which would carry no provenance either.
- **A login token sits on the owner's Mac between the first publish and the logout.** Worst case: a compromised machine could publish during that window, though npm still asks for the second factor on every publish. Set aside: a repository secret, which lasts until someone deletes it.

## Pros and Cons of the Options

### Option 1: Manual first version, then logout

- Good, because only real releases are published and no secret outlives the takeover.
- Bad, because the first version has no provenance and a token exists on one machine for a short time.

### Option 2: Placeholder version first

- Good, because the real first release could come from the workflow with provenance.
- Bad, because an immutable version that holds no release stays in the registry, the placeholder itself still needs a manual publish, and this repository's versioning allows no prerelease suffixes to mark it.

### Option 3: Temporary token as a repository secret

- Good, because the first version would come from the workflow.
- Bad, because it stores a publish secret in the repository settings, which ADR-0013 rules out, and the workflow would need a token path that stays in it afterwards or is removed by a second change.
