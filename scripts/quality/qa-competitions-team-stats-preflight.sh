#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "[qa:team-stats] Lint ciblé..."
npx eslint \
  src/ui/features/competitions/types/competitions.types.ts \
  src/data/mappers/competitionsMapper.ts \
  src/data/mappers/competitionsTeamStatsMapper.ts \
  src/ui/features/competitions/hooks/useCompetitionTeamStats.ts \
  src/ui/features/competitions/components/CompetitionTeamStatsTab.tsx \
  src/ui/features/competitions/components/HorizontalBarChart.tsx \
  src/ui/shared/query/queryKeys.ts \
  src/ui/shared/query/queryOptions.ts \
  src/ui/shared/i18n/locales/fr.ts \
  src/ui/shared/i18n/locales/en.ts \
  src/data/mappers/competitionsTeamStatsMapper.test.ts \
  src/ui/features/competitions/hooks/useCompetitionTeamStats.test.ts \
  src/ui/features/competitions/components/CompetitionTeamStatsTab.test.tsx

echo "[qa:team-stats] Typecheck..."
npm run typecheck

echo "[qa:team-stats] Tests ciblés..."
npm test -- --runInBand --forceExit \
  src/data/mappers/competitionsTeamStatsMapper.test.ts \
  src/ui/features/competitions/hooks/useCompetitionTeamStats.test.ts \
  src/ui/features/competitions/components/CompetitionTeamStatsTab.test.tsx \
  src/ui/features/competitions/screens/CompetitionDetailsScreen.test.tsx \
  src/ui/features/competitions/screens/CompetitionsScreen.test.tsx \
  src/data/mappers/competitionsMapper.test.ts

echo "[qa:team-stats] Preflight terminé avec succès."
echo "[qa:team-stats] Lancer ensuite la checklist visuelle: docs/mobile/competition-team-stats-qa-checklist.md"
