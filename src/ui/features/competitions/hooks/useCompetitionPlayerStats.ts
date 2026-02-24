import { useQuery } from '@tanstack/react-query';

import {
  fetchLeagueTopAssists,
  fetchLeagueTopRedCards,
  fetchLeagueTopScorers,
  fetchLeagueTopYellowCards,
} from '@data/endpoints/competitionsApi';
import { mapPlayerStatsDtoToPlayerStats } from '@data/mappers/competitionsMapper';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';
import type { CompetitionPlayerStat } from '../types/competitions.types';

export type PlayerStatType = 'goals' | 'assists' | 'yellowCards' | 'redCards';

export function useCompetitionPlayerStats(
  leagueId: number | undefined,
  season: number | undefined,
  statType: PlayerStatType,
) {
  return useQuery<CompetitionPlayerStat[], Error>({
    queryKey: queryKeys.competitions.playerStats(leagueId, season, statType),
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

      return mapPlayerStatsDtoToPlayerStats(dtos, season);
    },
    enabled: !!leagueId && !!season,
    ...featureQueryOptions.competitions.playerStats,
  });
}
