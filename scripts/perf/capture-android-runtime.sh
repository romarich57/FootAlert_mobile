#!/usr/bin/env bash
set -euo pipefail

label="${1:-before}"
app_id="${2:-com.footalert.app}"
root_dir="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$root_dir"

run_dir="$(bash scripts/perf/new-run-dir.sh "$label")"
gfx_file="$run_dir/gfxinfo.txt"
mem_file="$run_dir/meminfo.txt"
summary_file="$run_dir/runtime-summary.txt"

adb shell dumpsys gfxinfo "$app_id" > "$gfx_file"
adb shell dumpsys meminfo "$app_id" > "$mem_file"

janky_line="$(grep -m 1 'Janky frames:' "$gfx_file" || true)"
total_frames_line="$(grep -m 1 'Total frames rendered:' "$gfx_file" || true)"
pss_line="$(grep -m 1 'TOTAL PSS:' "$mem_file" || true)"

{
  echo "app_id=$app_id"
  echo "${total_frames_line:-Total frames rendered: n/a}"
  echo "${janky_line:-Janky frames: n/a}"
  echo "${pss_line:-TOTAL PSS: n/a}"
} | tee "$summary_file"

printf '%s\n' "$run_dir"
