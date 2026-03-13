import { useQuery, type QueryClient } from '@tanstack/react-query';

import { appEnv } from '@data/config/env';
import { buildCompetitionFullEntityId } from '@data/db/fullEntityIds';
import { createLocalFirstQueryFn } from '@data/db/localFirstAdapter';
import {
  getHydrationSection,
  isHydrationPending,
  resolveProgressiveHydrationRefetchInterval,
} from '@domain/contracts/fullPayloadHydration.types';
import {
  fetchCompetitionFull,
  type CompetitionFullPayload,
} from '@data/endpoints/competitionsApi';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';
import { queryKeys } from '@ui/shared/query/queryKeys';

import { useCompetitionLocalFirst } from './useCompetitionLocalFirst';

export function competitionFullQueryKey(
  leagueId: number | undefined,
  season?: number,
) {
  return queryKeys.competitions.full(
    leagueId ? String(leagueId) : 'invalid',
    season ?? null,
  );
}

function createCompetitionFullQueryFn(
  leagueId: number,
  season?: number,
) {
  if (!appEnv.mobileEnableSqliteLocalFirst) {
    return ({ signal }: { signal?: AbortSignal }) =>
      fetchCompetitionFull(leagueId, season, signal);
  }

  return createLocalFirstQueryFn<CompetitionFullPayload>({
    entityType: 'competition',
    entityId: buildCompetitionFullEntityId(String(leagueId), season ?? null),
    maxAgeMs: featureQueryOptions.competitions.full.staleTime ?? 60_000,
    fetchFn: signal => fetchCompetitionFull(leagueId, season, signal),
  });
}

function canUseCompetitionFull(leagueId: number | undefined): leagueId is number {
  return (
    typeof leagueId === 'number' &&
    Number.isFinite(leagueId)
  );
}

function getCachedCompetitionFullPayload(
  queryClient: QueryClient,
  leagueId: number | undefined,
  season?: number,
): CompetitionFullPayload | null {
  if (!canUseCompetitionFull(leagueId)) {
    return null;
  }

  const exactPayload = queryClient.getQueryData<CompetitionFullPayload>(
    competitionFullQueryKey(leagueId, season),
  );
  if (exactPayload) {
    return exactPayload;
  }

  const basePayload = queryClient.getQueryData<CompetitionFullPayload>(
    competitionFullQueryKey(leagueId),
  );
  if (!basePayload) {
    return null;
  }

  if (typeof season === 'number' && basePayload.season !== season) {
    return null;
  }

  return basePayload;
}

export async function loadCompetitionFullPayload(
  queryClient: QueryClient,
  leagueId: number | undefined,
  season?: number,
): Promise<CompetitionFullPayload | null> {
  if (!canUseCompetitionFull(leagueId)) {
    return null;
  }

  const cachedPayload = getCachedCompetitionFullPayload(queryClient, leagueId, season);
  if (cachedPayload) {
    return cachedPayload;
  }

  if (typeof season === 'number') {
    const basePayload = await queryClient.ensureQueryData({
      queryKey: competitionFullQueryKey(leagueId),
      queryFn: createCompetitionFullQueryFn(leagueId, undefined),
      ...featureQueryOptions.competitions.full,
    }) as CompetitionFullPayload;
    if (basePayload.season === season) {
      return basePayload;
    }
  }

  return queryClient.ensureQueryData({
    queryKey: competitionFullQueryKey(leagueId, season),
    queryFn: createCompetitionFullQueryFn(leagueId, season),
    ...featureQueryOptions.competitions.full,
  }) as Promise<CompetitionFullPayload>;
}

export function useCompetitionFullQuery(
  leagueId: number | undefined,
  season?: number,
  enabled: boolean = true,
) {
  const useSqliteLocalFirst = appEnv.mobileEnableSqliteLocalFirst;
  const localFirstQuery = useCompetitionLocalFirst({
    leagueId,
    season,
    enabled: useSqliteLocalFirst && enabled,
  });
  const networkQuery = useQuery<CompetitionFullPayload, Error>({
    queryKey: competitionFullQueryKey(leagueId, season),
    enabled: !useSqliteLocalFirst && enabled && canUseCompetitionFull(leagueId),
    queryFn: createCompetitionFullQueryFn(leagueId as number, season),
    placeholderData: previousData => previousData,
    refetchInterval: query =>
      resolveProgressiveHydrationRefetchInterval(
        query.state.data?._hydration,
        query.state.dataUpdatedAt,
      ),
    refetchIntervalInBackground: false,
    ...featureQueryOptions.competitions.full,
  });

  if (useSqliteLocalFirst) {
    return localFirstQuery;
  }

  return {
    ...networkQuery,
    hydration: networkQuery.data?._hydration ?? null,
    hydrationStatus: networkQuery.data?._hydration?.status ?? null,
    hydrationSections: networkQuery.data?._hydration?.sections ?? {},
    isHydrationPending: isHydrationPending(networkQuery.data?._hydration),
    getSectionHydration: (sectionKey: string) =>
      getHydrationSection(networkQuery.data?._hydration, sectionKey),
  };
}
