import { useMemo } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { mapStandingsToTeamData } from '@data/mappers/teamsMapper';
import { fetchTeamStandingsData } from '@data/teams/teamQueryData';
import {
  useTeamFull,
} from '@ui/features/teams/hooks/useTeamFull';
import type { TeamStandingsData } from '@ui/features/teams/types/teams.types';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';

type UseTeamStandingsParams = {
  teamId: string;
  leagueId: string | null;
  season: number | null;
  timezone?: string;
  enabled?: boolean;
};

export function useTeamStandings({
  teamId,
  leagueId,
  season,
  timezone = 'Europe/Paris',
  enabled = true,
}: UseTeamStandingsParams) {
  const teamFullQuery = useTeamFull({
    teamId,
    timezone,
    leagueId,
    season,
    enabled,
  });

  const canUseFullPayload =
    teamFullQuery.isFullEnabled && Boolean(teamFullQuery.data);

  const standaloneQuery = useQuery<TeamStandingsData>({
    queryKey: queryKeys.teams.standings(teamId, leagueId, season),
    enabled: enabled && !canUseFullPayload && Boolean(teamId) && Boolean(leagueId) && typeof season === 'number',
    refetchOnMount: false,
    ...featureQueryOptions.teams.standings,
    queryFn: ({ signal }) =>
      fetchTeamStandingsData({
        teamId,
        leagueId,
        season,
        signal,
      }),
  });

  const fullStandingsData = useMemo(() => {
    if (!canUseFullPayload) return undefined;
    return mapStandingsToTeamData(
      teamFullQuery.data?.standings?.response ?? null,
      teamId,
    );
  }, [canUseFullPayload, teamFullQuery.data?.standings?.response, teamId]);

  if (canUseFullPayload && fullStandingsData) {
    return {
      ...standaloneQuery,
      data: fullStandingsData,
      isLoading: false as const,
      isFetching: teamFullQuery.isFetching,
      isError: false as const,
      isPending: false as const,
      isSuccess: true as const,
      isFetched: true,
      status: 'success' as const,
      dataUpdatedAt: teamFullQuery.dataUpdatedAt,
    } as UseQueryResult<TeamStandingsData>;
  }

  return standaloneQuery;
}
