#!/usr/bin/env bash
set -euo pipefail

label="${1:-before}"
root_dir="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$root_dir"
android_dir="$root_dir/android"
android_serial="${ANDROID_SERIAL:-}"

adb_args=()
if [[ -n "$android_serial" ]]; then
  adb_args=(-s "$android_serial")
fi

run_dir="$(bash scripts/perf/new-run-dir.sh "$label")"
log_file="$run_dir/build-install.log"

{
  echo "[perf] run_dir=$run_dir"
  echo "[perf] label=$label"
  echo "[perf] building benchmark APK"
  echo "[perf] ENVFILE=.env.benchmark"
  (cd "$android_dir" && ENVFILE=.env.benchmark ./gradlew :app:assembleBenchmark)

  apk_path="$(find android/app/build/outputs/apk/benchmark -name '*.apk' | head -n 1)"
  if [[ -z "$apk_path" ]]; then
    echo "[perf] benchmark APK not found"
    exit 1
  fi

  echo "[perf] apk_path=$apk_path"
  echo "[perf] installing benchmark APK"
  adb "${adb_args[@]}" install -r "$apk_path"

  apk_size_bytes=""
  if stat -f%z "$apk_path" >/dev/null 2>&1; then
    apk_size_bytes="$(stat -f%z "$apk_path")"
  else
    apk_size_bytes="$(stat -c%s "$apk_path")"
  fi

  {
    echo "apk_path=$apk_path"
    echo "apk_size_bytes=$apk_size_bytes"
  } > "$run_dir/artifact-size.txt"

  echo "[perf] done"
} | tee "$log_file"

printf '%s\n' "$run_dir"
