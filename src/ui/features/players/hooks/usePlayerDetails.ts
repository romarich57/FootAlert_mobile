import { useQuery } from '@tanstack/react-query';

import { fetchPlayerDetails, fetchPlayerTrophies } from '@data/endpoints/playersApi';
import {
  mapPlayerDetailsToCharacteristics,
  mapPlayerDetailsToPositions,
  mapPlayerDetailsToProfile,
  mapPlayerDetailsToSeasonStatsDataset,
  mapPlayerTrophies,
} from '@data/mappers/playersMapper';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';

export function usePlayerDetails(playerId: string, season: number) {
  const query = useQuery({
    queryKey: queryKeys.players.details(playerId, season),
    queryFn: async ({ signal }) => {
      const [dto, trophiesDtos] = await Promise.all([
        fetchPlayerDetails(playerId, season, signal),
        fetchPlayerTrophies(playerId, signal),
      ]);

      if (!dto) throw new Error('Player not found');

      const seasonStatsDataset = mapPlayerDetailsToSeasonStatsDataset(dto, season);

      return {
        profile: mapPlayerDetailsToProfile(dto, season),
        characteristics: mapPlayerDetailsToCharacteristics(dto, season),
        positions: mapPlayerDetailsToPositions(dto, season),
        seasonStats: seasonStatsDataset.overall,
        seasonStatsDataset,
        trophies: mapPlayerTrophies(trophiesDtos),
      };
    },
    enabled: !!playerId && !!season,
    // staleTime = le plus court des deux anciens (details: 5min, trophies: 60min)
    staleTime: featureQueryOptions.players.details.staleTime,
    gcTime: featureQueryOptions.players.details.gcTime,
    retry: featureQueryOptions.players.details.retry,
  });

  return {
    profile: query.data?.profile ?? null,
    characteristics: query.data?.characteristics ?? null,
    positions: query.data?.positions ?? null,
    seasonStats: query.data?.seasonStats ?? null,
    seasonStatsDataset: query.data?.seasonStatsDataset ?? null,
    trophies: query.data?.trophies ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    dataUpdatedAt: query.dataUpdatedAt,
    refetch: () => { query.refetch(); },
  };
}
