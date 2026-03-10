import { useQuery, useQueryClient } from '@tanstack/react-query';

import { appEnv } from '@data/config/env';
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

import { loadCompetitionFullPayload } from './competitionFullQuery';

export type PlayerStatType = 'goals' | 'assists' | 'yellowCards' | 'redCards';

function readPlayerStatsFromFullPayload(
  statType: PlayerStatType,
  payload: Awaited<ReturnType<typeof loadCompetitionFullPayload>>,
  season: number,
): CompetitionPlayerStat[] | null {
  if (!payload?.playerStats) {
    return null;
  }

  switch (statType) {
    case 'goals':
      return mapPlayerStatsDtoToPlayerStats(payload.playerStats.topScorers, season);
    case 'assists':
      return mapPlayerStatsDtoToPlayerStats(payload.playerStats.topAssists, season);
    case 'yellowCards':
      return mapPlayerStatsDtoToPlayerStats(payload.playerStats.topYellowCards, season);
    case 'redCards':
      return mapPlayerStatsDtoToPlayerStats(payload.playerStats.topRedCards, season);
    default:
      return null;
  }
}

export function useCompetitionPlayerStats(
  leagueId: number | undefined,
  season: number | undefined,
  statType: PlayerStatType,
) {
  const queryClient = useQueryClient();

  return useQuery<CompetitionPlayerStat[], Error>({
    queryKey: queryKeys.competitions.playerStats(leagueId, season, statType),
    queryFn: async ({ signal }) => {
      if (!leagueId || !season) {
        return [];
      }

      if (appEnv.mobileEnableBffCompetitionFull) {
        try {
          const payload = await loadCompetitionFullPayload(queryClient, leagueId, season);
          const fullStats = readPlayerStatsFromFullPayload(statType, payload, season);
          if (fullStats) {
            return fullStats;
          }
        } catch {
          // Fallback legacy conservé pour les erreurs réseau/full.
        }
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
