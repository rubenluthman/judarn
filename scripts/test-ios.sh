#!/usr/bin/env bash
# Runs the Judarn test suite on an iOS simulator so the UIKit branches execute (`swift test` is macOS only).
# Boots the first available iPhone, waits for readiness, and kills a hung run after a watchdog timeout.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

TIMEOUT_SECONDS="${JUDARN_IOS_TEST_TIMEOUT:-900}"
UDID="$(xcrun simctl list devices available | grep -m1 'iPhone' | grep -oE '[0-9A-F]{8}-([0-9A-F]{4}-){3}[0-9A-F]{12}' || true)"
if [ -z "$UDID" ]; then
  echo "❌ No available iPhone simulator found" >&2
  exit 1
fi

xcrun simctl boot "$UDID" 2>/dev/null || true
timeout_boot=180
perl -e 'alarm shift; exec @ARGV' "$timeout_boot" xcrun simctl bootstatus "$UDID" -b > /dev/null

LOG="$(mktemp)"
set +e
# Own process group so the watchdog can terminate xcodebuild and its children together.
set -m
xcodebuild test -scheme Judarn -destination "platform=iOS Simulator,id=$UDID" \
  -skipPackagePluginValidation > "$LOG" 2>&1 &
PID=$!
# The watchdog runs in its own group and detaches stdout/stderr, so a leftover `sleep` can never hold a pipe open.
( sleep "$TIMEOUT_SECONDS"; kill -TERM -- "-$PID" 2>/dev/null; sleep 5; kill -KILL -- "-$PID" 2>/dev/null ) >/dev/null 2>&1 &
WATCHDOG=$!
disown "$WATCHDOG" 2>/dev/null || true
wait "$PID"
STATUS=$?
# Kill the whole watchdog group: killing only the subshell orphans its `sleep`.
kill -- "-$WATCHDOG" 2>/dev/null || kill "$WATCHDOG" 2>/dev/null
set +m
set -e

grep -E 'error:|warning:|recorded an issue|Test run with|\*\* TEST' "$LOG" | sort -u || true
if [ "$STATUS" -ne 0 ]; then
  echo "❌ iOS simulator tests failed or timed out (status $STATUS). Log: $LOG" >&2
  exit 1
fi
rm -f "$LOG"
echo "✓ iOS simulator tests passed."
