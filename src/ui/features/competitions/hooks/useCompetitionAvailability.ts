import { useQuery, useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query';

import {
  fetchLeagueFixtures,
  fetchLeagueStandings,
  fetchLeagueTopAssists,
  fetchLeagueTopRedCards,
  fetchLeagueTopScorers,
  fetchLeagueTopYellowCards,
  fetchLeagueTransfers,
} from '@data/endpoints/competitionsApi';
import {
  mapCompetitionPlayerStatsToTotw,
  mapFixturesDtoToFixtures,
  mapPlayerStatsDtoToPlayerStats,
  mapStandingDtoToGroups,
  mapTransfersDtoToCompetitionTransfers,
} from '@data/mappers/competitionsMapper';
import type { CompetitionTotwData } from '@ui/features/competitions/types/competitions.types';
import type { CompetitionTabKey } from '@ui/features/competitions/components/CompetitionTabs';
import {
  resolveSnapshotState,
  runProbeTask,
  type AvailabilityState,
  type EntityAvailabilitySnapshot,
  type TabAvailability,
} from '@ui/shared/availability';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';

type PlayerStatType = 'goals' | 'assists' | 'yellowCards' | 'redCards';

type UseCompetitionAvailabilityParams = {
  leagueId: number | undefined;
  season: number | undefined;
  enabled?: boolean;
  concurrency?: number;
};

type ProbeResult<TData> = {
  state: AvailabilityState;
  data: TData | null;
};

const PLAYER_STAT_TYPES: PlayerStatType[] = ['goals', 'assists', 'yellowCards', 'redCards'];
const PROBE_QUEUE_KEY = 'competition-availability-probe';
const LIST_PROBE_CONCURRENCY = 2;
const DETAILS_PROBE_CONCURRENCY = 3;

function buildFallbackSnapshot(
  leagueId: number | undefined,
): EntityAvailabilitySnapshot<CompetitionTabKey> {
  const tabs: Array<TabAvailability<CompetitionTabKey>> = [
    { key: 'standings', state: 'missing' },
    { key: 'matches', state: 'missing' },
    { key: 'playerStats', state: 'missing' },
    { key: 'teamStats', state: 'missing' },
    { key: 'transfers', state: 'missing' },
    { key: 'totw', state: 'missing' },
  ];

  return {
    entityId: String(leagueId ?? ''),
    tabs,
    state: 'missing',
    hasAnyTab: false,
    checkedAt: Date.now(),
  };
}

function hasStandingsRows(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.some(group => Array.isArray((group as { rows?: unknown[] }).rows) && ((group as { rows?: unknown[] }).rows ?? []).length > 0)
  );
}

