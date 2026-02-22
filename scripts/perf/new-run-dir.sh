#!/usr/bin/env bash
set -euo pipefail

label="${1:-before}"
run_date="${2:-$(date +%F)}"
run_time="$(date +%H%M%S)"

run_dir="perf-results/${run_date}/${label}/android/${run_time}"
mkdir -p "$run_dir"

echo "$run_dir"
