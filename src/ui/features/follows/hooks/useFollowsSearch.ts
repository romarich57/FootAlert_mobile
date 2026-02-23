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
  localTeams: FollowsSearchResultTeam[];
  localPlayers: FollowsSearchResultPlayer[];
};

export function useFollowsSearch({ tab, query, localTeams, localPlayers }: UseFollowsSearchParams) {
  const season = getCurrentSeasonYear();
  const trimmedQuery = query.trim();
  const debouncedQuery = useDebouncedValue(trimmedQuery, appEnv.followsSearchDebounceMs);
  const hasEnoughCharsForLocal = debouncedQuery.length >= appEnv.followsSearchMinChars;
  const minCharsApi = 3;
  const hasEnoughCharsForApi = debouncedQuery.length >= minCharsApi;

  const searchQuery = useQuery({
    queryKey: queryKeys.follows.search(tab, debouncedQuery, season),
    enabled: hasEnoughCharsForApi,
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
    if (!hasEnoughCharsForLocal) {
      return [];
    }

    const lowerQuery = debouncedQuery.toLowerCase();

    if (tab === 'teams') {
      const localMatches = localTeams.filter(t => t.teamName.toLowerCase().includes(lowerQuery));
      const apiMatches = (searchQuery.data as FollowsSearchResultTeam[]) || [];
      const merged = [...localMatches];
      const seen = new Set(localMatches.map(t => t.teamId));
      for (const apiMatch of apiMatches) {
        if (!seen.has(apiMatch.teamId)) {
          seen.add(apiMatch.teamId);
          merged.push(apiMatch);
        }
      }
      return merged;
    }

    const localMatches = localPlayers.filter(p => p.playerName.toLowerCase().includes(lowerQuery));
    const apiMatches = (searchQuery.data as FollowsSearchResultPlayer[]) || [];
    const merged = [...localMatches];
    const seen = new Set(localMatches.map(p => p.playerId));
    for (const apiMatch of apiMatches) {
      if (!seen.has(apiMatch.playerId)) {
        seen.add(apiMatch.playerId);
        merged.push(apiMatch);
      }
    }
    return merged;
  }, [hasEnoughCharsForLocal, debouncedQuery, tab, localTeams, localPlayers, searchQuery.data]);

  return {
    ...searchQuery,
    isLoading: searchQuery.isLoading && hasEnoughCharsForApi,
    debouncedQuery,
    hasEnoughChars: hasEnoughCharsForLocal,
    results,
  };
}
