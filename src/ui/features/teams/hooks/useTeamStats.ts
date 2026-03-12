import { useMemo } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import {
  fetchTeamAdvancedStats,
} from '@data/endpoints/teamsApi';
import {
  mapPlayersToTopPlayers,
  mapPlayersToTopPlayersByCategory,
  mapStandingsToTeamData,
  mapTeamAdvancedComparisonMetrics,
  mapTeamStatisticsToStats,
} from '@data/mappers/teamsMapper';
import {
  fetchAllTeamPlayers,
  fetchTeamStatsCoreData,
} from '@data/teams/teamQueryData';
import type {
  TeamAdvancedStatsDto,
  TeamStatsCoreData,
  TeamStatsData,
} from '@ui/features/teams/types/teams.types';
import {
  useTeamFull,
  type TeamFullData,
} from '@ui/features/teams/hooks/useTeamFull';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';

export { fetchTeamStatsCoreData } from '@data/teams/teamQueryData';

type UseTeamStatsParams = {
  teamId: string;
  leagueId: string | null;
  season: number | null;
  enabled?: boolean;
};

type TeamStatsPlayersData = Pick<TeamStatsData, 'topPlayers' | 'topPlayersByCategory'>;

type TeamStatsAdvancedData = Pick<TeamStatsData, 'comparisonMetrics' | 'expectedGoalsFor'> & {
  sourceUpdatedAt: string | null;
};

export type TeamStatsQueryResult = Pick<
  UseQueryResult<TeamStatsData>,
  'isLoading' | 'isFetching' | 'isError' | 'isFetched' | 'isFetchedAfterMount' | 'dataUpdatedAt'
> & {
  data: TeamStatsData | undefined;
  coreData: TeamStatsCoreData | undefined;
  playersData: TeamStatsPlayersData | undefined;
  advancedData: TeamStatsAdvancedData | undefined;
  coreUpdatedAt: number;
  playersUpdatedAt: number;
  advancedUpdatedAt: number;
  isCoreLoading: boolean;
  isPlayersLoading: boolean;
  isAdvancedLoading: boolean;
  isPlayersFetching: boolean;
  isAdvancedFetching: boolean;
  isPlayersError: boolean;
  isAdvancedError: boolean;
  refetch: () => Promise<void>;
};

const EMPTY_TEAM_STATS_PLAYERS: TeamStatsPlayersData = {
  topPlayers: [],
  topPlayersByCategory: {
    ratings: [],
    scorers: [],
    assisters: [],
  },
};

const EMPTY_TEAM_STATS_ADVANCED: TeamStatsAdvancedData = {
  comparisonMetrics: [],
  expectedGoalsFor: null,
  sourceUpdatedAt: null,
};

function toTeamStatsCoreData(data: TeamStatsData): TeamStatsCoreData {
  return {
    rank: data.rank,
    points: data.points,
    played: data.played,
    wins: data.wins,
    draws: data.draws,
    losses: data.losses,
    goalsFor: data.goalsFor,
    goalsAgainst: data.goalsAgainst,
    homePlayed: data.homePlayed,
    homeWins: data.homeWins,
    homeDraws: data.homeDraws,
    homeLosses: data.homeLosses,
    awayPlayed: data.awayPlayed,
    awayWins: data.awayWins,
    awayDraws: data.awayDraws,
    awayLosses: data.awayLosses,
    expectedGoalsFor: data.expectedGoalsFor,
    pointsByVenue: data.pointsByVenue,
    goalsForPerMatch: data.goalsForPerMatch,
    goalsAgainstPerMatch: data.goalsAgainstPerMatch,
    cleanSheets: data.cleanSheets,
    failedToScore: data.failedToScore,
    comparisonMetrics: data.comparisonMetrics,
    goalBreakdown: data.goalBreakdown,
  };
}

function mapTeamFullStatsCoreData(payload: TeamFullData, teamId: string): TeamStatsCoreData {
  const standings = mapStandingsToTeamData(payload.standings.response, teamId);
  const mappedStats = mapTeamStatisticsToStats(
    payload.statistics.response,
    standings,
    [],
    EMPTY_TEAM_STATS_PLAYERS.topPlayersByCategory,
    null,
  );
  return toTeamStatsCoreData(mappedStats);
}

function mapTeamFullStatsPlayersData(
  payload: TeamFullData,
  teamId: string,
): TeamStatsPlayersData {
  const playerContext = {
    teamId,
    leagueId: payload.selection.leagueId ?? undefined,
    season: payload.selection.season ?? undefined,
  };

  return {
    topPlayers: mapPlayersToTopPlayers(payload.statsPlayers.response, 8, playerContext),
    topPlayersByCategory: mapPlayersToTopPlayersByCategory(
      payload.statsPlayers.response,
      3,
      playerContext,
    ),
  };
}

