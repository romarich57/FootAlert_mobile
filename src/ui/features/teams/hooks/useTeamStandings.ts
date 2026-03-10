import { useQuery } from '@tanstack/react-query';

import { fetchTeamStandingsData } from '@data/teams/teamQueryData';
import type { TeamStandingsData } from '@ui/features/teams/types/teams.types';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';

type UseTeamStandingsParams = {
  teamId: string;
  leagueId: string | null;
  season: number | null;
  enabled?: boolean;
};

export function useTeamStandings({
  teamId,
  leagueId,
  season,
  enabled = true,
}: UseTeamStandingsParams) {
  return useQuery<TeamStandingsData>({
    queryKey: queryKeys.teams.standings(teamId, leagueId, season),
    enabled: enabled && Boolean(teamId) && Boolean(leagueId) && typeof season === 'number',
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
}
