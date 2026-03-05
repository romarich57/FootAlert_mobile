import { useInfiniteQuery } from '@tanstack/react-query';

import { fetchLeagueFixturesPage } from '@data/endpoints/competitionsApi';
import { mapFixturesDtoToFixtures } from '@data/mappers/competitionsMapper';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';
import type { Fixture } from '../types/competitions.types';

const FIXTURES_PAGE_SIZE = 50;

export type FixturePage = {
  items: Fixture[];
  hasMore: boolean;
  nextCursor: string | null;
};

export function useCompetitionFixtures(
  leagueId: number | undefined,
  season: number | undefined,
) {
  return useInfiniteQuery<FixturePage, Error>({
    queryKey: queryKeys.competitions.fixtures(leagueId, season),
    queryFn: async ({ pageParam, signal }) => {
      if (!leagueId || !season) {
        return { items: [], hasMore: false, nextCursor: null };
      }
      const page = await fetchLeagueFixturesPage(
        leagueId,
        season,
        signal,
        { limit: FIXTURES_PAGE_SIZE, cursor: pageParam as string | undefined },
      );
      return {
        items: mapFixturesDtoToFixtures(page.items),
        hasMore: page.pageInfo?.hasMore ?? false,
        nextCursor: page.pageInfo?.nextCursor ?? null,
      };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: lastPage => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    enabled: !!leagueId && !!season,
    ...featureQueryOptions.competitions.fixtures,
  });
}
