#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

ANDROID_GRADLE_PROPERTIES="android/gradle.properties"
IOS_PROJECT_FILE="ios/Mobile_Foot.xcodeproj/project.pbxproj"

if ! rg -q '^hermesEnabled=true$' "$ANDROID_GRADLE_PROPERTIES"; then
  echo "Hermes is not explicitly enabled in ${ANDROID_GRADLE_PROPERTIES}"
  exit 1
fi

if ! rg -q 'USE_HERMES = true;' "$IOS_PROJECT_FILE"; then
  echo "Hermes is not explicitly enabled in ${IOS_PROJECT_FILE}"
  exit 1
fi

echo "Hermes is enabled for Android and iOS."
