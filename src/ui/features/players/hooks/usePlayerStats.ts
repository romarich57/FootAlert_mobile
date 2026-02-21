import { useQuery } from '@tanstack/react-query';
import { fetchPlayerDetails } from '@data/endpoints/playersApi';
import { mapPlayerDetailsToSeasonStats } from '@data/mappers/playersMapper';

export const PLAYER_STATS_QUERY_KEY = 'player_stats';

export function usePlayerStats(playerId: string, season: number) {
    const statsQuery = useQuery({
        queryKey: [PLAYER_STATS_QUERY_KEY, playerId, season],
        queryFn: async ({ signal }) => {
            const dto = await fetchPlayerDetails(playerId, season, signal);
            if (!dto) throw new Error('Player not found');

            return mapPlayerDetailsToSeasonStats(dto);
        },
        enabled: !!playerId && !!season,
        staleTime: 5 * 60 * 1000,
    });

    return {
        stats: statsQuery.data ?? null,
        isLoading: statsQuery.isLoading,
        isError: statsQuery.isError,
        refetch: statsQuery.refetch,
    };
}
