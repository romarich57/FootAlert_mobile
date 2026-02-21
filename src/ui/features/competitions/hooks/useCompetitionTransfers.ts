import { useQuery } from '@tanstack/react-query';
import type { Transfer } from '../types/competitions.types';

export const COMPETITION_TRANSFERS_QUERY_KEY = 'competition_transfers';

export function useCompetitionTransfers(leagueId: number | undefined, season: number | undefined) {
    return useQuery<Transfer[], Error>({
        queryKey: [COMPETITION_TRANSFERS_QUERY_KEY, leagueId, season],
        queryFn: async () => {
            if (!leagueId || !season) {
                return [];
            }

            // Note: API-Football doesn't natively support /transfers?league=XX
            // Implementing a proper transfer feed for a whole league requires querying all teams in that league.
            // For now, we return an empty array or handle limitation.
            // You can enhance this by fetching all teams first and then their transfers, but it's cost-heavy.

            return [];
        },
        enabled: !!leagueId && !!season,
        staleTime: 12 * 60 * 60 * 1000,
    });
}
