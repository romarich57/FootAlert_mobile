#!/usr/bin/env bash
set -euo pipefail

target_summary_file="${1:-}"
baseline_summary_file="${2:-perf-results/baseline/audit-summary.txt}"
allow_missing_baseline="${3:-false}"

if [[ -z "$target_summary_file" ]]; then
  target_summary_file="$(find perf-results -type f -name 'audit-summary.txt' -print 2>/dev/null | sort | tail -n 1 || true)"
fi

if [[ -z "$target_summary_file" || ! -f "$target_summary_file" ]]; then
  echo "[perf][compare] target summary file not found"
  exit 1
fi

extract_key_value() {
  local key="$1"
  local file="$2"
  grep -E "^${key}=" "$file" | tail -n 1 | cut -d'=' -f2
}

extract_jank_percent() {
  local file="$1"
  local source_line

  source_line="$(grep -E 'Journey janky frames:|Janky frames:' "$file" | tail -n 1 || true)"
  if [[ -z "$source_line" ]]; then
    return 1
  fi

  local percent
  percent="$(printf '%s\n' "$source_line" | sed -E 's/.*\(([0-9]+([.][0-9]+)?)%\).*/\1/' || true)"
  if [[ -n "$percent" && "$percent" != "$source_line" ]]; then
    printf '%s\n' "$percent"
    return 0
  fi

  percent="$(printf '%s\n' "$source_line" | sed -E 's/.*: *([0-9]+([.][0-9]+)?)%.*/\1/' || true)"
  if [[ -n "$percent" && "$percent" != "$source_line" ]]; then
    printf '%s\n' "$percent"
    return 0
  fi

  return 1
}

if [[ ! -f "$baseline_summary_file" ]]; then
  if [[ "$allow_missing_baseline" == "true" ]]; then
    echo "[perf][compare] baseline summary not found ($baseline_summary_file); skipping baseline comparison"
    exit 0
  fi

  echo "[perf][compare] baseline summary not found ($baseline_summary_file)"
  exit 1
fi

target_p50="$(extract_key_value "p50_ms" "$target_summary_file" || true)"
target_p95="$(extract_key_value "p95_ms" "$target_summary_file" || true)"
target_jank="$(extract_jank_percent "$target_summary_file" || true)"

baseline_p50="$(extract_key_value "p50_ms" "$baseline_summary_file" || true)"
baseline_p95="$(extract_key_value "p95_ms" "$baseline_summary_file" || true)"
baseline_jank="$(extract_jank_percent "$baseline_summary_file" || true)"

if [[ -z "$target_p50" || -z "$target_p95" || -z "$target_jank" ]]; then
  echo "[perf][compare] unable to parse target metrics from $target_summary_file"
  exit 1
fi

if [[ -z "$baseline_p50" || -z "$baseline_p95" || -z "$baseline_jank" ]]; then
  echo "[perf][compare] unable to parse baseline metrics from $baseline_summary_file"
  exit 1
fi

format_delta() {
  local baseline="$1"
  local target="$2"
  awk "BEGIN {
    delta = $target - $baseline;
    pct = ($baseline == 0) ? 0 : (delta / $baseline) * 100;
    sign = (delta > 0) ? \"+\" : \"\";
    printf \"%s%.2f (%.2f%%)\", sign, delta, pct;
  }"
}

target_dir="$(dirname "$target_summary_file")"
comparison_file="$target_dir/baseline-compare-summary.txt"

{
  echo "baseline_summary=$baseline_summary_file"
  echo "target_summary=$target_summary_file"
  echo ""
  echo "metric,baseline,target,delta"
  echo "cold_start_p50_ms,$baseline_p50,$target_p50,$(format_delta "$baseline_p50" "$target_p50")"
  echo "cold_start_p95_ms,$baseline_p95,$target_p95,$(format_delta "$baseline_p95" "$target_p95")"
  echo "janky_frames_percent,$baseline_jank,$target_jank,$(format_delta "$baseline_jank" "$target_jank")"
} | tee "$comparison_file"

echo "[perf][compare] output_file=$comparison_file"
