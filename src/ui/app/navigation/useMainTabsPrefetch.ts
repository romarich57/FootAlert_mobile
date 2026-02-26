import { useCallback, useMemo, useRef } from 'react';
import { useNetInfo } from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';

import { appEnv } from '@data/config/env';
import { fetchAllLeagues } from '@data/endpoints/competitionsApi';
import {
  fetchNextFixtureForTeam,
  fetchPlayerSeasonStats,
  fetchTeamById,
  fetchTrendingPlayers,
  fetchTrendingTeams,
} from '@data/endpoints/followsApi';
import {
  getCurrentSeasonYear,
  mapPlayerSeasonToFollowedCard,
  mapTeamDetailsAndFixtureToFollowedCard,
  mapTrendingPlayersFromTopScorers,
  mapTrendingTeamsFromStandings,
} from '@data/mappers/followsMapper';
import {
  loadFollowedPlayerIds,
  loadFollowedTeamIds,
} from '@data/storage/followsStorage';
import { buildMatchesQueryResult, MATCHES_QUERY_STALE_TIME_MS, shouldRetryMatchesQuery } from '@ui/features/matches/hooks/useMatchesQuery';
import { mapWithConcurrency } from '@ui/shared/query/mapWithConcurrency';
import { queryKeys } from '@ui/shared/query/queryKeys';
import type { MainTabParamList } from '@ui/app/navigation/types';
import { TOP_COMPETITION_IDS } from '@/shared/constants';

type PrefetchTabName = Extract<keyof MainTabParamList, 'Matches' | 'Competitions' | 'Follows'>;

type TabListener = {
  tabPress: () => void;
};

export const TAB_PREFETCH_COOLDOWN_MS = 20_000;

const FOLLOWS_CARDS_CONCURRENCY = 3;
const COMPETITIONS_CATALOG_STALE_TIME_MS = 10 * 60_000;

function toApiDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTopLeagueIds(): string[] {
  return TOP_COMPETITION_IDS.slice(0, appEnv.followsTrendsLeagueCount);
}

