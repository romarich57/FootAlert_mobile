#!/usr/bin/env bash
set -euo pipefail

label="${1:-before}"
runs="${2:-10}"
app_id="${3:-com.footalert.app}"
activity="${4:-.MainActivity}"
root_dir="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$root_dir"
android_serial="${ANDROID_SERIAL:-}"

adb_args=()
if [[ -n "$android_serial" ]]; then
  adb_args=(-s "$android_serial")
fi

run_dir="$(bash scripts/perf/new-run-dir.sh "$label")"
raw_file="$run_dir/cold-start-raw.txt"
times_file="$run_dir/cold-start-times-ms.txt"
summary_file="$run_dir/cold-start-summary.txt"

: > "$raw_file"
: > "$times_file"

echo "[perf] cold start run_dir=$run_dir" | tee -a "$raw_file"
echo "[perf] app_id=$app_id activity=$activity runs=$runs" | tee -a "$raw_file"

for run_index in $(seq 1 "$runs"); do
  echo "[perf] run=$run_index" | tee -a "$raw_file"
  adb "${adb_args[@]}" shell am force-stop "$app_id"
  sleep 1

  am_output="$(adb "${adb_args[@]}" shell am start -W -n "$app_id/$activity")"
  printf '%s\n' "$am_output" | tee -a "$raw_file"

  total_time="$(printf '%s\n' "$am_output" | awk '/TotalTime:/ { print $2; exit }')"
  if [[ -n "$total_time" ]]; then
    echo "$total_time" >> "$times_file"
  fi

done

count="$(wc -l < "$times_file" | tr -d ' ')"
if [[ "$count" -eq 0 ]]; then
  echo "No TotalTime values captured." | tee "$summary_file"
  exit 1
fi

sorted_file="$run_dir/cold-start-times-sorted-ms.txt"
sort -n "$times_file" > "$sorted_file"

p50_index=$(( (count + 1) / 2 ))
p95_index=$(( (count * 95 + 99) / 100 ))
min_value="$(head -n 1 "$sorted_file")"
max_value="$(tail -n 1 "$sorted_file")"
p50_value="$(sed -n "${p50_index}p" "$sorted_file")"
p95_value="$(sed -n "${p95_index}p" "$sorted_file")"

{
  echo "count=$count"
  echo "min_ms=$min_value"
  echo "p50_ms=$p50_value"
  echo "p95_ms=$p95_value"
  echo "max_ms=$max_value"
} | tee "$summary_file"

printf '%s\n' "$run_dir"
