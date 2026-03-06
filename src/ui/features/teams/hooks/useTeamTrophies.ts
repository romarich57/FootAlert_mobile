import { useQuery } from '@tanstack/react-query';

import { fetchTeamTrophies } from '@data/endpoints/teamsApi';
import { mapTrophiesToTeamTrophies } from '@data/mappers/teamsMapper';
import type { TeamTrophiesData } from '@ui/features/teams/types/teams.types';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';

type UseTeamTrophiesParams = {
  teamId: string;
  enabled?: boolean;
};

const EMPTY_TEAM_TROPHIES: TeamTrophiesData = {
  groups: [],
  total: 0,
  totalWins: 0,
};

export function useTeamTrophies({ teamId, enabled = true }: UseTeamTrophiesParams) {
  return useQuery<TeamTrophiesData>({
    queryKey: queryKeys.teams.trophies(teamId),
    enabled: enabled && Boolean(teamId),
    ...featureQueryOptions.teams.trophies,
    queryFn: async ({ signal }): Promise<TeamTrophiesData> => {
      if (!teamId) {
        return EMPTY_TEAM_TROPHIES;
      }

      const payload = await fetchTeamTrophies(teamId, signal);
      return mapTrophiesToTeamTrophies(payload);
    },
  });
}
