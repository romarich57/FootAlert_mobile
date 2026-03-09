#!/usr/bin/env bash
set -euo pipefail

flow_path="${1:-}"
report_path="${2:-}"
app_id="${3:-com.footalert.app}"
android_serial="${ANDROID_SERIAL:-}"

if [[ -z "$flow_path" || -z "$report_path" ]]; then
  echo "usage: bash scripts/e2e/run-maestro-flow.sh <flow_path> <report_path> [app_id]" >&2
  exit 1
fi

root_dir="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$root_dir"

adb_args=()
if [[ -n "$android_serial" ]]; then
  adb_args=(-s "$android_serial")
fi

export PATH="$PATH:$HOME/.maestro/bin"

adb "${adb_args[@]}" shell am force-stop "$app_id" >/dev/null 2>&1 || true
adb "${adb_args[@]}" shell cmd statusbar collapse >/dev/null 2>&1 || true

maestro test "$flow_path" --format junit --output "$report_path"
