#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

ROUTE_LIMIT=250
violations=""

append_violation() {
  local file="$1"
  local lines="$2"
  if [[ -n "$violations" ]]; then
    violations+=$'\n'
  fi
  violations+="${file} (${lines} > ${ROUTE_LIMIT})"
}

while IFS= read -r file; do
  case "$file" in
    *.test.ts|*.spec.ts) continue ;;
  esac

  line_count="$(wc -l < "$file" | tr -d ' ')"
  if (( line_count > ROUTE_LIMIT )); then
    append_violation "$file" "$line_count"
  fi
done < <(find src/routes/matches src/routes/competitions -type f -name '*.ts' | sort)

if [[ -n "$violations" ]]; then
  echo "Refactored route files exceeded ${ROUTE_LIMIT} lines:"
  echo "$violations"
  exit 1
fi

echo "Refactored route line limits check passed."
