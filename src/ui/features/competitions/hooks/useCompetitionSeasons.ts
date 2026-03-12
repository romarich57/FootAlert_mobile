import { useQuery, useQueryClient } from '@tanstack/react-query';

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

      const payload = await loadCompetitionFullPayload(queryClient, leagueId);
      return payload?.competition ?? null;
    },
    enabled: !!leagueId,
    select: dto => (dto?.seasons ?? []).sort((a, b) => b.year - a.year),
    ...featureQueryOptions.competitions.seasons,
  });
}
