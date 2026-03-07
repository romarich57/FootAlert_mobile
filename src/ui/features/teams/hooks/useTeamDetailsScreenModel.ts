import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { fetchTeamOverview } from '@data/endpoints/teamsApi';
import type { RootStackParamList } from '@ui/app/navigation/types';
import { sanitizeNumericEntityId } from '@ui/app/navigation/routeParams';
import { useTeamContext } from '@ui/features/teams/hooks/useTeamContext';
import { useTeamMatches } from '@ui/features/teams/hooks/useTeamMatches';
import { useTeamOverview } from '@ui/features/teams/hooks/useTeamOverview';
import { useTeamSquad } from '@ui/features/teams/hooks/useTeamSquad';
import { useTeamStandings } from '@ui/features/teams/hooks/useTeamStandings';
import { fetchTeamStatsCoreData, useTeamStats } from '@ui/features/teams/hooks/useTeamStats';
import { fetchTeamTransfersData, useTeamTransfers } from '@ui/features/teams/hooks/useTeamTransfers';
import { resolveTeamStatsVisibility } from '@ui/features/teams/components/stats/teamStatsSelectors';
import type { TeamDetailsTab } from '@ui/features/teams/types/teams.types';
import { useFollowsActions } from '@ui/features/follows/hooks/useFollowsActions';
import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';

type TeamDetailsRoute = RouteProp<RootStackParamList, 'TeamDetails'>;
type TeamDetailsNavigation = NativeStackNavigationProp<RootStackParamList>;

function isLeagueCompetition(type: string | null | undefined): boolean {
  return (type ?? '').trim().toLowerCase() === 'league';
}

type QueryStateLike = Pick<
  UseQueryResult<unknown>,
  'isLoading' | 'isFetching' | 'isError' | 'isFetched' | 'isFetchedAfterMount'
>;

type IdleRequestHandle = number;
type IdleRequestOptions = {
  timeout?: number;
};
type IdleRequestDeadline = {
  readonly didTimeout: boolean;
  timeRemaining: () => number;
};
type IdleRequestCallback = (deadline: IdleRequestDeadline) => void;
type GlobalWithIdleCallbacks = typeof globalThis & {
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions,
  ) => IdleRequestHandle;
  cancelIdleCallback?: (handle: IdleRequestHandle) => void;
};
type DeferredTaskHandle = {
  cancel: () => void;
};

function scheduleDeferredTask(task: () => void): DeferredTaskHandle {
  const globalScope = globalThis as GlobalWithIdleCallbacks;

  if (typeof globalScope.requestIdleCallback === 'function') {
    const idleHandle = globalScope.requestIdleCallback(() => {
      task();
    }, { timeout: 250 });

    return {
      cancel: () => {
        if (typeof globalScope.cancelIdleCallback === 'function') {
          globalScope.cancelIdleCallback(idleHandle);
        }
      },
    };
  }

  const timeoutHandle = setTimeout(task, 0);
  return {
    cancel: () => {
      clearTimeout(timeoutHandle);
    },
  };
}

function shouldDisplayDataTab({
  hasData,
  query,
}: {
  hasData: boolean;
  query: QueryStateLike;
}): boolean {
  if (query.isError) {
    return true;
  }

  if (query.isLoading || query.isFetching) {
    return true;
  }

  const hasFetchedAfterMount = query.isFetchedAfterMount ?? query.isFetched;
  if (!hasFetchedAfterMount) {
    return true;
  }

  return hasData;
}

