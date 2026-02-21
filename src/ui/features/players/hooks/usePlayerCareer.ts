import { useQuery } from '@tanstack/react-query';
import { fetchPlayerDetails, fetchPlayerSeasons } from '@data/endpoints/playersApi';
import { mapPlayerCareerSeasons } from '@data/mappers/playersMapper';
import type { PlayerCareerSeason, PlayerCareerTeam } from '@ui/features/players/types/players.types';

export const PLAYER_CAREER_SEASONS_QUERY_KEY = 'player_career_seasons';
export const PLAYER_CAREER_QUERY_KEY = 'player_career';

function sumNullable(a: number | null, b: number | null): number | null {
    if (a === null && b === null) {
        return null;
    }

    return (a ?? 0) + (b ?? 0);
}

export function usePlayerCareer(playerId: string, enabled: boolean = true) {
    const seasonsListQuery = useQuery({
        queryKey: [PLAYER_CAREER_SEASONS_QUERY_KEY, playerId],
        queryFn: async ({ signal }) => {
            return fetchPlayerSeasons(playerId, signal);
        },
        enabled: enabled && !!playerId,
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

            results.forEach(dto => {
                if (dto) {
                    allSeasons = allSeasons.concat(mapPlayerCareerSeasons(dto));
                }
            });

            // Deduplicate season/team entries while preserving items with partial identifiers.
            const uniqueSeasons = Array.from(
                new Map(
                    allSeasons.map((item, index) => {
                        const seasonKey = item.season ?? `unknown-season-${index}`;
                        const teamKey = item.team.id ?? item.team.name ?? `unknown-team-${index}`;
                        return [`${seasonKey}-${teamKey}`, item] as const;
                    }),
                ).values(),
            );
            uniqueSeasons.sort((a, b) => {
                const aYear = a.season ? Number.parseInt(a.season, 10) : Number.NEGATIVE_INFINITY;
                const bYear = b.season ? Number.parseInt(b.season, 10) : Number.NEGATIVE_INFINITY;
                return bYear - aYear;
            });

            // Aggregate teams
            const teamMap = new Map<string, PlayerCareerTeam>();
            uniqueSeasons.forEach(s => {
                const teamId = s.team.id ?? '';
                if (!teamId) {
                    return;
                }

                if (!teamMap.has(teamId)) {
                    teamMap.set(teamId, {
                        team: s.team,
                        period: null,
                        matches: null,
                        goals: null,
                        assists: null,
                    });
                }
                const t = teamMap.get(teamId)!;
                t.matches = sumNullable(t.matches, s.matches);
                t.goals = sumNullable(t.goals, s.goals);
                t.assists = sumNullable(t.assists, s.assists);

                // basic period calculation snippet 
                const year = s.season ? Number.parseInt(s.season, 10) : Number.NaN;
                if (!isNaN(year)) {
                    if (!t.period) {
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
        enabled: enabled && !!playerId && seasonsListQuery.isSuccess,
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
