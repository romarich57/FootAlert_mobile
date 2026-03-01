#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

assert_contains() {
  local file="$1"
  local pattern="$2"
  local description="$3"
  if ! rg -q "$pattern" "$file"; then
    echo "Missing ${description} in ${file}"
    exit 1
  fi
}

assert_contains src/data/background/backgroundRefresh.ts \
  "BACKGROUND_REFRESH_POLICY" \
  "background refresh policy constant"
assert_contains src/data/background/backgroundRefresh.ts \
  "Platform\.OS !== 'ios'" \
  "ios-only runtime guard"
assert_contains docs/architecture/mobile-data-flow.md \
  "ios-only" \
  "documented ios-only policy"

echo "Background refresh policy check passed."
