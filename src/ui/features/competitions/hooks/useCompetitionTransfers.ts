import { useQuery } from '@tanstack/react-query';

import { fetchLeagueTransfers } from '@data/endpoints/competitionsApi';
import { mapTransfersDtoToCompetitionTransfers } from '@data/mappers/competitionsMapper';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';
import type { Transfer } from '../types/competitions.types';

export function useCompetitionTransfers(
  leagueId: number | undefined,
  season: number | undefined,
) {
  return useQuery<Transfer[], Error>({
    queryKey: queryKeys.competitions.transfers(leagueId, season),
    queryFn: async ({ signal }) => {
      if (!leagueId || !season) {
        return [];
      }

      const dtos = await fetchLeagueTransfers(leagueId, season, signal);
      return mapTransfersDtoToCompetitionTransfers(dtos, season);
    },
    enabled: !!leagueId && !!season,
    ...featureQueryOptions.competitions.transfers,
  });
}
