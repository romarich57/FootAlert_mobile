#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
ANDROID_DIR="$ROOT_DIR/android"
cd "$ANDROID_DIR"

DUMMY_SHA256="$(printf '0%.0s' {1..64})"

./gradlew :app:processReleaseMainManifest \
  -PFOOTALERT_UPLOAD_STORE_FILE=debug.keystore \
  -PFOOTALERT_UPLOAD_STORE_PASSWORD=android \
  -PFOOTALERT_UPLOAD_KEY_ALIAS=androiddebugkey \
  -PFOOTALERT_UPLOAD_KEY_PASSWORD=android \
  -PFOOTALERT_EXPECTED_RELEASE_SIGNATURE_SHA256="$DUMMY_SHA256" \
  --console=plain >/dev/null

manifest_path="$(
  find app/build/intermediates -type f -name AndroidManifest.xml \
    | rg 'merged_manifest.*/release/.*/AndroidManifest.xml|merged_manifests.*/release/.*/AndroidManifest.xml' \
    | head -n 1
)"

if [[ -z "$manifest_path" ]]; then
  echo "Unable to locate merged release AndroidManifest.xml"
  exit 1
fi

if ! rg -q 'android:usesCleartextTraffic="false"' "$manifest_path"; then
  echo "Expected android:usesCleartextTraffic=false in merged release manifest ($manifest_path)"
  exit 1
fi

echo "Android merged release manifest cleartext policy check passed."
