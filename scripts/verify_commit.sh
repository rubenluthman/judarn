#!/usr/bin/env bash
set -euo pipefail

echo "======================================================="
echo "Judarn Monorepo Pre-Commit Verification Suite"
echo "======================================================="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# A machine-wide lock for memory-heavy jobs, if `heavy-run` is installed; otherwise run directly (CI, other computers).
heavy() { if command -v heavy-run >/dev/null 2>&1; then heavy-run "$@"; else "$@"; fi; }

# Docs-only changes skip the heavy build and test steps (3 to 5). The command prints its own reason.
if scripts/commit-checks docs-only; then DOCS_ONLY=1; else DOCS_ONLY=0; fi

echo "1. Design Token Drift & Schema Parity Check..."
node scripts/compile-tokens.js --check

echo "1a. Token Loader Conformance Tests..."
node --test scripts/lib/design-tokens.test.js > /dev/null

echo "1b. Wada Explorer Build Drift Check..."
node scripts/build-wada-explorer.js --check

echo "1c. Wada MCP Server Stdio Tests..."
node --test tools/wada-explorer/mcp/server.test.js > /dev/null

echo "1d. Consumer Status Tests..."
node --test scripts/consumers.test.js > /dev/null

echo "2. Cross-Platform Token Version Synchronization Check..."
node scripts/sync-version.js --check

if [ "$DOCS_ONLY" = 1 ]; then
  echo "3 to 5. Skipped (Swift, iOS, web and consumption steps): docs-only change."
else
  echo "3. Apple Native (Swift) Build & Test Suite..."
  heavy swift build
  echo "   Running swift test (queues behind other heavy jobs if heavy-run is installed)..."
  heavy swift test

  echo "3b. Apple iOS Simulator Test Suite (queues behind other heavy jobs if heavy-run is installed)..."
  heavy ./scripts/test-ios.sh

  echo "4. Web Platform Verification Suite & Packaging Hygiene..."
  [ -d platforms/web/node_modules/esbuild ] || npm --prefix platforms/web ci --no-audit --no-fund
  npm --prefix platforms/web test
  (cd platforms/web && npm pack --dry-run > /dev/null)
  echo "✓ Web package tests, build and tarball packaging verified."

  echo "5. Cross-Platform External Consumption Contracts..."
  node scripts/verify-consumption.js
fi

echo "7. Commit Message Hook Verification..."
TMP_MSG_VALID=$(mktemp)
TMP_MSG_INVALID=$(mktemp)
echo "feat(tokens): test valid commit format" > "$TMP_MSG_VALID"
echo "invalid commit message format" > "$TMP_MSG_INVALID"

.githooks/commit-msg "$TMP_MSG_VALID"
if .githooks/commit-msg "$TMP_MSG_INVALID" 2>/dev/null; then
  echo "❌ Hook failed to reject invalid commit message"
  rm -f "$TMP_MSG_VALID" "$TMP_MSG_INVALID"
  exit 1
fi
rm -f "$TMP_MSG_VALID" "$TMP_MSG_INVALID"
echo "✓ Commit-msg hook strictly validated."

echo "8b. Machine-specific paths..."
# Home paths are caught by the shared commit checks (8c). This covers tool folders and file URLs.
if git grep -nI -e '~/\.gemini' -e '~/\.claude' -e 'file:///' -- . ':!scripts/verify_commit.sh'; then
  echo "❌ tracked files contain private paths" >&2
  exit 1
fi
echo "✓ No private paths in tracked files."

echo "8c. Shared commit checks (secrets, paths, emails, links, decision records, version guard, house style, hooks)..."
scripts/commit-checks verify

echo "======================================================="
echo "✓ All Monorepo Verification Checks Passed Successfully!"
echo "======================================================="
