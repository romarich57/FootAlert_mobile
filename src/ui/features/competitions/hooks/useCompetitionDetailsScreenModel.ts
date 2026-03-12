import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';

import { appEnv } from '@data/config/env';
import type { RootStackParamList } from '@ui/app/navigation/types';
import {
  safeGoBackFromDetail,
  safeNavigateEntity,
  sanitizeNumericEntityId,
} from '@ui/app/navigation/routeParams';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';
import { fetchLeagueById } from '@data/endpoints/competitionsApi';
import { mapLeagueDtoToCompetition } from '@data/mappers/competitionsMapper';
import { useFollowedCompetitions } from '@ui/features/competitions/hooks/useFollowedCompetitions';
import { useCompetitionSeasons } from '@ui/features/competitions/hooks/useCompetitionSeasons';
import { useCompetitionBracket } from '@ui/features/competitions/hooks/useCompetitionBracket';
import { useCompetitionFullQuery } from '@ui/features/competitions/hooks/competitionFullQuery';

import type { CompetitionTabKey } from '../components/CompetitionTabs';

type CompetitionDetailsScreenRouteProp = RouteProp<RootStackParamList, 'CompetitionDetails'>;
type CompetitionDetailsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'CompetitionDetails'
>;

export function useCompetitionDetailsScreenModel() {
  const route = useRoute<CompetitionDetailsScreenRouteProp>();
  const navigation = useNavigation<CompetitionDetailsScreenNavigationProp>();

  const { competitionId, competition: routeCompetition } = route.params;
  const safeCompetitionId = sanitizeNumericEntityId(competitionId);
  const numericCompetitionId = safeCompetitionId
    ? Number(safeCompetitionId)
    : Number.NaN;
  const resolvedCompetitionId = Number.isFinite(numericCompetitionId)
    ? numericCompetitionId
    : undefined;
  const competitionFullQuery = useCompetitionFullQuery(resolvedCompetitionId);
  const fullCompetition = useMemo(
    () => mapLeagueDtoToCompetition(competitionFullQuery.data?.competition ?? null),
    [competitionFullQuery.data?.competition],
  );
  const shouldFallbackToLegacyCompetition =
    !appEnv.mobileEnableBffCompetitionFull ||
    competitionFullQuery.isError ||
    (competitionFullQuery.isFetched && !competitionFullQuery.data?.competition);

  const competitionQuery = useQuery({
    queryKey: queryKeys.competitions.detailsHeader(safeCompetitionId ?? 'invalid'),
    queryFn: async ({ signal }) => {
      const dto = await fetchLeagueById(safeCompetitionId ?? '', signal);
      return mapLeagueDtoToCompetition(dto);
    },
    enabled:
      Boolean(safeCompetitionId) &&
      (!routeCompetition || routeCompetition.id !== safeCompetitionId) &&
      shouldFallbackToLegacyCompetition,
    ...featureQueryOptions.competitions.header,
  });

  const competition = useMemo(() => {
    if (!safeCompetitionId) {
      return null;
    }

    if (routeCompetition && routeCompetition.id === safeCompetitionId) {
      return routeCompetition;
    }
    return fullCompetition ?? competitionQuery.data ?? null;
  }, [competitionQuery.data, fullCompetition, routeCompetition, safeCompetitionId]);

  const [activeTab, setActiveTab] = useState<CompetitionTabKey>('standings');
  const [isSeasonPickerOpen, setIsSeasonPickerOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const { toggleFollow, followedIds } = useFollowedCompetitions();
  const followedIdsSet = useMemo(() => new Set(followedIds), [followedIds]);
  const isCompetitionFollowed = safeCompetitionId
    ? followedIdsSet.has(safeCompetitionId)
    : false;

  const seasonsQuery = useCompetitionSeasons(resolvedCompetitionId);
  const seasons = seasonsQuery.data;
  const seasonsLoading = seasonsQuery.isLoading;

  const defaultSeason = useMemo(() => {
    if (
      appEnv.mobileEnableBffCompetitionFull &&
      typeof competitionFullQuery.data?.season === 'number' &&
      Number.isFinite(competitionFullQuery.data.season)
    ) {
      return competitionFullQuery.data.season;
    }

    if (!seasons || seasons.length === 0) {
      return new Date().getFullYear();
    }
    const current = seasons.find(season => season.current);
    return current ? current.year : seasons[0].year;
  }, [competitionFullQuery.data?.season, seasons]);

  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const actualSeason = selectedSeason ?? competitionFullQuery.data?.season ?? defaultSeason;
  const hasResolvedSeason =
    typeof actualSeason === 'number' &&
    Number.isFinite(actualSeason) &&
    (
      selectedSeason !== null ||
      typeof competitionFullQuery.data?.season === 'number' ||
      !seasonsLoading
    );
  const resolvedSeason = hasResolvedSeason ? actualSeason : undefined;
  const availableSeasons = useMemo(
    () => (seasons ?? []).map(season => season.year),
    [seasons],
  );

  const normalizedCompetitionType = competition?.type?.trim().toLowerCase() ?? '';
  const isCupCompetitionType = normalizedCompetitionType === 'cup';
  const competitionBracketQuery = useCompetitionBracket(resolvedCompetitionId, resolvedSeason, {
    enabled: isCupCompetitionType,
  });
  const competitionBracketData = competitionBracketQuery.data;
  const competitionKind = competitionBracketData?.competitionKind ?? (isCupCompetitionType ? null : 'league');
  const hasBracketRounds = (competitionBracketData?.bracket?.length ?? 0) > 0;
  const isCupOnlyCompetition = competitionKind === 'cup';
  const isCompetitionStructureLoading =
    isCupCompetitionType &&
    Boolean(resolvedCompetitionId) &&
    Boolean(resolvedSeason) &&
    competitionBracketQuery.isLoading &&
    !competitionBracketData;
  const standingsTabLabelKey = isCupOnlyCompetition
    ? 'competitionDetails.tabs.bracket'
    : 'competitionDetails.tabs.standings';
  const hasCachedData =
    Boolean(competition) ||
    availableSeasons.length > 0 ||
    Boolean(competitionFullQuery.data);
  const lastUpdatedAt = Math.max(
    competitionQuery.dataUpdatedAt,
    competitionFullQuery.dataUpdatedAt,
    seasonsQuery.dataUpdatedAt,
    competitionBracketQuery.dataUpdatedAt ?? 0,
  );
  const resolvedLastUpdatedAt = lastUpdatedAt > 0 ? lastUpdatedAt : null;
  const isRefetchingSilently =
    hasCachedData &&
    (
      competitionFullQuery.isFetching ||
      competitionQuery.isFetching ||
      competitionBracketQuery.isFetching
    );
  const isCompetitionQueryLoading = !competition && (
    shouldFallbackToLegacyCompetition
      ? competitionQuery.isLoading
      : competitionFullQuery.isLoading
  );

  const tabs = useMemo<CompetitionTabKey[]>(() => {
    const showStandingsTab = !isCupOnlyCompetition || hasBracketRounds;
    const showTeamStatsTab = !isCupOnlyCompetition;
    const showTotwTab = !isCupOnlyCompetition;
    const base: CompetitionTabKey[] = [];

    if (showStandingsTab) {
      base.push('standings');
    }

    base.push('matches', 'playerStats');

    if (showTeamStatsTab) {
      base.push('teamStats');
    }

    base.push('transfers');

    return showTotwTab ? [...base, 'totw'] : base;
  }, [hasBracketRounds, isCupOnlyCompetition]);

  useEffect(() => {
    if (tabs.length === 0) {
      return;
    }

    if (!tabs.includes(activeTab)) {
      setActiveTab(tabs[0]);
    }
  }, [activeTab, tabs]);

  const handleBack = useCallback(() => {
    safeGoBackFromDetail(navigation);
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
    isCompetitionQueryLoading,
    hasCachedData,
    lastUpdatedAt: resolvedLastUpdatedAt,
    isRefetchingSilently,
    activeTab,
    setActiveTab,
    tabs,
    standingsTabLabelKey,
    seasonsLoading,
    isCompetitionStructureLoading,
    isCupCompetitionType,
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
