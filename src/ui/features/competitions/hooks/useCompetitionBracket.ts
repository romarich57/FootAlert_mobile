import { useMemo } from 'react';

import type { CompetitionBracket } from '@domain/contracts/competitions.types';
import { isHydrationSectionLoading } from '@domain/contracts/fullPayloadHydration.types';
import { queryKeys } from '@ui/shared/query/queryKeys';

import { useCompetitionFullQuery } from './competitionFullQuery';

type UseCompetitionBracketOptions = {
  enabled?: boolean;
};

export function useCompetitionBracket(
  leagueId: number | undefined,
  season: number | undefined,
  options?: UseCompetitionBracketOptions,
) {
  const isEnabled = options?.enabled ?? true;
  const competitionFullQuery = useCompetitionFullQuery(
    leagueId,
    season,
    isEnabled && !!leagueId && !!season,
  );
  const isBracketSectionLoading = isHydrationSectionLoading(
    competitionFullQuery.hydration,
    'bracket',
  );
  const data = useMemo<CompetitionBracket>(
    () => ({
      competitionKind: competitionFullQuery.data?.competitionKind ?? 'league',
      bracket: competitionFullQuery.data?.bracket ?? null,
    }),
    [competitionFullQuery.data?.bracket, competitionFullQuery.data?.competitionKind],
  );

  return {
    ...competitionFullQuery,
    queryKey: queryKeys.competitions.bracket(leagueId, season),
    data,
    isLoading:
      (competitionFullQuery.isLoading && !competitionFullQuery.data) ||
      isBracketSectionLoading,
    isFetching: competitionFullQuery.isFetching || isBracketSectionLoading,
    isError: competitionFullQuery.isError && !competitionFullQuery.data,
  };
}
