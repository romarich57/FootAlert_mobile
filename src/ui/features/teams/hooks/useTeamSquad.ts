import { useQuery } from '@tanstack/react-query';

import { fetchTeamSquad } from '@data/endpoints/teamsApi';
import { mapSquadToTeamSquad } from '@data/mappers/teamsMapper';
import type { TeamSquadData } from '@ui/features/teams/types/teams.types';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';

type UseTeamSquadParams = {
  teamId: string;
  enabled?: boolean;
};

const EMPTY_TEAM_SQUAD: TeamSquadData = {
  coach: null,
  players: [],
};

export function useTeamSquad({ teamId, enabled = true }: UseTeamSquadParams) {
  return useQuery({
    queryKey: queryKeys.teams.squad(teamId),
    enabled: enabled && Boolean(teamId),
    placeholderData: previousData => previousData,
    ...featureQueryOptions.teams.squad,
    queryFn: async ({ signal }): Promise<TeamSquadData> => {
      if (!teamId) {
        return EMPTY_TEAM_SQUAD;
      }

      const payload = await fetchTeamSquad(teamId, signal);
      return mapSquadToTeamSquad(payload);
    },
  });
}
