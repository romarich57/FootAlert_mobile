import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AppState,
  type AppStateStatus,
} from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNetInfo } from '@react-native-community/netinfo';
import { usePowerState } from 'react-native-device-info';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { composeMatchesFeed, type MatchesFeedItem } from '@app-core/domain/matches/index';
import type { RootStackParamList } from '@ui/app/navigation/types';
import { safeNavigateEntity } from '@ui/app/navigation/routeParams';
import { fetchAllLeagues } from '@data/endpoints/competitionsApi';
import { hasLiveMatches } from '@data/mappers/fixturesMapper';
import { useMatchesQuery } from '@ui/features/matches/hooks/useMatchesQuery';
import { useMatchesRefresh } from '@ui/features/matches/hooks/useMatchesRefresh';
import { useHiddenCompetitions } from '@ui/features/matches/hooks/useHiddenCompetitions';
import { useFollowedTeamIdsQuery } from '@ui/features/follows/hooks/useFollowedTeamIdsQuery';
import {
  DEFAULT_MATCH_NOTIFICATION_PREFS,
  loadMatchNotificationPrefs,
  saveMatchNotificationPrefs,
} from '@data/storage/matchPreferencesStorage';
import {
  loadFollowedMatchIds,
  toggleFollowedMatch,
} from '@data/storage/followsStorage';
import { queryKeys } from '@ui/shared/query/queryKeys';
import type {
  MatchItem,
  MatchNotificationPrefs,
  MatchStatusFilter,
} from '@ui/features/matches/types/matches.types';

function toApiDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function computeNextIds(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter(value => value !== id) : [id, ...ids.filter(value => value !== id)];
}

