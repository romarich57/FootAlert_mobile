import { useQuery } from '@tanstack/react-query';

import { fetchTeamFixtures } from '@data/endpoints/teamsApi';
import { mapFixturesToTeamMatches } from '@data/mappers/teamsMapper';
import type { TeamMatchesData } from '@ui/features/teams/types/teams.types';

type UseTeamMatchesParams = {
  teamId: string;
  leagueId: string | null;
  season: number | null;
  timezone: string;
  enabled?: boolean;
};

export const TEAM_MATCHES_QUERY_KEY = 'team_matches';

const EMPTY_TEAM_MATCHES: TeamMatchesData = {
  all: [],
  upcoming: [],
  live: [],
  past: [],
};

export function useTeamMatches({
  teamId,
  leagueId,
  season,
  timezone,
  enabled = true,
}: UseTeamMatchesParams) {
  return useQuery({
    queryKey: [TEAM_MATCHES_QUERY_KEY, teamId, leagueId, season, timezone],
    enabled: enabled && Boolean(teamId) && Boolean(leagueId) && typeof season === 'number',
    staleTime: 30_000,
    queryFn: async ({ signal }): Promise<TeamMatchesData> => {
      if (!teamId || !leagueId || typeof season !== 'number') {
        return EMPTY_TEAM_MATCHES;
      }

      const payload = await fetchTeamFixtures(
        {
          teamId,
          leagueId,
          season,
          timezone,
        },
        signal,
      );

      return mapFixturesToTeamMatches(payload);
    },
  });
}
