import { useQuery } from '@tanstack/react-query';

import { fetchPlayerDetails, fetchPlayerTrophies } from '@data/endpoints/playersApi';
import {
  mapPlayerDetailsToCharacteristics,
  mapPlayerDetailsToProfile,
  mapPlayerDetailsToSeasonStats,
  mapPlayerTrophies,
} from '@data/mappers/playersMapper';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';

export function usePlayerDetails(playerId: string, season: number) {
  const profileQuery = useQuery({
    queryKey: queryKeys.players.details(playerId, season),
    queryFn: async ({ signal }) => {
      const dto = await fetchPlayerDetails(playerId, season, signal);
      if (!dto) throw new Error('Player not found');
      return {
        profile: mapPlayerDetailsToProfile(dto, season),
        characteristics: mapPlayerDetailsToCharacteristics(dto, season),
        seasonStats: mapPlayerDetailsToSeasonStats(dto, season),
      };
    },
    enabled: !!playerId && !!season,
    ...featureQueryOptions.players.details,
  });

  const trophiesQuery = useQuery({
    queryKey: queryKeys.players.trophies(playerId),
    queryFn: async ({ signal }) => {
      const dtos = await fetchPlayerTrophies(playerId, signal);
      return mapPlayerTrophies(dtos);
    },
    enabled: !!playerId,
    ...featureQueryOptions.players.trophies,
  });

  return {
    profile: profileQuery.data?.profile ?? null,
    characteristics: profileQuery.data?.characteristics ?? null,
    seasonStats: profileQuery.data?.seasonStats ?? null,
    trophies: trophiesQuery.data ?? [],
    isLoading: profileQuery.isLoading || trophiesQuery.isLoading,
    isError: profileQuery.isError,
    dataUpdatedAt: Math.max(profileQuery.dataUpdatedAt, trophiesQuery.dataUpdatedAt),
    refetch: () => {
      profileQuery.refetch();
      trophiesQuery.refetch();
    },
  };
}
