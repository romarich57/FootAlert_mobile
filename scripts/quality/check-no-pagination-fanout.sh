#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

TARGET_FILES=(
  "src/ui/features/teams/hooks/useTeamOverview.ts"
  "src/ui/features/teams/hooks/useTeamStats.ts"
  "src/ui/features/matches/details/hooks/useMatchDetailsScreenModel.ts"
)

PATTERNS=(
  "Promise\\.all\\(\\s*Array\\.from\\(\\s*\\{\\s*length:\\s*[^}]*totalPages"
  "Promise\\.all\\(\\s*allPages\\.map\\("
  "Promise\\.all\\(\\s*pageNumbers\\.map\\("
  "Promise\\.all\\(\\s*[a-zA-Z0-9_$.]+\\.map\\(\\s*\\(?\\s*(page|pageIndex|pageNumber)"
)

violations=()

for file in "${TARGET_FILES[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "Missing target file for anti-fanout gate: $file" >&2
    exit 1
  fi

  for pattern in "${PATTERNS[@]}"; do
    if rg -nUP "$pattern" "$file" >/dev/null; then
      while IFS= read -r match_line; do
        violations+=("$file:$match_line")
      done < <(rg -nUP "$pattern" "$file")
    fi
  done
done

if (( ${#violations[@]} > 0 )); then
  echo "Detected forbidden pagination fan-out pattern(s) in critical hooks:" >&2
  printf '%s\n' "${violations[@]}" >&2
  exit 1
fi

echo "No forbidden pagination fan-out patterns detected."
