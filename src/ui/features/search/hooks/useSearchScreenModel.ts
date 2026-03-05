import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { appEnv } from '@data/config/env';
import { mapLeagueDtoToCompetition } from '@data/mappers/competitionsMapper';
import { searchLeaguesByName } from '@data/endpoints/competitionsApi';
import { searchPlayersByName, searchTeamsByName } from '@data/endpoints/followsApi';
import { searchGlobal } from '@data/endpoints/searchApi';
import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';
import {
  getCurrentSeasonYear,
  mapPlayerSearchResults,
  mapTeamSearchResults,
} from '@data/mappers/followsMapper';
import { safeNavigateEntity } from '@ui/app/navigation/routeParams';
import type { RootStackParamList } from '@ui/app/navigation/types';
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

function mapCompetitionResults(
  payload: Awaited<ReturnType<typeof searchLeaguesByName>>,
  limit: number,
): SearchCompetitionResult[] {
  const results: SearchCompetitionResult[] = [];

  payload.forEach(dto => {
    const mapped = mapLeagueDtoToCompetition(dto);
    if (!mapped) {
      return;
    }

    results.push({
      competitionId: mapped.id,
      competitionName: mapped.name,
      competitionLogo: mapped.logo,
      country: mapped.countryName,
      type: mapped.type,
    });
  });

  return results.slice(0, limit);
}

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
  const season = getCurrentSeasonYear();
  const trimmedQuery = query.trim();
  const debouncedQuery = useDebouncedValue(trimmedQuery, appEnv.followsSearchDebounceMs);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris';
  const hasEnoughChars = debouncedQuery.length >= appEnv.followsSearchMinChars;
  const resultsLimit = appEnv.followsSearchResultsLimit;

  const searchQuery = useQuery({
    queryKey: queryKeys.search.global(debouncedQuery, timezone, season, resultsLimit),
    enabled: hasEnoughChars,
    queryFn: async ({ signal }): Promise<SearchGlobalResults> => {
      try {
        const payload = await searchGlobal(
          debouncedQuery,
          timezone,
          season,
          resultsLimit,
          signal,
        );

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
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw error;
        }

        getMobileTelemetry().trackEvent('search_global_fallback_triggered', {
          reason: error instanceof Error ? 'http_error' : 'parse_error',
          queryLength: debouncedQuery.length,
          season,
          limit: resultsLimit,
        });

        const [teamsPayload, playersPayload, competitionsPayload] = await Promise.all([
          searchTeamsByName(debouncedQuery, signal),
          searchPlayersByName(debouncedQuery, season, signal),
          searchLeaguesByName(debouncedQuery, signal),
        ]);

        return {
          teams: mapTeamSearchResults(teamsPayload, resultsLimit),
          players: mapPlayerSearchResults(playersPayload, resultsLimit),
          competitions: mapCompetitionResults(competitionsPayload, resultsLimit),
          matches: [],
        };
      }
    },
  });

  useEffect(() => {
    if (!hasEnoughChars) {
      return;
    }

    const requestKey = `${debouncedQuery}|${timezone}|${season}|${resultsLimit}`;
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
  }, [debouncedQuery, hasEnoughChars, resultsLimit, season, timezone]);

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
  const teamResults: SearchTeamResult[] =
    selectedTab === 'all' || selectedTab === 'teams' ? rawResults.teams : [];
  const playerResults: SearchPlayerResult[] =
    selectedTab === 'all' || selectedTab === 'players' ? rawResults.players : [];
  const competitionResults: SearchCompetitionResult[] =
    selectedTab === 'all' || selectedTab === 'competitions' ? rawResults.competitions : [];
  const matchResults: SearchMatchResult[] =
    selectedTab === 'all' || selectedTab === 'matches' ? rawResults.matches : [];

  return {
    selectedTab,
    query,
    debouncedQuery,
    hasEnoughChars,
    isLoading: searchQuery.isLoading && hasEnoughChars,
    isError: searchQuery.isError && hasEnoughChars,
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
    retry: searchQuery.refetch,
  };
}
