#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

violations="$(rg -n "MOBILE_REQUEST_SIGNING_KEY" \
  .env.example \
  .env.staging.example \
  src/types/react-native-config.d.ts \
  src || true)"

if [[ -n "$violations" ]]; then
  echo "Detected forbidden shared mobile signing key references:"
  echo "$violations"
  exit 1
fi

echo "No shared mobile signing key references detected."
