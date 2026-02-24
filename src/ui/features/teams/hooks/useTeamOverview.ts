import { useQuery } from '@tanstack/react-query';

import {
  fetchLeagueStandings,
  fetchTeamFixtures,
  fetchTeamNextFixture,
  fetchTeamStatistics,
  fetchTeamTrophies,
} from '@data/endpoints/teamsApi';
import {
  findTeamStandingRow,
  mapFixtureToTeamMatch,
  mapFixturesToTeamMatches,
  mapRecentTeamForm,
  mapStandingsToTeamData,
  mapTeamStatisticsToStats,
  mapTrophiesToTeamTrophies,
} from '@data/mappers/teamsMapper';
import type { TeamOverviewData } from '@ui/features/teams/types/teams.types';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';

type UseTeamOverviewParams = {
  teamId: string;
  leagueId: string | null;
  season: number | null;
  timezone: string;
  enabled?: boolean;
};

const EMPTY_OVERVIEW: TeamOverviewData = {
  nextMatch: null,
  recentForm: [],
  rank: null,
  points: null,
  played: null,
  goalDiff: null,
  wins: null,
  draws: null,
  losses: null,
  scored: null,
  conceded: null,
  trophiesCount: null,
  trophyWinsCount: null,
};

export function useTeamOverview({
  teamId,
  leagueId,
  season,
  timezone,
  enabled = true,
}: UseTeamOverviewParams) {
  return useQuery({
    queryKey: queryKeys.teams.overview(teamId, leagueId, season, timezone),
    enabled: enabled && Boolean(teamId) && Boolean(leagueId) && typeof season === 'number',
    ...featureQueryOptions.teams.overview,
    queryFn: async ({ signal }): Promise<TeamOverviewData> => {
      if (!teamId || !leagueId || typeof season !== 'number') {
        return EMPTY_OVERVIEW;
      }

      const [fixturesPayload, nextFixturePayload, standingsPayload, statsPayload, trophiesPayload] =
        await Promise.all([
          fetchTeamFixtures(
            {
              teamId,
              leagueId,
              season,
              timezone,
            },
            signal,
          ),
          fetchTeamNextFixture(teamId, timezone, signal),
          fetchLeagueStandings(leagueId, season, signal),
          fetchTeamStatistics(leagueId, season, teamId, signal),
          fetchTeamTrophies(teamId, signal),
        ]);

      const matchesData = mapFixturesToTeamMatches(fixturesPayload);
      const standings = mapStandingsToTeamData(standingsPayload, teamId);
      const standingRow = findTeamStandingRow(standings);
      const stats = mapTeamStatisticsToStats(statsPayload, standings, []);
      const trophies = mapTrophiesToTeamTrophies(trophiesPayload);

      return {
        nextMatch: nextFixturePayload
          ? mapFixtureToTeamMatch(nextFixturePayload)
          : matchesData.upcoming[0] ?? null,
        recentForm: mapRecentTeamForm(matchesData.past, teamId, 5),
        rank: standingRow?.rank ?? stats.rank,
        points: standingRow?.points ?? stats.points,
        played: standingRow?.played ?? stats.played,
        goalDiff: standingRow?.goalDiff ?? null,
        wins: stats.wins,
        draws: stats.draws,
        losses: stats.losses,
        scored: stats.goalsFor,
        conceded: stats.goalsAgainst,
        trophiesCount: trophies.total,
        trophyWinsCount: trophies.totalWins,
      };
    },
  });
}
