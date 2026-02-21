import { useQuery } from '@tanstack/react-query';
import { fetchLeagueStandings } from '@data/endpoints/competitionsApi';
import { mapStandingDtoToGroups } from '@data/mappers/competitionsMapper';
import type { StandingGroup } from '../types/competitions.types';

export const COMPETITION_STANDINGS_QUERY_KEY = 'competition_standings';

export function useCompetitionStandings(leagueId: number | undefined, season: number | undefined) {
    return useQuery<StandingGroup[], Error>({
        queryKey: [COMPETITION_STANDINGS_QUERY_KEY, leagueId, season],
        queryFn: async ({ signal }) => {
            if (!leagueId || !season) {
                return [];
            }
            const dto = await fetchLeagueStandings(leagueId, season, signal);
            return mapStandingDtoToGroups(dto);
        },
        enabled: !!leagueId && !!season,
        staleTime: 5 * 60 * 1000, // 5 minutes cache
    });
}
