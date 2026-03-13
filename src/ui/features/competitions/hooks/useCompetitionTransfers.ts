import { useMemo } from 'react';

import { mapTransfersDtoToCompetitionTransfers } from '@data/mappers/competitionsMapper';
import { isHydrationSectionLoading } from '@domain/contracts/fullPayloadHydration.types';
import { queryKeys } from '@ui/shared/query/queryKeys';
import type { Transfer } from '../types/competitions.types';

import { useCompetitionFullQuery } from './competitionFullQuery';

export function useCompetitionTransfers(
  leagueId: number | undefined,
  season: number | undefined,
) {
  const competitionFullQuery = useCompetitionFullQuery(
    leagueId,
    season,
    !!leagueId && !!season,
  );
  const isTransfersSectionLoading = isHydrationSectionLoading(
    competitionFullQuery.hydration,
    'transfers',
  );
  const data = useMemo(
    () =>
      leagueId && season && competitionFullQuery.data
        ? mapTransfersDtoToCompetitionTransfers(
            competitionFullQuery.data.transfers ?? [],
            season,
          )
        : [],
    [competitionFullQuery.data, leagueId, season],
  );

  return {
    ...competitionFullQuery,
    queryKey: queryKeys.competitions.transfers(leagueId, season),
    data,
    isLoading:
      (competitionFullQuery.isLoading && !competitionFullQuery.data) ||
      isTransfersSectionLoading,
    isFetching: competitionFullQuery.isFetching || isTransfersSectionLoading,
    isError: competitionFullQuery.isError && !competitionFullQuery.data,
  };
}
