import { useMemo } from 'react';

import { mapPlayerStatsDtoToPlayerStats } from '@data/mappers/competitionsMapper';
import type { CompetitionFullPayload } from '@data/endpoints/competitionsApi';
import { isHydrationSectionLoading } from '@domain/contracts/fullPayloadHydration.types';
import { queryKeys } from '@ui/shared/query/queryKeys';
import type { CompetitionPlayerStat } from '../types/competitions.types';

import { useCompetitionFullQuery } from './competitionFullQuery';

export type PlayerStatType = 'goals' | 'assists' | 'yellowCards' | 'redCards';

function readPlayerStatsFromFullPayload(
  statType: PlayerStatType,
  payload: CompetitionFullPayload | null | undefined,
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
  const competitionFullQuery = useCompetitionFullQuery(
    leagueId,
    season,
    !!leagueId && !!season,
  );
  const isPlayerStatsSectionLoading = isHydrationSectionLoading(
    competitionFullQuery.hydration,
    'playerStats',
  );
  const data = useMemo(
    () =>
      leagueId && season && competitionFullQuery.data
        ? (readPlayerStatsFromFullPayload(
            statType,
            competitionFullQuery.data,
            season,
          ) ?? [])
        : [],
    [competitionFullQuery.data, leagueId, season, statType],
  );

  return {
    ...competitionFullQuery,
    queryKey: queryKeys.competitions.playerStats(leagueId, season, statType),
    data,
    isLoading:
      (competitionFullQuery.isLoading && !competitionFullQuery.data) ||
      isPlayerStatsSectionLoading,
    isFetching: competitionFullQuery.isFetching || isPlayerStatsSectionLoading,
    isError: competitionFullQuery.isError && !competitionFullQuery.data,
  };
}
