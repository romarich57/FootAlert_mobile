import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@ui/app/navigation/types';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { useCompetitions } from '@ui/features/competitions/hooks/useCompetitions';
import { useFollowedCompetitions } from '@ui/features/competitions/hooks/useFollowedCompetitions';
import { CompetitionCard } from '@ui/features/competitions/components/CompetitionCard';
import type { Competition } from '@ui/features/competitions/types/competitions.types';
import { FollowToggleButton } from '@ui/features/follows/components/FollowToggleButton';
import type { ThemeColors } from '@ui/shared/theme/theme';

type CompetitionListItem = {
  key: string;
  competition: Competition;
};

type CompetitionSectionType = 'followed' | 'suggested' | 'country';

type CompetitionSection = {
  key: string;
  type: CompetitionSectionType;
  title: string;
  data: CompetitionListItem[];
  countryName?: string;
  flagUrl?: string | null;
  isExpanded?: boolean;
  showAllCompetitionsTitle?: boolean;
};

function createStyles(colors: ThemeColors, topInset: number) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerSpace: {
      height: topInset,
      backgroundColor: colors.surface,
    },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      color: colors.text,
      fontSize: 28,
      fontWeight: '800',
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceElevated,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 48,
      marginHorizontal: 16,
      marginTop: 8,
      marginBottom: 12,
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: 16,
      marginLeft: 8,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
      marginTop: 8,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '700',
    },
    editButtonText: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: '600',
    },
    sectionContent: {
      paddingBottom: 16,
      backgroundColor: colors.surface,
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 14,
      textAlign: 'center',
      padding: 16,
    },
    loadingText: {
      color: colors.textMuted,
      fontSize: 14,
      textAlign: 'center',
      marginTop: 16,
    },
    loadingContainer: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    listContent: {
      paddingBottom: 64,
    },
    countryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    countryFlagContainer: {
      width: 24,
      height: 24,
      marginRight: 12,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: colors.surfaceElevated,
      justifyContent: 'center',
      alignItems: 'center',
    },
    countryFlag: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    countryName: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
      flex: 1,
    },
  });
}

