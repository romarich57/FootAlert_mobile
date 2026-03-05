import { useQuery } from '@tanstack/react-query';

import { fetchLeagueStandings } from '@data/endpoints/teamsApi';
import { mapStandingsToTeamData } from '@data/mappers/teamsMapper';
import type { TeamStandingsData } from '@ui/features/teams/types/teams.types';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';

type UseTeamStandingsParams = {
  teamId: string;
  leagueId: string | null;
  season: number | null;
  enabled?: boolean;
};

const EMPTY_TEAM_STANDINGS: TeamStandingsData = {
  groups: [],
};

type FetchTeamStandingsDataParams = {
  teamId: string;
  leagueId: string | null;
  season: number | null;
  signal?: AbortSignal;
};

export async function fetchTeamStandingsData({
  teamId,
  leagueId,
  season,
  signal,
}: FetchTeamStandingsDataParams): Promise<TeamStandingsData> {
  if (!teamId || !leagueId || typeof season !== 'number') {
    return EMPTY_TEAM_STANDINGS;
  }

  const payload = await fetchLeagueStandings(leagueId, season, signal);
  return mapStandingsToTeamData(payload, teamId);
}

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
    placeholderData: previousData => previousData,
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
