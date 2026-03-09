#!/usr/bin/env bash
set -euo pipefail

label="${1:-journey}"
app_id="${2:-com.footalert.app}"
activity="${3:-.MainActivity}"
duration_seconds="${4:-75}"
root_dir="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$root_dir"
android_serial="${ANDROID_SERIAL:-}"

adb_args=()
if [[ -n "$android_serial" ]]; then
  adb_args=(-s "$android_serial")
fi

run_dir="$(bash scripts/perf/new-run-dir.sh "$label")"
journey_summary_file="$run_dir/journey-summary.txt"
journey_gfx_file="$run_dir/journey-gfxinfo.txt"
journey_mem_file="$run_dir/journey-meminfo.txt"
journey_log_file="$run_dir/journey.log"

echo "[perf][journey] run_dir=$run_dir app_id=$app_id activity=$activity duration=${duration_seconds}s" | tee "$journey_log_file"

# Reset frame counters to measure only the scripted journey window.
adb "${adb_args[@]}" shell dumpsys gfxinfo "$app_id" reset >/dev/null 2>&1 || true

adb "${adb_args[@]}" shell am start -W -n "$app_id/$activity" >/dev/null
sleep 2

journey_started_at="$(date +%s)"
journey_ends_at=$((journey_started_at + duration_seconds))

while [[ "$(date +%s)" -lt "$journey_ends_at" ]]; do
  # Vertical scroll down then up to exercise list rendering without screen-specific selectors.
  adb "${adb_args[@]}" shell input swipe 540 1850 540 650 280 >/dev/null 2>&1 || true
  sleep 0.5
  adb "${adb_args[@]}" shell input swipe 540 650 540 1850 280 >/dev/null 2>&1 || true
  sleep 0.5

  # Horizontal swipe to exercise tabs/carousels where available.
  adb "${adb_args[@]}" shell input swipe 950 420 140 420 220 >/dev/null 2>&1 || true
  sleep 0.4
  adb "${adb_args[@]}" shell input swipe 140 420 950 420 220 >/dev/null 2>&1 || true
  sleep 0.4
done

adb "${adb_args[@]}" shell dumpsys gfxinfo "$app_id" > "$journey_gfx_file"
adb "${adb_args[@]}" shell dumpsys meminfo "$app_id" > "$journey_mem_file"

total_frames_line="$(grep -m 1 'Total frames rendered:' "$journey_gfx_file" || true)"
janky_line="$(grep -m 1 'Janky frames:' "$journey_gfx_file" || true)"
pss_line="$(grep -m 1 'TOTAL PSS:' "$journey_mem_file" || true)"

if grep -q 'No process found for:' "$journey_mem_file"; then
  echo "[perf][journey] app process not found for $app_id" | tee "$journey_summary_file"
  exit 1
fi

if [[ -z "$total_frames_line" || -z "$janky_line" || -z "$pss_line" ]]; then
  echo "[perf][journey] missing required journey metrics for $app_id" | tee "$journey_summary_file"
  exit 1
fi

{
  echo "app_id=$app_id"
  echo "duration_seconds=$duration_seconds"
  echo "$total_frames_line"
  echo "$janky_line"
  echo "$pss_line"
} | tee "$journey_summary_file"

printf '%s\n' "$run_dir"
