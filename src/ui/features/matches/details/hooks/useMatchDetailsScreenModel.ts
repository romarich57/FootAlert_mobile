import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNetInfo } from '@react-native-community/netinfo';
import {
  useIsFocused,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { usePowerState } from 'react-native-device-info';
import { useTranslation } from 'react-i18next';

import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';
import { safeNavigateEntity, sanitizeNumericEntityId } from '@ui/app/navigation/routeParams';
import type { RootStackParamList } from '@ui/app/navigation/types';
import {
  toArray,
} from '@ui/features/matches/details/hooks/matchDetailsDataTransforms';
import { useMatchDetailsDerivedState } from '@ui/features/matches/details/hooks/useMatchDetailsDerivedState';
import { useMatchDetailsQueryBundle } from '@ui/features/matches/details/hooks/useMatchDetailsQueryBundle';
import { useMatchesRefresh } from '@ui/features/matches/hooks/useMatchesRefresh';
import type { MatchDetailsTabKey } from '@ui/features/matches/types/matches.types';
import { resolveAppLocaleTag } from '@ui/shared/i18n/locale';

type MatchDetailsRoute = RouteProp<RootStackParamList, 'MatchDetails'>;
type MatchDetailsNavigation = NativeStackNavigationProp<RootStackParamList, 'MatchDetails'>;

export function useMatchDetailsScreenModel() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<MatchDetailsNavigation>();
  const route = useRoute<MatchDetailsRoute>();
  const isFocused = useIsFocused();
  const netInfo = useNetInfo();
  const powerState = usePowerState();
  const [activeTab, setActiveTab] = useState<MatchDetailsTabKey>('primary');
  const safeMatchId = sanitizeNumericEntityId(route.params.matchId);

  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris',
    [],
  );
  const locale = useMemo(
    () => resolveAppLocaleTag(i18n.language),
    [i18n.language],
  );

  const {
    fixtureQuery,
    fixture,
    lifecycleState,
    lineupsQuery,
    homeTeamId,
    awayTeamId,
    leagueId,
    season,
    queryPolicy,
    eventsQuery,
    statisticsQuery,
    canUseHalfStatistics,
    statisticsFirstHalfQuery,
    statisticsSecondHalfQuery,
    predictionsQuery,
    absencesQuery,
    headToHeadQuery,
    homePlayersStatsQuery,
    awayPlayersStatsQuery,
    standingsQuery,
    homeTeamMatchesQuery,
    awayTeamMatchesQuery,
    homeLeadersQuery,
    awayLeadersQuery,
  } = useMatchDetailsQueryBundle({
    safeMatchId,
    timezone,
    activeTab,
  });

  const {
    summaryIsFetching,
    isAnyDetailsQueryFetching,
    tabs,
    lastUpdatedAt,
    statusLabel,
    kickoffLabel,
    countdownLabel,
    events,
    statistics,
    statsRowsByPeriod,
    statsAvailablePeriods,
    preMatchTab,
    postMatchTab,
    lineupTeams,
    predictions,
    winPercent,
    absences,
    homePlayersStats,
    awayPlayersStats,
    standings,
    headToHead,
    datasetErrors,
    datasetErrorReasons,
    dataSources,
  } = useMatchDetailsDerivedState({
    t,
    locale,
    fixture,
    lifecycleState,
    homeTeamId,
    awayTeamId,
    leagueId,
    canUseHalfStatistics,
    lineupsQuery,
    eventsQuery,
    statisticsQuery,
    statisticsFirstHalfQuery,
    statisticsSecondHalfQuery,
    predictionsQuery,
    absencesQuery,
    headToHeadQuery,
    homePlayersStatsQuery,
    awayPlayersStatsQuery,
    standingsQuery,
    homeTeamMatchesQuery,
    awayTeamMatchesQuery,
    homeLeadersQuery,
    awayLeadersQuery,
  });

  const isInitialLoading = fixtureQuery.isLoading;
  const isInitialError = fixtureQuery.isError || !safeMatchId;
  const isOffline = netInfo.isConnected === false || netInfo.isInternetReachable === false;
  const networkLiteMode = isOffline || netInfo.details?.isConnectionExpensive === true;
  const batteryLiteMode = powerState.lowPowerMode === true;
  const activeBundle =
    activeTab === 'primary'
      ? 'primary'
      : activeTab === 'timeline' || activeTab === 'lineups' || activeTab === 'stats'
        ? 'live'
        : 'context';
  const refreshVisibleBundlesEnabled = activeBundle !== 'context';

  const refetchLiveData = useCallback(async () => {
    const refetchTasks: Array<() => Promise<unknown>> = [fixtureQuery.refetch];
    const runWithGuard = (enabled: boolean, callback: () => Promise<unknown>) => {
      if (enabled) {
        refetchTasks.push(callback);
      }
    };

    if (activeTab === 'primary') {
      runWithGuard(queryPolicy.enableLineups, lineupsQuery.refetch);
      runWithGuard(queryPolicy.enableEvents, eventsQuery.refetch);
      runWithGuard(queryPolicy.enableStatistics, statisticsQuery.refetch);
      runWithGuard(queryPolicy.enableHalfStatistics, statisticsFirstHalfQuery.refetch);
      runWithGuard(queryPolicy.enableHalfStatistics, statisticsSecondHalfQuery.refetch);
    } else if (activeTab === 'timeline') {
      runWithGuard(queryPolicy.enableEvents, eventsQuery.refetch);
    } else if (activeTab === 'lineups') {
      runWithGuard(queryPolicy.enableLineups, lineupsQuery.refetch);
      runWithGuard(queryPolicy.enableAbsences, absencesQuery.refetch);
      runWithGuard(queryPolicy.enableHomePlayersStats, homePlayersStatsQuery.refetch);
      runWithGuard(queryPolicy.enableAwayPlayersStats, awayPlayersStatsQuery.refetch);
    } else if (activeTab === 'standings') {
      runWithGuard(queryPolicy.enableStandings, standingsQuery.refetch);
    } else if (activeTab === 'stats') {
      runWithGuard(queryPolicy.enableStatistics, statisticsQuery.refetch);
      runWithGuard(queryPolicy.enableHalfStatistics, statisticsFirstHalfQuery.refetch);
      runWithGuard(queryPolicy.enableHalfStatistics, statisticsSecondHalfQuery.refetch);
    }

    const startedAtMs = Date.now();
    const results = await Promise.all(
      refetchTasks.map(task =>
        task().catch(() => ({ isError: true })),
      ),
    );
    const durationMs = Date.now() - startedAtMs;

    getMobileTelemetry().trackEvent('match_details.refetch.duration', {
      activeTab,
      bundle: activeBundle,
      lifecycleState,
      queryCount: refetchTasks.length,
      durationMs,
    });

    return {
      isError: results.some(result => {
        if (typeof result !== 'object' || result === null) {
          return true;
        }

        return Boolean((result as { isError?: boolean }).isError);
      }),
    };
  }, [
    absencesQuery,
    activeTab,
    activeBundle,
    awayPlayersStatsQuery,
    eventsQuery,
    fixtureQuery,
    homePlayersStatsQuery,
    lifecycleState,
    lineupsQuery,
    queryPolicy.enableAbsences,
    queryPolicy.enableAwayPlayersStats,
    queryPolicy.enableEvents,
    queryPolicy.enableHalfStatistics,
    queryPolicy.enableHomePlayersStats,
    queryPolicy.enableLineups,
    queryPolicy.enableStandings,
    queryPolicy.enableStatistics,
    standingsQuery,
    statisticsFirstHalfQuery,
    statisticsSecondHalfQuery,
    statisticsQuery,
  ]);

  useMatchesRefresh({
    enabled: isFocused && Boolean(safeMatchId) && !isOffline && refreshVisibleBundlesEnabled,
    hasLiveMatches: lifecycleState === 'live',
    isSlowNetwork: networkLiteMode,
    networkLiteMode,
    batteryLiteMode,
    refetch: refetchLiveData,
  });

  const retryVisibleQueries = useCallback(() => {
    const retry = (enabled: boolean, callback: () => Promise<unknown>) => {
      if (!enabled) {
        return;
      }

      callback().catch(() => undefined);
    };

    retry(true, fixtureQuery.refetch);

    if (activeTab === 'primary') {
      retry(queryPolicy.enableLineups, lineupsQuery.refetch);
      retry(queryPolicy.enableEvents, eventsQuery.refetch);
      retry(queryPolicy.enableStatistics, statisticsQuery.refetch);
      retry(queryPolicy.enableHalfStatistics, statisticsFirstHalfQuery.refetch);
      retry(queryPolicy.enableHalfStatistics, statisticsSecondHalfQuery.refetch);
      retry(queryPolicy.enablePredictions, predictionsQuery.refetch);
      retry(queryPolicy.enableStandings, standingsQuery.refetch);
      retry(queryPolicy.enableTeamContext, homeTeamMatchesQuery.refetch);
      retry(queryPolicy.enableTeamContext, awayTeamMatchesQuery.refetch);
      retry(queryPolicy.enablePreMatchExtras, homeLeadersQuery.refetch);
      retry(queryPolicy.enablePreMatchExtras, awayLeadersQuery.refetch);
    } else if (activeTab === 'timeline') {
      retry(queryPolicy.enableEvents, eventsQuery.refetch);
    } else if (activeTab === 'lineups') {
      retry(queryPolicy.enableLineups, lineupsQuery.refetch);
      retry(queryPolicy.enableAbsences, absencesQuery.refetch);
      retry(queryPolicy.enableHomePlayersStats, homePlayersStatsQuery.refetch);
      retry(queryPolicy.enableAwayPlayersStats, awayPlayersStatsQuery.refetch);
    } else if (activeTab === 'standings') {
      retry(queryPolicy.enableStandings, standingsQuery.refetch);
    } else if (activeTab === 'stats') {
      retry(queryPolicy.enableStatistics, statisticsQuery.refetch);
      retry(queryPolicy.enableHalfStatistics, statisticsFirstHalfQuery.refetch);
      retry(queryPolicy.enableHalfStatistics, statisticsSecondHalfQuery.refetch);
    } else if (activeTab === 'faceOff') {
      retry(queryPolicy.enableHeadToHead, headToHeadQuery.refetch);
    }
  }, [
    absencesQuery,
    activeTab,
    awayPlayersStatsQuery,
    awayTeamMatchesQuery,
    awayLeadersQuery,
    eventsQuery,
    fixtureQuery,
    headToHeadQuery,
    homeLeadersQuery,
    homePlayersStatsQuery,
    homeTeamMatchesQuery,
    lineupsQuery,
    predictionsQuery,
    queryPolicy.enableAbsences,
    queryPolicy.enableAwayPlayersStats,
    queryPolicy.enableEvents,
    queryPolicy.enableHalfStatistics,
    queryPolicy.enableHeadToHead,
    queryPolicy.enableHomePlayersStats,
    queryPolicy.enableLineups,
    queryPolicy.enablePreMatchExtras,
    queryPolicy.enablePredictions,
    queryPolicy.enableStandings,
    queryPolicy.enableStatistics,
    queryPolicy.enableTeamContext,
    standingsQuery,
    statisticsFirstHalfQuery,
    statisticsSecondHalfQuery,
    statisticsQuery,
  ]);

  const onRefreshLineups = useCallback(() => {
    lineupsQuery.refetch().catch(() => undefined);
  }, [lineupsQuery]);

  const handlePressMatch = useCallback((matchId: string) => {
    safeNavigateEntity(navigation, 'MatchDetails', matchId);
  }, [navigation]);

  const handlePressTeam = useCallback((teamId: string) => {
    const safeTeamId = sanitizeNumericEntityId(teamId);
    if (!safeTeamId) {
      return;
    }

    if (safeTeamId === homeTeamId || safeTeamId === awayTeamId) {
      return;
    }

    safeNavigateEntity(navigation, 'TeamDetails', safeTeamId);
  }, [awayTeamId, homeTeamId, navigation]);

  const handlePressPlayer = useCallback((playerId: string) => {
    safeNavigateEntity(navigation, 'PlayerDetails', playerId);
  }, [navigation]);

  const handlePressCompetition = useCallback((competitionId: string) => {
    safeNavigateEntity(navigation, 'CompetitionDetails', competitionId);
  }, [navigation]);

  const loadWindowStartedAtRef = useRef<number>(Date.now());
  const trackedDataCostRef = useRef<string | null>(null);

  useEffect(() => {
    loadWindowStartedAtRef.current = Date.now();
    trackedDataCostRef.current = null;
  }, [activeTab, lifecycleState, queryPolicy.enabledQueryCount, safeMatchId]);

  useEffect(() => {
    if (!safeMatchId || isInitialLoading || isAnyDetailsQueryFetching) {
      return;
    }

    const key = `${safeMatchId}:${lifecycleState}:${activeTab}:${queryPolicy.enabledQueryCount}`;
    if (trackedDataCostRef.current === key) {
      return;
    }

    trackedDataCostRef.current = key;
    getMobileTelemetry().trackEvent('match_details.data_cost', {
      matchId: safeMatchId,
      lifecycleState,
      activeTab,
      bundle: activeBundle,
      enabledQueries: queryPolicy.enabledQueryCount,
      loadDurationMs: Date.now() - loadWindowStartedAtRef.current,
    });
  }, [
    activeTab,
    activeBundle,
    isAnyDetailsQueryFetching,
    isInitialLoading,
    lifecycleState,
    queryPolicy.enabledQueryCount,
    safeMatchId,
  ]);

  const queryLineupsRaw = toArray(lineupsQuery.data);
  const queryHeadToHeadRaw = toArray(headToHeadQuery.data);
  const autoRefetchedFinishedLineupsRef = useRef<string | null>(null);
  const autoRefetchedPrematchHeadToHeadRef = useRef<string | null>(null);

  useEffect(() => {
    if (!safeMatchId) {
      autoRefetchedFinishedLineupsRef.current = null;
      return;
    }

    const guardKey = `${safeMatchId}:finished`;
    if (lifecycleState !== 'finished') {
      if (autoRefetchedFinishedLineupsRef.current === guardKey) {
        autoRefetchedFinishedLineupsRef.current = null;
      }
      return;
    }

    if (queryLineupsRaw.length > 0 || lineupsQuery.isFetching) {
      return;
    }

    if (autoRefetchedFinishedLineupsRef.current === guardKey) {
      return;
    }

    autoRefetchedFinishedLineupsRef.current = guardKey;
    lineupsQuery.refetch().catch(() => undefined);
  }, [lifecycleState, lineupsQuery, queryLineupsRaw.length, safeMatchId]);

  useEffect(() => {
    if (!safeMatchId) {
      autoRefetchedPrematchHeadToHeadRef.current = null;
      return;
    }

    const guardKey = `${safeMatchId}:pre_match:h2h`;
    if (lifecycleState !== 'pre_match') {
      if (autoRefetchedPrematchHeadToHeadRef.current === guardKey) {
        autoRefetchedPrematchHeadToHeadRef.current = null;
      }
      return;
    }

    if (!queryPolicy.enableHeadToHead) {
      return;
    }

    if (queryHeadToHeadRaw.length > 0 || headToHeadQuery.isFetching) {
      return;
    }

    if (autoRefetchedPrematchHeadToHeadRef.current === guardKey) {
      return;
    }

    autoRefetchedPrematchHeadToHeadRef.current = guardKey;
    headToHeadQuery.refetch().catch(() => undefined);
  }, [
    headToHeadQuery,
    lifecycleState,
    queryHeadToHeadRaw.length,
    queryPolicy.enableHeadToHead,
    safeMatchId,
  ]);

  useEffect(() => {
    setActiveTab(currentTab => (currentTab === 'primary' ? currentTab : 'primary'));
  }, [safeMatchId]);

  useEffect(() => {
    if (tabs.some(tab => tab.key === activeTab)) {
      return;
    }

    const nextTab = tabs[0]?.key ?? 'primary';
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [activeTab, tabs]);

  return {
    isPreMatch: lifecycleState === 'pre_match',
    isLive: lifecycleState === 'live',
    isFinished: lifecycleState === 'finished',
    isInitialLoading,
    isInitialError,
    isLiveRefreshing: summaryIsFetching,
    onRetryAll: retryVisibleQueries,
    onRefreshLineups,
    handlePressMatch,
    handlePressTeam,
    handlePressPlayer,
    handlePressCompetition,
    isLineupsRefetching: lineupsQuery.isFetching,
    navigation,
    safeMatchId,
    timezone,
    activeTab,
    setActiveTab,
    lifecycleState,
    queryPolicy,
    queryContext: {
      leagueId,
      season,
    },
    tabs,
    fixture,
    lastUpdatedAt,
    statusLabel,
    kickoffLabel,
    countdownLabel,
    events,
    statistics,
    statsRowsByPeriod,
    statsAvailablePeriods,
    preMatchTab,
    postMatchTab,
    lineupTeams,
    predictions,
    winPercent,
    absences,
    homePlayersStats,
    awayPlayersStats,
    standings,
    homeTeamId,
    awayTeamId,
    headToHead,
    datasetErrors,
    datasetErrorReasons,
    dataSources,
  };
}
