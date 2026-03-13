import { useCallback } from 'react';

import { appEnv } from '@data/config/env';
import { buildCompetitionFullEntityId } from '@data/db/fullEntityIds';
import { useLocalFirstQuery } from '@data/db/useLocalFirstQuery';
import {
  getHydrationSection,
  isHydrationPending,
} from '@domain/contracts/fullPayloadHydration.types';
import {
  fetchCompetitionFull,
  type CompetitionFullPayload,
} from '@data/endpoints/competitionsApi';
import { isJestRuntime } from '@data/runtime/isJestRuntime';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';
import { queryKeys } from '@ui/shared/query/queryKeys';

/** Durée max en ms avant de considérer le cache compétition stale — aligné sur COMPETITION_POLICY BFF (4h). */
const COMPETITION_FULL_MAX_AGE_MS = 4 * 60 * 60_000;

type UseCompetitionLocalFirstParams = {
  leagueId: number | undefined;
  season?: number;
  enabled?: boolean;
};

export function useCompetitionLocalFirst({
  leagueId,
  season,
  enabled = true,
}: UseCompetitionLocalFirstParams) {
  const fullEnabled =
    enabled &&
    !isJestRuntime() &&
    appEnv.mobileEnableSqliteLocalFirst &&
    appEnv.mobileEnableBffCompetitionFull &&
    typeof leagueId === 'number' &&
    Number.isFinite(leagueId);

  const fetchFn = useCallback(
    async (signal?: AbortSignal) => fetchCompetitionFull(leagueId as number, season, signal),
    [leagueId, season],
  );

  const query = useLocalFirstQuery<CompetitionFullPayload>({
    queryKey: queryKeys.competitions.full(
      leagueId ? String(leagueId) : 'invalid',
      season ?? null,
    ),
    entityType: 'competition',
    entityId: buildCompetitionFullEntityId(
      leagueId ? String(leagueId) : 'invalid',
      season ?? null,
    ),
    maxAgeMs: COMPETITION_FULL_MAX_AGE_MS,
    fetchFn,
    enabled: fullEnabled,
    queryOptions: featureQueryOptions.competitions.full,
  });

  return {
    ...query,
    isFullEnabled: fullEnabled,
    hydration: query.data?._hydration ?? null,
    hydrationStatus: query.data?._hydration?.status ?? null,
    hydrationSections: query.data?._hydration?.sections ?? {},
    isHydrationPending: isHydrationPending(query.data?._hydration),
    getSectionHydration: (sectionKey: string) =>
      getHydrationSection(query.data?._hydration, sectionKey),
  };
}
