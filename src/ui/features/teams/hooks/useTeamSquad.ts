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

function mergeTeamSquadData(
  previousData: TeamSquadData | undefined,
  nextData: TeamSquadData,
): TeamSquadData {
  if (!previousData) {
    return nextData;
  }

  return {
    coach: nextData.coach ?? previousData.coach,
    players: nextData.players.length > 0 ? nextData.players : previousData.players,
  };
}

export function useTeamSquad({ teamId, enabled = true }: UseTeamSquadParams) {
  return useQuery<TeamSquadData>({
    queryKey: queryKeys.teams.squad(teamId),
    enabled: enabled && Boolean(teamId),
    placeholderData: previousData => previousData,
    structuralSharing: (oldData, newData) =>
      mergeTeamSquadData(oldData as TeamSquadData | undefined, newData as TeamSquadData),
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
