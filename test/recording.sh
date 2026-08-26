#!/usr/bin/env bash
set -euo pipefail

functions_dir="$(cd "$(dirname "$0")/../.config/fish/functions" && pwd)"
sandbox="$(mktemp -d)"
trap 'rm -rf "$sandbox"' EXIT

mkdir -p "$sandbox/fish/functions"
cp "$functions_dir"/recording_on.fish "$functions_dir"/recording_off.fish "$sandbox/fish/functions/"
: > "$sandbox/fish/config.fish"

failures=0

fish_eval() {
  XDG_CONFIG_HOME="$sandbox" fish -c "$1"
}

assert_equal() {
  local description="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "ok - $description"
  else
    echo "not ok - $description (expected '$expected', got '$actual')"
    failures=$((failures + 1))
  fi
}

assert_equal "recording_on reports what it did" \
  "recording on: autosuggestions hidden" "$(fish_eval recording_on)"

assert_equal "recording_on disables autosuggestions" \
  "0" "$(fish_eval 'echo $fish_autosuggestion_enabled')"

assert_equal "the flag is universal, so already open shells pick it up" \
  "universal scope" "$(fish_eval 'set --show fish_autosuggestion_enabled' | sed -n 's/.*set in \(universal scope\).*/\1/p')"

assert_equal "recording_on is idempotent" \
  "0" "$(fish_eval 'recording_on >/dev/null; echo $fish_autosuggestion_enabled')"

assert_equal "recording_off reports what it did" \
  "recording off: autosuggestions restored" "$(fish_eval recording_off)"

assert_equal "recording_off restores autosuggestions" \
  "1" "$(fish_eval 'echo $fish_autosuggestion_enabled')"

assert_equal "recording_off is idempotent" \
  "1" "$(fish_eval 'recording_off >/dev/null; echo $fish_autosuggestion_enabled')"

exit $failures
