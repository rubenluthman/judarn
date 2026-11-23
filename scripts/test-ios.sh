#!/usr/bin/env bash
# Runs the Judarn test suite on an iOS simulator so the UIKit branches execute (`swift test` is macOS only).
# With `sim-run` on PATH (the owner's machine) it picks the device, waits for boot, stops a stalled run and shuts
# the simulator down on every exit path. Without it (CI, contributors) it runs plain `xcodebuild` on the iPhone 17
# simulator, with no stall check and no cleanup.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Longest silence measured after the tests end was 179 s (100 s with -collect-test-diagnostics never); the limit leaves headroom.
STALL_SECONDS="${JUDARN_IOS_TEST_STALL:-300}"
XCODEBUILD_FLAGS=(-scheme Judarn -skipPackagePluginValidation -collect-test-diagnostics never)

LOG="$(mktemp)"
set +e
if command -v sim-run >/dev/null 2>&1; then
  sim-run test --stall "$STALL_SECONDS" --max 900 -- xcodebuild test "${XCODEBUILD_FLAGS[@]}" > "$LOG" 2>&1
else
  echo "sim-run not found: running xcodebuild without a stall check or simulator cleanup."
  xcodebuild test "${XCODEBUILD_FLAGS[@]}" -destination 'platform=iOS Simulator,name=iPhone 17' \
    -parallel-testing-enabled NO > "$LOG" 2>&1
fi
STATUS=$?
set -e

grep -E 'error:|warning:|recorded an issue|Test run with|\*\* TEST|sim-run:' "$LOG" | sort -u || true
if [ "$STATUS" -ne 0 ]; then
  echo "❌ iOS simulator tests failed or timed out (status $STATUS). Log: $LOG" >&2
  exit 1
fi
rm -f "$LOG"
echo "✓ iOS simulator tests passed."
