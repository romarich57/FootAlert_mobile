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
  "BACKGROUND_REFRESH_POLICY: BackgroundRefreshPolicy = 'shared-package'" \
  "shared-package background refresh policy constant"
assert_contains src/data/background/backgroundRefresh.ts \
  "Platform\\.OS !== 'ios' && Platform\\.OS !== 'android'" \
  "shared-package runtime platform guard"
assert_contains docs/architecture/mobile-data-flow.md \
  "shared-package" \
  "documented shared-package policy"
assert_contains docs/architecture/mobile-data-flow.md \
  "skip \\+ telemetry" \
  "documented skip + telemetry fallback"
assert_contains docs/mobile/runtime-ownership.md \
  "shared-package" \
  "runtime ownership shared-package policy"
assert_contains docs/mobile/runtime-ownership.md \
  "skip \\+ telemetry" \
  "runtime ownership skip + telemetry fallback"

echo "Background refresh policy check passed."
