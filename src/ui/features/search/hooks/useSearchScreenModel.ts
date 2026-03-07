import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { appEnv } from '@data/config/env';
import {
  fetchDiscoveryPlayers,
  fetchDiscoveryTeams,
  searchPlayersByName,
  searchTeamsByName,
} from '@data/endpoints/followsApi';
import { searchGlobal } from '@data/endpoints/searchApi';
import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';
import {
  getCurrentSeasonYear,
  mapPlayerSearchResults,
  mapTeamSearchResults,
} from '@data/mappers/followsMapper';
import { safeNavigateEntity } from '@ui/app/navigation/routeParams';
import type { RootStackParamList } from '@ui/app/navigation/types';
import type {
  FollowDiscoveryPlayerItem,
  FollowDiscoveryTeamItem,
} from '@ui/features/follows/types/follows.types';
import { buildFollowDiscoveryPlaceholderResponse } from '@ui/features/follows/utils/discoverySeeds';
import { queryKeys } from '@ui/shared/query/queryKeys';
import type {
  SearchCompetitionResult,
  SearchEntityTab,
  SearchGlobalResults,
  SearchMatchResult,
  SearchPlayerResult,
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

const EMPTY_RESULTS: SearchGlobalResults = {
  teams: [],
  players: [],
  competitions: [],
  matches: [],
};

function mapMatchResults(
  payload: Awaited<ReturnType<typeof searchGlobal>>['matches'],
  limit: number,
): SearchMatchResult[] {
  return payload.slice(0, limit).map(item => ({
    fixtureId: item.fixtureId,
    kickoffAt: item.startDate,
    statusShort: item.statusShort,
    statusLong: item.statusLong,
    competitionId: item.competitionId,
    competitionName: item.competitionName,
    competitionCountry: item.competitionCountry,
    homeTeamId: item.homeTeamId,
    homeTeamName: item.homeTeamName,
    homeTeamLogo: item.homeTeamLogo,
    awayTeamId: item.awayTeamId,
    awayTeamName: item.awayTeamName,
    awayTeamLogo: item.awayTeamLogo,
    homeGoals: item.homeGoals,
    awayGoals: item.awayGoals,
  }));
}

export function useSearchScreenModel() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [selectedTab, setSelectedTab] = useState<SearchEntityTab>('all');
  const [query, setQuery] = useState('');
  const trackedRequestKeyRef = useRef<string | null>(null);
  const discoveryTelemetryKeyRef = useRef<string | null>(null);
  const discoverySeedVisibleTabRef = useRef<SearchEntityTab | null>(null);
  const season = getCurrentSeasonYear();
  const trimmedQuery = query.trim();
  const isEntitySearchTab = selectedTab === 'teams' || selectedTab === 'players';
  const debounceMs = isEntitySearchTab ? 250 : appEnv.followsSearchDebounceMs;
  const debouncedQuery = useDebouncedValue(trimmedQuery, debounceMs);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris';
  const hasEnoughChars = debouncedQuery.length >= appEnv.followsSearchMinChars;
  const resultsLimit = appEnv.followsSearchResultsLimit;

  const discoveryQuery = useQuery({
    queryKey: queryKeys.follows.discovery(selectedTab === 'players' ? 'players' : 'teams', resultsLimit),
    enabled: isEntitySearchTab && trimmedQuery.length === 0,
    staleTime: appEnv.followsTrendsTtlMs,
    queryFn: ({ signal }): Promise<
      | { items: FollowDiscoveryTeamItem[]; meta: { source: string } }
      | { items: FollowDiscoveryPlayerItem[]; meta: { source: string } }
    > => {
      if (selectedTab === 'teams') {
        return fetchDiscoveryTeams(resultsLimit, signal);
      }

      return fetchDiscoveryPlayers(resultsLimit, signal);
    },
    placeholderData: previousData =>
      previousData ??
      buildFollowDiscoveryPlaceholderResponse(
        selectedTab === 'players' ? 'players' : 'teams',
        resultsLimit,
      ),
  });

  const searchQuery = useQuery({
    queryKey: isEntitySearchTab
      ? queryKeys.follows.search(selectedTab, debouncedQuery, season)
      : queryKeys.search.global(debouncedQuery, timezone, season, resultsLimit),
    enabled: hasEnoughChars,
    queryFn: async ({ signal }): Promise<SearchGlobalResults> => {
      if (selectedTab === 'teams') {
        const payload = await searchTeamsByName(debouncedQuery, signal);
        return {
          teams: mapTeamSearchResults(payload, resultsLimit),
          players: [],
          competitions: [],
          matches: [],
        };
      }

      if (selectedTab === 'players') {
        const payload = await searchPlayersByName(debouncedQuery, season, signal);
        return {
          teams: [],
          players: mapPlayerSearchResults(payload, resultsLimit),
          competitions: [],
          matches: [],
        };
      }

      const payload = await searchGlobal(
        debouncedQuery,
        timezone,
        season,
        resultsLimit,
        signal,
      );

      if (payload.meta.partial) {
        getMobileTelemetry().trackEvent('search_global_partial_response', {
          queryLength: debouncedQuery.length,
          season,
          limit: resultsLimit,
          degradedSources: payload.meta.degradedSources.join(','),
        });
      }

      return {
        teams: payload.teams.map(item => ({
          teamId: item.id,
          teamName: item.name,
          teamLogo: item.logo,
          country: item.country,
        })),
        players: payload.players.map(item => ({
          playerId: item.id,
          playerName: item.name,
          playerPhoto: item.photo,
          position: item.position,
          teamName: item.teamName,
          teamLogo: item.teamLogo,
          leagueName: item.leagueName,
        })),
        competitions: payload.competitions.map(item => ({
          competitionId: item.id,
          competitionName: item.name,
          competitionLogo: item.logo,
          country: item.country,
          type: item.type,
        })),
        matches: mapMatchResults(payload.matches, resultsLimit),
      };
    },
  });

  useEffect(() => {
    if (!hasEnoughChars) {
      return;
    }

    const requestKey = `${selectedTab}|${debouncedQuery}|${timezone}|${season}|${resultsLimit}`;
    if (trackedRequestKeyRef.current === requestKey) {
      return;
    }
    trackedRequestKeyRef.current = requestKey;

    getMobileTelemetry().trackEvent('search_screen.request_count', {
      queryCount: 1,
      queryLength: debouncedQuery.length,
      season,
      limit: resultsLimit,
    });
  }, [debouncedQuery, hasEnoughChars, resultsLimit, season, selectedTab, timezone]);

  useEffect(() => {
    if (!isEntitySearchTab || trimmedQuery.length > 0 || !discoveryQuery.data) {
      return;
    }

    const source = discoveryQuery.data.meta.source;
    const itemCount = discoveryQuery.data.items.length;
    const telemetryKey = `${selectedTab}|${source}|${itemCount}|${discoveryQuery.isPlaceholderData ? 'placeholder' : 'resolved'}|${discoveryQuery.dataUpdatedAt}`;
    if (discoveryTelemetryKeyRef.current === telemetryKey) {
      return;
    }
    discoveryTelemetryKeyRef.current = telemetryKey;

    getMobileTelemetry().trackEvent('follows.discovery_source', {
      screen: 'search',
      tab: selectedTab,
      source,
      itemCount,
    });

    if (discoveryQuery.isPlaceholderData && source === 'static_seed') {
      discoverySeedVisibleTabRef.current = selectedTab;
      getMobileTelemetry().trackEvent('follows.discovery_seed_rendered', {
        screen: 'search',
        tab: selectedTab,
        source,
        itemCount,
      });
      return;
    }

    if (discoverySeedVisibleTabRef.current === selectedTab && source !== 'static_seed') {
      discoverySeedVisibleTabRef.current = null;
      getMobileTelemetry().trackEvent('follows.discovery_remote_replaced', {
        screen: 'search',
        tab: selectedTab,
        source,
        itemCount,
      });
    }
  }, [
    discoveryQuery.data,
    discoveryQuery.dataUpdatedAt,
    discoveryQuery.isPlaceholderData,
    isEntitySearchTab,
    selectedTab,
    trimmedQuery.length,
  ]);

  const handleClearQuery = useCallback(() => {
    setQuery('');
  }, []);

  const handleSelectTab = useCallback((nextTab: SearchEntityTab) => {
    setSelectedTab(nextTab);
  }, []);

  const handlePressTeam = useCallback(
    (teamId: string) => {
      safeNavigateEntity(navigation, 'TeamDetails', teamId, { followSource: 'search_tab' });
    },
    [navigation],
  );

  const handlePressPlayer = useCallback(
    (playerId: string) => {
      safeNavigateEntity(navigation, 'PlayerDetails', playerId, { followSource: 'search_tab' });
    },
    [navigation],
  );

  const handlePressCompetition = useCallback(
    (competitionId: string) => {
      safeNavigateEntity(navigation, 'CompetitionDetails', competitionId);
    },
    [navigation],
  );

  const handlePressMatch = useCallback(
    (fixtureId: string) => {
      safeNavigateEntity(navigation, 'MatchDetails', fixtureId);
    },
    [navigation],
  );

  const rawResults = searchQuery.data ?? EMPTY_RESULTS;
  const discoveryResponse = discoveryQuery.data as
    | {
        items?: Array<FollowDiscoveryTeamItem | FollowDiscoveryPlayerItem>;
      }
    | undefined;
  const discoveryItems = discoveryResponse?.items ?? [];
  const discoveryTeams =
    selectedTab === 'teams' && !trimmedQuery.length
      ? (discoveryItems as FollowDiscoveryTeamItem[]).map(item => ({
          teamId: item.teamId,
          teamName: item.teamName,
          teamLogo: item.teamLogo,
          country: item.country,
        }))
      : [];
  const discoveryPlayers =
    selectedTab === 'players' && !trimmedQuery.length
      ? (discoveryItems as FollowDiscoveryPlayerItem[]).map(item => ({
          playerId: item.playerId,
          playerName: item.playerName,
          playerPhoto: item.playerPhoto,
          position: item.position,
          teamName: item.teamName,
          teamLogo: item.teamLogo,
          leagueName: item.leagueName,
        }))
      : [];
  const teamResults: SearchTeamResult[] =
    selectedTab === 'teams' && !trimmedQuery.length
      ? discoveryTeams
      : selectedTab === 'all' || selectedTab === 'teams'
        ? rawResults.teams
        : [];
  const playerResults: SearchPlayerResult[] =
    selectedTab === 'players' && !trimmedQuery.length
      ? discoveryPlayers
      : selectedTab === 'all' || selectedTab === 'players'
        ? rawResults.players
        : [];
  const competitionResults: SearchCompetitionResult[] =
    selectedTab === 'all' || selectedTab === 'competitions' ? rawResults.competitions : [];
  const matchResults: SearchMatchResult[] =
    selectedTab === 'all' || selectedTab === 'matches' ? rawResults.matches : [];

  const isDiscoveryLoading =
    isEntitySearchTab &&
    !trimmedQuery.length &&
    discoveryQuery.isLoading &&
    !discoveryQuery.data;
  const isDiscoveryError =
    isEntitySearchTab &&
    !trimmedQuery.length &&
    discoveryQuery.isError &&
    !discoveryQuery.data;

  return {
    selectedTab,
    query,
    debouncedQuery,
    hasEnoughChars,
    isLoading: (searchQuery.isLoading && hasEnoughChars) || isDiscoveryLoading,
    isError: (searchQuery.isError && hasEnoughChars) || isDiscoveryError,
    teamResults,
    playerResults,
    competitionResults,
    matchResults,
    setQuery,
    handleClearQuery,
    handleSelectTab,
    handlePressTeam,
    handlePressPlayer,
    handlePressCompetition,
    handlePressMatch,
    retry:
      isEntitySearchTab && !trimmedQuery.length
        ? discoveryQuery.refetch
        : searchQuery.refetch,
  };
}
