import { useQuery } from '@tanstack/react-query';
import { fetchPlayerDetails, fetchPlayerTrophies } from '@data/endpoints/playersApi';
import {
    mapPlayerDetailsToCharacteristics,
    mapPlayerDetailsToProfile,
    mapPlayerDetailsToSeasonStats,
    mapPlayerTrophies,
} from '@data/mappers/playersMapper';

export const PLAYER_DETAILS_QUERY_KEY = 'player_details';
export const PLAYER_TROPHIES_QUERY_KEY = 'player_trophies';

export function usePlayerDetails(playerId: string, season: number) {
    const profileQuery = useQuery({
        queryKey: [PLAYER_DETAILS_QUERY_KEY, playerId, season],
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
        staleTime: 5 * 60 * 1000,
    });

    const trophiesQuery = useQuery({
        queryKey: [PLAYER_TROPHIES_QUERY_KEY, playerId],
        queryFn: async ({ signal }) => {
            const dtos = await fetchPlayerTrophies(playerId, signal);
            return mapPlayerTrophies(dtos);
        },
        enabled: !!playerId,
        staleTime: 60 * 60 * 1000,
    });

    return {
        profile: profileQuery.data?.profile ?? null,
        characteristics: profileQuery.data?.characteristics ?? null,
        seasonStats: profileQuery.data?.seasonStats ?? null,
        trophies: trophiesQuery.data ?? [],
        isLoading: profileQuery.isLoading || trophiesQuery.isLoading,
        isError: profileQuery.isError,
        refetch: () => {
            profileQuery.refetch();
            trophiesQuery.refetch();
        },
    };
}
