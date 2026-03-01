#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

TARGET_FILES=(
  "src/ui/features/matches/components/MatchesHeader.tsx"
  "src/ui/features/matches/screens/MatchDetailsScreen.tsx"
  "src/ui/features/competitions/components/CompetitionTabs.tsx"
  "src/ui/features/teams/components/TeamTabs.tsx"
  "src/ui/features/competitions/components/CompetitionHeader.tsx"
  "src/ui/features/matches/components/DateChipsRow.tsx"
  "src/ui/features/search/components/SearchResultsList.tsx"
)

violations=""

for file in "${TARGET_FILES[@]}"; do
  if rg -n "<Pressable" "$file" >/dev/null; then
    violations+="$file: raw Pressable usage detected. Use AppPressable for contract enforcement."$'\n'
  fi
done

if ! rg -n "actionButtonSize = isCompact \\? MIN_TOUCH_TARGET" "src/ui/features/matches/components/MatchesHeader.tsx" >/dev/null; then
  violations+="src/ui/features/matches/components/MatchesHeader.tsx: compact action button must use MIN_TOUCH_TARGET."$'\n'
fi

if ! rg -n "minHeight: MIN_TOUCH_TARGET" "src/ui/features/competitions/components/CompetitionHeader.tsx" >/dev/null; then
  violations+="src/ui/features/competitions/components/CompetitionHeader.tsx: season selector must enforce MIN_TOUCH_TARGET."$'\n'
fi

if [[ -n "$violations" ]]; then
  echo "Mobile design control checks failed."
  echo
  printf "%s" "$violations"
  exit 1
fi

echo "Mobile design control checks passed."
