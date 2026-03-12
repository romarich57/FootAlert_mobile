import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

import { mapFixturesDtoToFixtures } from '@data/mappers/competitionsMapper';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';
import type { Fixture } from '../types/competitions.types';

import { loadCompetitionFullPayload } from './competitionFullQuery';

const FIXTURES_PAGE_SIZE = 50;

export type FixturePage = {
  items: Fixture[];
  hasMore: boolean;
  nextCursor: string | null;
  hasPrevious: boolean;
  previousCursor: string | null;
};

export function useCompetitionFixtures(
  leagueId: number | undefined,
  season: number | undefined,
) {
  const queryClient = useQueryClient();

  return useInfiniteQuery<FixturePage, Error>({
    queryKey: queryKeys.competitions.fixtures(leagueId, season),
    queryFn: async ({ pageParam, signal }) => {
      if (!leagueId || !season) {
        return {
          items: [],
          hasMore: false,
          nextCursor: null,
          hasPrevious: false,
          previousCursor: null,
        };
      }

      const payload = await loadCompetitionFullPayload(queryClient, leagueId, season);
      return {
        items: mapFixturesDtoToFixtures(payload?.matches ?? []),
        hasMore: false,
        nextCursor: null,
        hasPrevious: false,
        previousCursor: null,
      };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: lastPage => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    getPreviousPageParam: firstPage =>
      firstPage.hasPrevious ? firstPage.previousCursor : undefined,
    enabled: !!leagueId && !!season,
    ...featureQueryOptions.competitions.fixtures,
  });
}
