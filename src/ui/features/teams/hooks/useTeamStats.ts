import { useQuery } from '@tanstack/react-query';

import {
  fetchTeamAdvancedStats,
  fetchLeagueStandings,
  fetchTeamPlayers,
  fetchTeamStatistics,
} from '@data/endpoints/teamsApi';
import {
  mapPlayersToTopPlayers,
  mapPlayersToTopPlayersByCategory,
  mapStandingsToTeamData,
  mapTeamStatisticsToStats,
} from '@data/mappers/teamsMapper';
import type { TeamApiPlayerDto, TeamStatsData } from '@ui/features/teams/types/teams.types';
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

async function fetchAllTeamPlayers(
  teamId: string,
  leagueId: string,
  season: number,
  signal?: AbortSignal,
): Promise<TeamApiPlayerDto[]> {
  const firstPage = await fetchTeamPlayers(
    {
      teamId,
      leagueId,
      season,
      page: 1,
    },
    signal,
  );

  const totalPages = Math.max(1, firstPage.paging?.total ?? 1);
  if (totalPages <= 1) {
    return firstPage.response ?? [];
  }

  const nextPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      fetchTeamPlayers(
        {
          teamId,
          leagueId,
          season,
          page: index + 2,
        },
        signal,
      ),
    ),
  );

  return [firstPage, ...nextPages].flatMap(page => page.response ?? []);
}

export function useTeamStats({
  teamId,
  leagueId,
  season,
  enabled = true,
}: UseTeamStatsParams) {
  return useQuery({
    queryKey: queryKeys.teams.stats(teamId, leagueId, season),
    enabled: enabled && Boolean(teamId) && Boolean(leagueId) && typeof season === 'number',
    ...featureQueryOptions.teams.stats,
    queryFn: async ({ signal }): Promise<TeamStatsData> => {
      if (!teamId || !leagueId || typeof season !== 'number') {
        return EMPTY_TEAM_STATS;
      }

      const [statisticsResult, standingsResult, playersResult, advancedStatsResult] =
        await Promise.allSettled([
          fetchTeamStatistics(leagueId, season, teamId, signal),
          fetchLeagueStandings(leagueId, season, signal),
          fetchAllTeamPlayers(teamId, leagueId, season, signal),
          fetchTeamAdvancedStats(leagueId, season, teamId, signal),
        ]);

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
    },
  });
}
