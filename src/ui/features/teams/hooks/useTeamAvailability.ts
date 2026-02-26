import { useQuery, useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query';

import {
  fetchLeagueStandings,
  fetchTeamFixtures,
  fetchTeamSquad,
  fetchTeamTransfers,
  fetchTeamTrophies,
} from '@data/endpoints/teamsApi';
import {
  mapFixturesToTeamMatches,
  mapSquadToTeamSquad,
  mapStandingsToTeamData,
  mapTransfersToTeamTransfers,
  mapTrophiesToTeamTrophies,
} from '@data/mappers/teamsMapper';
import { fetchTeamStatsData } from '@ui/features/teams/hooks/useTeamStats';
import type { TeamDetailsTab } from '@ui/features/teams/types/teams.types';
import {
  resolveSnapshotState,
  runProbeTask,
  type AvailabilityState,
  type EntityAvailabilitySnapshot,
  type TabAvailability,
} from '@ui/shared/availability';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';

type TeamAvailabilityTab = TeamDetailsTab;

type UseTeamAvailabilityParams = {
  teamId: string;
  leagueId: string | null;
  season: number | null;
  timezone: string;
  enabled?: boolean;
  concurrency?: number;
};

type ProbeResult<TData> = {
  state: AvailabilityState;
  data: TData | null;
};

const PROBE_QUEUE_KEY = 'team-availability-probe';
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

function hasMatches(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const matches = value as { all?: unknown[] };
  return Array.isArray(matches.all) && matches.all.length > 0;
}

function hasStandingsRows(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const standings = value as { groups?: Array<{ rows?: unknown[] }> };
  return (standings.groups ?? []).some(group => (group.rows ?? []).length > 0);
}

function hasStats(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const stats = value as { comparisonMetrics?: unknown[]; topPlayers?: unknown[]; played?: number | null };
  return (
    (Array.isArray(stats.comparisonMetrics) && stats.comparisonMetrics.length > 0) ||
    (Array.isArray(stats.topPlayers) && stats.topPlayers.length > 0) ||
    typeof stats.played === 'number'
  );
}

function hasTransfers(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const transfers = value as { arrivals?: unknown[]; departures?: unknown[] };
  return (transfers.arrivals ?? []).length > 0 || (transfers.departures ?? []).length > 0;
}

function hasSquad(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const squad = value as { players?: unknown[]; coach?: unknown };
  return (squad.players ?? []).length > 0 || Boolean(squad.coach);
}

function hasTrophies(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const trophies = value as { groups?: Array<{ placements?: unknown[] }> };
  return (trophies.groups ?? []).some(group => (group.placements ?? []).length > 0);
}

function buildFallbackSnapshot(teamId: string): EntityAvailabilitySnapshot<TeamAvailabilityTab> {
  const tabs: Array<TabAvailability<TeamAvailabilityTab>> = [
    { key: 'overview', state: 'missing' },
    { key: 'matches', state: 'missing' },
    { key: 'standings', state: 'missing' },
    { key: 'stats', state: 'missing' },
    { key: 'transfers', state: 'missing' },
    { key: 'squad', state: 'missing' },
    { key: 'trophies', state: 'missing' },
  ];

  return {
    entityId: teamId,
    tabs,
    state: 'missing',
    hasAnyTab: false,
    checkedAt: Date.now(),
  };
}

export async function fetchTeamAvailabilitySnapshot({
  queryClient,
  teamId,
  leagueId,
  season,
  timezone,
  concurrency = DEFAULT_PROBE_CONCURRENCY,
}: {
  queryClient: QueryClient;
  teamId: string;
  leagueId: string | null;
  season: number | null;
  timezone: string;
  concurrency?: number;
}): Promise<EntityAvailabilitySnapshot<TeamAvailabilityTab>> {
  if (!teamId) {
    return buildFallbackSnapshot(teamId);
  }

  const matchesResult =
    leagueId && typeof season === 'number'
      ? await runProbe({
          queryClient,
          concurrency,
          queryKey: queryKeys.teams.matches(teamId, leagueId, season, timezone),
          queryFn: async signal => {
            const payload = await fetchTeamFixtures({ teamId, leagueId, season, timezone }, signal);
            return mapFixturesToTeamMatches(payload);
          },
          isAvailable: hasMatches,
        })
      : { state: 'missing' as const, data: null };

  const standingsResult =
    leagueId && typeof season === 'number'
      ? await runProbe({
          queryClient,
          concurrency,
          queryKey: queryKeys.teams.standings(teamId, leagueId, season),
          queryFn: async signal => {
            const payload = await fetchLeagueStandings(leagueId, season, signal);
            return mapStandingsToTeamData(payload, teamId);
          },
          isAvailable: hasStandingsRows,
        })
      : { state: 'missing' as const, data: null };

  const statsResult =
    leagueId && typeof season === 'number'
      ? await runProbe({
          queryClient,
          concurrency,
          queryKey: queryKeys.teams.stats(teamId, leagueId, season),
          queryFn: signal =>
            fetchTeamStatsData({
              teamId,
              leagueId,
              season,
              signal,
            }),
          isAvailable: hasStats,
        })
      : { state: 'missing' as const, data: null };

  const transfersResult = await runProbe({
    queryClient,
    concurrency,
    queryKey: queryKeys.teams.transfers(teamId, season),
    queryFn: async signal => {
      const payload = await fetchTeamTransfers(teamId, signal);
      return mapTransfersToTeamTransfers(payload, teamId, season);
    },
    isAvailable: hasTransfers,
  });

  const squadResult = await runProbe({
    queryClient,
    concurrency,
    queryKey: queryKeys.teams.squad(teamId),
    queryFn: async signal => {
      const payload = await fetchTeamSquad(teamId, signal);
      return mapSquadToTeamSquad(payload);
    },
    isAvailable: hasSquad,
  });

  const trophiesResult = await runProbe({
    queryClient,
    concurrency,
    queryKey: queryKeys.teams.trophies(teamId),
    queryFn: async signal => {
      const payload = await fetchTeamTrophies(teamId, signal);
      return mapTrophiesToTeamTrophies(payload);
    },
    isAvailable: hasTrophies,
  });

  const coreStates = [
    matchesResult.state,
    standingsResult.state,
    statsResult.state,
    transfersResult.state,
    squadResult.state,
    trophiesResult.state,
  ];
  const overviewState: AvailabilityState = coreStates.includes('available')
    ? 'available'
    : coreStates.includes('unknown')
      ? 'unknown'
      : 'missing';

  const tabs: Array<TabAvailability<TeamAvailabilityTab>> = [
    { key: 'overview', state: overviewState },
    { key: 'matches', state: matchesResult.state },
    { key: 'standings', state: standingsResult.state },
    { key: 'stats', state: statsResult.state },
    { key: 'transfers', state: transfersResult.state },
    { key: 'squad', state: squadResult.state },
    { key: 'trophies', state: trophiesResult.state },
  ];

  const state = resolveSnapshotState(tabs);

  return {
    entityId: teamId,
    state,
    tabs,
    hasAnyTab: tabs.some(tab => tab.state === 'available'),
    checkedAt: Date.now(),
  };
}

export function useTeamAvailability({
  teamId,
  leagueId,
  season,
  timezone,
  enabled = true,
  concurrency = DEFAULT_PROBE_CONCURRENCY,
}: UseTeamAvailabilityParams) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.teams.availability(teamId, leagueId, season),
    enabled: enabled && Boolean(teamId),
    staleTime: featureQueryOptions.teams.availability.staleTime,
    retry: featureQueryOptions.teams.availability.retry,
    queryFn: () =>
      fetchTeamAvailabilitySnapshot({
        queryClient,
        teamId,
        leagueId,
        season,
        timezone,
        concurrency,
      }),
  });
}

