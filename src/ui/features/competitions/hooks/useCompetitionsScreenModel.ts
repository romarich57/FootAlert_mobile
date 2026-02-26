import { useCallback, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import type { RootStackParamList } from '@ui/app/navigation/types';
import { safeNavigateEntity } from '@ui/app/navigation/routeParams';
import { useCompetitions } from '@ui/features/competitions/hooks/useCompetitions';
import { useFollowedCompetitions } from '@ui/features/competitions/hooks/useFollowedCompetitions';
import type { Competition } from '@ui/features/competitions/types/competitions.types';
import { useOfflineUiState } from '@ui/shared/hooks';

export type CompetitionListItem = {
  key: string;
  competition: Competition;
};

type CompetitionSectionType = 'followed' | 'suggested' | 'country';

export type CompetitionSection = {
  key: string;
  type: CompetitionSectionType;
  title: string;
  data: CompetitionListItem[];
  countryName?: string;
  flagUrl?: string | null;
  isExpanded?: boolean;
  showAllCompetitionsTitle?: boolean;
};

export function useCompetitionsScreenModel() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [expandedCountries, setExpandedCountries] = useState<Record<string, boolean>>({});

  const {
    countries,
    suggestedCompetitions,
    searchResults,
    searchLeagues,
    isSearching,
    isLoading: isCompetitionsLoading,
    lastUpdatedAt,
  } = useCompetitions();

  const { followedIds, followedCompetitions, toggleFollow } = useFollowedCompetitions();
  const followedIdSet = useMemo(() => new Set(followedIds), [followedIds]);

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchQuery(text);
      searchLeagues(text);
    },
    [searchLeagues],
  );

  const handleClearSearch = useCallback(() => {
    handleSearchChange('');
  }, [handleSearchChange]);

  const handleOpenCompetition = useCallback(
    (competition: Competition) => {
      safeNavigateEntity(navigation, 'CompetitionDetails', competition.id, { competition });
    },
    [navigation],
  );

  const handleToggleCountry = useCallback((countryName: string) => {
    setExpandedCountries(current => ({
      ...current,
      [countryName]: !current[countryName],
    }));
  }, []);

  const handleToggleFollow = useCallback(
    (competitionId: string) => {
      toggleFollow(competitionId).catch(() => undefined);
    },
    [toggleFollow],
  );

  const toggleEditMode = useCallback(() => {
    setIsEditMode(current => !current);
  }, []);

  const competitionSections = useMemo<CompetitionSection[]>(() => {
    const followedItems = followedCompetitions.map(competition => ({
      key: `followed-${competition.id}`,
      competition,
    }));

    const suggestedItems = suggestedCompetitions.map(competition => ({
      key: `suggested-${competition.id}`,
      competition,
    }));

    const countrySections = countries.map((country, index) => {
      const isExpanded = Boolean(expandedCountries[country.name]);
      const countryItems = isExpanded
        ? country.competitions.map(competition => ({
            key: `country-${country.name}-${competition.id}`,
            competition,
          }))
        : [];

      return {
        key: `country-${country.name}`,
        type: 'country' as const,
        title: country.name,
        countryName: country.name,
        flagUrl: country.code
          ? `https://flagcdn.com/w40/${country.code.toLowerCase()}.png`
          : null,
        data: countryItems,
        isExpanded,
        showAllCompetitionsTitle: index === 0,
      };
    });

    return [
      {
        key: 'followed',
        type: 'followed' as const,
        title: t('screens.competitions.follows'),
        data: followedItems,
      },
      {
        key: 'suggested',
        type: 'suggested' as const,
        title: t('screens.competitions.suggested'),
        data: suggestedItems,
      },
      ...countrySections,
    ];
  }, [countries, expandedCountries, followedCompetitions, suggestedCompetitions, t]);

  const searchIsActive = searchQuery.trim().length > 0;
  const hasCompetitionData =
    countries.length > 0 ||
    suggestedCompetitions.length > 0 ||
    followedCompetitions.length > 0;
  const hasVisibleData = searchIsActive ? searchResults.length > 0 : hasCompetitionData;
  const offlineUi = useOfflineUiState({
    hasData: hasVisibleData,
    isLoading: isCompetitionsLoading || isSearching,
    lastUpdatedAt,
  });
  const offlineLastUpdatedAt = offlineUi.lastUpdatedAt
    ? new Date(offlineUi.lastUpdatedAt).toISOString()
    : null;

  return {
    searchQuery,
    isEditMode,
    competitionSections,
    followedCompetitions,
    followedIdSet,
    searchResults,
    searchIsActive,
    hasCompetitionData,
    isSearching,
    isCompetitionsLoading,
    offlineUi,
    offlineLastUpdatedAt,
    handleSearchChange,
    handleClearSearch,
    handleOpenCompetition,
    handleToggleCountry,
    handleToggleFollow,
    toggleEditMode,
  };
}
