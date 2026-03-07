import { useMemo } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import {
  fetchTeamAdvancedStats,
  fetchLeagueStandings,
  fetchTeamStatistics,
} from '@data/endpoints/teamsApi';
import {
  mapPlayersToTopPlayers,
  mapPlayersToTopPlayersByCategory,
  mapStandingsToTeamData,
  mapTeamAdvancedComparisonMetrics,
  mapTeamStatisticsToStats,
} from '@data/mappers/teamsMapper';
import type {
  TeamAdvancedStatsDto,
  TeamStatsCoreData,
  TeamStatsData,
} from '@ui/features/teams/types/teams.types';
import { fetchAllTeamPlayers } from '@ui/features/teams/utils/fetchAllTeamPlayers';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';

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

const EMPTY_TEAM_STATS: TeamStatsData = {
  rank: null,
  points: null,
  played: null,
  wins: null,
  draws: null,
  losses: null,
  goalsFor: null,
  goalsAgainst: null,
  homePlayed: null,
  homeWins: null,
  homeDraws: null,
  homeLosses: null,
  awayPlayed: null,
  awayWins: null,
  awayDraws: null,
  awayLosses: null,
  expectedGoalsFor: null,
  pointsByVenue: {
    home: null,
    away: null,
  },
  goalsForPerMatch: null,
  goalsAgainstPerMatch: null,
  cleanSheets: null,
  failedToScore: null,
  topPlayersByCategory: {
    ratings: [],
    scorers: [],
    assisters: [],
  },
  comparisonMetrics: [],
  goalBreakdown: [],
  topPlayers: [],
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

function isAbortError(error: unknown): error is Error {
  return error instanceof Error && error.name === 'AbortError';
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

function mergeTeamStatsCoreData(
  previousData: TeamStatsCoreData | undefined,
  nextData: TeamStatsCoreData,
): TeamStatsCoreData {
  if (!previousData) {
    return nextData;
  }

  return {
    ...nextData,
    rank: nextData.rank ?? previousData.rank,
    points: nextData.points ?? previousData.points,
    played: nextData.played ?? previousData.played,
    wins: nextData.wins ?? previousData.wins,
    draws: nextData.draws ?? previousData.draws,
    losses: nextData.losses ?? previousData.losses,
    goalsFor: nextData.goalsFor ?? previousData.goalsFor,
    goalsAgainst: nextData.goalsAgainst ?? previousData.goalsAgainst,
    homePlayed: nextData.homePlayed ?? previousData.homePlayed,
    homeWins: nextData.homeWins ?? previousData.homeWins,
    homeDraws: nextData.homeDraws ?? previousData.homeDraws,
    homeLosses: nextData.homeLosses ?? previousData.homeLosses,
    awayPlayed: nextData.awayPlayed ?? previousData.awayPlayed,
    awayWins: nextData.awayWins ?? previousData.awayWins,
    awayDraws: nextData.awayDraws ?? previousData.awayDraws,
    awayLosses: nextData.awayLosses ?? previousData.awayLosses,
    expectedGoalsFor: nextData.expectedGoalsFor ?? previousData.expectedGoalsFor,
    pointsByVenue: {
      home: nextData.pointsByVenue.home ?? previousData.pointsByVenue.home,
      away: nextData.pointsByVenue.away ?? previousData.pointsByVenue.away,
    },
    goalsForPerMatch: nextData.goalsForPerMatch ?? previousData.goalsForPerMatch,
    goalsAgainstPerMatch: nextData.goalsAgainstPerMatch ?? previousData.goalsAgainstPerMatch,
    cleanSheets: nextData.cleanSheets ?? previousData.cleanSheets,
    failedToScore: nextData.failedToScore ?? previousData.failedToScore,
    comparisonMetrics:
      nextData.comparisonMetrics.length > 0
        ? nextData.comparisonMetrics
        : previousData.comparisonMetrics,
    goalBreakdown: nextData.goalBreakdown.length > 0 ? nextData.goalBreakdown : previousData.goalBreakdown,
  };
}

function mergeTeamStatsPlayersData(
  previousData: TeamStatsPlayersData | undefined,
  nextData: TeamStatsPlayersData,
): TeamStatsPlayersData {
  if (!previousData) {
    return nextData;
  }

  const hasNextPlayers = nextData.topPlayers.length > 0;
  const hasNextCategoryPlayers =
    nextData.topPlayersByCategory.ratings.length > 0 ||
    nextData.topPlayersByCategory.scorers.length > 0 ||
    nextData.topPlayersByCategory.assisters.length > 0;

  return {
    topPlayers: hasNextPlayers ? nextData.topPlayers : previousData.topPlayers,
    topPlayersByCategory: hasNextCategoryPlayers
      ? nextData.topPlayersByCategory
      : previousData.topPlayersByCategory,
  };
}

function mergeTeamStatsAdvancedData(
  previousData: TeamStatsAdvancedData | undefined,
  nextData: TeamStatsAdvancedData,
): TeamStatsAdvancedData {
  if (!previousData) {
    return nextData;
  }

  return {
    comparisonMetrics:
      nextData.comparisonMetrics.length > 0
        ? nextData.comparisonMetrics
        : previousData.comparisonMetrics,
    expectedGoalsFor: nextData.expectedGoalsFor ?? previousData.expectedGoalsFor,
    sourceUpdatedAt: nextData.sourceUpdatedAt ?? previousData.sourceUpdatedAt,
  };
}

type FetchTeamStatsCoreDataParams = {
  teamId: string;
  leagueId: string | null;
  season: number | null;
  signal?: AbortSignal;
};

export async function fetchTeamStatsCoreData({
  teamId,
  leagueId,
  season,
  signal,
}: FetchTeamStatsCoreDataParams): Promise<TeamStatsCoreData> {
  if (!teamId || !leagueId || typeof season !== 'number') {
    const { topPlayers, topPlayersByCategory, ...emptyCore } = EMPTY_TEAM_STATS;
    return emptyCore;
  }

  const [statisticsResult, standingsResult] = await Promise.allSettled([
    fetchTeamStatistics(leagueId, season, teamId, signal),
    fetchLeagueStandings(leagueId, season, signal),
  ]);

  if (statisticsResult.status === 'rejected' && isAbortError(statisticsResult.reason)) {
    throw statisticsResult.reason;
  }
  if (standingsResult.status === 'rejected' && isAbortError(standingsResult.reason)) {
    throw standingsResult.reason;
  }

  const statisticsPayload = statisticsResult.status === 'fulfilled' ? statisticsResult.value : null;
  const standingsPayload = standingsResult.status === 'fulfilled' ? standingsResult.value : null;

  if (statisticsPayload === null && standingsPayload === null) {
    const coreError =
      statisticsResult.status === 'rejected'
        ? statisticsResult.reason
        : standingsResult.status === 'rejected'
          ? standingsResult.reason
          : null;

    throw coreError instanceof Error
      ? coreError
      : new Error('Unable to load team statistics core datasets');
  }

  const standings = mapStandingsToTeamData(standingsPayload, teamId);
  const mappedStats = mapTeamStatisticsToStats(
    statisticsPayload,
    standings,
    [],
    EMPTY_TEAM_STATS_PLAYERS.topPlayersByCategory,
    null,
  );
  const { topPlayers, topPlayersByCategory, ...coreData } = mappedStats;
  return coreData;
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

  const coreQuery = useQuery<TeamStatsCoreData>({
    queryKey: queryKeys.teams.statsCore(teamId, leagueId, season),
    enabled: isCoreEnabled,
    refetchOnMount: false,
    placeholderData: previousData => previousData,
    structuralSharing: (oldData, newData) =>
      mergeTeamStatsCoreData(oldData as TeamStatsCoreData | undefined, newData as TeamStatsCoreData),
    ...featureQueryOptions.teams.statsCore,
    queryFn: ({ signal }) =>
      fetchTeamStatsCoreData({
        teamId,
        leagueId,
        season,
        signal,
      }),
  });

  const enrichmentEnabled = isCoreEnabled && Boolean(coreQuery.data);

  const playersQuery = useQuery<TeamStatsPlayersData>({
    queryKey: queryKeys.teams.statsPlayers(teamId, leagueId, season),
    enabled: enrichmentEnabled,
    refetchOnMount: false,
    placeholderData: previousData => previousData,
    structuralSharing: (oldData, newData) =>
      mergeTeamStatsPlayersData(
        oldData as TeamStatsPlayersData | undefined,
        newData as TeamStatsPlayersData,
      ),
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
    placeholderData: previousData => previousData,
    structuralSharing: (oldData, newData) =>
      mergeTeamStatsAdvancedData(
        oldData as TeamStatsAdvancedData | undefined,
        newData as TeamStatsAdvancedData,
      ),
    ...featureQueryOptions.teams.statsAdvanced,
    queryFn: ({ signal }) =>
      fetchTeamStatsAdvancedData({
        teamId,
        leagueId,
        season,
        signal,
      }),
  });

  const data = useMemo(() => {
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
  }, [advancedQuery.data, coreQuery.data, playersQuery.data]);

  return {
    data,
    coreData: coreQuery.data,
    playersData: playersQuery.data,
    advancedData: advancedQuery.data,
    coreUpdatedAt: coreQuery.dataUpdatedAt,
    playersUpdatedAt: playersQuery.dataUpdatedAt,
    advancedUpdatedAt: advancedQuery.dataUpdatedAt,
    isLoading: coreQuery.isLoading && !coreQuery.data,
    isFetching: coreQuery.isFetching || playersQuery.isFetching || advancedQuery.isFetching,
    isError: coreQuery.isError && !coreQuery.data,
    isFetched: coreQuery.isFetched,
    isFetchedAfterMount: coreQuery.isFetchedAfterMount,
    dataUpdatedAt: Math.max(
      coreQuery.dataUpdatedAt,
      playersQuery.dataUpdatedAt,
      advancedQuery.dataUpdatedAt,
    ),
    isCoreLoading: coreQuery.isLoading && !coreQuery.data,
    isPlayersLoading: playersQuery.isLoading && !playersQuery.data,
    isAdvancedLoading: advancedQuery.isLoading && !advancedQuery.data,
    isPlayersFetching: playersQuery.isFetching,
    isAdvancedFetching: advancedQuery.isFetching,
    isPlayersError: playersQuery.isError && !playersQuery.data,
    isAdvancedError: advancedQuery.isError && !advancedQuery.data,
    refetch: async () => {
      await Promise.allSettled([
        coreQuery.refetch(),
        playersQuery.refetch(),
        advancedQuery.refetch(),
      ]);
    },
  };
}
