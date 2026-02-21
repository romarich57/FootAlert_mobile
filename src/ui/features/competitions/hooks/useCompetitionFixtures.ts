import { useQuery } from '@tanstack/react-query';
import { fetchLeagueFixtures } from '@data/endpoints/competitionsApi';
import { mapFixturesDtoToFixtures } from '@data/mappers/competitionsMapper';
import type { Fixture } from '../types/competitions.types';

export const COMPETITION_FIXTURES_QUERY_KEY = 'competition_fixtures';

export function useCompetitionFixtures(leagueId: number | undefined, season: number | undefined) {
    return useQuery<Fixture[], Error>({
        queryKey: [COMPETITION_FIXTURES_QUERY_KEY, leagueId, season],
        queryFn: async ({ signal }) => {
            if (!leagueId || !season) {
                return [];
            }
            const dtos = await fetchLeagueFixtures(leagueId, season, signal);
            return mapFixturesDtoToFixtures(dtos);
        },
        enabled: !!leagueId && !!season,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}
