import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AppState,
  StyleSheet,
  Text,
  View,
  type AppStateStatus,
} from 'react-native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNetInfo } from '@react-native-community/netinfo';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RootStackParamList } from '@ui/app/navigation/types';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { CompetitionSection } from '@ui/features/matches/components/CompetitionSection';
import { DateChipsRow } from '@ui/features/matches/components/DateChipsRow';
import { MatchNotificationModal } from '@ui/features/matches/components/MatchNotificationModal';
import { MatchesHeader } from '@ui/features/matches/components/MatchesHeader';
import { PartnerBannerCard } from '@ui/features/matches/components/PartnerBannerCard';
import { ScreenStateView } from '@ui/features/matches/components/ScreenStateView';
import { StatusFiltersRow } from '@ui/features/matches/components/StatusFiltersRow';
import { buildFallbackSections } from '@ui/features/matches/mocks/fallbackMatches';
import { hasLiveMatches } from '@data/mappers/fixturesMapper';
import { useMatchesOfflineCache } from '@ui/features/matches/hooks/useMatchesOfflineCache';
import { useMatchesQuery } from '@ui/features/matches/hooks/useMatchesQuery';
import { useMatchesRefresh } from '@ui/features/matches/hooks/useMatchesRefresh';
import { appEnv } from '@data/config/env';
import {
  DEFAULT_MATCH_NOTIFICATION_PREFS,
  loadMatchNotificationPrefs,
  saveMatchNotificationPrefs,
} from '@data/storage/matchPreferencesStorage';
import type {
  CompetitionSection as CompetitionSectionType,
  MatchItem,
  MatchNotificationPrefs,
  MatchStatusFilter,
} from '@ui/features/matches/types/matches.types';
import { ApiError } from '@data/api/http/client';
import { getJsonValue } from '@data/storage/asyncStorage';
import type { ThemeColors } from '@ui/shared/theme/theme';

type MatchesFeedItem =
  | {
      type: 'section';
      key: string;
      section: CompetitionSectionType;
    }
  | {
      type: 'ad';
      key: string;
    };

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listContent: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 18,
      gap: 20,
    },
    listHeader: {
      gap: 18,
      paddingBottom: 6,
    },
    demoFallbackBox: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: 'rgba(21, 248, 106, 0.08)',
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 4,
    },
    demoFallbackTitle: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '800',
    },
    demoFallbackMessage: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
  });
}

function toApiDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function filterSectionsByStatus(
  sections: CompetitionSectionType[],
  filter: MatchStatusFilter,
): CompetitionSectionType[] {
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
  sections: CompetitionSectionType[],
  followedTeamIds: string[],
  label: string,
): CompetitionSectionType {
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

function buildFeedItems(sections: CompetitionSectionType[]): MatchesFeedItem[] {
  const nonFollowSectionsCount = sections.filter(section => !section.isFollowSection).length;
  let hasInsertedAd = false;

  return sections.flatMap((section, index) => {
    const sectionItem: MatchesFeedItem = {
      type: 'section',
      key: `section-${section.id}-${index}`,
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

function mapFollowedTeamIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map(value => String(value));
}

export function MatchesScreen() {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
  const [followedTeamIds, setFollowedTeamIds] = useState<string[]>([]);
  const [notificationModalMatch, setNotificationModalMatch] = useState<MatchItem | null>(null);
  const [notificationPrefs, setNotificationPrefs] = useState<MatchNotificationPrefs>(
    DEFAULT_MATCH_NOTIFICATION_PREFS,
  );

  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris',
    [],
  );
  const selectedDateKey = useMemo(() => toApiDateString(selectedDate), [selectedDate]);
  const isForcedDemoMode = appEnv.matchesDemoMode || !appEnv.apiFootballKey;

  const isOffline = netInfo.isConnected === false || netInfo.isInternetReachable === false;

  const matchesQuery = useMatchesQuery({
    date: selectedDateKey,
    timezone,
    enabled: !isOffline && !isForcedDemoMode,
  });

  const { cachedPayload, isLoadingCache, saveCache, lastUpdatedAt } =
    useMatchesOfflineCache(selectedDateKey);
  const demoFallbackSections = useMemo(() => buildFallbackSections(selectedDate), [selectedDate]);

  const shouldUseDemoFallback = useMemo(() => {
    if (isForcedDemoMode) {
      return true;
    }

    if (!appEnv.matchesApiErrorFallbackEnabled) {
      return false;
    }

    if (matchesQuery.data?.sections || cachedPayload?.sections) {
      return false;
    }

    if (!matchesQuery.isError) {
      return false;
    }

    const queryError = matchesQuery.error;
    if (queryError instanceof ApiError) {
      return [401, 403, 429].includes(queryError.status);
    }

    return (
      queryError instanceof Error &&
      queryError.message.includes('Missing API_FOOTBALL_KEY')
    );
  }, [
    cachedPayload?.sections,
    isForcedDemoMode,
    matchesQuery.data?.sections,
    matchesQuery.error,
    matchesQuery.isError,
  ]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      setAppState(nextState);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    getJsonValue<unknown>('followed_team_ids')
      .then(payload => {
        setFollowedTeamIds(mapFollowedTeamIds(payload));
      })
      .catch(() => {
        setFollowedTeamIds([]);
      });
  }, [isFocused]);

  useEffect(() => {
    if (!matchesQuery.data) {
      return;
    }

    saveCache({
      sections: matchesQuery.data.sections,
      lastUpdatedAt: matchesQuery.data.fetchedAt,
    }).catch(() => {
      return undefined;
    });
  }, [matchesQuery.data, saveCache]);

  const baseSections = useMemo(() => {
    if (shouldUseDemoFallback) {
      return demoFallbackSections;
    }

    return matchesQuery.data?.sections ?? cachedPayload?.sections ?? [];
  }, [
    cachedPayload?.sections,
    demoFallbackSections,
    matchesQuery.data?.sections,
    shouldUseDemoFallback,
  ]);
  const filteredSections = useMemo(
    () => filterSectionsByStatus(baseSections, statusFilter),
    [baseSections, statusFilter],
  );
  const followsSection = useMemo(
    () => buildFollowsSection(filteredSections, followedTeamIds, t('matches.followsSectionTitle')),
    [filteredSections, followedTeamIds, t],
  );

  const sectionsForFeed = useMemo<CompetitionSectionType[]>(() => {
    return [followsSection, ...filteredSections];
  }, [filteredSections, followsSection]);

  const feedItems = useMemo(() => buildFeedItems(sectionsForFeed), [sectionsForFeed]);
  const hasVisibleMatches = filteredSections.some(section => section.matches.length > 0);
  const hasLive = useMemo(() => hasLiveMatches(baseSections), [baseSections]);
  const refreshEnabled = isFocused && appState === 'active' && !isOffline;

  useMatchesRefresh({
    enabled: refreshEnabled,
    hasLiveMatches: hasLive,
    isSlowNetwork: matchesQuery.isSlowNetwork,
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
      navigation.navigate('MatchDetails', { matchId: match.fixtureId });
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

  const renderItem: ListRenderItem<MatchesFeedItem> = ({ item }) => {
    if (item.type === 'ad') {
      return <PartnerBannerCard />;
    }

    return (
      <CompetitionSection
        section={item.section}
        collapsed={Boolean(collapsedSections[item.section.id])}
        onToggle={handleToggleSection}
        onPressMatch={handlePressMatch}
        onPressNotification={handlePressNotification}
      />
    );
  };

  const showLoading =
    (matchesQuery.isLoading || isLoadingCache) &&
    !cachedPayload &&
    !shouldUseDemoFallback;
  const showError = matchesQuery.isError && !cachedPayload && !shouldUseDemoFallback;
  const showOfflineWithoutCache = isOffline && !cachedPayload;
  const showEmpty = !showLoading && !showError && !showOfflineWithoutCache && !hasVisibleMatches;
  const showOfflineBanner = isOffline && Boolean(cachedPayload) && !shouldUseDemoFallback;
  const showErrorBanner =
    matchesQuery.isError && Boolean(cachedPayload) && !shouldUseDemoFallback;
  const showDemoFallbackBanner = shouldUseDemoFallback;
  const listData = showLoading || showError || showEmpty || showOfflineWithoutCache ? [] : feedItems;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlashList
        data={listData}
        renderItem={renderItem}
        keyExtractor={item => item.key}
        refreshing={matchesQuery.isRefetching}
        onRefresh={() => {
          matchesQuery.refetch().catch(() => {
            return undefined;
          });
        }}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <MatchesHeader
              onPressCalendar={handlePressCalendar}
              onPressSearch={handlePressSearch}
              onPressNotifications={handlePressNotifications}
            />
            <DateChipsRow selectedDate={selectedDate} onSelectDate={setSelectedDate} />
            <StatusFiltersRow filter={statusFilter} onFilterChange={setStatusFilter} />
            {showDemoFallbackBanner ? (
              <View style={styles.demoFallbackBox}>
                <Text style={styles.demoFallbackTitle}>
                  {t('matches.demoFallback.title')}
                </Text>
                <Text style={styles.demoFallbackMessage}>
                  {t('matches.demoFallback.message')}
                </Text>
              </View>
            ) : null}

            {showLoading ? <ScreenStateView state="loading" /> : null}
            {showError ? (
              <ScreenStateView
                state="error"
                onRetry={() => {
                  matchesQuery.refetch().catch(() => {
                    return undefined;
                  });
                }}
              />
            ) : null}
            {showOfflineBanner ? (
              <ScreenStateView state="offline" lastUpdatedAt={lastUpdatedAt} />
            ) : null}
            {showOfflineWithoutCache ? (
              <ScreenStateView state="offline" lastUpdatedAt={lastUpdatedAt} />
            ) : null}
            {showErrorBanner ? (
              <ScreenStateView
                state="error"
                onRetry={() => {
                  matchesQuery.refetch().catch(() => {
                    return undefined;
                  });
                }}
              />
            ) : null}
            {matchesQuery.isSlowNetwork ? <ScreenStateView state="slow" /> : null}
            {showEmpty ? <ScreenStateView state="empty" /> : null}
          </View>
        }
      />

      <MatchNotificationModal
        key={notificationModalMatch?.fixtureId ?? 'notification-modal'}
        visible={Boolean(notificationModalMatch)}
        initialPrefs={notificationPrefs}
        onClose={closeNotificationModal}
        onSave={handleSaveNotificationPrefs}
      />
    </SafeAreaView>
  );
}
