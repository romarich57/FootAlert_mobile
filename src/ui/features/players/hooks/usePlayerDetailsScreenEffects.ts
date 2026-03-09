import { useCallback, useEffect, useRef } from 'react';
import type { NetInfoState } from '@react-native-community/netinfo';
import { useFocusEffect } from '@react-navigation/native';
import type { QueryClient } from '@tanstack/react-query';

import { appEnv } from '@data/config/env';
import {
  fetchPlayerMatchesAggregate,
  fetchPlayerStatsCatalog,
  PLAYER_MATCHES_LIMIT,
} from '@data/endpoints/playersApi';
import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';
import { usePlayerDetailsScreenModel } from '@ui/features/players/hooks/usePlayerDetailsScreenModel';
import type { PlayerTabType } from '@ui/features/players/components/PlayerTabs';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';

type PlayerDetailsScreenModel = ReturnType<typeof usePlayerDetailsScreenModel>;

type UsePlayerDetailsScreenEffectsParams = {
  safePlayerId: string | null;
  activeTab: PlayerTabType;
  screenModel: PlayerDetailsScreenModel;
  queryClient: QueryClient;
  netInfo: NetInfoState;
  powerState: {
    lowPowerMode?: boolean;
  };
};

export function usePlayerDetailsScreenEffects({
  safePlayerId,
  activeTab,
  screenModel,
  queryClient,
  netInfo,
  powerState,
}: UsePlayerDetailsScreenEffectsParams) {
  const screenOpenedAtRef = useRef(Date.now());
  const firstContentTrackedRef = useRef(false);
  const tabLoadStartedAtRef = useRef(Date.now());
  const lastTrackedTabRef = useRef<PlayerTabType>(activeTab);
  const trackedTabLoadKeyRef = useRef<string | null>(null);
  const prefetchedContextRef = useRef<string | null>(null);

  useEffect(() => {
    screenOpenedAtRef.current = Date.now();
    firstContentTrackedRef.current = false;
    tabLoadStartedAtRef.current = Date.now();
    lastTrackedTabRef.current = activeTab;
    trackedTabLoadKeyRef.current = null;
    prefetchedContextRef.current = null;
    if (safePlayerId) {
      getMobileTelemetry().trackEvent('player_details.screen_open_ms', {
        playerId: safePlayerId,
        tab: activeTab,
        value: 0,
      });
    }
  }, [activeTab, safePlayerId]);

  useFocusEffect(
    useCallback(() => {
      if (!safePlayerId || activeTab !== 'matchs') {
        return;
      }

      const teamId = screenModel.profile?.team.id;
      if (!teamId) {
        return;
      }

      const filters = { stale: true } as const;
      queryClient.invalidateQueries({
        queryKey: queryKeys.players.matchesAggregate(
          safePlayerId,
          teamId,
          screenModel.selectedSeason,
        ),
        ...filters,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.players.matchesLegacy(
          safePlayerId,
          teamId,
          screenModel.selectedSeason,
        ),
        ...filters,
      });
    }, [
      activeTab,
      queryClient,
      safePlayerId,
      screenModel.profile?.team.id,
      screenModel.selectedSeason,
    ]),
  );

  useEffect(() => {
    if (lastTrackedTabRef.current !== activeTab) {
      lastTrackedTabRef.current = activeTab;
      tabLoadStartedAtRef.current = Date.now();
      trackedTabLoadKeyRef.current = null;
    }
  }, [activeTab]);

  const isActiveTabLoading =
    activeTab === 'profil'
      ? screenModel.isProfileLoading
      : activeTab === 'matchs'
        ? screenModel.isMatchesLoading
        : activeTab === 'stats'
          ? screenModel.isStatsLoading
          : screenModel.isCareerLoading;

  useEffect(() => {
    if (!safePlayerId || firstContentTrackedRef.current) {
      return;
    }

    if (screenModel.isProfileLoading || !screenModel.profile) {
      return;
    }

    firstContentTrackedRef.current = true;
    getMobileTelemetry().trackEvent('player_details.first_content_ms', {
      playerId: safePlayerId,
      tab: activeTab,
      value: Date.now() - screenOpenedAtRef.current,
      cache_hit_estimate: screenModel.hasCachedData,
    });
  }, [
    activeTab,
    safePlayerId,
    screenModel.hasCachedData,
    screenModel.isProfileLoading,
    screenModel.profile,
  ]);

  useEffect(() => {
    if (!safePlayerId || isActiveTabLoading) {
      return;
    }

    const tabLoadKey = [
      safePlayerId,
      activeTab,
      screenModel.statsSelectedLeagueId ?? 'none',
      screenModel.statsSelectedSeason ?? 'none',
    ].join(':');
    if (trackedTabLoadKeyRef.current === tabLoadKey) {
      return;
    }
    trackedTabLoadKeyRef.current = tabLoadKey;

    getMobileTelemetry().trackEvent('player_details.tab_load_ms', {
      playerId: safePlayerId,
      tab: activeTab,
      value: Date.now() - tabLoadStartedAtRef.current,
      cache_hit_estimate: screenModel.hasCachedData,
    });
  }, [
    activeTab,
    isActiveTabLoading,
    safePlayerId,
    screenModel.hasCachedData,
    screenModel.statsSelectedLeagueId,
    screenModel.statsSelectedSeason,
  ]);

  useEffect(() => {
    const isOffline =
      netInfo.isConnected === false || netInfo.isInternetReachable === false;
    const networkLiteMode =
      isOffline || netInfo.details?.isConnectionExpensive === true;
    const batteryLiteMode = powerState.lowPowerMode === true;
    const teamId = screenModel.profile?.team.id;

    if (
      !safePlayerId ||
      !teamId ||
      screenModel.isProfileLoading ||
      isOffline ||
      networkLiteMode ||
      batteryLiteMode
    ) {
      return;
    }

    const prefetchContextKey = [
      safePlayerId,
      teamId,
      screenModel.selectedSeason,
    ].join(':');
    if (prefetchedContextRef.current === prefetchContextKey) {
      return;
    }
    prefetchedContextRef.current = prefetchContextKey;

    const prefetchTasks: Array<Promise<unknown>> = [];

    if (appEnv.mobileEnablePlayerStatsCatalogAggregate) {
      prefetchTasks.push(
        queryClient.prefetchQuery({
          queryKey: queryKeys.players.statsCatalogV2(safePlayerId),
          queryFn: ({ signal }) => fetchPlayerStatsCatalog(safePlayerId, signal),
          ...featureQueryOptions.players.statsCatalog,
        }),
      );
    }

    if (appEnv.mobileEnableBffPlayerAggregates) {
      prefetchTasks.push(
        queryClient.prefetchQuery({
          queryKey: queryKeys.players.matchesAggregate(
            safePlayerId,
            teamId,
            screenModel.selectedSeason,
          ),
          queryFn: ({ signal }) =>
            fetchPlayerMatchesAggregate(
              safePlayerId,
              teamId,
              screenModel.selectedSeason,
              PLAYER_MATCHES_LIMIT,
              signal,
            ),
          ...featureQueryOptions.players.matches,
        }),
      );
    }

    if (prefetchTasks.length > 0) {
      void Promise.allSettled(prefetchTasks);
    }
  }, [
    netInfo.details?.isConnectionExpensive,
    netInfo.isConnected,
    netInfo.isInternetReachable,
    powerState.lowPowerMode,
    queryClient,
    safePlayerId,
    screenModel.isProfileLoading,
    screenModel.profile?.team.id,
    screenModel.selectedSeason,
  ]);
}