export function useMatchesScreenModel() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const isFocused = useIsFocused();
  const netInfo = useNetInfo();
  const powerState = usePowerState();
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [statusFilter, setStatusFilter] = useState<MatchStatusFilter>('all');
  const [followedOnly, setFollowedOnly] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [notificationModalMatch, setNotificationModalMatch] = useState<MatchItem | null>(null);
  const [notificationPrefs, setNotificationPrefs] = useState<MatchNotificationPrefs>(
    DEFAULT_MATCH_NOTIFICATION_PREFS,
  );
  const [consecutiveSlowSamples, setConsecutiveSlowSamples] = useState(0);
  const [isManageHiddenModalVisible, setIsManageHiddenModalVisible] = useState(false);
  const [isCalendarModalVisible, setIsCalendarModalVisible] = useState(false);

  const { hiddenIds, hideCompetition, unhideCompetition } = useHiddenCompetitions();

  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris',
    [],
  );
  const selectedDateKey = useMemo(() => toApiDateString(selectedDate), [selectedDate]);

  const isOffline = netInfo.isConnected === false || netInfo.isInternetReachable === false;

  const matchesQuery = useMatchesQuery({
    date: selectedDateKey,
    timezone,
    enabled: !isOffline,
  });
  const followedTeamIdsQuery = useFollowedTeamIdsQuery();
  const followedMatchIdsQuery = useQuery({
    queryKey: queryKeys.followedMatchIds(),
    queryFn: loadFollowedMatchIds,
    staleTime: Infinity,
  });
  const competitionsCatalogQuery = useQuery({
    queryKey: queryKeys.competitions.catalog(),
    queryFn: ({ signal }) => fetchAllLeagues(signal),
    staleTime: 6 * 60 * 60 * 1000,
  });

  const followedTeamIds = useMemo(
    () => followedTeamIdsQuery.data ?? [],
    [followedTeamIdsQuery.data],
  );
  const followedMatchIds = useMemo(
    () => followedMatchIdsQuery.data ?? [],
    [followedMatchIdsQuery.data],
  );
  const lastUpdatedAt = matchesQuery.data?.fetchedAt ?? null;

  const toggleFollowedMatchMutation = useMutation({
    mutationFn: (fixtureId: string) => toggleFollowedMatch(fixtureId),
    onMutate: async fixtureId => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.followedMatchIds(),
      });

      const previousIds =
        queryClient.getQueryData<string[]>(queryKeys.followedMatchIds()) ?? [];
      queryClient.setQueryData(queryKeys.followedMatchIds(), computeNextIds(previousIds, fixtureId));
      return { previousIds };
    },
    onError: (_error, _fixtureId, context) => {
      queryClient.setQueryData(
        queryKeys.followedMatchIds(),
        context?.previousIds ?? [],
      );
    },
    onSuccess: ids => {
      queryClient.setQueryData(queryKeys.followedMatchIds(), ids);
    },
  });

  useEffect(() => {
    if (!matchesQuery.data && !matchesQuery.error) {
      return;
    }

    setConsecutiveSlowSamples(current => {
      if (matchesQuery.isSlowNetwork) {
        return Math.min(current + 1, 10);
      }

      return 0;
    });
  }, [matchesQuery.data, matchesQuery.error, matchesQuery.isSlowNetwork]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      setAppState(nextState);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const baseSections = useMemo(
    () => matchesQuery.data?.sections ?? [],
    [matchesQuery.data?.sections],
  );
  const matchesFeedModel = useMemo(
    () =>
      composeMatchesFeed({
        baseSections,
        catalog: competitionsCatalogQuery.data ?? [],
        statusFilter,
        followedTeamIds,
        followedMatchIds,
        followsSectionLabel: t('matches.followsSectionTitle'),
        hiddenCompetitionIds: hiddenIds,
        followedOnly,
      }),
    [
      baseSections,
      competitionsCatalogQuery.data,
      followedMatchIds,
      followedOnly,
      followedTeamIds,
      hiddenIds,
      statusFilter,
      t,
    ],
  );
  const {
    normalizedSections: normalizedBaseSections,
    filteredSections,
    followsSection,
    feedItems,
  } = matchesFeedModel;

  const hiddenCompetitionNameById = useMemo(() => {
    const map = new Map<string, string>();
    normalizedBaseSections.forEach(section => {
      if (!section.isFollowSection) {
        map.set(section.id, section.country ? `${section.country} - ${section.name}` : section.name);
      }
    });
    return map;
  }, [normalizedBaseSections]);

  const hiddenCompetitions = useMemo(
    () =>
      hiddenIds.map(id => ({
        id,
        name: hiddenCompetitionNameById.get(id) ?? '',
      })),
    [hiddenCompetitionNameById, hiddenIds],
  );

  const hasVisibleMatches = followedOnly
    ? followsSection.matches.length > 0
    : filteredSections.some(section => section.matches.length > 0);
  const hasLive = useMemo(() => hasLiveMatches(normalizedBaseSections), [normalizedBaseSections]);
  const refreshEnabled = isFocused && appState === 'active' && !isOffline;
  const networkLiteMode =
    isOffline ||
    netInfo.details?.isConnectionExpensive === true ||
    consecutiveSlowSamples >= 3;
  const batteryLiteMode = powerState.lowPowerMode === true;

  useMatchesRefresh({
    enabled: refreshEnabled,
    hasLiveMatches: hasLive,
    isSlowNetwork: matchesQuery.isSlowNetwork,
    networkLiteMode,
    batteryLiteMode,
    refetch: matchesQuery.refetch,
  });

  const handleToggleSection = useCallback((sectionId: string) => {
    setCollapsedSections(current => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  }, []);

  const handlePressMatch = useCallback(
    (match: MatchItem) => {
      safeNavigateEntity(navigation, 'MatchDetails', match.fixtureId);
    },
    [navigation],
  );

  const handlePressTeam = useCallback(
    (selectedTeamId: string) => {
      safeNavigateEntity(navigation, 'TeamDetails', selectedTeamId);
    },
    [navigation],
  );

  const handleToggleMatchFollow = useCallback(
    (match: MatchItem) => {
      toggleFollowedMatchMutation.mutate(match.fixtureId);
    },
    [toggleFollowedMatchMutation],
  );

  const isMatchFollowed = useCallback(
    (fixtureId: string) => followedMatchIds.includes(fixtureId),
    [followedMatchIds],
  );

  const handlePressNotification = useCallback((match: MatchItem) => {
    setNotificationModalMatch(match);

    loadMatchNotificationPrefs(match.fixtureId)
      .then(savedPrefs => {
        setNotificationPrefs(savedPrefs);
      })
      .catch(() => {
        setNotificationPrefs(DEFAULT_MATCH_NOTIFICATION_PREFS);
      });
  }, []);

  const closeNotificationModal = useCallback(() => {
    setNotificationModalMatch(null);
  }, []);

  const handleSaveNotificationPrefs = useCallback(
    (prefs: MatchNotificationPrefs) => {
      if (!notificationModalMatch) {
        return;
      }

      saveMatchNotificationPrefs(notificationModalMatch.fixtureId, prefs).catch(() => {
        return undefined;
      });
      setNotificationPrefs(prefs);
      setNotificationModalMatch(null);
    },
    [notificationModalMatch],
  );

  const handlePressCalendar = useCallback(() => {
    setIsCalendarModalVisible(true);
  }, []);

  const handlePressSearch = useCallback(() => {
    navigation.navigate('SearchPlaceholder');
  }, [navigation]);

  const openManageHiddenModal = useCallback(() => {
    setIsManageHiddenModalVisible(true);
  }, []);

  const hasCachedData = Boolean(matchesQuery.data);
  const showLoading = matchesQuery.isLoading && !hasCachedData;
  const showError = matchesQuery.isError && !hasCachedData;
  const showOfflineWithoutCache = isOffline && !hasCachedData;
  const showEmpty = !showLoading && !showError && !showOfflineWithoutCache && !hasVisibleMatches;
  const showOfflineBanner = isOffline && hasCachedData;
  const showErrorBanner = matchesQuery.isError && hasCachedData;
  const listData: MatchesFeedItem[] =
    showLoading || showError || showEmpty || showOfflineWithoutCache ? [] : feedItems;

  return {
    selectedDate,
    setSelectedDate,
    statusFilter,
    setStatusFilter,
    followedOnly,
    toggleFollowedOnly: () => setFollowedOnly(current => !current),
    collapsedSections,
    listData,
    isCalendarModalVisible,
    showLoading,
    showError,
    showOfflineWithoutCache,
    showEmpty,
    showOfflineBanner,
    showErrorBanner,
    lastUpdatedAt,
    isSlowNetwork: matchesQuery.isSlowNetwork,
    isRefetching: matchesQuery.isRefetching,
    notificationModalMatch,
    notificationPrefs,
    handleToggleSection,
    handlePressMatch,
    handleToggleMatchFollow,
    isMatchFollowed,
    handlePressTeam,
    handlePressNotification,
    closeNotificationModal,
    handleSaveNotificationPrefs,
    handlePressCalendar,
    closeCalendarModal: () => setIsCalendarModalVisible(false),
    handlePressSearch,
    handleHideCompetition: hideCompetition,
    handleUnhideCompetition: unhideCompetition,
    hiddenCompetitions,
    isManageHiddenModalVisible,
    openManageHiddenModal,
    closeManageHiddenModal: () => setIsManageHiddenModalVisible(false),
    refetch: () =>
      matchesQuery.refetch().catch(() => {
        return undefined;
      }),
  };
}
