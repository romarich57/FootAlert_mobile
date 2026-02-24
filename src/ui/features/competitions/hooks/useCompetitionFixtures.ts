import { useQuery } from '@tanstack/react-query';

import { fetchLeagueFixtures } from '@data/endpoints/competitionsApi';
import { mapFixturesDtoToFixtures } from '@data/mappers/competitionsMapper';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';
import type { Fixture } from '../types/competitions.types';

export function useCompetitionFixtures(
  leagueId: number | undefined,
  season: number | undefined,
) {
  return useQuery<Fixture[], Error>({
    queryKey: queryKeys.competitions.fixtures(leagueId, season),
    queryFn: async ({ signal }) => {
      if (!leagueId || !season) {
        return [];
      }
      const dtos = await fetchLeagueFixtures(leagueId, season, signal);
      return mapFixturesDtoToFixtures(dtos);
    },
    enabled: !!leagueId && !!season,
    ...featureQueryOptions.competitions.fixtures,
  });
}
