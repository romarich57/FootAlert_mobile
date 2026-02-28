#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

UI_LIMIT=350
BFF_ROUTE_LIMIT=500
BFF_REFACTORED_ROUTE_LIMIT=250

violations=""

append_violation() {
  local category="$1"
  local file="$2"
  local lines="$3"
  local limit="$4"
  if [[ -n "$violations" ]]; then
    violations+=$'\n'
  fi
  violations+="${category}: ${file} (${lines} > ${limit})"
}

while IFS= read -r file; do
  case "$file" in
    *.test.tsx|*.spec.tsx) continue ;;
  esac

  line_count="$(wc -l < "$file" | tr -d ' ')"
  if (( line_count > UI_LIMIT )); then
    append_violation "UI" "$file" "$line_count" "$UI_LIMIT"
  fi
done < <(find src/ui -type f -name '*.tsx' | sort)

while IFS= read -r file; do
  case "$file" in
    *.test.ts|*.spec.ts) continue ;;
  esac

  line_count="$(wc -l < "$file" | tr -d ' ')"
  if (( line_count > BFF_ROUTE_LIMIT )); then
    append_violation "BFF_ROUTE" "$file" "$line_count" "$BFF_ROUTE_LIMIT"
  fi
done < <(find footalert-bff/src/routes -type f -name '*.ts' | sort)

while IFS= read -r file; do
  case "$file" in
    *.test.ts|*.spec.ts) continue ;;
  esac

  line_count="$(wc -l < "$file" | tr -d ' ')"
  if (( line_count > BFF_REFACTORED_ROUTE_LIMIT )); then
    append_violation "BFF_REFACTORED_ROUTE" "$file" "$line_count" "$BFF_REFACTORED_ROUTE_LIMIT"
  fi
done < <(find footalert-bff/src/routes/matches footalert-bff/src/routes/competitions -type f -name '*.ts' | sort)

if [[ -n "$violations" ]]; then
  echo "File line limits exceeded:"
  echo "$violations"
  exit 1
fi

echo "File line limits check passed."
