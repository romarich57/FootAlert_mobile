import { useQuery, useQueryClient } from '@tanstack/react-query';

import { appEnv } from '@data/config/env';
import { fetchLeagueTransfers } from '@data/endpoints/competitionsApi';
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

      if (appEnv.mobileEnableBffCompetitionFull) {
        try {
          const payload = await loadCompetitionFullPayload(queryClient, leagueId, season);
          if (payload?.transfers) {
            return mapTransfersDtoToCompetitionTransfers(payload.transfers, season);
          }
        } catch {
          // Fallback legacy conservé pour les erreurs réseau/full.
        }
      }

      const dtos = await fetchLeagueTransfers(leagueId, season, signal);
      return mapTransfersDtoToCompetitionTransfers(dtos, season);
    },
    enabled: !!leagueId && !!season,
    ...featureQueryOptions.competitions.transfers,
  });
}
