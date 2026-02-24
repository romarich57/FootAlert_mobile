import { useQuery } from '@tanstack/react-query';

import { fetchPlayerDetails } from '@data/endpoints/playersApi';
import { mapPlayerDetailsToSeasonStats } from '@data/mappers/playersMapper';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';

export function usePlayerStats(
  playerId: string,
  season: number,
  enabled: boolean = true,
) {
  const statsQuery = useQuery({
    queryKey: queryKeys.players.stats(playerId, season),
    queryFn: async ({ signal }) => {
      const dto = await fetchPlayerDetails(playerId, season, signal);
      if (!dto) throw new Error('Player not found');

      return mapPlayerDetailsToSeasonStats(dto, season);
    },
    enabled: enabled && !!playerId && !!season,
    ...featureQueryOptions.players.stats,
  });

  return {
    stats: statsQuery.data ?? null,
    isLoading: statsQuery.isLoading,
    isError: statsQuery.isError,
    dataUpdatedAt: statsQuery.dataUpdatedAt,
    refetch: statsQuery.refetch,
  };
}
