import { useQuery } from '@tanstack/react-query';
import { fetchLeagueTopScorers, fetchLeagueTopAssists, fetchLeagueTopYellowCards, fetchLeagueTopRedCards } from '@data/endpoints/competitionsApi';
import { mapPlayerStatsDtoToPlayerStats } from '@data/mappers/competitionsMapper';
import type { CompetitionPlayerStat } from '../types/competitions.types';

export const COMPETITION_PLAYER_STATS_QUERY_KEY = 'competition_player_stats';

export type PlayerStatType = 'goals' | 'assists' | 'yellowCards' | 'redCards';

export function useCompetitionPlayerStats(leagueId: number | undefined, season: number | undefined, statType: PlayerStatType) {
    return useQuery<CompetitionPlayerStat[], Error>({
        queryKey: [COMPETITION_PLAYER_STATS_QUERY_KEY, leagueId, season, statType],
        queryFn: async ({ signal }) => {
            if (!leagueId || !season) {
                return [];
            }

            let dtos;
            switch (statType) {
                case 'goals':
                    dtos = await fetchLeagueTopScorers(leagueId, season, signal);
                    break;
                case 'assists':
                    dtos = await fetchLeagueTopAssists(leagueId, season, signal);
                    break;
                case 'yellowCards':
                    dtos = await fetchLeagueTopYellowCards(leagueId, season, signal);
                    break;
                case 'redCards':
                    dtos = await fetchLeagueTopRedCards(leagueId, season, signal);
                    break;
                default:
                    return [];
            }

            return mapPlayerStatsDtoToPlayerStats(dtos);
        },
        enabled: !!leagueId && !!season,
        staleTime: 60 * 60 * 1000, // 1 hour cache since it doesn't change rapidly
    });
}
