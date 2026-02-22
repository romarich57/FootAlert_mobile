#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

PATTERNS=(
  'key=\{\s*(idx|index)\s*\}'
  'key=\{`[^`]*\$\{\s*(idx|index)\s*\}[^`]*`\}'
  'keyExtractor=\([^)]*,\s*(idx|index)\)'
)

violations=""
for pattern in "${PATTERNS[@]}"; do
  match="$(rg -n --pcre2 "$pattern" src/ui || true)"
  if [[ -n "$match" ]]; then
    if [[ -n "$violations" ]]; then
      violations+=$'\n'
    fi
    violations+="$match"
  fi
done

if [[ -n "$violations" ]]; then
  echo "Index-based keys were detected in src/ui."
  echo "Replace with stable identifiers before merging."
  echo
  echo "$violations"
  exit 1
fi

echo "No index-based key usage detected in src/ui."
