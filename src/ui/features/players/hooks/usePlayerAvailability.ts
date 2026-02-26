import { useQuery, useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query';

import {
  fetchPlayerCareerAggregate,
  fetchPlayerDetails,
  fetchPlayerMatchesAggregate,
} from '@data/endpoints/playersApi';
import {
  mapPlayerDetailsToProfile,
  mapPlayerDetailsToSeasonStatsDataset,
} from '@data/mappers/playersMapper';
import type { PlayerTabType } from '@ui/features/players/components/PlayerTabs';
import {
  hasAnyPresentValue,
  resolveSnapshotState,
  runProbeTask,
  type AvailabilityState,
  type EntityAvailabilitySnapshot,
  type TabAvailability,
} from '@ui/shared/availability';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';

type UsePlayerAvailabilityParams = {
  playerId: string;
  season: number;
  leagueId?: string | null;
  enabled?: boolean;
  concurrency?: number;
};

type ProbeResult<TData> = {
  state: AvailabilityState;
  data: TData | null;
};

const PROBE_QUEUE_KEY = 'player-availability-probe';
const DEFAULT_PROBE_CONCURRENCY = 3;

async function runProbe<TData>({
  queryClient,
  queryKey,
  queryFn,
  isAvailable,
  concurrency,
}: {
  queryClient: QueryClient;
  queryKey: QueryKey;
  queryFn: (signal?: AbortSignal) => Promise<TData>;
  isAvailable: (value: TData) => boolean;
  concurrency: number;
}): Promise<ProbeResult<TData>> {
  const cachedData = queryClient.getQueryData<TData>(queryKey);
  if (typeof cachedData !== 'undefined') {
    return {
      state: isAvailable(cachedData) ? 'available' : 'missing',
      data: cachedData,
    };
  }

  const cachedState = queryClient.getQueryState<TData>(queryKey);
  if (cachedState?.status === 'error') {
    return { state: 'unknown', data: null };
  }

  try {
    const data = await runProbeTask({
      queueKey: PROBE_QUEUE_KEY,
      concurrency,
      task: () =>
        queryClient.fetchQuery({
          queryKey,
          queryFn: ({ signal }) => queryFn(signal),
        }),
    });

    return {
      state: isAvailable(data) ? 'available' : 'missing',
      data,
    };
  } catch {
    return { state: 'unknown', data: null };
  }
}

function buildFallbackSnapshot(playerId: string): EntityAvailabilitySnapshot<PlayerTabType> {
  const tabs: Array<TabAvailability<PlayerTabType>> = [
    { key: 'profil', state: 'missing' },
    { key: 'matchs', state: 'missing' },
    { key: 'stats', state: 'missing' },
    { key: 'carriere', state: 'missing' },
  ];

  return {
    entityId: playerId,
    tabs,
    state: 'missing',
    hasAnyTab: false,
    checkedAt: Date.now(),
  };
}

function hasCareerData(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const payload = value as { seasons?: unknown[]; teams?: unknown[] };
  return (payload.seasons ?? []).length > 0 || (payload.teams ?? []).length > 0;
}

function hasMatches(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

export async function fetchPlayerAvailabilitySnapshot({
  queryClient,
  playerId,
  season,
  leagueId,
  concurrency = DEFAULT_PROBE_CONCURRENCY,
}: {
  queryClient: QueryClient;
  playerId: string;
  season: number;
  leagueId?: string | null;
  concurrency?: number;
}): Promise<EntityAvailabilitySnapshot<PlayerTabType>> {
  if (!playerId || !Number.isFinite(season)) {
    return buildFallbackSnapshot(playerId);
  }

  const detailsResult = await runProbe({
    queryClient,
    concurrency,
    queryKey: queryKeys.players.details(playerId, season),
    queryFn: signal => fetchPlayerDetails(playerId, season, signal),
    isAvailable: value => Boolean(value),
  });

  const detailsDto = detailsResult.data;
  const profile = detailsDto ? mapPlayerDetailsToProfile(detailsDto, season) : null;
  const statsDataset = detailsDto ? mapPlayerDetailsToSeasonStatsDataset(detailsDto, season) : null;
  const statsForLeague =
    statsDataset && leagueId
      ? statsDataset.byCompetition.find(item => item.leagueId === leagueId)?.stats ?? null
      : statsDataset?.overall ?? null;
  const statsState: AvailabilityState = hasAnyPresentValue(statsForLeague as Record<string, unknown> | null)
    ? 'available'
    : detailsResult.state === 'unknown'
      ? 'unknown'
      : 'missing';

  const profileState: AvailabilityState = detailsResult.state === 'available'
    ? 'available'
    : detailsResult.state;

  const teamId = profile?.team.id ?? null;

  const matchesResult =
    teamId && Number.isFinite(season)
      ? await runProbe({
          queryClient,
          concurrency,
          queryKey: queryKeys.players.matchesAggregate(playerId, teamId, season),
          queryFn: signal => fetchPlayerMatchesAggregate(playerId, teamId, season, 15, signal),
          isAvailable: hasMatches,
        })
      : { state: 'missing' as const, data: null };

  const careerResult = await runProbe({
    queryClient,
    concurrency,
    queryKey: queryKeys.players.careerAggregate(playerId),
    queryFn: signal => fetchPlayerCareerAggregate(playerId, signal),
    isAvailable: hasCareerData,
  });

  const tabs: Array<TabAvailability<PlayerTabType>> = [
    { key: 'profil', state: profileState },
    { key: 'matchs', state: matchesResult.state },
    { key: 'stats', state: statsState },
    { key: 'carriere', state: careerResult.state },
  ];

  const state = resolveSnapshotState(tabs);

  return {
    entityId: playerId,
    state,
    tabs,
    hasAnyTab: tabs.some(tab => tab.state === 'available'),
    checkedAt: Date.now(),
  };
}

export function usePlayerAvailability({
  playerId,
  season,
  leagueId,
  enabled = true,
  concurrency = DEFAULT_PROBE_CONCURRENCY,
}: UsePlayerAvailabilityParams) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.players.availability(playerId, season, leagueId),
    enabled: enabled && Boolean(playerId) && Number.isFinite(season),
    staleTime: featureQueryOptions.players.availability.staleTime,
    retry: featureQueryOptions.players.availability.retry,
    queryFn: () =>
      fetchPlayerAvailabilitySnapshot({
        queryClient,
        playerId,
        season,
        leagueId,
        concurrency,
      }),
  });
}

