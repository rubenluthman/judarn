#!/usr/bin/env bash
# Fails when the working tree carries a version whose release tag already exists and the tree is not
# that exact, clean release commit. Committing on top would reuse an immutable tag's version.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

CURRENT_VER=$(node scripts/sync-version.js --get)
if git rev-parse -q --verify "refs/tags/v${CURRENT_VER}" >/dev/null; then
  TAG_COMMIT=$(git rev-parse "v${CURRENT_VER}^{commit}")
  HEAD_COMMIT=$(git rev-parse HEAD)
  # A clean tree at the tagged commit is the release itself. Staged or unstaged changes on top of it
  # would be committed under the tag's version, so they collide too.
  if [ "$TAG_COMMIT" != "$HEAD_COMMIT" ] || ! git diff --quiet HEAD --; then
    echo "❌ Working tree version ${CURRENT_VER} collides with existing git tag v${CURRENT_VER} at commit ${TAG_COMMIT:0:7}." >&2
    echo "   Bump the version using 'node scripts/bump-version.js' before committing." >&2
    exit 1
  fi
fi
echo "✓ Version v${CURRENT_VER} validated (no collision with existing tags)."
