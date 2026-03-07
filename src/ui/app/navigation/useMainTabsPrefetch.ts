import { useCallback, useMemo, useRef } from 'react';
import { useNetInfo } from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import { usePowerState } from 'react-native-device-info';

import { appEnv } from '@data/config/env';
import { fetchAllLeagues } from '@data/endpoints/competitionsApi';
import {
  fetchDiscoveryPlayers,
  fetchDiscoveryTeams,
  fetchFollowedPlayerCards,
  fetchFollowedTeamCards,
} from '@data/endpoints/followsApi';
import { getCurrentSeasonYear } from '@data/mappers/followsMapper';
import {
  loadFollowedPlayerIds,
  loadFollowedTeamIds,
} from '@data/storage/followsStorage';
import { buildMatchesQueryResult, MATCHES_QUERY_STALE_TIME_MS, shouldRetryMatchesQuery } from '@ui/features/matches/hooks/useMatchesQuery';
import { queryKeys } from '@ui/shared/query/queryKeys';
import type { MainTabParamList } from '@ui/app/navigation/types';

type PrefetchTabName = Extract<keyof MainTabParamList, 'Matches' | 'Competitions' | 'Follows'>;

type TabListener = {
  tabPress: () => void;
};

export const TAB_PREFETCH_COOLDOWN_MS = 20_000;

const COMPETITIONS_CATALOG_STALE_TIME_MS = 10 * 60_000;

function toApiDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function useMainTabsPrefetch(): Record<PrefetchTabName, TabListener> {
  const queryClient = useQueryClient();
  const netInfo = useNetInfo();
  const powerState = usePowerState();
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
    const prefetchTasks: Array<Promise<unknown>> = [];

    if (sortedTeamIds.length > 0) {
      prefetchTasks.push(
        queryClient.prefetchQuery({
          queryKey: queryKeys.follows.followedTeamCards(sortedTeamIds, timezone),
          staleTime: appEnv.followsTeamNextFixtureTtlMs,
          queryFn: ({ signal }) => fetchFollowedTeamCards(sortedTeamIds, timezone, signal),
        }),
      );
    }

    if (sortedPlayerIds.length > 0) {
      prefetchTasks.push(
        queryClient.prefetchQuery({
          queryKey: queryKeys.follows.followedPlayerCards(sortedPlayerIds, season),
          staleTime: appEnv.followsPlayerStatsTtlMs,
          queryFn: ({ signal }) => fetchFollowedPlayerCards(sortedPlayerIds, season, signal),
        }),
      );
    }

    prefetchTasks.push(
      queryClient.prefetchQuery({
        queryKey: queryKeys.follows.discovery('teams', appEnv.followsTrendsTeamsLimit),
        staleTime: appEnv.followsTrendsTtlMs,
        queryFn: ({ signal }) => fetchDiscoveryTeams(appEnv.followsTrendsTeamsLimit, signal),
      }),
    );

    prefetchTasks.push(
      queryClient.prefetchQuery({
        queryKey: queryKeys.follows.discovery('players', appEnv.followsTrendsPlayersLimit),
        staleTime: appEnv.followsTrendsTtlMs,
        queryFn: ({ signal }) => fetchDiscoveryPlayers(appEnv.followsTrendsPlayersLimit, signal),
      }),
    );

    await Promise.allSettled(prefetchTasks);
  }, [queryClient, timezone]);

  const triggerTabPrefetch = useCallback((tabName: PrefetchTabName) => {
    const isOffline =
      netInfo.isConnected === false || netInfo.isInternetReachable === false;
    const networkLiteMode = isOffline || netInfo.details?.isConnectionExpensive === true;
    const batteryLiteMode = powerState.lowPowerMode === true;
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
      if (networkLiteMode || batteryLiteMode) {
        return;
      }
      prefetchCompetitionsTab().catch(() => undefined);
      return;
    }

    if (networkLiteMode || batteryLiteMode) {
      return;
    }
    prefetchFollowsTab().catch(() => undefined);
  }, [
    netInfo.isConnected,
    netInfo.isInternetReachable,
    netInfo.details?.isConnectionExpensive,
    prefetchCompetitionsTab,
    prefetchFollowsTab,
    prefetchMatchesTab,
    powerState.lowPowerMode,
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
