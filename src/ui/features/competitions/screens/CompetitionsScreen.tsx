import { useCallback, useMemo } from 'react';
import {
  Image,
  Pressable,
  SectionList,
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
import { createCompetitionsScreenStyles } from '@ui/features/competitions/screens/CompetitionsScreen.styles';
import { StandingsTabSkeleton } from '@ui/features/competitions/components/StandingsTabSkeleton';

export function CompetitionsScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createCompetitionsScreenStyles(colors, insets.top), [colors, insets.top]);
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

      if (section.type === 'followed') {
        return (
          <CompetitionCard
            name={competition.name}
            logoUrl={competition.logo}
            isEditMode={screenModel.isEditMode}
            onUnfollow={() => {
              screenModel.handleToggleFollow(competition.id);
            }}
            onPress={() => {
              if (!screenModel.isEditMode) {
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
          onPress={() => {
            screenModel.handleOpenCompetition(competition);
          }}
        />
      );
    },
    [renderFollowButton, screenModel],
  );

  const renderSearchItem = useCallback(
    ({ item }: { item: Competition }) => {
      return (
        <CompetitionCard
          name={item.name}
          logoUrl={item.logo}
          rightElement={renderFollowButton(item.id)}
          onPress={() => {
            screenModel.handleOpenCompetition(item);
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
                  <Image
                    source={{ uri: section.flagUrl }}
                    style={styles.countryFlag}
                    accessibilityLabel={countryName}
                  />
                ) : (
                  <MaterialCommunityIcons
                    name="flag"
                    size={14}
                    color={colors.textMuted}
                  />
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
      <View style={styles.container}>
        <StandingsTabSkeleton />
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
