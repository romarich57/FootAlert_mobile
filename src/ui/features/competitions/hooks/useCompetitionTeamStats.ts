import { useQuery } from '@tanstack/react-query';
import { useCompetitionStandings } from './useCompetitionStandings';
import type { StandingRow } from '../types/competitions.types';

export const COMPETITION_TEAM_STATS_QUERY_KEY = 'competition_team_stats';

// Instead of querying /teams/statistics for every single team (expensive API calls),
// we use the Standings data to extract basic team stats (Goals For, Goals Against, Points).

export type TeamStatLeaderboard = {
    bestAttack: StandingRow[];
    bestDefense: StandingRow[];
};

export function useCompetitionTeamStats(leagueId: number | undefined, season: number | undefined) {
    const { data: standingsGroups, isLoading, error } = useCompetitionStandings(leagueId, season);

    const teamStats = useQuery<TeamStatLeaderboard, Error>({
        queryKey: [COMPETITION_TEAM_STATS_QUERY_KEY, leagueId, season],
        queryFn: () => {
            if (!standingsGroups || standingsGroups.length === 0) {
                return { bestAttack: [], bestDefense: [] };
            }

            // Flatten all groups
            const allTeams = standingsGroups.flatMap(group => group.rows);

            // Sort by attack (goals for)
            const bestAttack = [...allTeams].sort((a, b) => b.goalsFor - a.goalsFor);

            // Sort by defense (goals against) lowest is better
            const bestDefense = [...allTeams].sort((a, b) => a.goalsAgainst - b.goalsAgainst);

            return {
                bestAttack,
                bestDefense,
            };
        },
        enabled: !!standingsGroups && standingsGroups.length > 0,
    });

    return {
        ...teamStats,
        isLoading: isLoading || teamStats.isLoading,
        error: error || teamStats.error,
    };
}
