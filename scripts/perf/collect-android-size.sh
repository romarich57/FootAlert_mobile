#!/usr/bin/env bash
set -euo pipefail

label="${1:-before}"
root_dir="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$root_dir"

run_dir="$(bash scripts/perf/new-run-dir.sh "$label")"
summary_file="$run_dir/android-size-summary.txt"

file_size_bytes() {
  local file_path="$1"
  if stat -f%z "$file_path" >/dev/null 2>&1; then
    stat -f%z "$file_path"
  else
    stat -c%s "$file_path"
  fi
}

apk_path="$(find android/app/build/outputs/apk/benchmark -name '*.apk' | head -n 1 || true)"
aab_path="$(find android/app/build/outputs/bundle/benchmark -name '*.aab' | head -n 1 || true)"

{
  if [[ -n "$apk_path" ]]; then
    echo "apk_path=$apk_path"
    echo "apk_size_bytes=$(file_size_bytes "$apk_path")"
  else
    echo "apk_path=not_found"
  fi

  if [[ -n "$aab_path" ]]; then
    echo "aab_path=$aab_path"
    echo "aab_size_bytes=$(file_size_bytes "$aab_path")"
  else
    echo "aab_path=not_found"
  fi
} | tee "$summary_file"

printf '%s\n' "$run_dir"
