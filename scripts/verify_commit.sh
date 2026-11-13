#!/usr/bin/env bash
set -euo pipefail

echo "======================================================="
echo "Judarn Monorepo Pre-Commit Verification Suite"
echo "======================================================="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "1. Design Token Drift & Schema Parity Check..."
node scripts/compile-tokens.js --check

echo "1a. Token Loader Conformance Tests..."
node --test scripts/lib/design-tokens.test.js > /dev/null

echo "1b. Wada Explorer Build Drift Check..."
node scripts/build-wada-explorer.js --check

echo "1c. Wada MCP Server Stdio Tests..."
node --test tools/wada-explorer/mcp/server.test.js > /dev/null

echo "2. Cross-Platform Token Version Synchronization Check..."
node scripts/sync-version.js --check

echo "2b. Release Tag Collision Guard..."
bash scripts/check-release-tag.sh

echo "2c. ADR Governance..."
node --test scripts/verify-adrs.test.js > /dev/null
node scripts/verify-adrs.js

echo "3. Apple Native (Swift) Build & Test Suite..."
swift build
echo "   Running swift test (waits if another project's Apple tests are running)..."
lockf -k -t 1800 /tmp/apple-tests.lock swift test || {
  status=$?
  [ "$status" -eq 75 ] && echo "❌ Another project's Apple tests held the lock for 30 minutes (lock file: /tmp/apple-tests.lock). Tests did not run."
  exit "$status"
}

echo "3b. Apple iOS Simulator Test Suite (waits if another project's Apple tests are running)..."
lockf -k -t 1800 /tmp/apple-tests.lock ./scripts/test-ios.sh || {
  status=$?
  [ "$status" -eq 75 ] && echo "❌ Another project's Apple tests held the lock for 30 minutes (lock file: /tmp/apple-tests.lock). Tests did not run."
  exit "$status"
}

echo "4. Web Platform Verification Suite & Packaging Hygiene..."
[ -d platforms/web/node_modules/esbuild ] || npm --prefix platforms/web ci --no-audit --no-fund
npm --prefix platforms/web test
(cd platforms/web && npm pack --dry-run > /dev/null)
echo "✓ Web package tests, build and tarball packaging verified."

echo "5. Cross-Platform External Consumption Contracts..."
node scripts/verify-consumption.js

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

echo "8. Relative Markdown Link Integrity..."
python3 scripts/check-markdown-links.py

echo "8b. Private Path Scan..."
# Home paths and file URLs tie a tracked file to one machine.
if git grep -nI -e '/Users/' -e '~/Developer' -e '~/\.gemini' -e '~/\.claude' -e 'file:///' -- . ':!scripts/verify_commit.sh'; then
  echo "❌ tracked files contain private paths" >&2
  exit 1
fi
echo "✓ No private paths in tracked files."

echo "9. House Style (Vale)..."
# Wording and punctuation rules come from the shared house-style package, never an inline list.
if ! command -v vale >/dev/null 2>&1; then
  echo "❌ vale is not installed: brew install vale" >&2
  exit 1
fi
# Resync whenever the pinned release changes, so a version bump never runs stale cached rules.
pin="$(grep '^Packages' .vale.ini)"
if [ "$(cat .vale/styles/HouseStyle/.pin 2>/dev/null)" != "$pin" ]; then
  vale sync >/dev/null || { echo "❌ vale sync failed: the house-style package needs network access once per pinned release" >&2; exit 1; }
  printf '%s\n' "$pin" > .vale/styles/HouseStyle/.pin
fi
prose_files=()
while IFS= read -r file; do
  [ -f "$file" ] && prose_files+=("$file")
done < <(git ls-files --cached --others --exclude-standard -- '*.md' '*.swift' || true)
if [ "${#prose_files[@]}" -gt 0 ]; then
  vale --output=line "${prose_files[@]}" >&2 || { echo "❌ house style check failed" >&2; exit 1; }
fi
echo "✓ House style check passed."

echo "======================================================="
echo "✓ All Monorepo Verification Checks Passed Successfully!"
echo "======================================================="
