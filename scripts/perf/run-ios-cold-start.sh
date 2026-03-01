#!/usr/bin/env bash
set -euo pipefail

label="${1:-local}"
runs="${2:-5}"
scheme="${3:-Mobile_Foot}"
workspace_path="${4:-ios/Mobile_Foot.xcworkspace}"
root_dir="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$root_dir"

if ! command -v xcrun >/dev/null 2>&1; then
  echo "xcrun is required to run iOS cold-start profiling." >&2
  exit 1
fi

if ! [[ "$runs" =~ ^[0-9]+$ ]] || [[ "$runs" -le 0 ]]; then
  echo "runs must be a positive integer (received: $runs)." >&2
  exit 1
fi

run_date="$(date +%F)"
run_time="$(date +%H%M%S)"
run_dir="perf-results/ios/${run_date}/${label}/${run_time}"
derived_data_dir="$run_dir/DerivedData"
logs_dir="$run_dir/logs"
trace_dir="$run_dir/traces"
summary_file="$run_dir/summary.txt"
times_file="$run_dir/cold-start-times-ms.txt"
raw_file="$logs_dir/cold-start-raw.log"

mkdir -p "$logs_dir" "$trace_dir"
: > "$times_file"
: > "$raw_file"

simulator_device="${IOS_SIMULATOR_DEVICE:-}"
if [[ -z "$simulator_device" ]]; then
  simulator_device="$(xcrun simctl list devices available | awk -F '[()]' '/iPhone/{gsub(/^[[:space:]]+|[[:space:]]+$/, "", $1); print $1; exit}')"
fi

if [[ -z "$simulator_device" ]]; then
  echo "No available iOS simulator device found." >&2
  exit 1
fi

simulator_udid="$(xcrun simctl list devices available | awk -v target="$simulator_device" -F '[()]' '$1 ~ target { print $2; exit }')"
if [[ -z "$simulator_udid" ]]; then
  simulator_udid="$simulator_device"
fi

echo "[perf][ios] run_dir=$run_dir" | tee -a "$raw_file"
echo "[perf][ios] device=$simulator_device udid=$simulator_udid runs=$runs" | tee -a "$raw_file"
echo "[perf][ios] building workspace=$workspace_path scheme=$scheme" | tee -a "$raw_file"

xcodebuild \
  -workspace "$workspace_path" \
  -scheme "$scheme" \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination "platform=iOS Simulator,id=$simulator_udid" \
  -derivedDataPath "$derived_data_dir" \
  CODE_SIGNING_ALLOWED=NO \
  build >"$logs_dir/xcodebuild.log" 2>&1

app_bundle="$(find "$derived_data_dir/Build/Products/Debug-iphonesimulator" -maxdepth 1 -name "*.app" | head -n 1)"
if [[ -z "$app_bundle" ]]; then
  echo "Unable to locate built .app bundle in $derived_data_dir." >&2
  exit 1
fi

if [[ -n "${IOS_BUNDLE_ID:-}" ]]; then
  bundle_id="$IOS_BUNDLE_ID"
else
  bundle_id="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$app_bundle/Info.plist")"
fi

echo "[perf][ios] app_bundle=$app_bundle bundle_id=$bundle_id" | tee -a "$raw_file"

xcrun simctl boot "$simulator_udid" >/dev/null 2>&1 || true
xcrun simctl bootstatus "$simulator_udid" -b >>"$raw_file" 2>&1
xcrun simctl install "$simulator_udid" "$app_bundle" >>"$raw_file" 2>&1

now_ms() {
  perl -MTime::HiRes=time -e 'printf("%.0f\n", time() * 1000)'
}

run_with_xctrace() {
  local trace_file="$1"
  xcrun xctrace record \
    --template "App Launch" \
    --device "$simulator_udid" \
    --time-limit 8s \
    --output "$trace_file" \
    --launch -- \
    xcrun simctl launch "$simulator_udid" "$bundle_id"
}

for run_index in $(seq 1 "$runs"); do
  echo "[perf][ios] run=$run_index" | tee -a "$raw_file"
  xcrun simctl terminate "$simulator_udid" "$bundle_id" >/dev/null 2>&1 || true
  sleep 1

  start_ms="$(now_ms)"
  if xcrun xctrace list templates >/dev/null 2>&1; then
    trace_file="$trace_dir/run-${run_index}.trace"
    if ! run_with_xctrace "$trace_file" >>"$raw_file" 2>&1; then
      echo "[perf][ios] xctrace failed for run=$run_index, fallback to simctl launch." | tee -a "$raw_file"
      xcrun simctl launch "$simulator_udid" "$bundle_id" >>"$raw_file" 2>&1
    fi
  else
    xcrun simctl launch "$simulator_udid" "$bundle_id" >>"$raw_file" 2>&1
  fi
  end_ms="$(now_ms)"

  elapsed_ms=$((end_ms - start_ms))
  echo "$elapsed_ms" >>"$times_file"
  echo "[perf][ios] run=$run_index cold_start_ms=$elapsed_ms" | tee -a "$raw_file"
done

count="$(wc -l < "$times_file" | tr -d ' ')"
if [[ "$count" -eq 0 ]]; then
  echo "No iOS cold-start samples were captured." >&2
  exit 1
fi

sorted_file="$run_dir/cold-start-times-sorted-ms.txt"
sort -n "$times_file" >"$sorted_file"

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
  echo "device=$simulator_device"
  echo "bundle_id=$bundle_id"
} | tee "$summary_file"

printf '%s\n' "$run_dir"
