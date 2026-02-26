import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AppState,
  type AppStateStatus,
} from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNetInfo } from '@react-native-community/netinfo';
import { useTranslation } from 'react-i18next';

import type { RootStackParamList } from '@ui/app/navigation/types';
import { safeNavigateEntity } from '@ui/app/navigation/routeParams';
import { hasLiveMatches } from '@data/mappers/fixturesMapper';
import { useMatchesQuery } from '@ui/features/matches/hooks/useMatchesQuery';
import { useMatchesRefresh } from '@ui/features/matches/hooks/useMatchesRefresh';
import { useFollowedTeamIdsQuery } from '@ui/features/follows/hooks/useFollowedTeamIdsQuery';
import {
  DEFAULT_MATCH_NOTIFICATION_PREFS,
  loadMatchNotificationPrefs,
  saveMatchNotificationPrefs,
} from '@data/storage/matchPreferencesStorage';
import type {
  CompetitionSection,
  MatchItem,
  MatchNotificationPrefs,
  MatchStatusFilter,
} from '@ui/features/matches/types/matches.types';

type MatchesFeedItem =
  | {
      type: 'section';
      key: string;
      section: CompetitionSection;
    }
  | {
      type: 'ad';
      key: string;
    };

function toApiDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function filterSectionsByStatus(
  sections: CompetitionSection[],
  filter: MatchStatusFilter,
): CompetitionSection[] {
  if (filter === 'all') {
    return sections;
  }

  return sections
    .map(section => ({
      ...section,
      matches: section.matches.filter(match => match.status === filter),
    }))
    .filter(section => section.matches.length > 0);
}

function buildFollowsSection(
  sections: CompetitionSection[],
  followedTeamIds: string[],
  label: string,
): CompetitionSection {
  if (followedTeamIds.length === 0) {
    return {
      id: 'follows',
      name: label,
      logo: '',
      country: '',
      isFollowSection: true,
      matches: [],
    };
  }

  const followedMatches = sections
    .flatMap(section => section.matches)
    .filter(
      match =>
        followedTeamIds.includes(match.homeTeamId) || followedTeamIds.includes(match.awayTeamId),
    );

  return {
    id: 'follows',
    name: label,
    logo: '',
    country: '',
    isFollowSection: true,
    matches: followedMatches,
  };
}

function buildFeedItems(sections: CompetitionSection[]): MatchesFeedItem[] {
  const nonFollowSectionsCount = sections.filter(section => !section.isFollowSection).length;
  let hasInsertedAd = false;
  const sectionOccurrences = new Map<string, number>();

  return sections.flatMap(section => {
    const baseKey = `section-${section.id}-${section.name}`;
    const occurrence = (sectionOccurrences.get(baseKey) ?? 0) + 1;
    sectionOccurrences.set(baseKey, occurrence);

    const sectionItem: MatchesFeedItem = {
      type: 'section',
      key: occurrence === 1 ? baseKey : `${baseKey}-${occurrence}`,
      section,
    };

    const shouldInsertAd =
      !hasInsertedAd && !section.isFollowSection && nonFollowSectionsCount > 1;

    if (!shouldInsertAd) {
      return [sectionItem];
    }

    hasInsertedAd = true;
    return [sectionItem, { type: 'ad', key: 'partner-ad-slot' }];
  });
}

export function useMatchesScreenModel() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const netInfo = useNetInfo();
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [statusFilter, setStatusFilter] = useState<MatchStatusFilter>('all');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [notificationModalMatch, setNotificationModalMatch] = useState<MatchItem | null>(null);
  const [notificationPrefs, setNotificationPrefs] = useState<MatchNotificationPrefs>(
    DEFAULT_MATCH_NOTIFICATION_PREFS,
  );
  const [consecutiveSlowSamples, setConsecutiveSlowSamples] = useState(0);

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
  const followedTeamIds = useMemo(
    () => followedTeamIdsQuery.data ?? [],
    [followedTeamIdsQuery.data],
  );
  const lastUpdatedAt = matchesQuery.data?.fetchedAt ?? null;

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

  const baseSections = useMemo(() => matchesQuery.data?.sections ?? [], [matchesQuery.data?.sections]);
  const filteredSections = useMemo(
    () => filterSectionsByStatus(baseSections, statusFilter),
    [baseSections, statusFilter],
  );
  const followsSection = useMemo(
    () => buildFollowsSection(filteredSections, followedTeamIds, t('matches.followsSectionTitle')),
    [filteredSections, followedTeamIds, t],
  );

  const sectionsForFeed = useMemo<CompetitionSection[]>(() => {
    return [followsSection, ...filteredSections];
  }, [filteredSections, followsSection]);

  const feedItems = useMemo(() => buildFeedItems(sectionsForFeed), [sectionsForFeed]);
  const hasVisibleMatches = filteredSections.some(section => section.matches.length > 0);
  const hasLive = useMemo(() => hasLiveMatches(baseSections), [baseSections]);
  const refreshEnabled = isFocused && appState === 'active' && !isOffline;
  const networkLiteMode =
    isOffline ||
    netInfo.details?.isConnectionExpensive === true ||
    consecutiveSlowSamples >= 3;

  useMatchesRefresh({
    enabled: refreshEnabled,
    hasLiveMatches: hasLive,
    isSlowNetwork: matchesQuery.isSlowNetwork,
    networkLiteMode,
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setSelectedDate(today);
  }, []);

  const handlePressSearch = useCallback(() => {
    navigation.navigate('SearchPlaceholder');
  }, [navigation]);

  const handlePressNotifications = useCallback(() => {
    navigation.navigate('MainTabs', { screen: 'More' });
  }, [navigation]);

  const hasCachedData = Boolean(matchesQuery.data);
  const showLoading = matchesQuery.isLoading && !hasCachedData;
  const showError = matchesQuery.isError && !hasCachedData;
  const showOfflineWithoutCache = isOffline && !hasCachedData;
  const showEmpty = !showLoading && !showError && !showOfflineWithoutCache && !hasVisibleMatches;
  const showOfflineBanner = isOffline && hasCachedData;
  const showErrorBanner = matchesQuery.isError && hasCachedData;
  const listData = showLoading || showError || showEmpty || showOfflineWithoutCache ? [] : feedItems;

  return {
    selectedDate,
    setSelectedDate,
    statusFilter,
    setStatusFilter,
    collapsedSections,
    listData,
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
    handlePressTeam,
    handlePressNotification,
    closeNotificationModal,
    handleSaveNotificationPrefs,
    handlePressCalendar,
    handlePressSearch,
    handlePressNotifications,
    refetch: () =>
      matchesQuery.refetch().catch(() => {
        return undefined;
      }),
  };
}
