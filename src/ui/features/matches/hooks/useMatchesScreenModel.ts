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
import type { CompetitionsApiLeagueDto } from '@domain/contracts/competitions.types';
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

type CompetitionCatalogEntry = {
  name: string;
  country: string;
  logo: string;
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

function sortMatchesByKickoff(matches: MatchItem[]): MatchItem[] {
  return [...matches].sort(
    (firstMatch, secondMatch) =>
      new Date(firstMatch.startDate).getTime() - new Date(secondMatch.startDate).getTime(),
  );
}

function buildFollowsSection(
  sections: CompetitionSection[],
  followedTeamIds: string[],
  followedMatchIds: string[],
  label: string,
): CompetitionSection {
  if (followedTeamIds.length === 0 && followedMatchIds.length === 0) {
    return {
      id: 'follows',
      name: label,
      logo: '',
      country: '',
      isFollowSection: true,
      matches: [],
    };
  }

  const followedTeamIdSet = new Set(followedTeamIds);
  const followedMatchIdSet = new Set(followedMatchIds);
  const allMatches = sections.flatMap(section => section.matches);

  const starredMatches = sortMatchesByKickoff(
    allMatches.filter(match => followedMatchIdSet.has(match.fixtureId)),
  );

  const teamMatches = sortMatchesByKickoff(
    allMatches.filter(
      match =>
        !followedMatchIdSet.has(match.fixtureId) &&
        (followedTeamIdSet.has(match.homeTeamId) || followedTeamIdSet.has(match.awayTeamId)),
    ),
  );

  return {
    id: 'follows',
    name: label,
    logo: '',
    country: '',
    isFollowSection: true,
    matches: [...starredMatches, ...teamMatches],
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

function computeNextIds(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter(value => value !== id) : [id, ...ids.filter(value => value !== id)];
}

function buildCompetitionCatalogMap(catalog: CompetitionsApiLeagueDto[]): Map<string, CompetitionCatalogEntry> {
  const map = new Map<string, CompetitionCatalogEntry>();
  catalog.forEach(item => {
    map.set(String(item.league.id), {
      name: item.league.name,
      country: item.country.name,
      logo: item.league.logo,
    });
  });
  return map;
}

function applyCompetitionCatalog(
  sections: CompetitionSection[],
  catalogMap: Map<string, CompetitionCatalogEntry>,
): CompetitionSection[] {
  return sections.map(section => {
    if (section.isFollowSection) {
      return section;
    }

    const catalogEntry = catalogMap.get(section.id);
    if (!catalogEntry) {
      return section;
    }

    return {
      ...section,
      name: catalogEntry.name,
      country: catalogEntry.country,
      logo: catalogEntry.logo || section.logo,
      matches: section.matches.map(match => ({
        ...match,
        competitionName: catalogEntry.name,
        competitionCountry: catalogEntry.country,
        competitionLogo: catalogEntry.logo || match.competitionLogo,
      })),
    };
  });
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
  const competitionCatalogMap = useMemo(
    () => buildCompetitionCatalogMap(competitionsCatalogQuery.data ?? []),
    [competitionsCatalogQuery.data],
  );
  const normalizedBaseSections = useMemo(
    () => applyCompetitionCatalog(baseSections, competitionCatalogMap),
    [baseSections, competitionCatalogMap],
  );
  const filteredSections = useMemo(
    () => filterSectionsByStatus(normalizedBaseSections, statusFilter),
    [normalizedBaseSections, statusFilter],
  );
  const followsSection = useMemo(
    () =>
      buildFollowsSection(
        filteredSections,
        followedTeamIds,
        followedMatchIds,
        t('matches.followsSectionTitle'),
      ),
    [filteredSections, followedMatchIds, followedTeamIds, t],
  );

  const sectionsForFeed = useMemo<CompetitionSection[]>(() => {
    if (followedOnly) {
      return [followsSection];
    }

    const visibleCompetitionSections = filteredSections.filter(
      section => !hiddenIds.includes(section.id),
    );
    return [followsSection, ...visibleCompetitionSections];
  }, [filteredSections, followedOnly, followsSection, hiddenIds]);

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

  const feedItems = useMemo(() => buildFeedItems(sectionsForFeed), [sectionsForFeed]);
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
    closeManageHiddenModal: () => setIsManageHiddenModalVisible(false),
    refetch: () =>
      matchesQuery.refetch().catch(() => {
        return undefined;
      }),
  };
}
