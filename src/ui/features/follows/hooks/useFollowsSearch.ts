import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { appEnv } from '@data/config/env';
import { searchPlayersByName, searchTeamsByName } from '@data/endpoints/followsApi';
import {
  getCurrentSeasonYear,
  mapPlayerSearchResults,
  mapTeamSearchResults,
} from '@data/mappers/followsMapper';
import type {
  FollowEntityTab,
  FollowsSearchResultPlayer,
  FollowsSearchResultTeam,
} from '@ui/features/follows/types/follows.types';
import { queryKeys } from '@ui/shared/query/queryKeys';

function useDebouncedValue(value: string, delayMs: number): string {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(timeout);
    };
  }, [delayMs, value]);

  return debouncedValue;
}

type UseFollowsSearchParams = {
  tab: FollowEntityTab;
  query: string;
};

export function useFollowsSearch({ tab, query }: UseFollowsSearchParams) {
  const season = getCurrentSeasonYear();
  const trimmedQuery = query.trim();
  const debouncedQuery = useDebouncedValue(trimmedQuery, appEnv.followsSearchDebounceMs);
  const hasEnoughChars = debouncedQuery.length >= appEnv.followsSearchMinChars;

  const searchQuery = useQuery({
    queryKey: queryKeys.follows.search(tab, debouncedQuery, season),
    enabled: hasEnoughChars,
    queryFn: async ({ signal }): Promise<
      FollowsSearchResultTeam[] | FollowsSearchResultPlayer[]
    > => {
      if (tab === 'teams') {
        const payload = await searchTeamsByName(debouncedQuery, signal);
        return mapTeamSearchResults(payload, appEnv.followsSearchResultsLimit);
      }

      const payload = await searchPlayersByName(debouncedQuery, season, signal);
      return mapPlayerSearchResults(payload, appEnv.followsSearchResultsLimit);
    },
  });

  const results = useMemo(() => {
    if (!hasEnoughChars) {
      return [];
    }

    return searchQuery.data ?? [];
  }, [hasEnoughChars, searchQuery.data]);

  return {
    ...searchQuery,
    debouncedQuery,
    hasEnoughChars,
    results,
  };
}
