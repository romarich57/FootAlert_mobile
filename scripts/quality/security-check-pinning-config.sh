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

assert_absent() {
  local path="$1"
  local pattern="$2"
  local description="$3"
  if rg -n "$pattern" "$path" >/dev/null; then
    echo "Detected forbidden ${description} in ${path}"
    rg -n "$pattern" "$path"
    exit 1
  fi
}

assert_contains package.json "react-native-ssl-public-key-pinning" "SSL pinning dependency"
assert_contains src/data/security/networkPinning.ts "initializeSslPinning" "SSL pinning initialization"
assert_contains src/data/api/http/secureTransport.ts "ensureSslPinning" "secure transport pinning enforcement"
assert_contains src/data/security/networkPinning.ts "parsed.host !== appEnv.mobilePinningHost" "target host guard"
assert_contains src/data/config/env.ts "configuredPinningHost = Config.MOBILE_PINNING_HOST\\?\\.trim\\(\\) \\|\\| configuredMobileApiHost" "pinning host fallback"
assert_contains .env.staging.example "MOBILE_PINNING_ENABLED=true" "staging pinning enable flag"
assert_contains .env.staging.example "MOBILE_PINNING_SPKI_PRIMARY" "primary staging pin"
assert_contains .env.staging.example "MOBILE_PINNING_SPKI_BACKUP" "backup staging pin"

fetch_violations="$(
  rg -n "\\bfetch\\(" src/data \
    --glob '!**/*.test.ts' \
    --glob '!**/api/http/secureTransport.ts' \
    || true
)"

if [[ -n "$fetch_violations" ]]; then
  echo "Detected forbidden direct fetch usage in src/data. Use secure transport helpers instead:"
  echo "$fetch_violations"
  exit 1
fi

assert_absent src/data/telemetry/mobileTelemetry.transport.ts "\\bfetch\\(" "direct telemetry fetch"
assert_absent src/data/security/mobileSessionAuth.ts "\\bfetch\\(" "direct session fetch"

echo "SSL pinning configuration checks passed."
