import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { useCompetitions } from '@ui/features/competitions/hooks/useCompetitions';
import { useFollowedCompetitions } from '@ui/features/competitions/hooks/useFollowedCompetitions';
import { CompetitionCard } from '@ui/features/competitions/components/CompetitionCard';
import { CountryAccordion } from '@ui/features/competitions/components/CountryAccordion';
import { FollowToggleButton } from '@ui/features/follows/components/FollowToggleButton';
import type { ThemeColors } from '@ui/shared/theme/theme';

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
      marginBottom: 16,
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
  });
}

export function CompetitionsScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, insets.top), [colors, insets.top]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);

  const {
    countries,
    suggestedCompetitions,
    searchResults,
    searchLeagues,
    isLoading: isCompetitionsLoading,
  } = useCompetitions();

  const {
    followedIds,
    followedCompetitions,
    toggleFollow,
  } = useFollowedCompetitions();

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    searchLeagues(text);
  };

  const renderFollowButton = (competitionId: string) => {
    const isFollowing = followedIds.includes(competitionId);
    return (
      <FollowToggleButton
        isFollowing={isFollowing}
        onPress={() => toggleFollow(competitionId)}
        followLabel={t('screens.competitions.follow')}
        unfollowLabel={t('screens.competitions.unfollow')}
        accessibilityLabel={t('screens.competitions.follow')}
      />
    );
  };

  if (isCompetitionsLoading && countries.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
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
        {searchQuery.length > 0 && (
          <Pressable onPress={() => handleSearchChange('')}>
            <MaterialCommunityIcons name="close-circle" size={20} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      <ScrollView>
        {searchQuery.length > 0 ? (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('follows.search.title')}</Text>
            </View>
            <View style={styles.sectionContent}>
              {searchResults.length === 0 ? (
                <Text style={styles.emptyText}>{t('follows.search.empty')}</Text>
              ) : (
                searchResults.map(comp => (
                  <CompetitionCard
                    key={comp.id}
                    name={comp.name}
                    logoUrl={comp.logo}
                    rightElement={renderFollowButton(comp.id)}
                  />
                ))
              )}
            </View>
          </View>
        ) : (
          <>
            {/* Suivis */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('screens.competitions.follows')}</Text>
              {followedCompetitions.length > 0 && (
                <Pressable onPress={() => setIsEditMode(!isEditMode)}>
                  <Text style={styles.editButtonText}>
                    {isEditMode ? t('actions.save') : t('screens.competitions.edit')}
                  </Text>
                </Pressable>
              )}
            </View>
            <View style={styles.sectionContent}>
              {followedCompetitions.length === 0 ? (
                <Text style={styles.emptyText}>{t('screens.competitions.emptyFollowed')}</Text>
              ) : (
                followedCompetitions.map(comp => (
                  <CompetitionCard
                    key={comp.id}
                    name={comp.name}
                    logoUrl={comp.logo}
                    isEditMode={isEditMode}
                    onUnfollow={() => toggleFollow(comp.id)}
                  />
                ))
              )}
            </View>

            {/* Suggérés */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('screens.competitions.suggested')}</Text>
            </View>
            <View style={styles.sectionContent}>
              {suggestedCompetitions.map(comp => (
                <CompetitionCard
                  key={comp.id}
                  name={comp.name}
                  logoUrl={comp.logo}
                  rightElement={renderFollowButton(comp.id)}
                />
              ))}
            </View>

            {/* Toutes les compétitions */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('screens.competitions.allCompetitions')}</Text>
            </View>
            <View style={[styles.sectionContent, { paddingBottom: 64 }]}>
              {countries.map(country => (
                <CountryAccordion
                  key={country.name}
                  name={country.name}
                  flagUrl={country.code ? `https://flagcdn.com/w40/${country.code.toLowerCase()}.png` : null}
                >
                  {country.competitions.map(comp => (
                    <CompetitionCard
                      key={comp.id}
                      name={comp.name}
                      logoUrl={comp.logo}
                      rightElement={renderFollowButton(comp.id)}
                    />
                  ))}
                </CountryAccordion>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
