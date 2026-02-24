import { useQuery } from '@tanstack/react-query';

import { fetchLeagueById } from '@data/endpoints/competitionsApi';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';

export function useCompetitionSeasons(leagueId: number | undefined) {
  return useQuery<{ year: number; current: boolean }[], Error>({
    queryKey: queryKeys.competitions.seasons(leagueId),
    queryFn: async ({ signal }) => {
      if (!leagueId) {
        return [];
      }
      const dto = await fetchLeagueById(leagueId.toString(), signal);
      if (!dto) return [];
      return dto.seasons.sort((a, b) => b.year - a.year);
    },
    enabled: !!leagueId,
    ...featureQueryOptions.competitions.seasons,
  });
}
