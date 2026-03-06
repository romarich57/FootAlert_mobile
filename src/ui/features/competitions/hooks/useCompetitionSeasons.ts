import { useQuery } from '@tanstack/react-query';

import { fetchLeagueById } from '@data/endpoints/competitionsApi';
import type { CompetitionsApiLeagueDto } from '@domain/contracts/competitions.types';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';

type CompetitionSeason = CompetitionsApiLeagueDto['seasons'][number];

export function useCompetitionSeasons(leagueId: number | undefined) {
  return useQuery<CompetitionsApiLeagueDto | null, Error, CompetitionSeason[]>({
    queryKey: queryKeys.competitions.detailsHeader(String(leagueId ?? 'invalid')),
    queryFn: async ({ signal }) => {
      if (!leagueId) {
        return null;
      }
      return fetchLeagueById(leagueId.toString(), signal);
    },
    enabled: !!leagueId,
    select: dto => (dto?.seasons ?? []).sort((a, b) => b.year - a.year),
    ...featureQueryOptions.competitions.seasons,
  });
}