function hasFixtures(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function hasTransfers(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function hasPlayerStats(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function hasTotw(value: CompetitionTotwData | null): boolean {
  return Boolean(value && Array.isArray(value.players) && value.players.length > 0);
}

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

async function probeCompetitionAvailability({
  leagueId,
  season,
  queryClient,
  concurrency,
}: {
  leagueId: number;
  season: number;
  queryClient: QueryClient;
  concurrency: number;
}): Promise<EntityAvailabilitySnapshot<CompetitionTabKey>> {
  const standingsResult = await runProbe({
    queryClient,
    concurrency,
    queryKey: queryKeys.competitions.standings(leagueId, season),
    queryFn: async signal => {
      const dto = await fetchLeagueStandings(leagueId, season, signal);
      return mapStandingDtoToGroups(dto);
    },
    isAvailable: hasStandingsRows,
  });

  const matchesResult = await runProbe({
    queryClient,
    concurrency,
    queryKey: queryKeys.competitions.fixtures(leagueId, season),
    queryFn: async signal => {
      const dto = await fetchLeagueFixtures(leagueId, season, signal);
      return mapFixturesDtoToFixtures(dto);
    },
    isAvailable: hasFixtures,
  });

  let hasAnyPlayerStats = false;
  let hasPlayerStatsUnknown = false;
  const playerStatsCategories: Array<{ key: string; state: AvailabilityState }> = [];

  for (const statType of PLAYER_STAT_TYPES) {
    const result = await runProbe({
      queryClient,
      concurrency,
      queryKey: queryKeys.competitions.playerStats(leagueId, season, statType),
      queryFn: async signal => {
        switch (statType) {
          case 'goals':
            return mapPlayerStatsDtoToPlayerStats(
              await fetchLeagueTopScorers(leagueId, season, signal),
              season,
            );
          case 'assists':
            return mapPlayerStatsDtoToPlayerStats(
              await fetchLeagueTopAssists(leagueId, season, signal),
              season,
            );
          case 'yellowCards':
            return mapPlayerStatsDtoToPlayerStats(
              await fetchLeagueTopYellowCards(leagueId, season, signal),
              season,
            );
          case 'redCards':
            return mapPlayerStatsDtoToPlayerStats(
              await fetchLeagueTopRedCards(leagueId, season, signal),
              season,
            );
          default:
            return [];
        }
      },
      isAvailable: hasPlayerStats,
    });

    playerStatsCategories.push({ key: statType, state: result.state });

    if (result.state === 'available') {
      hasAnyPlayerStats = true;
      break;
    }

    if (result.state === 'unknown') {
      hasPlayerStatsUnknown = true;
    }
  }

  const playerStatsState: AvailabilityState = hasAnyPlayerStats
    ? 'available'
    : hasPlayerStatsUnknown
      ? 'unknown'
      : 'missing';

  const transfersResult = await runProbe({
    queryClient,
    concurrency,
    queryKey: queryKeys.competitions.transfers(leagueId, season),
    queryFn: async signal => {
      const dto = await fetchLeagueTransfers(leagueId, season, signal);
      return mapTransfersDtoToCompetitionTransfers(dto, season);
    },
    isAvailable: hasTransfers,
  });

  const totwResult = await runProbe({
    queryClient,
    concurrency,
    queryKey: queryKeys.competitions.totw(leagueId, season),
    queryFn: async signal => {
      const [topScorers, topAssists, topYellowCards, topRedCards] = await Promise.all([
        fetchLeagueTopScorers(leagueId, season, signal),
        fetchLeagueTopAssists(leagueId, season, signal),
        fetchLeagueTopYellowCards(leagueId, season, signal),
        fetchLeagueTopRedCards(leagueId, season, signal),
      ]);

      const allPlayers = [
        ...mapPlayerStatsDtoToPlayerStats(topScorers, season),
        ...mapPlayerStatsDtoToPlayerStats(topAssists, season),
        ...mapPlayerStatsDtoToPlayerStats(topYellowCards, season),
        ...mapPlayerStatsDtoToPlayerStats(topRedCards, season),
      ];

      return mapCompetitionPlayerStatsToTotw(allPlayers, season);
    },
    isAvailable: hasTotw,
  });

  const teamStatsState =
    standingsResult.state === 'available'
      ? 'available'
      : standingsResult.state === 'unknown'
        ? 'unknown'
        : 'missing';

  const tabs: Array<TabAvailability<CompetitionTabKey>> = [
    { key: 'standings', state: standingsResult.state },
    { key: 'matches', state: matchesResult.state },
    {
      key: 'playerStats',
      state: playerStatsState,
      categories: playerStatsCategories,
    },
    {
      key: 'teamStats',
      state: teamStatsState,
      categories: [
        { key: 'summary', state: teamStatsState },
        { key: 'homeAway', state: teamStatsState },
        { key: 'advanced', state: teamStatsState === 'available' ? 'unknown' : teamStatsState },
      ],
    },
    { key: 'transfers', state: transfersResult.state },
    { key: 'totw', state: totwResult.state },
  ];

  const state = resolveSnapshotState(tabs);

  return {
    entityId: String(leagueId),
    tabs,
    state,
    hasAnyTab: tabs.some(tab => tab.state === 'available'),
    checkedAt: Date.now(),
  };
}

export async function fetchCompetitionAvailabilitySnapshot({
  queryClient,
  leagueId,
  season,
  concurrency = DETAILS_PROBE_CONCURRENCY,
}: {
  queryClient: QueryClient;
  leagueId: number | undefined;
  season: number | undefined;
  concurrency?: number;
}): Promise<EntityAvailabilitySnapshot<CompetitionTabKey>> {
  if (
    typeof leagueId !== 'number' ||
    !Number.isFinite(leagueId) ||
    typeof season !== 'number' ||
    !Number.isFinite(season)
  ) {
    return buildFallbackSnapshot(leagueId);
  }

  return probeCompetitionAvailability({
    leagueId,
    season,
    queryClient,
    concurrency: Math.max(1, concurrency),
  });
}

export function useCompetitionAvailability({
  leagueId,
  season,
  enabled = true,
  concurrency,
}: UseCompetitionAvailabilityParams) {
  const queryClient = useQueryClient();
  const effectiveConcurrency =
    concurrency ??
    (enabled ? DETAILS_PROBE_CONCURRENCY : LIST_PROBE_CONCURRENCY);

  return useQuery({
    queryKey: queryKeys.competitions.availability(leagueId, season),
    enabled,
    staleTime: featureQueryOptions.competitions.availability.staleTime,
    retry: featureQueryOptions.competitions.availability.retry,
    queryFn: async () => {
      return fetchCompetitionAvailabilitySnapshot({
        queryClient,
        leagueId,
        season,
        concurrency: effectiveConcurrency,
      });
    },
  });
}
