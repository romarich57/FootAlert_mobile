#!/usr/bin/env bash
set -euo pipefail

label="${1:-before}"
app_id="${2:-com.footalert.app}"
root_dir="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$root_dir"
android_serial="${ANDROID_SERIAL:-}"

adb_args=()
if [[ -n "$android_serial" ]]; then
  adb_args=(-s "$android_serial")
fi

run_dir="$(bash scripts/perf/new-run-dir.sh "$label")"
gfx_file="$run_dir/gfxinfo.txt"
mem_file="$run_dir/meminfo.txt"
summary_file="$run_dir/runtime-summary.txt"

adb "${adb_args[@]}" shell dumpsys gfxinfo "$app_id" > "$gfx_file"
adb "${adb_args[@]}" shell dumpsys meminfo "$app_id" > "$mem_file"

janky_line="$(grep -m 1 'Janky frames:' "$gfx_file" || true)"
total_frames_line="$(grep -m 1 'Total frames rendered:' "$gfx_file" || true)"
pss_line="$(grep -m 1 'TOTAL PSS:' "$mem_file" || true)"

if grep -q 'No process found for:' "$mem_file"; then
  echo "[perf][runtime] app process not found for $app_id" | tee "$summary_file"
  exit 1
fi

if [[ -z "$total_frames_line" || -z "$janky_line" || -z "$pss_line" ]]; then
  echo "[perf][runtime] missing required runtime metrics for $app_id" | tee "$summary_file"
  exit 1
fi

{
  echo "app_id=$app_id"
  echo "$total_frames_line"
  echo "$janky_line"
  echo "$pss_line"
} | tee "$summary_file"

printf '%s\n' "$run_dir"
