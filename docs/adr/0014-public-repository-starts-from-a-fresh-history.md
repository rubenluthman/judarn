# Public Repository Starts from a Fresh History
Status: Active · 2026-11-08

## Decision

The public repository's first commit is the cleaned tree at version 0.7.1. Development from 2026-09-01 to 2026-11-08 happened privately, and that history lives only in the owner's offline Git bundle.

- No branch, tag, or object from the pre-release history is pushed to the public repository. The local checkout is a clone of the public repository, and a stray `git push --tags` from a checkout holding both histories is what this prevents.
- The tracked tree carries no absolute or home-relative paths, no paths, line references, or commit hashes from private repositories, and no personal details about the owner or third parties. `scripts/verify_commit.sh` scans for the path patterns, and the pattern list lives there. Records describe evidence from consuming apps in general terms.
- `previews/`, with studies of private apps, stays outside the repository.
- Android code lives only in the offline bundle while it is parked ([ADR-0001](0001-design-tokens-are-the-single-source-of-truth.md)).
- Decision records were consolidated once for the first public release, from 25 records to 14, and again to the current set under the editable-record format of 2026-11-10. The earlier originals live in the offline bundle.

## Why

Publishing `@judarn/ui` to npm ([ADR-0013](0013-apps-consume-judarn-ui-from-the-public-npm-registry.md)) needs a public repository, and the private history holds home paths, a personal email address on most commits, and details of a private app that cleanup commits cannot remove. Making the existing repository public would publish all of it. Staying private would have needed GitHub Packages, a renamed package, and a personal access token on every machine.

## What we gave up

- **The development history.** Earlier commits and tags stay private, and hashes cited in documents stop resolving for outside readers.
- **The dated sequence of decisions.** Only the bundle and Git history since 0.7.1 show how decisions changed.
- **Stable citations.** Other repositories that cite Judarn records by their former numbers find gaps or different records.

## Revisit if

The owner decides to publish the earlier history after a full scrub, or a private-material leak is found in the public tree.
