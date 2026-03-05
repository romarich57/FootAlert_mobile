import { useQuery } from '@tanstack/react-query';

import { fetchTeamFixtures } from '@data/endpoints/teamsApi';
import { mapFixturesToTeamMatches } from '@data/mappers/teamsMapper';
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

const EMPTY_TEAM_MATCHES: TeamMatchesData = {
  all: [],
  upcoming: [],
  live: [],
  past: [],
};

type FetchTeamMatchesDataParams = {
  teamId: string;
  leagueId: string | null;
  season: number | null;
  timezone: string;
  signal?: AbortSignal;
};

export async function fetchTeamMatchesData({
  teamId,
  leagueId,
  season,
  timezone,
  signal,
}: FetchTeamMatchesDataParams): Promise<TeamMatchesData> {
  if (!teamId || !leagueId || typeof season !== 'number') {
    return EMPTY_TEAM_MATCHES;
  }

  const payload = await fetchTeamFixtures(
    {
      teamId,
      leagueId,
      season,
      timezone,
    },
    signal,
  );

  return mapFixturesToTeamMatches(payload);
}

export function useTeamMatches({
  teamId,
  leagueId,
  season,
  timezone,
  enabled = true,
}: UseTeamMatchesParams) {
  return useQuery<TeamMatchesData>({
    queryKey: queryKeys.teams.matches(teamId, leagueId, season, timezone),
    enabled: enabled && Boolean(teamId) && Boolean(leagueId) && typeof season === 'number',
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
}
