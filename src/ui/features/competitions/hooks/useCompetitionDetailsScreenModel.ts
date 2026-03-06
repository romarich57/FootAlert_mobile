import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useNetInfo } from '@react-native-community/netinfo';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePowerState } from 'react-native-device-info';

import type { RootStackParamList } from '@ui/app/navigation/types';
import { safeNavigateEntity, sanitizeNumericEntityId } from '@ui/app/navigation/routeParams';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { fetchLeagueById, fetchLeagueStandings, fetchLeagueFixturesPage } from '@data/endpoints/competitionsApi';
import { mapLeagueDtoToCompetition, mapStandingDtoToGroups, mapFixturesDtoToFixtures } from '@data/mappers/competitionsMapper';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';
import { useFollowedCompetitions } from '@ui/features/competitions/hooks/useFollowedCompetitions';
import { useCompetitionSeasons } from '@ui/features/competitions/hooks/useCompetitionSeasons';
import { useCompetitionTotw } from '@ui/features/competitions/hooks/useCompetitionTotw';
import { useCompetitionBracket } from '@ui/features/competitions/hooks/useCompetitionBracket';

import type { CompetitionTabKey } from '../components/CompetitionTabs';

type CompetitionDetailsScreenRouteProp = RouteProp<RootStackParamList, 'CompetitionDetails'>;
type CompetitionDetailsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'CompetitionDetails'
>;