function mapTeamFullStatsAdvancedData(payload: TeamFullData): TeamStatsAdvancedData {
  return {
    comparisonMetrics: mapTeamAdvancedComparisonMetrics(payload.advancedStats.response),
    expectedGoalsFor: toAdvancedExpectedGoals(payload.advancedStats.response),
    sourceUpdatedAt: payload.advancedStats.response?.sourceUpdatedAt ?? null,
  };
}

function mergeComparisonMetrics(
  coreMetrics: TeamStatsData['comparisonMetrics'],
  advancedMetrics: TeamStatsData['comparisonMetrics'],
): TeamStatsData['comparisonMetrics'] {
  if (advancedMetrics.length === 0) {
    return coreMetrics;
  }

  const metricsByKey = new Map(coreMetrics.map(metric => [metric.key, metric]));
  advancedMetrics.forEach(metric => {
    metricsByKey.set(metric.key, metric);
  });
  return Array.from(metricsByKey.values());
}

type FetchTeamStatsPlayersDataParams = {
  teamId: string;
  leagueId: string | null;
  season: number | null;
  signal?: AbortSignal;
};

export async function fetchTeamStatsPlayersData({
  teamId,
  leagueId,
  season,
  signal,
}: FetchTeamStatsPlayersDataParams): Promise<TeamStatsPlayersData> {
  if (!teamId || !leagueId || typeof season !== 'number') {
    return EMPTY_TEAM_STATS_PLAYERS;
  }

  const playersPayload = await fetchAllTeamPlayers({
    teamId,
    leagueId,
    season,
    signal,
    maxRequests: 4,
    targetItems: 120,
  });

  return {
    topPlayers: mapPlayersToTopPlayers(playersPayload, 8, {
      teamId,
      leagueId,
      season,
    }),
    topPlayersByCategory: mapPlayersToTopPlayersByCategory(playersPayload, 3, {
      teamId,
      leagueId,
      season,
    }),
  };
}

type FetchTeamStatsAdvancedDataParams = {
  teamId: string;
  leagueId: string | null;
  season: number | null;
  signal?: AbortSignal;
};

