import { useQuery } from '@tanstack/react-query';

import {
  fetchTeamAdvancedStats,
  fetchLeagueStandings,
  fetchTeamStatistics,
} from '@data/endpoints/teamsApi';
import {
  mapPlayersToTopPlayers,
  mapPlayersToTopPlayersByCategory,
  mapStandingsToTeamData,
  mapTeamStatisticsToStats,
} from '@data/mappers/teamsMapper';
import type { TeamStatsData } from '@ui/features/teams/types/teams.types';
import { fetchAllTeamPlayers } from '@ui/features/teams/utils/fetchAllTeamPlayers';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';

type UseTeamStatsParams = {
  teamId: string;
  leagueId: string | null;
  season: number | null;
  enabled?: boolean;
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

function isAbortError(error: unknown): error is Error {
  return error instanceof Error && error.name === 'AbortError';
}

function findAbortError(results: ReadonlyArray<PromiseSettledResult<unknown>>): Error | null {
  for (const result of results) {
    if (result.status === 'rejected' && isAbortError(result.reason)) {
      return result.reason;
    }
  }

  return null;
}

function mergeTeamStatsData(
  previousData: TeamStatsData | undefined,
  nextData: TeamStatsData,
): TeamStatsData {
  if (!previousData) {
    return nextData;
  }

  const hasNextTopPlayers = nextData.topPlayers.length > 0;
  const hasNextCategoryPlayers =
    nextData.topPlayersByCategory.ratings.length > 0 ||
    nextData.topPlayersByCategory.scorers.length > 0 ||
    nextData.topPlayersByCategory.assisters.length > 0;
  const hasNextComparisonMetrics = nextData.comparisonMetrics.length > 0;
  const hasNextGoalBreakdown = nextData.goalBreakdown.length > 0;

  return {
    ...nextData,
    topPlayers: hasNextTopPlayers ? nextData.topPlayers : previousData.topPlayers,
    topPlayersByCategory: hasNextCategoryPlayers
      ? nextData.topPlayersByCategory
      : previousData.topPlayersByCategory,
    comparisonMetrics: hasNextComparisonMetrics ? nextData.comparisonMetrics : previousData.comparisonMetrics,
    goalBreakdown: hasNextGoalBreakdown ? nextData.goalBreakdown : previousData.goalBreakdown,
  };
}

type FetchTeamStatsDataParams = {
  teamId: string;
  leagueId: string | null;
  season: number | null;
  signal?: AbortSignal;
};

export async function fetchTeamStatsData({
  teamId,
  leagueId,
  season,
  signal,
}: FetchTeamStatsDataParams): Promise<TeamStatsData> {
  if (!teamId || !leagueId || typeof season !== 'number') {
    return EMPTY_TEAM_STATS;
  }

  const [statisticsResult, standingsResult, playersResult, advancedStatsResult] =
    await Promise.allSettled([
      fetchTeamStatistics(leagueId, season, teamId, signal),
      fetchLeagueStandings(leagueId, season, signal),
      fetchAllTeamPlayers({ teamId, leagueId, season, signal }),
      fetchTeamAdvancedStats(leagueId, season, teamId, signal),
    ]);

  const abortedError = findAbortError([
    statisticsResult,
    standingsResult,
    playersResult,
    advancedStatsResult,
  ]);
  if (abortedError) {
    throw abortedError;
  }

  const statisticsPayload = statisticsResult.status === 'fulfilled' ? statisticsResult.value : null;
  const standingsPayload = standingsResult.status === 'fulfilled' ? standingsResult.value : null;
  const playersPayload = playersResult.status === 'fulfilled' ? playersResult.value : [];
  const advancedStatsPayload = advancedStatsResult.status === 'fulfilled' ? advancedStatsResult.value : null;

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
  const topPlayers = mapPlayersToTopPlayers(playersPayload, 8, {
    teamId,
    leagueId,
    season,
  });
  const topPlayersByCategory = mapPlayersToTopPlayersByCategory(playersPayload, 3, {
    teamId,
    leagueId,
    season,
  });

  return mapTeamStatisticsToStats(
    statisticsPayload,
    standings,
    topPlayers,
    topPlayersByCategory,
    advancedStatsPayload,
  );
}

export function useTeamStats({
  teamId,
  leagueId,
  season,
  enabled = true,
}: UseTeamStatsParams) {
  return useQuery<TeamStatsData>({
    queryKey: queryKeys.teams.stats(teamId, leagueId, season),
    enabled: enabled && Boolean(teamId) && Boolean(leagueId) && typeof season === 'number',
    refetchOnMount: false,
    placeholderData: previousData => previousData,
    structuralSharing: (oldData, newData) =>
      mergeTeamStatsData(oldData as TeamStatsData | undefined, newData as TeamStatsData),
    ...featureQueryOptions.teams.stats,
    queryFn: ({ signal }) =>
      fetchTeamStatsData({
        teamId,
        leagueId,
        season,
        signal,
      }),
  });
}
