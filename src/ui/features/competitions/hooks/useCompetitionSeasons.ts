import { useQuery } from '@tanstack/react-query';
import { fetchLeagueById } from '@data/endpoints/competitionsApi';

export const COMPETITION_SEASONS_QUERY_KEY = 'competition_seasons';

export function useCompetitionSeasons(leagueId: number | undefined) {
    return useQuery<{ year: number; current: boolean }[], Error>({
        queryKey: [COMPETITION_SEASONS_QUERY_KEY, leagueId],
        queryFn: async ({ signal }) => {
            if (!leagueId) {
                return [];
            }
            const dto = await fetchLeagueById(leagueId.toString(), signal);
            if (!dto) return [];
            return dto.seasons.sort((a, b) => b.year - a.year); // Descending order
        },
        enabled: !!leagueId,
        staleTime: 24 * 60 * 60 * 1000, // 24 hours, seasons rarely change
    });
}
