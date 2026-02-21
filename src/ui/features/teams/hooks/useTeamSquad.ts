import { useQuery } from '@tanstack/react-query';

import { fetchTeamSquad } from '@data/endpoints/teamsApi';
import { mapSquadToTeamSquad } from '@data/mappers/teamsMapper';
import type { TeamSquadData } from '@ui/features/teams/types/teams.types';

type UseTeamSquadParams = {
  teamId: string;
  enabled?: boolean;
};

export const TEAM_SQUAD_QUERY_KEY = 'team_squad';

const EMPTY_TEAM_SQUAD: TeamSquadData = {
  coach: null,
  players: [],
};

export function useTeamSquad({ teamId, enabled = true }: UseTeamSquadParams) {
  return useQuery({
    queryKey: [TEAM_SQUAD_QUERY_KEY, teamId],
    enabled: enabled && Boolean(teamId),
    staleTime: 10 * 60_000,
    queryFn: async ({ signal }): Promise<TeamSquadData> => {
      if (!teamId) {
        return EMPTY_TEAM_SQUAD;
      }

      const payload = await fetchTeamSquad(teamId, signal);
      return mapSquadToTeamSquad(payload);
    },
  });
}
