import { useQuery } from '@tanstack/react-query';

import { fetchLeagueStandings } from '@data/endpoints/teamsApi';
import { mapStandingsToTeamData } from '@data/mappers/teamsMapper';
import type { TeamStandingsData } from '@ui/features/teams/types/teams.types';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';

type UseTeamStandingsParams = {
  teamId: string;
  leagueId: string | null;
  season: number | null;
  enabled?: boolean;
};

const EMPTY_TEAM_STANDINGS: TeamStandingsData = {
  groups: [],
};

export function useTeamStandings({
  teamId,
  leagueId,
  season,
  enabled = true,
}: UseTeamStandingsParams) {
  return useQuery({
    queryKey: queryKeys.teams.standings(teamId, leagueId, season),
    enabled: enabled && Boolean(teamId) && Boolean(leagueId) && typeof season === 'number',
    ...featureQueryOptions.teams.standings,
    queryFn: async ({ signal }): Promise<TeamStandingsData> => {
      if (!teamId || !leagueId || typeof season !== 'number') {
        return EMPTY_TEAM_STANDINGS;
      }

      const payload = await fetchLeagueStandings(leagueId, season, signal);
      return mapStandingsToTeamData(payload, teamId);
    },
  });
}
