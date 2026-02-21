import { useQuery } from '@tanstack/react-query';
import { fetchPlayerDetails, fetchPlayerSeasons } from '@data/endpoints/playersApi';
import { mapPlayerCareerSeasons, mapPlayerCareerTeams } from '@data/mappers/playersMapper';
import type { PlayerCareerSeason, PlayerCareerTeam } from '@ui/features/players/types/players.types';

export const PLAYER_CAREER_SEASONS_QUERY_KEY = 'player_career_seasons';
export const PLAYER_CAREER_QUERY_KEY = 'player_career';

export function usePlayerCareer(playerId: string) {
    const seasonsListQuery = useQuery({
        queryKey: [PLAYER_CAREER_SEASONS_QUERY_KEY, playerId],
        queryFn: async ({ signal }) => {
            return fetchPlayerSeasons(playerId, signal);
        },
        enabled: !!playerId,
        staleTime: 60 * 60 * 1000,
    });

    const careerQuery = useQuery({
        queryKey: [PLAYER_CAREER_QUERY_KEY, playerId, seasonsListQuery.data],
        queryFn: async ({ signal }) => {
            const seasons = seasonsListQuery.data || [];
            // Fetch details for all seasons to aggregate career stats
            // Note: In real app, consider pagination or batching to avoid API rate limits
            // For this implementation, we map over the seasons to gather career data
            const promises = seasons.map(s => fetchPlayerDetails(playerId, s, signal));
            const results = await Promise.all(promises);

            let allSeasons: PlayerCareerSeason[] = [];
            let allTeams: PlayerCareerTeam[] = [];

            results.forEach(dto => {
                if (dto) {
                    allSeasons = allSeasons.concat(mapPlayerCareerSeasons(dto));
                }
            });

            // We will sort and filter duplicates appropriately if the API returned overlapping stats
            const uniqueSeasons = Array.from(new Map(allSeasons.map(item => [item.season + '-' + item.team.id, item])).values());
            uniqueSeasons.sort((a, b) => b.season.localeCompare(a.season));

            // Aggregate teams
            const teamMap = new Map<string, PlayerCareerTeam>();
            uniqueSeasons.forEach(s => {
                if (!teamMap.has(s.team.id)) {
                    teamMap.set(s.team.id, {
                        team: s.team,
                        period: '',
                        matches: 0,
                        goals: 0,
                        assists: 0,
                    });
                }
                const t = teamMap.get(s.team.id)!;
                t.matches += s.matches;
                t.goals += s.goals;
                t.assists += s.assists;

                // basic period calculation snippet 
                const year = parseInt(s.season, 10);
                if (!isNaN(year)) {
                    if (t.period === '') {
                        t.period = `${year}`;
                    } else {
                        const range = t.period.split(' - ').map(Number);
                        const min = Math.min(...range, year);
                        const max = Math.max(...range, year);
                        t.period = min === max ? `${min}` : `${min} - ${max}`;
                    }
                }
            });

            return {
                seasons: uniqueSeasons,
                teams: Array.from(teamMap.values()),
            };
        },
        enabled: !!playerId && seasonsListQuery.isSuccess,
        staleTime: 60 * 60 * 1000,
    });

    return {
        careerSeasons: careerQuery.data?.seasons ?? [],
        careerTeams: careerQuery.data?.teams ?? [],
        isLoading: seasonsListQuery.isLoading || careerQuery.isLoading,
        isError: seasonsListQuery.isError || careerQuery.isError,
        refetch: () => {
            seasonsListQuery.refetch();
            careerQuery.refetch();
        },
    };
}
