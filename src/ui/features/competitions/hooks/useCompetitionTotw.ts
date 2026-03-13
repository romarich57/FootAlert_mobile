import { useMemo } from 'react';

import {
  mapCompetitionPlayerStatsToTotw,
  mapPlayerStatsDtoToPlayerStats,
} from '@data/mappers/competitionsMapper';
import { isHydrationSectionLoading } from '@domain/contracts/fullPayloadHydration.types';
import type { CompetitionTotwData } from '@ui/features/competitions/types/competitions.types';
import { queryKeys } from '@ui/shared/query/queryKeys';

import { useCompetitionFullQuery } from './competitionFullQuery';

export function useCompetitionTotw(
  leagueId: number | undefined,
  season: number | undefined,
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
  const data = useMemo<CompetitionTotwData | null>(() => {
    if (!leagueId || !season || !competitionFullQuery.data) {
      return null;
    }

    const allPlayers = [
      ...mapPlayerStatsDtoToPlayerStats(competitionFullQuery.data.playerStats.topScorers ?? [], season),
      ...mapPlayerStatsDtoToPlayerStats(competitionFullQuery.data.playerStats.topAssists ?? [], season),
      ...mapPlayerStatsDtoToPlayerStats(competitionFullQuery.data.playerStats.topYellowCards ?? [], season),
      ...mapPlayerStatsDtoToPlayerStats(competitionFullQuery.data.playerStats.topRedCards ?? [], season),
    ];

    return mapCompetitionPlayerStatsToTotw(allPlayers, season);
  }, [competitionFullQuery.data, leagueId, season]);

  return {
    ...competitionFullQuery,
    queryKey: queryKeys.competitions.totw(leagueId, season),
    data,
    isLoading:
      (competitionFullQuery.isLoading && !competitionFullQuery.data) ||
      isPlayerStatsSectionLoading,
    isFetching: competitionFullQuery.isFetching || isPlayerStatsSectionLoading,
    isError: competitionFullQuery.isError && !competitionFullQuery.data,
  };
}
