#!/usr/bin/env bash
set -euo pipefail

summary_file="${1:-}"
p50_threshold_ms="${2:-750}"
p95_threshold_ms="${3:-1200}"
jank_threshold_percent="${4:-6}"

if [[ -z "$summary_file" ]]; then
  summary_file="$(find perf-results -type f -name 'audit-summary.txt' -print 2>/dev/null | sort | tail -n 1 || true)"
fi

if [[ -z "$summary_file" || ! -f "$summary_file" ]]; then
  echo "[perf][slo] audit summary file not found"
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

  # Fallback format: "Janky frames: X%"
  percent="$(printf '%s\n' "$source_line" | sed -E 's/.*: *([0-9]+([.][0-9]+)?)%.*/\1/' || true)"
  if [[ -n "$percent" && "$percent" != "$source_line" ]]; then
    printf '%s\n' "$percent"
    return 0
  fi

  return 1
}

assert_less_than() {
  local label="$1"
  local actual="$2"
  local expected="$3"
  local failure_ref="$4"

  if awk "BEGIN { exit !($actual < $expected) }"; then
    echo "[perf][slo] PASS $label actual=$actual threshold=$expected"
  else
    echo "[perf][slo] FAIL $label actual=$actual threshold=$expected"
    eval "$failure_ref=1"
  fi
}

p50_ms="$(extract_key_value "p50_ms" "$summary_file" || true)"
p95_ms="$(extract_key_value "p95_ms" "$summary_file" || true)"
jank_percent="$(extract_jank_percent "$summary_file" || true)"
total_pss_line="$(grep -E 'Journey TOTAL PSS:|TOTAL PSS:' "$summary_file" | tail -n 1 || true)"

if [[ -z "$p50_ms" || -z "$p95_ms" || -z "$jank_percent" ]]; then
  echo "[perf][slo] unable to parse required metrics from $summary_file"
  echo "[perf][slo] parsed p50_ms='$p50_ms' p95_ms='$p95_ms' jank_percent='$jank_percent'"
  exit 1
fi

echo "[perf][slo] summary_file=$summary_file"
echo "[perf][slo] parsed p50_ms=$p50_ms p95_ms=$p95_ms jank_percent=$jank_percent"
if [[ -n "$total_pss_line" ]]; then
  echo "[perf][slo] parsed ${total_pss_line}"
fi

failed=0
assert_less_than "cold_start_p50_ms" "$p50_ms" "$p50_threshold_ms" failed
assert_less_than "cold_start_p95_ms" "$p95_ms" "$p95_threshold_ms" failed
assert_less_than "janky_frames_percent" "$jank_percent" "$jank_threshold_percent" failed

if [[ "$failed" -ne 0 ]]; then
  exit 1
fi