export function useTeamDetailsScreenModel() {
  const { t } = useTranslation();
  const navigation = useNavigation<TeamDetailsNavigation>();
  const route = useRoute<TeamDetailsRoute>();
  const queryClient = useQueryClient();
  const safeTeamId = sanitizeNumericEntityId(route.params.teamId);
  const teamId = safeTeamId ?? '';

  const [activeTab, setActiveTab] = useState<TeamDetailsTab>('overview');
  const requestCountTelemetryKeyRef = useRef<string | null>(null);
  const prefetchedContextKeyRef = useRef<string | null>(null);
  const prefetchedStatsCoreKeyRef = useRef<string | null>(null);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  const { followedTeamIds, toggleTeamFollow } = useFollowsActions();
  const isFollowed = Boolean(safeTeamId) && followedTeamIds.includes(teamId);

  const {
    team,
    timezone,
    competitions,
    selectedLeagueId,
    selectedSeason,
    setLeague,
    setLeagueSeason,
    setSeason,
    isLoading: isContextLoading,
    isError: isContextError,
    lastUpdatedAt: contextLastUpdatedAt,
    hasCachedData: hasContextCachedData,
    refetch: refetchContext,
  } = useTeamContext({ teamId });

  const hasLeagueSelection = Boolean(selectedLeagueId) && typeof selectedSeason === 'number';
  const isOverviewTabActive = activeTab === 'overview';
  const isMatchesTabActive = activeTab === 'matches';
  const isStandingsTabActive = activeTab === 'standings';
  const isStatsTabActive = activeTab === 'stats';
  const isTransfersTabActive = activeTab === 'transfers';
  const isSquadTabActive = activeTab === 'squad';
  const standingsCompetitions = useMemo(
    () => competitions.filter(item => isLeagueCompetition(item.type)),
    [competitions],
  );
  const standingsSeasons = useMemo(() => {
    if (activeTab !== 'standings') {
      return [];
    }

    const selectedStandingsCompetition =
      standingsCompetitions.find(item => item.leagueId === selectedLeagueId) ??
      standingsCompetitions[0] ??
      null;

    return selectedStandingsCompetition?.seasons ?? [];
  }, [activeTab, selectedLeagueId, standingsCompetitions]);

  const selectedCompetitionSeasons = useMemo(() => {
    const selectedCompetition = competitions.find(item => item.leagueId === selectedLeagueId) ?? null;
    return selectedCompetition?.seasons ?? [];
  }, [competitions, selectedLeagueId]);

  useEffect(() => {
    if (activeTab !== 'standings') {
      return;
    }

    if (standingsCompetitions.length === 0) {
      return;
    }

    const selectedCompetition = competitions.find(item => item.leagueId === selectedLeagueId) ?? null;
    if (selectedCompetition && isLeagueCompetition(selectedCompetition.type)) {
      return;
    }

    setLeague(standingsCompetitions[0].leagueId);
  }, [activeTab, competitions, selectedLeagueId, setLeague, standingsCompetitions]);

  const overviewQuery = useTeamOverview({
    teamId,
    leagueId: selectedLeagueId,
    season: selectedSeason,
    timezone,
    competitionSeasons: selectedCompetitionSeasons,
    enabled: hasLeagueSelection && isOverviewTabActive,
  });

  const matchesQuery = useTeamMatches({
    teamId,
    leagueId: selectedLeagueId,
    season: selectedSeason,
    timezone,
    enabled: hasLeagueSelection && isMatchesTabActive,
  });

  const standingsQuery = useTeamStandings({
    teamId,
    leagueId: selectedLeagueId,
    season: selectedSeason,
    enabled: hasLeagueSelection && isStandingsTabActive,
  });

  const statsQuery = useTeamStats({
    teamId,
    leagueId: selectedLeagueId,
    season: selectedSeason,
    enabled: hasLeagueSelection && isStatsTabActive,
  });

  const transfersQuery = useTeamTransfers({
    teamId,
    season: selectedSeason,
    enabled: Boolean(safeTeamId) && isTransfersTabActive,
  });

  const squadQuery = useTeamSquad({
    teamId,
    enabled: Boolean(safeTeamId) && isSquadTabActive,
  });

  const activeRequestCount = useMemo(() => {
    let count = 1; // Team context query.

    if (hasLeagueSelection && isOverviewTabActive) {
      count += 2;
    }
    if (hasLeagueSelection && isMatchesTabActive) {
      count += 1;
    }
    if (hasLeagueSelection && isStandingsTabActive) {
      count += 1;
    }
    if (hasLeagueSelection && isStatsTabActive) {
      count += 3;
    }
    if (safeTeamId && isTransfersTabActive) {
      count += 1;
    }
    if (safeTeamId && isSquadTabActive) {
      count += 1;
    }

    return count;
  }, [
    hasLeagueSelection,
    isMatchesTabActive,
    isOverviewTabActive,
    isSquadTabActive,
    isStandingsTabActive,
    isStatsTabActive,
    isTransfersTabActive,
    safeTeamId,
  ]);

  useEffect(() => {
    if (!safeTeamId || !selectedLeagueId || typeof selectedSeason !== 'number' || !timezone) {
      return;
    }

    const historySeasons = selectedCompetitionSeasons.filter(item => item !== selectedSeason).slice(0, 5);
    const historySeasonsKey = historySeasons.join(',');
    const prefetchContextKey = [
      teamId,
      selectedLeagueId,
      selectedSeason,
      timezone,
      historySeasonsKey,
    ].join(':');
    if (prefetchedContextKeyRef.current === prefetchContextKey) {
      return;
    }
    prefetchedContextKeyRef.current = prefetchContextKey;

    void Promise.allSettled([
      queryClient.prefetchQuery({
        queryKey: queryKeys.teams.overview(
          teamId,
          selectedLeagueId,
          selectedSeason,
          timezone,
          historySeasonsKey,
        ),
        queryFn: ({ signal }) =>
          fetchTeamOverview(
            {
              teamId,
              leagueId: selectedLeagueId,
              season: selectedSeason,
              timezone,
              historySeasons,
            },
            signal,
          ),
        ...featureQueryOptions.teams.overview,
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.teams.transfers(teamId, selectedSeason),
        queryFn: ({ signal }) =>
          fetchTeamTransfersData({
            teamId,
            season: selectedSeason,
            signal,
          }),
        ...featureQueryOptions.teams.transfers,
      }),
    ]);
  }, [
    prefetchedContextKeyRef,
    queryClient,
    safeTeamId,
    selectedCompetitionSeasons,
    selectedLeagueId,
    selectedSeason,
    teamId,
    timezone,
  ]);

  useEffect(() => {
    if (!safeTeamId || !selectedLeagueId || typeof selectedSeason !== 'number' || !overviewQuery.coreData) {
      return;
    }

    const statsPrefetchKey = [teamId, selectedLeagueId, selectedSeason].join(':');
    if (prefetchedStatsCoreKeyRef.current === statsPrefetchKey) {
      return;
    }
    prefetchedStatsCoreKeyRef.current = statsPrefetchKey;

    const scheduledTask = scheduleDeferredTask(() => {
      void queryClient.prefetchQuery({
        queryKey: queryKeys.teams.statsCore(teamId, selectedLeagueId, selectedSeason),
        queryFn: ({ signal }) =>
          fetchTeamStatsCoreData({
            teamId,
            leagueId: selectedLeagueId,
            season: selectedSeason,
            signal,
          }),
        ...featureQueryOptions.teams.statsCore,
      });
    });

    return () => {
      scheduledTask.cancel();
    };
  }, [
    overviewQuery.coreData,
    queryClient,
    safeTeamId,
    selectedLeagueId,
    selectedSeason,
    teamId,
  ]);

  useEffect(() => {
    if (!safeTeamId) {
      return;
    }

    const telemetryKey = `${teamId}|${activeTab}|${selectedLeagueId ?? 'none'}|${selectedSeason ?? 'none'}|${activeRequestCount}`;
    if (requestCountTelemetryKeyRef.current === telemetryKey) {
      return;
    }
    requestCountTelemetryKeyRef.current = telemetryKey;

    getMobileTelemetry().trackEvent('team_details.request_count', {
      activeTab,
      queryCount: activeRequestCount,
      hasLeagueSelection,
    });
  }, [
    activeRequestCount,
    activeTab,
    hasLeagueSelection,
    safeTeamId,
    selectedLeagueId,
    selectedSeason,
    teamId,
  ]);

  useEffect(() => {
    if (activeTab !== 'standings') {
      return;
    }

    if (!selectedLeagueId || typeof selectedSeason !== 'number') {
      return;
    }

    if (standingsQuery.isLoading) {
      return;
    }

    const hasRows = (standingsQuery.data?.groups ?? []).some(group => group.rows.length > 0);
    if (hasRows) {
      return;
    }

    const selectedCompetition = competitions.find(c => c.leagueId === selectedLeagueId);
    if (!selectedCompetition) {
      return;
    }

    const currentSeasonIndex = selectedCompetition.seasons.indexOf(selectedSeason);
    if (currentSeasonIndex === -1) {
      return;
    }

    const fallbackCandidates = [
      ...selectedCompetition.seasons.slice(currentSeasonIndex + 1),
      ...selectedCompetition.seasons.slice(0, currentSeasonIndex).reverse(),
    ];

    const fallbackSeason = fallbackCandidates.find(season => season !== selectedSeason);

    if (typeof fallbackSeason === 'number') {
      setSeason(fallbackSeason);
    }
  }, [
    activeTab,
    selectedLeagueId,
    selectedSeason,
    standingsQuery.data,
    standingsQuery.isError,
    standingsQuery.isLoading,
    competitions,
    setSeason,
  ]);

  const handleChangeTab = useCallback((tab: TeamDetailsTab) => {
    setActiveTab(tab);
  }, []);

  const handlePressMatch = useCallback(
    (matchId: string) => {
      const safeMatchId = sanitizeNumericEntityId(matchId);
      if (!safeMatchId) {
        return;
      }

      navigation.navigate('MatchDetails', { matchId: safeMatchId });
    },
    [navigation],
  );

  const handlePressTeam = useCallback(
    (nextTeamId: string) => {
      const safeNextTeamId = sanitizeNumericEntityId(nextTeamId);
      if (!safeNextTeamId || safeNextTeamId === teamId) {
        return;
      }

      navigation.push('TeamDetails', { teamId: safeNextTeamId });
    },
    [navigation, teamId],
  );

  const handlePressPlayer = useCallback(
    (playerId: string) => {
      const safePlayerId = sanitizeNumericEntityId(playerId);
      if (!safePlayerId) {
        return;
      }

      navigation.navigate('PlayerDetails', { playerId: safePlayerId });
    },
    [navigation],
  );

  const handleToggleFollow = useCallback(() => {
    if (!safeTeamId) {
      return;
    }

    toggleTeamFollow(teamId).catch(() => undefined);
  }, [safeTeamId, teamId, toggleTeamFollow]);

  const openNotificationModal = useCallback(() => {
    setIsNotificationModalOpen(true);
  }, []);

  const closeNotificationModal = useCallback(() => {
    setIsNotificationModalOpen(false);
  }, []);

  const hasMatchesData = useMemo(
    () => (matchesQuery.data?.all.length ?? 0) > 0,
    [matchesQuery.data?.all.length],
  );
  const hasStandingsData = useMemo(
    () => (standingsQuery.data?.groups ?? []).some(group => group.rows.length > 0),
    [standingsQuery.data?.groups],
  );
  const hasStatsData = useMemo(() => {
    const visibility = resolveTeamStatsVisibility(statsQuery.data);

    return (
      visibility.pointsCardVisible ||
      visibility.goalsCardVisible ||
      visibility.playersCardVisible ||
      (statsQuery.data?.comparisonMetrics.length ?? 0) > 0
    );
  }, [statsQuery.data]);
  const hasTransfersData = useMemo(
    () =>
      (transfersQuery.data?.arrivals.length ?? 0) > 0 ||
      (transfersQuery.data?.departures.length ?? 0) > 0,
    [transfersQuery.data?.arrivals.length, transfersQuery.data?.departures.length],
  );
  const hasSquadData = useMemo(
    () => (squadQuery.data?.players.length ?? 0) > 0 || Boolean(squadQuery.data?.coach),
    [squadQuery.data?.coach, squadQuery.data?.players.length],
  );

  const showMatchesTab = hasLeagueSelection && shouldDisplayDataTab({
    hasData: hasMatchesData,
    query: matchesQuery,
  });
  const showStandingsTab = hasLeagueSelection && shouldDisplayDataTab({
    hasData: hasStandingsData,
    query: standingsQuery,
  });
  const showStatsTab = hasLeagueSelection && shouldDisplayDataTab({
    hasData: hasStatsData,
    query: statsQuery,
  });
  const showTransfersTab = shouldDisplayDataTab({
    hasData: hasTransfersData,
    query: transfersQuery,
  });
  const showSquadTab = shouldDisplayDataTab({
    hasData: hasSquadData,
    query: squadQuery,
  });

  const tabs = useMemo(() => {
    const computedTabs: Array<{ key: TeamDetailsTab; label: string }> = [
      { key: 'overview' as const, label: t('teamDetails.tabs.overview') },
    ];

    if (showMatchesTab) {
      computedTabs.push({ key: 'matches' as const, label: t('teamDetails.tabs.matches') });
    }

    if (showStandingsTab) {
      computedTabs.push({ key: 'standings' as const, label: t('teamDetails.tabs.standings') });
    }

    if (showStatsTab) {
      computedTabs.push({ key: 'stats' as const, label: t('teamDetails.tabs.stats') });
    }

    if (showTransfersTab) {
      computedTabs.push({ key: 'transfers' as const, label: t('teamDetails.tabs.transfers') });
    }

    if (showSquadTab) {
      computedTabs.push({ key: 'squad' as const, label: t('teamDetails.tabs.squad') });
    }

    return computedTabs;
  }, [
    showMatchesTab,
    showStandingsTab,
    showStatsTab,
    showTransfersTab,
    showSquadTab,
    t,
  ]);

  useEffect(() => {
    if (tabs.some(tab => tab.key === activeTab)) {
      return;
    }

    setActiveTab('overview');
  }, [activeTab, tabs]);

  const activeTabDataUpdatedAt = useMemo(() => {
    if (activeTab === 'overview') {
      return overviewQuery.dataUpdatedAt;
    }
    if (activeTab === 'matches') {
      return matchesQuery.dataUpdatedAt;
    }
    if (activeTab === 'standings') {
      return standingsQuery.dataUpdatedAt;
    }
    if (activeTab === 'stats') {
      return statsQuery.dataUpdatedAt;
    }
    if (activeTab === 'transfers') {
      return transfersQuery.dataUpdatedAt;
    }
    if (activeTab === 'squad') {
      return squadQuery.dataUpdatedAt;
    }
    return 0;
  }, [
    activeTab,
    matchesQuery.dataUpdatedAt,
    overviewQuery.dataUpdatedAt,
    squadQuery.dataUpdatedAt,
    standingsQuery.dataUpdatedAt,
    statsQuery.dataUpdatedAt,
    transfersQuery.dataUpdatedAt,
  ]);

  const lastUpdatedAt = useMemo(() => {
    const maxUpdatedAt = Math.max(
      contextLastUpdatedAt ?? 0,
      overviewQuery.dataUpdatedAt,
      matchesQuery.dataUpdatedAt,
      standingsQuery.dataUpdatedAt,
      statsQuery.dataUpdatedAt,
      transfersQuery.dataUpdatedAt,
      squadQuery.dataUpdatedAt,
    );
    return maxUpdatedAt > 0 ? maxUpdatedAt : null;
  }, [
    contextLastUpdatedAt,
    matchesQuery.dataUpdatedAt,
    overviewQuery.dataUpdatedAt,
    squadQuery.dataUpdatedAt,
    standingsQuery.dataUpdatedAt,
    statsQuery.dataUpdatedAt,
    transfersQuery.dataUpdatedAt,
  ]);

  const hasCachedData = hasContextCachedData || activeTabDataUpdatedAt > 0;

  return {
    isValidTeamId: Boolean(safeTeamId),
    teamId,
    team,
    activeTab,
    tabs,
    competitions,
    standingsSeasons,
    selectedLeagueId,
    selectedSeason,
    isContextLoading,
    isContextError,
    hasCachedData,
    lastUpdatedAt,
    isFollowed,
    hasLeagueSelection,
    overviewQuery,
    matchesQuery,
    standingsQuery,
    statsQuery,
    transfersQuery,
    squadQuery,
    setLeague,
    setLeagueSeason,
    setSeason,
    refetchContext,
    handleChangeTab,
    handlePressMatch,
    handlePressTeam,
    handlePressPlayer,
    handleToggleFollow,
    isNotificationModalOpen,
    openNotificationModal,
    closeNotificationModal,
    onBack: () => navigation.goBack(),
  };
}