export function useMainTabsPrefetch(): Record<PrefetchTabName, TabListener> {
  const queryClient = useQueryClient();
  const netInfo = useNetInfo();
  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris',
    [],
  );

  const lastPrefetchAtByTabRef = useRef<Record<PrefetchTabName, number>>({
    Matches: 0,
    Competitions: 0,
    Follows: 0,
  });

  const prefetchMatchesTab = useCallback(async () => {
    const date = toApiDateString(new Date());
    await queryClient.prefetchQuery({
      queryKey: queryKeys.matches(date, timezone),
      staleTime: MATCHES_QUERY_STALE_TIME_MS,
      retry: shouldRetryMatchesQuery,
      queryFn: ({ signal }) => buildMatchesQueryResult({ date, timezone, signal }),
    });
  }, [queryClient, timezone]);

  const prefetchCompetitionsTab = useCallback(async () => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.competitions.catalog(),
      staleTime: COMPETITIONS_CATALOG_STALE_TIME_MS,
      queryFn: ({ signal }) => fetchAllLeagues(signal),
    });
  }, [queryClient]);

  const prefetchFollowsTab = useCallback(async () => {
    const season = getCurrentSeasonYear();
    const followedTeamIds = await queryClient.fetchQuery({
      queryKey: queryKeys.follows.followedTeamIds(),
      queryFn: loadFollowedTeamIds,
      staleTime: Infinity,
    });
    const followedPlayerIds = await queryClient.fetchQuery({
      queryKey: queryKeys.follows.followedPlayerIds(),
      queryFn: loadFollowedPlayerIds,
      staleTime: Infinity,
    });

    const sortedTeamIds = [...followedTeamIds].sort();
    const sortedPlayerIds = [...followedPlayerIds].sort();
    const topLeagueIds = getTopLeagueIds();

    const prefetchTasks: Array<Promise<unknown>> = [];

    if (sortedTeamIds.length > 0) {
      prefetchTasks.push(
        queryClient.prefetchQuery({
          queryKey: queryKeys.follows.followedTeamCards(sortedTeamIds, timezone),
          staleTime: appEnv.followsTeamNextFixtureTtlMs,
          queryFn: async ({ signal }) => {
            return mapWithConcurrency(sortedTeamIds, FOLLOWS_CARDS_CONCURRENCY, async teamId => {
              const [teamDetails, nextFixture] = await Promise.all([
                fetchTeamById(teamId, signal),
                fetchNextFixtureForTeam(teamId, timezone, signal),
              ]);
              return mapTeamDetailsAndFixtureToFollowedCard(teamId, teamDetails, nextFixture);
            });
          },
        }),
      );
    }

    if (sortedPlayerIds.length > 0) {
      prefetchTasks.push(
        queryClient.prefetchQuery({
          queryKey: queryKeys.follows.followedPlayerCards(sortedPlayerIds, season),
          staleTime: appEnv.followsPlayerStatsTtlMs,
          queryFn: async ({ signal }) => {
            return mapWithConcurrency(sortedPlayerIds, FOLLOWS_CARDS_CONCURRENCY, async playerId => {
              const payload = await fetchPlayerSeasonStats(playerId, season, signal);
              return mapPlayerSeasonToFollowedCard(playerId, payload, season);
            });
          },
        }),
      );
    }

    if (topLeagueIds.length > 0 && sortedTeamIds.length > 0) {
      prefetchTasks.push(
        queryClient.prefetchQuery({
          queryKey: queryKeys.follows.trends('teams', season, false),
          staleTime: appEnv.followsTrendsTtlMs,
          queryFn: async ({ signal }) => {
            try {
              const payload = await fetchTrendingTeams(topLeagueIds, season, signal);
              return mapTrendingTeamsFromStandings(payload, appEnv.followsTrendsTeamsLimit);
            } catch {
              return [];
            }
          },
        }),
      );
    }

    if (topLeagueIds.length > 0 && sortedPlayerIds.length > 0) {
      prefetchTasks.push(
        queryClient.prefetchQuery({
          queryKey: queryKeys.follows.trends('players', season, false),
          staleTime: appEnv.followsTrendsTtlMs,
          queryFn: async ({ signal }) => {
            try {
              const payload = await fetchTrendingPlayers(topLeagueIds, season, signal);
              return mapTrendingPlayersFromTopScorers(
                payload,
                appEnv.followsTrendsPlayersLimit,
                season,
              );
            } catch {
              return [];
            }
          },
        }),
      );
    }

    await Promise.allSettled(prefetchTasks);
  }, [queryClient, timezone]);

  const triggerTabPrefetch = useCallback((tabName: PrefetchTabName) => {
    const isOffline =
      netInfo.isConnected === false || netInfo.isInternetReachable === false;
    if (isOffline) {
      return;
    }

    const now = Date.now();
    const lastTriggeredAt = lastPrefetchAtByTabRef.current[tabName];
    if (lastTriggeredAt > 0 && now - lastTriggeredAt < TAB_PREFETCH_COOLDOWN_MS) {
      return;
    }
    lastPrefetchAtByTabRef.current[tabName] = now;

    if (tabName === 'Matches') {
      prefetchMatchesTab().catch(() => undefined);
      return;
    }

    if (tabName === 'Competitions') {
      prefetchCompetitionsTab().catch(() => undefined);
      return;
    }

    prefetchFollowsTab().catch(() => undefined);
  }, [
    netInfo.isConnected,
    netInfo.isInternetReachable,
    prefetchCompetitionsTab,
    prefetchFollowsTab,
    prefetchMatchesTab,
  ]);

  return useMemo(
    () => ({
      Matches: {
        tabPress: () => {
          triggerTabPrefetch('Matches');
        },
      },
      Competitions: {
        tabPress: () => {
          triggerTabPrefetch('Competitions');
        },
      },
      Follows: {
        tabPress: () => {
          triggerTabPrefetch('Follows');
        },
      },
    }),
    [triggerTabPrefetch],
  );
}
