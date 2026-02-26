import { useCallback, useMemo } from 'react';
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

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { CompetitionCard } from '@ui/features/competitions/components/CompetitionCard';
import type { Competition } from '@ui/features/competitions/types/competitions.types';
import {
  useCompetitionsScreenModel,
  type CompetitionListItem,
  type CompetitionSection,
} from '@ui/features/competitions/hooks/useCompetitionsScreenModel';
import { FollowToggleButton } from '@ui/features/follows/components/FollowToggleButton';
import { ScreenStateView } from '@ui/features/matches/components/ScreenStateView';
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
    stateWrap: {
      paddingHorizontal: 16,
      paddingBottom: 12,
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
  const screenModel = useCompetitionsScreenModel();

  const renderFollowButton = useCallback(
    (competitionId: string) => {
      const isFollowing = screenModel.followedIdSet.has(competitionId);

      return (
        <FollowToggleButton
          isFollowing={isFollowing}
          onPress={() => {
            screenModel.handleToggleFollow(competitionId);
          }}
          followLabel={t('screens.competitions.follow')}
          unfollowLabel={t('screens.competitions.unfollow')}
          accessibilityLabel={t('screens.competitions.follow')}
        />
      );
    },
    [screenModel, t],
  );

  const sectionKeyExtractor = useCallback((item: CompetitionListItem) => item.key, []);

  const searchKeyExtractor = useCallback((item: Competition) => `search-${item.id}`, []);

  const renderCompetitionItem = useCallback(
    ({ item, section }: { item: CompetitionListItem; section: CompetitionSection }) => {
      const { competition } = item;
      const availabilityStatus = screenModel.availabilityByCompetitionId.get(competition.id);
      const disabled = availabilityStatus?.disabled ?? false;
      const disabledReason = availabilityStatus?.disabledReason;

      if (section.type === 'followed') {
        return (
          <CompetitionCard
            name={competition.name}
            logoUrl={competition.logo}
            isEditMode={screenModel.isEditMode}
            onUnfollow={() => {
              screenModel.handleToggleFollow(competition.id);
            }}
            disabled={disabled}
            disabledReason={disabledReason}
            onPress={() => {
              if (!screenModel.isEditMode && !disabled) {
                screenModel.handleOpenCompetition(competition);
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
          disabled={disabled}
          disabledReason={disabledReason}
          onPress={() => {
            if (!disabled) {
              screenModel.handleOpenCompetition(competition);
            }
          }}
        />
      );
    },
    [renderFollowButton, screenModel],
  );

  const renderSearchItem = useCallback(
    ({ item }: { item: Competition }) => {
      const availabilityStatus = screenModel.availabilityByCompetitionId.get(item.id);
      const disabled = availabilityStatus?.disabled ?? false;

      return (
        <CompetitionCard
          name={item.name}
          logoUrl={item.logo}
          rightElement={renderFollowButton(item.id)}
          disabled={disabled}
          disabledReason={availabilityStatus?.disabledReason}
          onPress={() => {
            if (!disabled) {
              screenModel.handleOpenCompetition(item);
            }
          }}
        />
      );
    },
    [renderFollowButton, screenModel],
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
                screenModel.handleToggleCountry(countryName);
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
          {section.type === 'followed' && screenModel.followedCompetitions.length > 0 ? (
            <Pressable
              onPress={() => {
                screenModel.toggleEditMode();
              }}
            >
              <Text style={styles.editButtonText}>
                {screenModel.isEditMode ? t('actions.save') : t('screens.competitions.edit')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      );
    },
    [colors.textMuted, screenModel, styles, t],
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

  if (screenModel.isCompetitionsLoading && !screenModel.hasCompetitionData) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('screens.competitions.loading')}</Text>
      </View>
    );
  }

  if (screenModel.offlineUi.showOfflineNoCache) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <View style={styles.stateWrap}>
          <ScreenStateView state="offline" lastUpdatedAt={screenModel.offlineLastUpdatedAt} />
        </View>
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
          value={screenModel.searchQuery}
          onChangeText={screenModel.handleSearchChange}
        />
        {screenModel.searchQuery.length > 0 ? (
          <Pressable onPress={screenModel.handleClearSearch}>
            <MaterialCommunityIcons name="close-circle" size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {screenModel.offlineUi.showOfflineBanner ? (
        <View style={styles.stateWrap}>
          <ScreenStateView state="offline" lastUpdatedAt={screenModel.offlineLastUpdatedAt} />
        </View>
      ) : null}

      {screenModel.searchIsActive ? (
        <FlashList
          data={screenModel.searchResults}
          keyExtractor={searchKeyExtractor}
          renderItem={renderSearchItem}
          // @ts-ignore FlashList runtime supports estimatedItemSize.
          estimatedItemSize={96}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('follows.search.title')}</Text>
            </View>
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {screenModel.isSearching
                ? t('screens.competitions.loading')
                : t('follows.search.empty')}
            </Text>
          }
        />
      ) : (
        <SectionList
          sections={screenModel.competitionSections}
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
