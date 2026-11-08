---
status: accepted
date: 2026-11-08
deciders: Ruben Luthman
tags: [repository, visibility, history, adr-governance]
---

# Public Repository Starts from a Fresh History

## Context and Problem Statement

Judarn was developed in a private repository from 2026-09-01 to 2026-11-08. Publishing `@judarn/ui` to npm ([ADR-0013](0013-apps-consume-judarn-ui-from-the-public-npm-registry.md)) needs a public repository. An audit before the change found private material that cleanup commits cannot remove: home-directory paths and private configuration paths in history, a personal email address on most commits, file paths, line ranges, defects and commit hashes from a private app in the bodies of accepted ADRs, and studies of that app in `previews/`. The repository's rules forbid force-pushing `main`, deleting records, and changing the body of an accepted ADR.

The same cleanup exposed a second problem: 25 records, several of which only amended or corrected others, made the decision list hard to read for anyone outside the project. A first public commit was prepared and found to carry that list. A consolidation commit on top of it was impossible, because `scripts/verify-adrs.js` rejects deleted or renamed records and body edits to accepted records, hooks may not be bypassed, and force-pushing `main` is forbidden.

How does Judarn become public without publishing the private material, and with a decision list that states each active decision once?

## Decision Drivers

- No private-project internals, home paths, or personal details in anything public.
- No force-push of `main` and no history rewrite of a published repository.
- Every active decision and invariant survives, and reversed positions stay visible as considered options so nobody repeats them.
- Consumers keep the same local path and package name.
- Other repositories cite Judarn records by number, so former numbers stay resolvable.

## Considered Options

- **Option 1: A new public repository from the cleaned tree and a consolidated record set, with the pre-release history kept offline.**
- **Option 2: Make the existing repository public after cleanup commits.**
- **Option 3: Stay private and publish to GitHub Packages.**
- **Option 4: A consolidation commit on top of an already published first commit.**

## Decision Outcome

Chosen option: **Option 1**, because it is the only option that publishes none of the private material and ends with a single, current record set, without rewriting the history of a published repository.

The record set was consolidated once, when the public repository was created, from 25 records to 14. Each active decision appears once in its current form, and superseded or amending records are folded into the records they changed. `docs/adr/README.md` maps former numbers to the new ones.

### Invariants & Negative Constraints

1. **Public history starts at 0.7.1:** the public repository's first commit is the cleaned tree at version 0.7.1. History before it was developed privately and lives only in the owner's offline Git bundle of the pre-release history. No branch, tag, or object from that history is pushed to the public repository.
2. **Public tree hygiene:** the tracked tree carries no absolute or home-relative paths, no file paths, line references, or commit hashes from private repositories, and no personal details about the owner or third parties. ADRs describe evidence from consuming apps in general terms. `scripts/verify_commit.sh` scans for the path patterns; the pattern list lives there.
3. **One-time consolidation:** the record set was consolidated once, when the public repository was created. The original records, with their amendment chains, live in the owner's offline Git bundle of the pre-release history. From the first public commit on, the normal lifecycle applies unchanged: accepted records are immutable outside their status and callout, and a changed decision needs a new record.
4. **Studies of private apps stay outside:** `previews/` is not part of the public repository. Studies that use a private app's strings or code live outside this repository.
5. **Android stays offline:** Android code lives only in the offline bundle while it is parked ([ADR-0001](0001-design-tokens-are-the-single-source-of-truth.md)).

### Positive Consequences

- Nothing private reaches the public repository or npm.
- Readers meet 14 current records, each with the reversed positions it carries as considered options.
- The offline bundle keeps the full record, including every original ADR body.

### Negative Consequences

- **The public repository loses the pre-release record.** Every earlier commit and tag stays private, and commit hashes cited in documents stop resolving for outside readers. Worst case: a reader cannot see who changed what on which day. Set aside: publishing the development history.
- **The dated sequence of individual decisions is gone from the tree.** Amendments and supersessions are folded in, so only the bundle holds the original sequence. Worst case: a record states a current position without the day it changed. Set aside: keeping 25 records with amendment chains, and a consolidation commit that the lifecycle gate forbids.
- **Citations in other repositories use former numbers.** Worst case: a repository keeps citing a number above 0014 or a number that now means another record. The Former numbers table in `docs/adr/README.md` resolves them until they are updated.
- **The local checkout is replaced by a clone of the public repository at the same path,** and the pre-release history lives only in the offline bundle. Set aside: one checkout holding both histories, where a stray `git push --tags` would publish the private one.

## Pros and Cons of the Options

### Option 1: New public repository, consolidated records, offline history

- Good, because no private material is published and no published history is rewritten.
- Bad, because the public repository starts without its development history and with folded records.

### Option 2: Make the existing repository public after cleanup commits

- Good, because the full development history stays visible.
- Bad, because history keeps every path, email address, and private-app detail, and accepted ADR bodies keep their private details.

### Option 3: Stay private and publish to GitHub Packages

- Good, because nothing becomes public.
- Bad, because the package name must change and every machine needs a classic personal access token ([ADR-0013](0013-apps-consume-judarn-ui-from-the-public-npm-registry.md)).

### Option 4: A consolidation commit on top of a published first commit

- Good, because the first commit stays as published.
- Bad, because the lifecycle gate rejects deleted or renamed records and body edits to accepted records, hooks may not be bypassed, and force-pushing `main` is forbidden.