function toAdvancedExpectedGoals(payload: TeamAdvancedStatsDto | null): number | null {
  const value = payload?.metrics?.expectedGoalsPerMatch?.value;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export async function fetchTeamStatsAdvancedData({
  teamId,
  leagueId,
  season,
  signal,
}: FetchTeamStatsAdvancedDataParams): Promise<TeamStatsAdvancedData> {
  if (!teamId || !leagueId || typeof season !== 'number') {
    return EMPTY_TEAM_STATS_ADVANCED;
  }

  const payload = await fetchTeamAdvancedStats(leagueId, season, teamId, signal);

  return {
    comparisonMetrics: mapTeamAdvancedComparisonMetrics(payload),
    expectedGoalsFor: toAdvancedExpectedGoals(payload),
    sourceUpdatedAt: payload?.sourceUpdatedAt ?? null,
  };
}

export function useTeamStats({
  teamId,
  leagueId,
  season,
  enabled = true,
}: UseTeamStatsParams): TeamStatsQueryResult {
  const isCoreEnabled = enabled && Boolean(teamId) && Boolean(leagueId) && typeof season === 'number';
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris';
  const teamFullQuery = useTeamFull({
    teamId,
    timezone,
    leagueId,
    season,
    enabled: isCoreEnabled,
  });
  const canUseFullPayload =
    teamFullQuery.isFullEnabled && Boolean(teamFullQuery.data);

  const coreQuery = useQuery<TeamStatsCoreData>({
    queryKey: queryKeys.teams.statsCore(teamId, leagueId, season),
    enabled: isCoreEnabled && !canUseFullPayload,
    refetchOnMount: false,
    ...featureQueryOptions.teams.statsCore,
    queryFn: ({ signal }) =>
      fetchTeamStatsCoreData({
        teamId,
        leagueId,
        season,
        signal,
      }),
  });

  // Les queries d'enrichissement s'exécutent en parallèle dès que les params sont valides
  const enrichmentEnabled = isCoreEnabled && !canUseFullPayload;

  const playersQuery = useQuery<TeamStatsPlayersData>({
    queryKey: queryKeys.teams.statsPlayers(teamId, leagueId, season),
    enabled: enrichmentEnabled,
    refetchOnMount: false,
    ...featureQueryOptions.teams.statsPlayers,
    queryFn: ({ signal }) =>
      fetchTeamStatsPlayersData({
        teamId,
        leagueId,
        season,
        signal,
      }),
  });

  const advancedQuery = useQuery<TeamStatsAdvancedData>({
    queryKey: queryKeys.teams.statsAdvanced(teamId, leagueId, season),
    enabled: enrichmentEnabled,
    refetchOnMount: false,
    ...featureQueryOptions.teams.statsAdvanced,
    queryFn: ({ signal }) =>
      fetchTeamStatsAdvancedData({
        teamId,
        leagueId,
        season,
        signal,
      }),
  });

  const fullCoreData = useMemo(
    () =>
      canUseFullPayload && teamFullQuery.data
        ? mapTeamFullStatsCoreData(teamFullQuery.data, teamId)
        : undefined,
    [canUseFullPayload, teamFullQuery.data, teamId],
  );
  const fullPlayersData = useMemo(
    () =>
      canUseFullPayload && teamFullQuery.data
        ? mapTeamFullStatsPlayersData(teamFullQuery.data, teamId)
        : undefined,
    [canUseFullPayload, teamFullQuery.data, teamId],
  );
  const fullAdvancedData = useMemo(
    () =>
      canUseFullPayload && teamFullQuery.data
        ? mapTeamFullStatsAdvancedData(teamFullQuery.data)
        : undefined,
    [canUseFullPayload, teamFullQuery.data],
  );

  const data = useMemo(() => {
    if (fullCoreData) {
      const playersData = fullPlayersData ?? EMPTY_TEAM_STATS_PLAYERS;
      const advancedData = fullAdvancedData ?? EMPTY_TEAM_STATS_ADVANCED;

      return {
        ...fullCoreData,
        topPlayers: playersData.topPlayers,
        topPlayersByCategory: playersData.topPlayersByCategory,
        expectedGoalsFor: advancedData.expectedGoalsFor ?? fullCoreData.expectedGoalsFor,
        comparisonMetrics: mergeComparisonMetrics(
          fullCoreData.comparisonMetrics,
          advancedData.comparisonMetrics,
        ),
      } satisfies TeamStatsData;
    }

    if (!coreQuery.data) {
      return undefined;
    }

    const playersData = playersQuery.data ?? EMPTY_TEAM_STATS_PLAYERS;
    const advancedData = advancedQuery.data ?? EMPTY_TEAM_STATS_ADVANCED;

    return {
      ...coreQuery.data,
      topPlayers: playersData.topPlayers,
      topPlayersByCategory: playersData.topPlayersByCategory,
      expectedGoalsFor: advancedData.expectedGoalsFor ?? coreQuery.data.expectedGoalsFor,
      comparisonMetrics: mergeComparisonMetrics(
        coreQuery.data.comparisonMetrics,
        advancedData.comparisonMetrics,
      ),
    } satisfies TeamStatsData;
  }, [
    advancedQuery.data,
    coreQuery.data,
    fullAdvancedData,
    fullCoreData,
    fullPlayersData,
    playersQuery.data,
  ]);

  return {
    data,
    coreData: fullCoreData ?? coreQuery.data,
    playersData: fullPlayersData ?? playersQuery.data,
    advancedData: fullAdvancedData ?? advancedQuery.data,
    coreUpdatedAt: canUseFullPayload ? teamFullQuery.dataUpdatedAt : coreQuery.dataUpdatedAt,
    playersUpdatedAt: canUseFullPayload ? teamFullQuery.dataUpdatedAt : playersQuery.dataUpdatedAt,
    advancedUpdatedAt: canUseFullPayload ? teamFullQuery.dataUpdatedAt : advancedQuery.dataUpdatedAt,
    isLoading: canUseFullPayload
      ? teamFullQuery.isLoading && !teamFullQuery.data
      : coreQuery.isLoading && !coreQuery.data,
    isFetching: canUseFullPayload
      ? teamFullQuery.isFetching
      : coreQuery.isFetching || playersQuery.isFetching || advancedQuery.isFetching,
    isError: canUseFullPayload
      ? teamFullQuery.isError && !teamFullQuery.data
      : coreQuery.isError && !coreQuery.data,
    isFetched: canUseFullPayload ? teamFullQuery.isFetched : coreQuery.isFetched,
    isFetchedAfterMount: canUseFullPayload
      ? teamFullQuery.isFetchedAfterMount
      : coreQuery.isFetchedAfterMount,
    dataUpdatedAt: Math.max(
      canUseFullPayload ? teamFullQuery.dataUpdatedAt : coreQuery.dataUpdatedAt,
      canUseFullPayload ? teamFullQuery.dataUpdatedAt : playersQuery.dataUpdatedAt,
      canUseFullPayload ? teamFullQuery.dataUpdatedAt : advancedQuery.dataUpdatedAt,
    ),
    isCoreLoading: canUseFullPayload ? false : coreQuery.isLoading && !coreQuery.data,
    isPlayersLoading: canUseFullPayload ? false : playersQuery.isLoading && !playersQuery.data,
    isAdvancedLoading: canUseFullPayload ? false : advancedQuery.isLoading && !advancedQuery.data,
    isPlayersFetching: canUseFullPayload ? false : playersQuery.isFetching,
    isAdvancedFetching: canUseFullPayload ? false : advancedQuery.isFetching,
    isPlayersError: canUseFullPayload ? false : playersQuery.isError && !playersQuery.data,
    isAdvancedError: canUseFullPayload ? false : advancedQuery.isError && !advancedQuery.data,
    refetch: async () => {
      if (canUseFullPayload) {
        await teamFullQuery.refetch();
        return;
      }

      await Promise.allSettled([
        coreQuery.refetch(),
        playersQuery.refetch(),
        advancedQuery.refetch(),
      ]);
    },
  };
}