export function useCompetitionDetailsScreenModel() {
  const route = useRoute<CompetitionDetailsScreenRouteProp>();
  const navigation = useNavigation<CompetitionDetailsScreenNavigationProp>();
  const queryClient = useQueryClient();
  const netInfo = useNetInfo();
  const powerState = usePowerState();

  const { competitionId, competition: routeCompetition } = route.params;
  const safeCompetitionId = sanitizeNumericEntityId(competitionId);
  const numericCompetitionId = safeCompetitionId
    ? Number(safeCompetitionId)
    : Number.NaN;

  const competitionQuery = useQuery({
    queryKey: queryKeys.competitions.detailsHeader(safeCompetitionId ?? 'invalid'),
    queryFn: async ({ signal }) => {
      const dto = await fetchLeagueById(safeCompetitionId ?? '', signal);
      return mapLeagueDtoToCompetition(dto);
    },
    enabled:
      Boolean(safeCompetitionId) &&
      (!routeCompetition || routeCompetition.id !== safeCompetitionId),
    staleTime: 12 * 60 * 60 * 1000,
  });

  const competition = useMemo(() => {
    if (!safeCompetitionId) {
      return null;
    }

    if (routeCompetition && routeCompetition.id === safeCompetitionId) {
      return routeCompetition;
    }
    return competitionQuery.data ?? null;
  }, [competitionQuery.data, routeCompetition, safeCompetitionId]);

  const [activeTab, setActiveTab] = useState<CompetitionTabKey>('standings');
  const [isSeasonPickerOpen, setIsSeasonPickerOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const { toggleFollow, followedIds } = useFollowedCompetitions();
  const followedIdsSet = useMemo(() => new Set(followedIds), [followedIds]);
  const isCompetitionFollowed = safeCompetitionId
    ? followedIdsSet.has(safeCompetitionId)
    : false;

  const { data: seasons, isLoading: seasonsLoading } = useCompetitionSeasons(
    Number.isFinite(numericCompetitionId) ? numericCompetitionId : undefined,
  );

  const defaultSeason = useMemo(() => {
    if (!seasons || seasons.length === 0) {
      return new Date().getFullYear();
    }
    const current = seasons.find(season => season.current);
    return current ? current.year : seasons[0].year;
  }, [seasons]);

  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const actualSeason = selectedSeason ?? defaultSeason;
  const resolvedCompetitionId = Number.isFinite(numericCompetitionId) ? numericCompetitionId : undefined;
  const resolvedSeason = seasonsLoading ? undefined : actualSeason;
  const availableSeasons = useMemo(
    () => (seasons ?? []).map(season => season.year),
    [seasons],
  );

  const { data: totwData } = useCompetitionTotw(resolvedCompetitionId, resolvedSeason);
  const { data: competitionBracketData } = useCompetitionBracket(resolvedCompetitionId, resolvedSeason);
  const competitionKind = competitionBracketData?.competitionKind;
  const hasBracketRounds = (competitionBracketData?.bracket?.length ?? 0) > 0;
  const isCupOnlyCompetition = competitionKind === 'cup';
  const isOffline =
    netInfo.isConnected === false || netInfo.isInternetReachable === false;
  const networkLiteMode = isOffline || netInfo.details?.isConnectionExpensive === true;
  const batteryLiteMode = powerState.lowPowerMode === true;
  const standingsTabLabelKey = isCupOnlyCompetition
    ? 'competitionDetails.tabs.bracket'
    : 'competitionDetails.tabs.standings';

  useEffect(() => {
    if (!Number.isFinite(numericCompetitionId) || seasonsLoading) {
      return;
    }

    if (isOffline || networkLiteMode || batteryLiteMode) {
      return;
    }

    const leagueId = numericCompetitionId;
    const season = actualSeason;

    if (activeTab === 'standings' && !isCupOnlyCompetition) {
      void queryClient.prefetchQuery({
        queryKey: queryKeys.competitions.standings(leagueId, season),
        queryFn: ({ signal }) =>
          fetchLeagueStandings(leagueId, season, signal).then(dto => mapStandingDtoToGroups(dto)),
        staleTime: featureQueryOptions.competitions.standings.staleTime,
      });
    }

    if (activeTab === 'matches') {
      void queryClient.prefetchInfiniteQuery({
        queryKey: queryKeys.competitions.fixtures(leagueId, season),
        queryFn: async ({ pageParam, signal }) => {
          const page = await fetchLeagueFixturesPage(leagueId, season, signal, {
            limit: 50,
            cursor: pageParam as string | undefined,
          });
          return {
            items: mapFixturesDtoToFixtures(page.items),
            hasMore: page.pageInfo?.hasMore ?? false,
            nextCursor: page.pageInfo?.nextCursor ?? null,
          };
        },
        initialPageParam: undefined as string | undefined,
        staleTime: featureQueryOptions.competitions.fixtures.staleTime,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    actualSeason,
    batteryLiteMode,
    isCupOnlyCompetition,
    isOffline,
    networkLiteMode,
    numericCompetitionId,
    queryClient,
    seasonsLoading,
  ]);

  const tabs = useMemo<CompetitionTabKey[]>(() => {
    const showStandingsTab = !isCupOnlyCompetition || hasBracketRounds;
    const showTeamStatsTab = !isCupOnlyCompetition;
    const base: CompetitionTabKey[] = [];

    if (showStandingsTab) {
      base.push('standings');
    }

    base.push('matches', 'playerStats');

    if (showTeamStatsTab) {
      base.push('teamStats');
    }

    base.push('transfers');

    return totwData ? [...base, 'totw'] : base;
  }, [hasBracketRounds, isCupOnlyCompetition, totwData]);

  useEffect(() => {
    if (tabs.length === 0) {
      return;
    }

    if (!tabs.includes(activeTab)) {
      setActiveTab(tabs[0]);
    }
  }, [activeTab, tabs]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleToggleFollow = useCallback(() => {
    if (!safeCompetitionId) {
      return;
    }

    toggleFollow(safeCompetitionId).catch(() => undefined);
  }, [safeCompetitionId, toggleFollow]);

  const openSeasonPicker = useCallback(() => {
    setIsSeasonPickerOpen(true);
  }, []);

  const closeSeasonPicker = useCallback(() => {
    setIsSeasonPickerOpen(false);
  }, []);

  const openNotificationModal = useCallback(() => {
    setIsNotificationModalOpen(true);
  }, []);

  const closeNotificationModal = useCallback(() => {
    setIsNotificationModalOpen(false);
  }, []);

  const selectSeason = useCallback((season: number) => {
    setSelectedSeason(season);
    setIsSeasonPickerOpen(false);
  }, []);

  const handlePressMatch = useCallback((matchId: string) => {
    safeNavigateEntity(navigation, 'MatchDetails', matchId);
  }, [navigation]);

  const handlePressTeam = useCallback((teamId: string) => {
    safeNavigateEntity(navigation, 'TeamDetails', teamId);
  }, [navigation]);

  const handlePressPlayer = useCallback((playerId: string) => {
    safeNavigateEntity(navigation, 'PlayerDetails', playerId);
  }, [navigation]);

  const handlePressCompetition = useCallback((nextCompetitionId: string) => {
    safeNavigateEntity(navigation, 'CompetitionDetails', nextCompetitionId);
  }, [navigation]);

  return {
    competition,
    safeCompetitionId,
    numericCompetitionId,
    isCompetitionQueryLoading: competitionQuery.isLoading,
    activeTab,
    setActiveTab,
    tabs,
    standingsTabLabelKey,
    totwData,
    seasonsLoading,
    actualSeason,
    defaultSeason,
    availableSeasons,
    isCompetitionFollowed,
    isSeasonPickerOpen,
    isNotificationModalOpen,
    handleBack,
    handleToggleFollow,
    openSeasonPicker,
    closeSeasonPicker,
    openNotificationModal,
    closeNotificationModal,
    selectSeason,
    handlePressMatch,
    handlePressTeam,
    handlePressPlayer,
    handlePressCompetition,
  };
}
