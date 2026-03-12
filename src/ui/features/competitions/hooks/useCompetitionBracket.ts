import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';
import type { CompetitionBracket } from '@domain/contracts/competitions.types';

import { loadCompetitionFullPayload } from './competitionFullQuery';

type UseCompetitionBracketOptions = {
  enabled?: boolean;
};

export function useCompetitionBracket(
  leagueId: number | undefined,
  season: number | undefined,
  options?: UseCompetitionBracketOptions,
) {
  const isEnabled = options?.enabled ?? true;
  const queryClient = useQueryClient();

  return useQuery<CompetitionBracket, Error>({
    queryKey: queryKeys.competitions.bracket(leagueId, season),
    queryFn: async ({ signal }) => {
      if (!leagueId || !season) {
        return { competitionKind: 'league', bracket: null };
      }

      const payload = await loadCompetitionFullPayload(queryClient, leagueId, season);
      return {
        competitionKind: payload?.competitionKind ?? 'league',
        bracket: payload?.bracket ?? null,
      };
    },
    enabled: isEnabled && !!leagueId && !!season,
    placeholderData: keepPreviousData,
    gcTime: 24 * 60 * 60 * 1000,
    ...featureQueryOptions.competitions.bracket,
  });
}
