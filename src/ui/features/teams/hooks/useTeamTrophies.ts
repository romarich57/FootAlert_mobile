import { useQuery } from '@tanstack/react-query';

import { fetchTeamTrophies } from '@data/endpoints/teamsApi';
import { mapTrophiesToTeamTrophies } from '@data/mappers/teamsMapper';
import type { TeamTrophiesData } from '@ui/features/teams/types/teams.types';

type UseTeamTrophiesParams = {
  teamId: string;
  enabled?: boolean;
};

export const TEAM_TROPHIES_QUERY_KEY = 'team_trophies';

const EMPTY_TEAM_TROPHIES: TeamTrophiesData = {
  groups: [],
  total: 0,
  totalWins: 0,
};

export function useTeamTrophies({ teamId, enabled = true }: UseTeamTrophiesParams) {
  return useQuery({
    queryKey: [TEAM_TROPHIES_QUERY_KEY, teamId],
    enabled: enabled && Boolean(teamId),
    staleTime: 60 * 60_000,
    queryFn: async ({ signal }): Promise<TeamTrophiesData> => {
      if (!teamId) {
        return EMPTY_TEAM_TROPHIES;
      }

      const payload = await fetchTeamTrophies(teamId, signal);
      return mapTrophiesToTeamTrophies(payload);
    },
  });
}
