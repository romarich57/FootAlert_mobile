#!/usr/bin/env bash
set -euo pipefail

label="${1:-audit}"
runs="${2:-20}"
app_id="${3:-com.footalert.app}"
activity="${4:-.MainActivity}"
journey_duration_seconds="${5:-75}"
root_dir="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$root_dir"

cold_output_file="$(mktemp)"
runtime_output_file="$(mktemp)"
journey_output_file="$(mktemp)"
cleanup() {
  rm -f "$cold_output_file" "$runtime_output_file" "$journey_output_file"
}
trap cleanup EXIT

echo "[perf] android audit label=$label runs=$runs app_id=$app_id activity=$activity journey_duration_seconds=$journey_duration_seconds"

echo "[perf] step=1 cold-start"
bash scripts/perf/run-android-cold-start.sh "$label" "$runs" "$app_id" "$activity" | tee "$cold_output_file"
cold_run_dir="$(tail -n 1 "$cold_output_file")"

echo "[perf] step=2 runtime"
bash scripts/perf/capture-android-runtime.sh "$label" "$app_id" | tee "$runtime_output_file"
runtime_run_dir="$(tail -n 1 "$runtime_output_file")"

journey_run_dir=""
if [[ "$journey_duration_seconds" -gt 0 ]]; then
  echo "[perf] step=3 journey"
  bash scripts/perf/capture-android-journey.sh "$label" "$app_id" "$activity" "$journey_duration_seconds" | tee "$journey_output_file"
  journey_run_dir="$(tail -n 1 "$journey_output_file")"
fi

cold_summary_file="$cold_run_dir/cold-start-summary.txt"
runtime_summary_file="$runtime_run_dir/runtime-summary.txt"
audit_summary_file="$runtime_run_dir/audit-summary.txt"
journey_summary_file="$journey_run_dir/journey-summary.txt"
runtime_journey_summary_file="$runtime_run_dir/journey-summary.txt"

if [[ -n "$journey_run_dir" && -f "$journey_summary_file" ]]; then
  if [[ "$journey_summary_file" != "$runtime_journey_summary_file" ]]; then
    cp "$journey_summary_file" "$runtime_journey_summary_file"
  fi
fi

{
  echo "label=$label"
  echo "runs=$runs"
  echo "app_id=$app_id"
  echo "activity=$activity"
  echo "cold_start_run_dir=$cold_run_dir"
  echo "runtime_run_dir=$runtime_run_dir"
  if [[ -n "$journey_run_dir" ]]; then
    echo "journey_run_dir=$journey_run_dir"
  fi
  echo ""
  echo "[cold-start-summary]"
  cat "$cold_summary_file"
  echo ""
  echo "[runtime-summary]"
  cat "$runtime_summary_file"
  if [[ -n "$journey_run_dir" && -f "$journey_summary_file" ]]; then
    echo ""
    echo "[journey-summary]"
    cat "$journey_summary_file"
  fi
} | tee "$audit_summary_file"

echo "[perf] audit_summary=$audit_summary_file"
