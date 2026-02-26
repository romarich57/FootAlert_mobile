#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

TARGET_FILE="src/ui/app/navigation/RootNavigator.tsx"

if [[ ! -f "$TARGET_FILE" ]]; then
  echo "Missing target file: $TARGET_FILE"
  exit 1
fi

for screen_import in \
  MatchDetailsScreen \
  CompetitionDetailsScreen \
  TeamDetailsScreen \
  PlayerDetailsScreen \
  SearchScreen
do
  if rg -q "import .*${screen_import}" "$TARGET_FILE"; then
    echo "Found eager import for ${screen_import} in ${TARGET_FILE}"
    exit 1
  fi
done

if rg -q "lazy:\\s*false" "$TARGET_FILE"; then
  echo "Found lazy:false in ${TARGET_FILE}; tabs should keep lazy defaults."
  exit 1
fi

required_lines=(
  '<Stack.Screen name="MatchDetails" getComponent={getMatchDetailsScreen} />'
  'name="CompetitionDetails"'
  'getComponent={getCompetitionDetailsScreen}'
  'name="TeamDetails" getComponent={getTeamDetailsScreen}'
  'name="PlayerDetails" getComponent={getPlayerDetailsScreen}'
  'name="SearchPlaceholder"'
  'getComponent={getSearchScreen}'
)

for required in "${required_lines[@]}"; do
  if ! grep -Fq "$required" "$TARGET_FILE"; then
    echo "Missing lazy-loading marker in ${TARGET_FILE}: $required"
    exit 1
  fi
done

echo "Lazy screen configuration check passed."
