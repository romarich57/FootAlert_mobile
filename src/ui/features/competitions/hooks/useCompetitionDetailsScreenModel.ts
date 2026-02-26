import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';

import type { RootStackParamList } from '@ui/app/navigation/types';
import { sanitizeNumericEntityId } from '@ui/app/navigation/routeParams';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { fetchLeagueById } from '@data/endpoints/competitionsApi';
import { mapLeagueDtoToCompetition } from '@data/mappers/competitionsMapper';
import { useFollowedCompetitions } from '@ui/features/competitions/hooks/useFollowedCompetitions';
import { useCompetitionSeasons } from '@ui/features/competitions/hooks/useCompetitionSeasons';
import { useCompetitionTotw } from '@ui/features/competitions/hooks/useCompetitionTotw';

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
  const { toggleFollow, followedIds } = useFollowedCompetitions();
  const isCompetitionFollowed = safeCompetitionId
    ? followedIds.includes(safeCompetitionId)
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
  const availableSeasons = useMemo(
    () => (seasons ?? []).map(season => season.year),
    [seasons],
  );

  const { data: totwData } = useCompetitionTotw(
    Number.isFinite(numericCompetitionId) ? numericCompetitionId : undefined,
    seasonsLoading ? undefined : actualSeason,
  );

  const tabs = useMemo<CompetitionTabKey[]>(() => {
    const baseTabs: CompetitionTabKey[] = [
      'standings',
      'matches',
      'playerStats',
      'teamStats',
      'transfers',
    ];
    if (totwData) {
      baseTabs.push('totw');
    }
    return baseTabs;
  }, [totwData]);

  useEffect(() => {
    if (activeTab === 'totw' && !totwData) {
      setActiveTab('standings');
    }
  }, [activeTab, totwData]);

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

  const selectSeason = useCallback((season: number) => {
    setSelectedSeason(season);
    setIsSeasonPickerOpen(false);
  }, []);

  return {
    competition,
    safeCompetitionId,
    numericCompetitionId,
    isCompetitionQueryLoading: competitionQuery.isLoading,
    activeTab,
    setActiveTab,
    tabs,
    totwData,
    seasonsLoading,
    actualSeason,
    defaultSeason,
    availableSeasons,
    isCompetitionFollowed,
    isSeasonPickerOpen,
    handleBack,
    handleToggleFollow,
    openSeasonPicker,
    closeSeasonPicker,
    selectSeason,
  };
}
