import { useQuery } from '@tanstack/react-query';

import {
  fetchLeagueStandings,
  fetchTeamPlayers,
  fetchTeamStatistics,
} from '@data/endpoints/teamsApi';
import {
  mapPlayersToTopPlayers,
  mapStandingsToTeamData,
  mapTeamStatisticsToStats,
} from '@data/mappers/teamsMapper';
import type { TeamStatsData } from '@ui/features/teams/types/teams.types';

type UseTeamStatsParams = {
  teamId: string;
  leagueId: string | null;
  season: number | null;
  enabled?: boolean;
};

export const TEAM_STATS_QUERY_KEY = 'team_stats';

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
  goalBreakdown: [],
  topPlayers: [],
};

export function useTeamStats({
  teamId,
  leagueId,
  season,
  enabled = true,
}: UseTeamStatsParams) {
  return useQuery({
    queryKey: [TEAM_STATS_QUERY_KEY, teamId, leagueId, season],
    enabled: enabled && Boolean(teamId) && Boolean(leagueId) && typeof season === 'number',
    staleTime: 60_000,
    queryFn: async ({ signal }): Promise<TeamStatsData> => {
      if (!teamId || !leagueId || typeof season !== 'number') {
        return EMPTY_TEAM_STATS;
      }

      const [statisticsPayload, standingsPayload, playersPayload] = await Promise.all([
        fetchTeamStatistics(leagueId, season, teamId, signal),
        fetchLeagueStandings(leagueId, season, signal),
        fetchTeamPlayers(
          {
            teamId,
            leagueId,
            season,
            page: 1,
          },
          signal,
        ),
      ]);

      const standings = mapStandingsToTeamData(standingsPayload, teamId);
      const topPlayers = mapPlayersToTopPlayers(
        playersPayload.response ?? [],
        8,
        { teamId, leagueId, season },
      );

      return mapTeamStatisticsToStats(statisticsPayload, standings, topPlayers);
    },
  });
}
