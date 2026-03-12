import { useMemo } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { mapSquadToTeamSquad } from '@data/mappers/teamsMapper';
import { fetchTeamSquadData } from '@data/teams/teamQueryData';
import { useTeamFull } from '@ui/features/teams/hooks/useTeamFull';
import type { TeamSquadData } from '@ui/features/teams/types/teams.types';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';

type UseTeamSquadParams = {
  teamId: string;
  enabled?: boolean;
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

export function useTeamSquad({
  teamId,
  enabled = true,
}: UseTeamSquadParams): UseQueryResult<TeamSquadData> {
  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris',
    [],
  );
  const teamFullQuery = useTeamFull({
    teamId,
    timezone,
    enabled,
  });
  const canUseFullPayload = teamFullQuery.isFullEnabled && Boolean(teamFullQuery.data);
  const fullSquadData = useMemo(
    () =>
      canUseFullPayload
        ? mapSquadToTeamSquad(teamFullQuery.data?.squad.response[0] ?? null)
        : { coach: null, players: [] },
    [canUseFullPayload, teamFullQuery.data?.squad.response],
  );

  const query = useQuery<TeamSquadData>({
    queryKey: queryKeys.teams.squad(teamId),
    enabled: enabled && Boolean(teamId) && !canUseFullPayload,
    placeholderData: previousData => previousData,
    structuralSharing: (oldData, newData) =>
      mergeTeamSquadData(oldData as TeamSquadData | undefined, newData as TeamSquadData),
    ...featureQueryOptions.teams.squad,
    queryFn: ({ signal }) =>
      fetchTeamSquadData({
        teamId,
        signal,
      }),
  });

  return canUseFullPayload
    ? {
        ...query,
        data: fullSquadData,
        isLoading: teamFullQuery.isLoading && !teamFullQuery.data,
        isFetching: teamFullQuery.isFetching,
        isError: teamFullQuery.isError && !teamFullQuery.data,
        isFetched: teamFullQuery.isFetched,
        isFetchedAfterMount: teamFullQuery.isFetchedAfterMount,
        dataUpdatedAt: teamFullQuery.dataUpdatedAt,
        refetch: teamFullQuery.refetch,
      } as unknown as UseQueryResult<TeamSquadData>
    : query;
}
