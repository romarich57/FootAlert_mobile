#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CHECKLIST_PATH="docs/mobile/sqlite-local-first-qa-checklist.md"

cd "$ROOT_DIR"

print_checklist_path() {
  echo "[qa:sqlite-local-first] Checklist QA manuelle: ${CHECKLIST_PATH}"
}

trap print_checklist_path EXIT

echo "[qa:sqlite-local-first] Lint ciblé..."
npx eslint \
  src/data/background/backgroundRefresh.ts \
  src/data/background/backgroundRefresh.test.ts \
  src/data/db \
  src/data/prefetch/entityPrefetchOrchestrator.ts \
  src/data/prefetch/entityPrefetchOrchestrator.test.ts \
  src/data/prefetch/usePrefetchOnMount.ts \
  src/data/prefetch/usePrefetchOnMount.test.tsx \
  src/data/storage/followsStorage.ts \
  src/data/storage/followsStorage.test.ts \
  src/ui/app/hooks/useAppBootstrap.ts \
  src/ui/app/hooks/useAppBootstrap.test.tsx \
  src/ui/app/navigation/useMainTabsPrefetch.ts \
  src/ui/app/navigation/useMainTabsPrefetch.test.tsx \
  src/ui/app/providers/QueryProvider.tsx \
  src/ui/app/providers/QueryProvider.test.tsx \
  src/ui/features/competitions/components/CompetitionStandingsTab.test.tsx \
  src/ui/features/competitions/screens/CompetitionDetailsScreen.test.tsx \
  src/ui/features/competitions/screens/CompetitionsScreen.test.tsx \
  src/ui/features/matches/details/hooks/useMatchDetailsQueryBundle.ts \
  src/ui/features/matches/details/hooks/useMatchDetailsQueryBundle.test.tsx \
  src/ui/features/matches/screens/MatchDetailsScreen.test.tsx \
  src/ui/features/matches/screens/MatchesScreen.test.tsx \
  src/ui/features/players/hooks/usePlayerFullHooks.test.tsx \
  src/ui/features/players/screens/PlayerDetailsScreen.test.tsx \
  src/ui/features/teams/screens/TeamDetailsScreen.test.tsx

echo "[qa:sqlite-local-first] Typecheck..."
npm run typecheck

echo "[qa:sqlite-local-first] Data-layer boundaries..."
npm run check:data-layer-boundaries

echo "[qa:sqlite-local-first] Background refresh policy..."
npm run check:background-refresh-policy

echo "[qa:sqlite-local-first] Tests ciblés..."
npm test -- --runInBand --forceExit \
  src/data/background/backgroundRefresh.test.ts \
  src/data/db/__tests__/entityStore.test.ts \
  src/data/db/__tests__/localFirstAdapter.test.ts \
  src/data/db/__tests__/queryCacheSyncMiddleware.test.ts \
  src/data/db/__tests__/relationalStores.test.ts \
  src/data/prefetch/entityPrefetchOrchestrator.test.ts \
  src/data/prefetch/usePrefetchOnMount.test.tsx \
  src/data/storage/followsStorage.test.ts \
  src/ui/app/hooks/useAppBootstrap.test.tsx \
  src/ui/app/navigation/useMainTabsPrefetch.test.tsx \
  src/ui/app/providers/QueryProvider.test.tsx \
  src/ui/features/competitions/components/CompetitionStandingsTab.test.tsx \
  src/ui/features/competitions/screens/CompetitionDetailsScreen.test.tsx \
  src/ui/features/competitions/screens/CompetitionsScreen.test.tsx \
  src/ui/features/matches/details/hooks/useMatchDetailsQueryBundle.test.tsx \
  src/ui/features/matches/screens/MatchDetailsScreen.test.tsx \
  src/ui/features/matches/screens/MatchesScreen.test.tsx \
  src/ui/features/players/hooks/usePlayerFullHooks.test.tsx \
  src/ui/features/players/screens/PlayerDetailsScreen.test.tsx \
  src/ui/features/teams/screens/TeamDetailsScreen.test.tsx

echo "[qa:sqlite-local-first] Preflight terminé avec succès."
