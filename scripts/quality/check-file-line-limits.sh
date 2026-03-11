#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

SOURCE_LIMIT=600
SOURCE_DIRS=(
  "src"
  "footalert-bff/src"
  "packages/app-core/src"
)

violations=""

append_violation() {
  local file="$1"
  local lines="$2"
  local limit="$3"
  if [[ -n "$violations" ]]; then
    violations+=$'\n'
  fi
  violations+="${file} (${lines} > ${limit})"
}

resolve_limit_for_file() {
  local file="$1"
  case "$file" in
    footalert-bff/src/worker.ts) echo 200 ;;
    footalert-bff/src/worker/*.ts|footalert-bff/src/config/env/*.ts) echo 300 ;;
    *) echo "$SOURCE_LIMIT" ;;
  esac
}

should_skip_file() {
  local file="$1"
  case "$file" in
    *.test.ts|*.test.tsx|*.spec.ts|*.spec.tsx) return 0 ;;
    */__tests__/*|*/__mocks__/*|*/generated/*) return 0 ;;
  esac
  return 1
}

while IFS= read -r file; do
  [[ -n "$file" ]] || continue
  [[ -f "$file" ]] || continue

  if should_skip_file "$file"; then
    continue
  fi

  line_count="$(wc -l < "$file" | tr -d ' ')"
  limit="$(resolve_limit_for_file "$file")"
  if (( line_count > limit )); then
    append_violation "$file" "$line_count" "$limit"
  fi
done < <(
  {
    git diff --name-only -- "${SOURCE_DIRS[@]}"
    git diff --name-only --cached -- "${SOURCE_DIRS[@]}"
    git ls-files --others --exclude-standard -- "${SOURCE_DIRS[@]}"
  } | sort -u
)

if [[ -n "$violations" ]]; then
  echo "File line limits exceeded:"
  echo "$violations"
  exit 1
fi

echo "File line limits check passed."
