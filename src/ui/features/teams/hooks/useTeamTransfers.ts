import { useMemo } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { isHydrationSectionLoading } from '@domain/contracts/fullPayloadHydration.types';
import { mapTransfersToTeamTransfers } from '@data/mappers/teamsMapper';
import { fetchTeamTransfersData } from '@data/teams/teamQueryData';
import {
  useTeamFull,
} from '@ui/features/teams/hooks/useTeamFull';
import type { TeamTransfersData } from '@ui/features/teams/types/teams.types';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';

type UseTeamTransfersParams = {
  teamId: string;
  season: number | null;
  enabled?: boolean;
};

export function useTeamTransfers({
  teamId,
  season,
  enabled = true,
}: UseTeamTransfersParams): UseQueryResult<TeamTransfersData> {
  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris',
    [],
  );
  const teamFullQuery = useTeamFull({
    teamId,
    timezone,
    enabled,
  });
  const canUseFullPayload =
    teamFullQuery.isFullEnabled && Boolean(teamFullQuery.data);
  const isFullTransfersSectionLoading =
    canUseFullPayload && isHydrationSectionLoading(teamFullQuery.hydration, 'transfers');
  const fullTransfers = useMemo(
    () =>
      canUseFullPayload && !isFullTransfersSectionLoading
        ? mapTransfersToTeamTransfers(teamFullQuery.data?.transfers.response ?? [], teamId, season)
        : { arrivals: [], departures: [] },
    [
      canUseFullPayload,
      isFullTransfersSectionLoading,
      season,
      teamFullQuery.data?.transfers.response,
      teamId,
    ],
  );

  const query = useQuery<TeamTransfersData>({
    queryKey: queryKeys.teams.transfers(teamId, season),
    enabled: enabled && Boolean(teamId) && !canUseFullPayload,
    placeholderData: previousData => previousData,
    ...featureQueryOptions.teams.transfers,
    queryFn: ({ signal }) =>
      fetchTeamTransfersData({
        teamId,
        season,
        signal,
      }),
  });

  return canUseFullPayload
    ? {
        ...query,
        data: fullTransfers,
        isLoading: (teamFullQuery.isLoading && !teamFullQuery.data) || isFullTransfersSectionLoading,
        isFetching: teamFullQuery.isFetching || isFullTransfersSectionLoading,
        isError: teamFullQuery.isError && !teamFullQuery.data,
        isFetched: teamFullQuery.isFetched,
        isFetchedAfterMount: teamFullQuery.isFetchedAfterMount,
        dataUpdatedAt: teamFullQuery.dataUpdatedAt,
        refetch: teamFullQuery.refetch,
      } as unknown as UseQueryResult<TeamTransfersData>
    : query;
}
