import { useQuery, useQueryClient } from '@tanstack/react-query';

import type { PlayerApiOverviewResponse } from '@domain/contracts/players.types';
import { fetchPlayerDetails } from '@data/endpoints/playersApi';
import { mapPlayerDetailsToSeasonStatsDataset } from '@data/mappers/playersMapper';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';

export function usePlayerStats(
  playerId: string,
  season: number,
  enabled: boolean = true,
) {
  const queryClient = useQueryClient();
  const statsQuery = useQuery({
    queryKey: queryKeys.players.stats(playerId, season),
    queryFn: async ({ signal }) => {
      const cachedOverview = queryClient.getQueryData<PlayerApiOverviewResponse>(
        queryKeys.players.overview(playerId, season),
      );
      if (cachedOverview?.seasonStatsDataset) {
        return cachedOverview.seasonStatsDataset;
      }

      const dto = await fetchPlayerDetails(playerId, season, signal);
      if (!dto) throw new Error('Player not found');

      return mapPlayerDetailsToSeasonStatsDataset(dto, season);
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
