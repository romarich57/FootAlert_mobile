import { useQuery } from '@tanstack/react-query';
import { fetchLeagueTransfers } from '@data/endpoints/competitionsApi';
import { mapTransfersDtoToCompetitionTransfers } from '@data/mappers/competitionsMapper';
import type { Transfer } from '../types/competitions.types';

export const COMPETITION_TRANSFERS_QUERY_KEY = 'competition_transfers';

export function useCompetitionTransfers(leagueId: number | undefined, season: number | undefined) {
    return useQuery<Transfer[], Error>({
        queryKey: [COMPETITION_TRANSFERS_QUERY_KEY, leagueId, season],
        queryFn: async ({ signal }) => {
            if (!leagueId || !season) {
                return [];
            }

            const dtos = await fetchLeagueTransfers(leagueId, season, signal);
            return mapTransfersDtoToCompetitionTransfers(dtos, season);
        },
        enabled: !!leagueId && !!season,
        staleTime: 60 * 60 * 1000,
    });
}