export function CompetitionsScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, insets.top), [colors, insets.top]);
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
  } = useCompetitions();

  const {
    followedIds,
    followedCompetitions,
    toggleFollow,
  } = useFollowedCompetitions();

  const followedIdSet = useMemo(() => new Set(followedIds), [followedIds]);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    searchLeagues(text);
  }, [searchLeagues]);

  const handleClearSearch = useCallback(() => {
    handleSearchChange('');
  }, [handleSearchChange]);

  const handleOpenCompetition = useCallback((competition: Competition) => {
    navigation.navigate('CompetitionDetails', {
      competitionId: competition.id,
      competition,
    });
  }, [navigation]);

  const handleToggleCountry = useCallback((countryName: string) => {
    setExpandedCountries(current => ({
      ...current,
      [countryName]: !current[countryName],
    }));
  }, []);

  const renderFollowButton = useCallback((competitionId: string) => {
    const isFollowing = followedIdSet.has(competitionId);

    return (
      <FollowToggleButton
        isFollowing={isFollowing}
        onPress={() => {
          toggleFollow(competitionId).catch(() => undefined);
        }}
        followLabel={t('screens.competitions.follow')}
        unfollowLabel={t('screens.competitions.unfollow')}
        accessibilityLabel={t('screens.competitions.follow')}
      />
    );
  }, [followedIdSet, t, toggleFollow]);

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
        flagUrl: country.code ? `https://flagcdn.com/w40/${country.code.toLowerCase()}.png` : null,
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

  const sectionKeyExtractor = useCallback((item: CompetitionListItem) => item.key, []);

  const searchKeyExtractor = useCallback((item: Competition) => `search-${item.id}`, []);

  const renderCompetitionItem = useCallback(
    ({ item, section }: { item: CompetitionListItem; section: CompetitionSection }) => {
      const { competition } = item;

      if (section.type === 'followed') {
        return (
          <CompetitionCard
            name={competition.name}
            logoUrl={competition.logo}
            isEditMode={isEditMode}
            onUnfollow={() => {
              toggleFollow(competition.id).catch(() => undefined);
            }}
            onPress={() => {
              if (!isEditMode) {
                handleOpenCompetition(competition);
              }
            }}
          />
        );
      }

      return (
        <CompetitionCard
          name={competition.name}
          logoUrl={competition.logo}
          rightElement={renderFollowButton(competition.id)}
          onPress={() => {
            handleOpenCompetition(competition);
          }}
        />
      );
    },
    [handleOpenCompetition, isEditMode, renderFollowButton, toggleFollow],
  );

  const renderSearchItem = useCallback(
    ({ item }: { item: Competition }) => {
      return (
        <CompetitionCard
          name={item.name}
          logoUrl={item.logo}
          rightElement={renderFollowButton(item.id)}
          onPress={() => {
            handleOpenCompetition(item);
          }}
        />
      );
    },
    [handleOpenCompetition, renderFollowButton],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: CompetitionSection }) => {
      if (section.type === 'country') {
        const countryName = section.countryName ?? '';

        return (
          <>
            {section.showAllCompetitionsTitle ? (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('screens.competitions.allCompetitions')}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={() => {
                handleToggleCountry(countryName);
              }}
              style={styles.countryHeader}
            >
              <View style={styles.countryFlagContainer}>
                {section.flagUrl ? (
                  <Image source={{ uri: section.flagUrl }} style={styles.countryFlag} />
                ) : (
                  <MaterialCommunityIcons name="flag" size={14} color={colors.textMuted} />
                )}
              </View>
              <Text numberOfLines={1} style={styles.countryName}>
                {countryName}
              </Text>
              <MaterialCommunityIcons
                name={section.isExpanded ? 'chevron-up' : 'chevron-down'}
                size={24}
                color={colors.textMuted}
              />
            </Pressable>
          </>
        );
      }

      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.type === 'followed' && followedCompetitions.length > 0 ? (
            <Pressable
              onPress={() => {
                setIsEditMode(current => !current);
              }}
            >
              <Text style={styles.editButtonText}>
                {isEditMode ? t('actions.save') : t('screens.competitions.edit')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      );
    },
    [colors.textMuted, followedCompetitions.length, handleToggleCountry, isEditMode, styles, t],
  );

  const renderSectionFooter = useCallback(
    ({ section }: { section: CompetitionSection }) => {
      if (section.type === 'followed' && section.data.length === 0) {
        return (
          <View style={styles.sectionContent}>
            <Text style={styles.emptyText}>{t('screens.competitions.emptyFollowed')}</Text>
          </View>
        );
      }

      return null;
    },
    [styles, t],
  );

  const searchIsActive = searchQuery.trim().length > 0;

  if (isCompetitionsLoading && countries.length === 0) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('screens.competitions.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerSpace} />
      <View style={styles.header}>
        <Text style={styles.title}>{t('screens.competitions.title')}</Text>
      </View>

      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={24} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('screens.competitions.searchPlaceholder')}
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={handleSearchChange}
        />
        {searchQuery.length > 0 ? (
          <Pressable onPress={handleClearSearch}>
            <MaterialCommunityIcons name="close-circle" size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {searchIsActive ? (
        <FlashList
          data={searchResults}
          keyExtractor={searchKeyExtractor}
          renderItem={renderSearchItem}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('follows.search.title')}</Text>
            </View>
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {isSearching ? t('screens.competitions.loading') : t('follows.search.empty')}
            </Text>
          }
        />
      ) : (
        <SectionList
          sections={competitionSections}
          keyExtractor={sectionKeyExtractor}
          renderItem={renderCompetitionItem}
          renderSectionHeader={renderSectionHeader}
          renderSectionFooter={renderSectionFooter}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          initialNumToRender={10}
          maxToRenderPerBatch={12}
          windowSize={8}
          removeClippedSubviews
        />
      )}
    </View>
  );
}
