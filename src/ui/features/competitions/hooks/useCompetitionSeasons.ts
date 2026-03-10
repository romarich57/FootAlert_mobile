import { useQuery, useQueryClient } from '@tanstack/react-query';

import { appEnv } from '@data/config/env';
import { fetchLeagueById } from '@data/endpoints/competitionsApi';
import type { CompetitionsApiLeagueDto } from '@domain/contracts/competitions.types';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';

import { loadCompetitionFullPayload } from './competitionFullQuery';

type CompetitionSeason = CompetitionsApiLeagueDto['seasons'][number];

export function useCompetitionSeasons(leagueId: number | undefined) {
  const queryClient = useQueryClient();

  return useQuery<CompetitionsApiLeagueDto | null, Error, CompetitionSeason[]>({
    queryKey: queryKeys.competitions.seasons(leagueId),
    queryFn: async ({ signal }) => {
      if (!leagueId) {
        return null;
      }

      if (appEnv.mobileEnableBffCompetitionFull) {
        try {
          const payload = await loadCompetitionFullPayload(queryClient, leagueId);
          if (payload?.competition) {
            return payload.competition;
          }
        } catch {
          // Fallback legacy conservé pour les erreurs ou payloads incomplets.
        }
      }

      return fetchLeagueById(leagueId.toString(), signal);
    },
    enabled: !!leagueId,
    select: dto => (dto?.seasons ?? []).sort((a, b) => b.year - a.year),
    ...featureQueryOptions.competitions.seasons,
  });
}
