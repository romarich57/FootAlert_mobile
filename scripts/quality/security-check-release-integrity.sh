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

assert_plist_bool_false() {
  local file="$1"
  local key="$2"
  if ! awk -v k="$key" '
    $0 ~ "<key>" k "</key>" {
      getline
      if ($0 ~ /<false\/>/) {
        found=1
      } else {
        bad=1
      }
    }
    END {
      if (bad == 1 || found != 1) {
        exit 1
      }
    }
  ' "$file"; then
    echo "Expected ${key}=false in ${file}"
    exit 1
  fi
}

assert_contains android/app/build.gradle \
  "Release tasks require signing credentials" \
  "release signing hard-fail guard"
assert_contains android/app/build.gradle \
  "Release tasks require FOOTALERT_EXPECTED_RELEASE_SIGNATURE_SHA256" \
  "release signature hard-fail guard"
assert_contains android/app/build.gradle \
  "FOOTALERT_EXPECTED_RELEASE_SIGNATURE_SHA256 must be a 64-character lowercase SHA-256 hex digest" \
  "release signature format guard"
assert_contains android/app/src/main/java/com/footalert/app/MainApplication.kt \
  "EXPECTED_RELEASE_SIGNATURE_SHA256" \
  "android runtime signature verification"

assert_contains ios/Mobile_Foot/AppDelegate.swift \
  "SecCodeCheckValidity" \
  "iOS signature validity check"
assert_contains ios/Mobile_Foot/AppDelegate.swift \
  "kSecCodeInfoTeamIdentifier" \
  "iOS team identifier validation"
assert_contains ios/Mobile_Foot/Info.plist \
  "FootAlertExpectedTeamIdentifier" \
  "expected iOS team identifier key"
assert_plist_bool_false ios/Mobile_Foot/Info.plist NSAllowsLocalNetworking

assert_contains .env.staging.example \
  "MOBILE_AUTH_ATTESTATION_MODE=provider" \
  "non-mock staging attestation mode"
assert_contains .env.staging.example \
  "MOBILE_ATTESTATION_STRATEGY=strict" \
  "strict staging attestation strategy"

echo "Release integrity checks passed."
