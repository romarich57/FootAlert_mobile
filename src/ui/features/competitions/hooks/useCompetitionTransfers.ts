import { useQuery } from '@tanstack/react-query';
import { fetchLeagueTransfers } from '@data/endpoints/competitionsApi';
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

            // Map the BFF DTO format recursively to the flattened domain model
            const transfers: Transfer[] = [];
            for (const dto of dtos) {
                for (const t of dto.transfers) {
                    transfers.push({
                        playerId: dto.player.id,
                        playerName: dto.player.name,
                        date: t.date,
                        type: t.type,
                        teamIn: t.teams.in,
                        teamOut: t.teams.out,
                    });
                }
            }

            return transfers;
        },
        enabled: !!leagueId && !!season,
        staleTime: 12 * 60 * 60 * 1000,
    });
}
