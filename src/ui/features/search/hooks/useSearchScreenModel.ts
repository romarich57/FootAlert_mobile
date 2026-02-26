import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { appEnv } from '@data/config/env';
import { searchPlayersByName, searchTeamsByName } from '@data/endpoints/followsApi';
import {
  getCurrentSeasonYear,
  mapPlayerSearchResults,
  mapTeamSearchResults,
} from '@data/mappers/followsMapper';
import { safeNavigateEntity } from '@ui/app/navigation/routeParams';
import type { RootStackParamList } from '@ui/app/navigation/types';
import { queryKeys } from '@ui/shared/query/queryKeys';
import type {
  SearchEntityTab,
  SearchPlayerResult,
  SearchResult,
  SearchTeamResult,
} from '@ui/features/search/types/search.types';

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

export function useSearchScreenModel() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [selectedTab, setSelectedTab] = useState<SearchEntityTab>('teams');
  const [query, setQuery] = useState('');
  const season = getCurrentSeasonYear();
  const trimmedQuery = query.trim();
  const debouncedQuery = useDebouncedValue(trimmedQuery, appEnv.followsSearchDebounceMs);
  const hasEnoughChars = debouncedQuery.length >= appEnv.followsSearchMinChars;

  const searchQuery = useQuery({
    queryKey: queryKeys.follows.search(selectedTab, debouncedQuery, season),
    enabled: hasEnoughChars,
    queryFn: async ({ signal }): Promise<SearchResult[]> => {
      if (selectedTab === 'teams') {
        const payload = await searchTeamsByName(debouncedQuery, signal);
        return mapTeamSearchResults(payload, appEnv.followsSearchResultsLimit);
      }

      const payload = await searchPlayersByName(debouncedQuery, season, signal);
      return mapPlayerSearchResults(payload, appEnv.followsSearchResultsLimit);
    },
  });

  const handleClearQuery = useCallback(() => {
    setQuery('');
  }, []);

  const handleSelectTab = useCallback((nextTab: SearchEntityTab) => {
    setSelectedTab(nextTab);
  }, []);

  const handlePressTeam = useCallback(
    (teamId: string) => {
      safeNavigateEntity(navigation, 'TeamDetails', teamId);
    },
    [navigation],
  );

  const handlePressPlayer = useCallback(
    (playerId: string) => {
      safeNavigateEntity(navigation, 'PlayerDetails', playerId);
    },
    [navigation],
  );

  const rawResults = searchQuery.data ?? [];
  const teamResults = selectedTab === 'teams' ? (rawResults as SearchTeamResult[]) : [];
  const playerResults = selectedTab === 'players' ? (rawResults as SearchPlayerResult[]) : [];

  return {
    selectedTab,
    query,
    debouncedQuery,
    hasEnoughChars,
    isLoading: searchQuery.isLoading && hasEnoughChars,
    isError: searchQuery.isError && hasEnoughChars,
    teamResults,
    playerResults,
    setQuery,
    handleClearQuery,
    handleSelectTab,
    handlePressTeam,
    handlePressPlayer,
    retry: searchQuery.refetch,
  };
}
