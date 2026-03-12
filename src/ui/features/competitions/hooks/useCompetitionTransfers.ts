import { useQuery, useQueryClient } from '@tanstack/react-query';

import { mapTransfersDtoToCompetitionTransfers } from '@data/mappers/competitionsMapper';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';
import type { Transfer } from '../types/competitions.types';

import { loadCompetitionFullPayload } from './competitionFullQuery';

export function useCompetitionTransfers(
  leagueId: number | undefined,
  season: number | undefined,
) {
  const queryClient = useQueryClient();

  return useQuery<Transfer[], Error>({
    queryKey: queryKeys.competitions.transfers(leagueId, season),
    queryFn: async ({ signal }) => {
      if (!leagueId || !season) {
        return [];
      }

      const payload = await loadCompetitionFullPayload(queryClient, leagueId, season);
      return mapTransfersDtoToCompetitionTransfers(payload?.transfers ?? [], season);
    },
    enabled: !!leagueId && !!season,
    ...featureQueryOptions.competitions.transfers,
  });
}
