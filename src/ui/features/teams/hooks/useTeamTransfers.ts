import { useQuery } from '@tanstack/react-query';

import { fetchTeamTransfers } from '@data/endpoints/teamsApi';
import { mapTransfersToTeamTransfers } from '@data/mappers/teamsMapper';
import type { TeamTransfersData } from '@ui/features/teams/types/teams.types';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';

type UseTeamTransfersParams = {
  teamId: string;
  season: number | null;
  enabled?: boolean;
};

const EMPTY_TEAM_TRANSFERS: TeamTransfersData = {
  arrivals: [],
  departures: [],
};

type FetchTeamTransfersDataParams = {
  teamId: string;
  season: number | null;
  signal?: AbortSignal;
};

export async function fetchTeamTransfersData({
  teamId,
  season,
  signal,
}: FetchTeamTransfersDataParams): Promise<TeamTransfersData> {
  if (!teamId) {
    return EMPTY_TEAM_TRANSFERS;
  }

  const payload = await fetchTeamTransfers(teamId, season, signal);
  return mapTransfersToTeamTransfers(payload, teamId, season);
}

export function useTeamTransfers({ teamId, season, enabled = true }: UseTeamTransfersParams) {
  return useQuery<TeamTransfersData>({
    queryKey: queryKeys.teams.transfers(teamId, season),
    enabled: enabled && Boolean(teamId),
    placeholderData: previousData => previousData,
    ...featureQueryOptions.teams.transfers,
    queryFn: ({ signal }) =>
      fetchTeamTransfersData({
        teamId,
        season,
        signal,
      }),
  });
}
