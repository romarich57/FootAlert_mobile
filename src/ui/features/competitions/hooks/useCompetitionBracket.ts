import { useQuery, keepPreviousData } from '@tanstack/react-query';

import { fetchCompetitionBracket } from '@data/endpoints/competitionsApi';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';
import type { CompetitionBracket } from '@domain/contracts/competitions.types';

type UseCompetitionBracketOptions = {
  enabled?: boolean;
};

export function useCompetitionBracket(
  leagueId: number | undefined,
  season: number | undefined,
  options?: UseCompetitionBracketOptions,
) {
  const isEnabled = options?.enabled ?? true;

  return useQuery<CompetitionBracket, Error>({
    queryKey: queryKeys.competitions.bracket(leagueId, season),
    queryFn: async ({ signal }) => {
      if (!leagueId || !season) {
        return { competitionKind: 'league', bracket: null };
      }
      return fetchCompetitionBracket(leagueId, season, signal);
    },
    enabled: isEnabled && !!leagueId && !!season,
    placeholderData: keepPreviousData,
    gcTime: 24 * 60 * 60 * 1000,
    ...featureQueryOptions.competitions.bracket,
  });
}
