import { useQuery } from '@tanstack/react-query';

import { fetchLeagueStandings } from '@data/endpoints/competitionsApi';
import { mapStandingDtoToGroups } from '@data/mappers/competitionsMapper';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';
import type { StandingGroup } from '../types/competitions.types';

export function useCompetitionStandings(
  leagueId: number | undefined,
  season: number | undefined,
) {
  return useQuery<StandingGroup[], Error>({
    queryKey: queryKeys.competitions.standings(leagueId, season),
    queryFn: async ({ signal }) => {
      if (!leagueId || !season) {
        return [];
      }
      const dto = await fetchLeagueStandings(leagueId, season, signal);
      return mapStandingDtoToGroups(dto);
    },
    enabled: !!leagueId && !!season,
    ...featureQueryOptions.competitions.standings,
  });
}
