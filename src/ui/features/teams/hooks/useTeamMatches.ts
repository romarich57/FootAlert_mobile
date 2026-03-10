import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { mapFixturesToTeamMatches } from '@data/mappers/teamsMapper';
import { fetchTeamMatchesData } from '@data/teams/teamQueryData';
import {
  doesTeamFullSelectionMatch,
  useTeamFull,
} from '@ui/features/teams/hooks/useTeamFull';
import type { TeamMatchesData } from '@ui/features/teams/types/teams.types';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';

type UseTeamMatchesParams = {
  teamId: string;
  leagueId: string | null;
  season: number | null;
  timezone: string;
  enabled?: boolean;
};

export function useTeamMatches({
  teamId,
  leagueId,
  season,
  timezone,
  enabled = true,
}: UseTeamMatchesParams): UseQueryResult<TeamMatchesData> {
  const teamFullQuery = useTeamFull({
    teamId,
    timezone,
    leagueId,
    season,
    enabled,
  });
  const canUseFullPayload =
    teamFullQuery.isFullEnabled &&
    doesTeamFullSelectionMatch(teamFullQuery.data, leagueId, season);

  const query = useQuery<TeamMatchesData>({
    queryKey: queryKeys.teams.matches(teamId, leagueId, season, timezone),
    enabled:
      enabled &&
      Boolean(teamId) &&
      Boolean(leagueId) &&
      typeof season === 'number' &&
      !canUseFullPayload,
    refetchOnMount: false,
    ...featureQueryOptions.teams.matches,
    queryFn: ({ signal }) =>
      fetchTeamMatchesData({
        teamId,
        leagueId,
        season,
        timezone,
        signal,
      }),
  });

  if (!canUseFullPayload) {
    return query;
  }

  return {
    ...query,
    data: mapFixturesToTeamMatches(teamFullQuery.data?.matches.response ?? []),
    isLoading: teamFullQuery.isLoading && !teamFullQuery.data,
    isFetching: teamFullQuery.isFetching,
    isError: teamFullQuery.isError && !teamFullQuery.data,
    isFetched: teamFullQuery.isFetched,
    isFetchedAfterMount: teamFullQuery.isFetchedAfterMount,
    dataUpdatedAt: teamFullQuery.dataUpdatedAt,
    refetch: teamFullQuery.refetch,
  } as unknown as UseQueryResult<TeamMatchesData>;
}
