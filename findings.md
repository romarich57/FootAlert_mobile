# Findings

## Initial Observations
- The active git repository is `Mobile_Foot`, not the parent `Football_apps`.
- The worktree is already dirty with many modifications across BFF, data layer, SQLite cache, UI hooks, tests, and docs.
- There are already partial implementations for team local-first hooks and several untracked files for match/player/team full-query work.
- The requested rollout likely needs integration and stabilization of in-progress work, not a greenfield implementation.

## Stabilization Gate
- `npm run typecheck` currently fails on three concrete errors:
  - missing `MOBILE_QUERY_PERSIST_MAX_BYTES` in `src/types/react-native-config.d.ts`
  - missing `MatchStandingsData` type import in `src/ui/features/matches/details/hooks/useMatchDetailsQueryBundle.ts`
  - incompatible custom query object shape in `src/ui/features/teams/components/TeamDetailsScreenView.tsx`
- `npm run check:data-layer-boundaries` fails on current `src/data -> @ui` imports:
  - `src/data/endpoints/teamsApi.ts`
  - `src/data/prefetch/entityPrefetchOrchestrator.ts`
  - `src/data/prefetch/entityPrefetchOrchestrator.test.ts`
  - `src/data/storage/mmkvStorage.ts`
- `npm run lint -- --quiet` also fails on repo-wide scope noise:
  - k6 globals in `footalert-bff/scripts/perf/*.js`
  - generated assets under `site_vitrine/dist`
  - real source issues in follows/search/team stats and the boundary violations above

## SQLite / Local-First Status
- Present but not wired:
  - `src/data/db/database.ts`
  - `src/data/db/localFirstAdapter.ts`
  - `src/data/db/useLocalFirstQuery.ts`
  - `src/data/db/queryCacheSyncMiddleware.ts`
  - `src/data/db/hydrationBridge.ts`
  - `src/data/db/garbageCollector.ts`
  - `src/data/db/matchesByDateStore.ts`
- `src/ui/features/teams/hooks/useTeamLocalFirst.ts` exists and is the only entity-specific local-first hook.
- `src/ui/app/providers/QueryProvider.tsx` does not initialize SQLite, hydrate React Query, run GC, or install the sync middleware.
- `src/data/background/backgroundRefresh.ts` is still `ios-only` and calls raw network fetchers instead of `prefetchQuery`, so it does not warm SQLite.
- `matches_by_date` exists only as a raw store; no runtime writer currently populates it.
- Only migration `001_initial` exists. `002_relational_cache` does not exist yet.

## Existing Full-Payload Adoption
- Team: most advanced. `useTeamFull` is used by overview, matches, squad, stats, transfers, and context hooks.
- Player: `/full` exists through `playerFullQuery.ts`, already consumed by overview, stats catalog, and matches hooks.
- Competition: `/full` exists through `competitionFullQuery.ts`, already used by the screen model and several derived hooks.
- Match: detail flow already prefers `/full` through `useMatchDetailsQueryBundle.ts` and `matchFullQueryAdapter.ts`.
- Missing entity hooks:
  - `usePlayerLocalFirst`
  - `useCompetitionLocalFirst`
  - `useMatchLocalFirst`
