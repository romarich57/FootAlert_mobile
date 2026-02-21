import { useQuery } from '@tanstack/react-query';
import { fetchFixturePlayerStats, fetchTeamFixtures } from '@data/endpoints/playersApi';
import { mapPlayerMatchPerformance } from '@data/mappers/playersMapper';
import type { PlayerMatchPerformance } from '@ui/features/players/types/players.types';

export const PLAYER_MATCHES_QUERY_KEY = 'player_matches';

export function usePlayerMatches(playerId: string, teamId: string, season: number) {
    const matchesQuery = useQuery({
        queryKey: [PLAYER_MATCHES_QUERY_KEY, playerId, teamId, season],
        queryFn: async ({ signal }) => {
            // 1. Fetch the last 15 fixtures for the team in this season
            const fixtures = await fetchTeamFixtures(teamId, season, 15, signal);

            // 2. Fetch the player stats for each fixture
            const performances: PlayerMatchPerformance[] = [];

            for (const fixture of fixtures) {
                if (!fixture.fixture?.id) continue;
                const statsDto = await fetchFixturePlayerStats(String(fixture.fixture.id), teamId, signal);

                const mapped = mapPlayerMatchPerformance(playerId, fixture, statsDto);
                if (mapped) {
                    performances.push(mapped);
                }
            }

            return performances;
        },
        enabled: !!playerId && !!teamId && !!season,
        staleTime: 5 * 60 * 1000,
    });

    return {
        matches: matchesQuery.data ?? [],
        isLoading: matchesQuery.isLoading,
        isError: matchesQuery.isError,
        refetch: matchesQuery.refetch,
    };
}
