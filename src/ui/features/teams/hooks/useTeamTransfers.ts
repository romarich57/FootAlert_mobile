import { useQuery } from '@tanstack/react-query';

import { fetchTeamTransfers } from '@data/endpoints/teamsApi';
import { mapTransfersToTeamTransfers } from '@data/mappers/teamsMapper';
import type { TeamTransfersData } from '@ui/features/teams/types/teams.types';

type UseTeamTransfersParams = {
  teamId: string;
  season: number | null;
  enabled?: boolean;
};

export const TEAM_TRANSFERS_QUERY_KEY = 'team_transfers';

const EMPTY_TEAM_TRANSFERS: TeamTransfersData = {
  arrivals: [],
  departures: [],
};

export function useTeamTransfers({ teamId, season, enabled = true }: UseTeamTransfersParams) {
  return useQuery({
    queryKey: [TEAM_TRANSFERS_QUERY_KEY, teamId, season],
    enabled: enabled && Boolean(teamId),
    staleTime: 2 * 60_000,
    queryFn: async ({ signal }): Promise<TeamTransfersData> => {
      if (!teamId) {
        return EMPTY_TEAM_TRANSFERS;
      }

      const payload = await fetchTeamTransfers(teamId, signal);
      return mapTransfersToTeamTransfers(payload, teamId, season);
    },
  });
}
