import { useQuery, useQueryClient } from '@tanstack/react-query';

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

      const payload = await loadCompetitionFullPayload(queryClient, leagueId, season);
      return readPlayerStatsFromFullPayload(statType, payload, season) ?? [];
    },
    enabled: !!leagueId && !!season,
    ...featureQueryOptions.competitions.playerStats,
  });
}
