import { useQuery } from '@tanstack/react-query';
import { fetchFixturePlayerStats, fetchTeamFixtures } from '@data/endpoints/playersApi';
import { mapPlayerMatchPerformance } from '@data/mappers/playersMapper';
import type { PlayerMatchPerformance } from '@ui/features/players/types/players.types';

export const PLAYER_MATCHES_QUERY_KEY = 'player_matches';

export function usePlayerMatches(
    playerId: string,
    teamId: string,
    season: number,
    enabled: boolean = true,
) {
    const matchesQuery = useQuery({
        queryKey: [PLAYER_MATCHES_QUERY_KEY, playerId, teamId, season],
        queryFn: async ({ signal }) => {
            // 1. Fetch the last 15 fixtures for the team in this season
            const fixtures = await fetchTeamFixtures(teamId, season, 15, signal);

            // 2. Fetch player stats in parallel for better responsiveness
            const performanceTasks = fixtures
                .filter(fixture => Boolean(fixture.fixture?.id))
                .map(async fixture => {
                    if (!fixture.fixture?.id) {
                        return null;
                    }

                    try {
                        const statsDto = await fetchFixturePlayerStats(String(fixture.fixture.id), teamId, signal);
                        return mapPlayerMatchPerformance(playerId, fixture, statsDto);
                    } catch {
                        // Skip failed fixture details and keep the rest of the list usable
                        return null;
                    }
                });

            const performances = await Promise.all(performanceTasks);
            return performances.filter((item): item is PlayerMatchPerformance => item !== null);
        },
        enabled: enabled && !!playerId && !!teamId && !!season,
        staleTime: 5 * 60 * 1000,
    });

    return {
        matches: matchesQuery.data ?? [],
        isLoading: matchesQuery.isLoading,
        isError: matchesQuery.isError,
        refetch: matchesQuery.refetch,
    };
}
