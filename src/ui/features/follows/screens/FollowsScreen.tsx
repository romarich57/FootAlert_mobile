import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { appEnv } from '@data/config/env';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import {
  FollowsFollowedSection,
  FollowsHeader,
  FollowsSegmentedControl,
  FollowsTrendRow,
} from '@ui/features/follows/components';
import { useFollowsScreenModel } from '@ui/features/follows/hooks/useFollowsScreenModel';
import { ScreenStateView } from '@ui/features/matches/components/ScreenStateView';
import type {
  FollowsSearchResultPlayer,
  FollowsSearchResultTeam,
  TrendPlayerItem,
  TrendTeamItem,
} from '@ui/features/follows/types/follows.types';
import { useOfflineUiState } from '@ui/shared/hooks';
import { localizePlayerPosition } from '@ui/shared/i18n/playerPosition';
import {
  DEFAULT_HIT_SLOP,
  MIN_TOUCH_TARGET,
  type ThemeColors,
} from '@ui/shared/theme/theme';

type FollowsFeedItem =
  | {
    type: 'trend-team';
    key: string;
    item: TrendTeamItem;
  }
  | {
    type: 'trend-player';
    key: string;
    item: TrendPlayerItem;
  }
  | {
    type: 'search-team';
    key: string;
    item: FollowsSearchResultTeam;
  }
  | {
    type: 'search-player';
    key: string;
    item: FollowsSearchResultPlayer;
  }
  | {
    type: 'empty';
    key: string;
    message: string;
  };

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listContent: {
      paddingBottom: 28,
    },
    trendsSection: {
      paddingHorizontal: 20,
      paddingTop: 14,
      gap: 12,
    },
    trendsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 44,
      marginBottom: 4,
    },
    trendsTitle: {
      color: colors.text,
      fontSize: 24,
      fontWeight: '800',
    },
    trendsActionText: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: '600',
    },
    trendsActionButton: {
      minHeight: MIN_TOUCH_TARGET,
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    infoText: {
      color: colors.textMuted,
      fontSize: 18,
      fontWeight: '600',
      paddingHorizontal: 20,
      paddingTop: 8,
    },
    limitError: {
      color: colors.warning,
      fontSize: 16,
      fontWeight: '700',
      paddingHorizontal: 20,
      paddingBottom: 6,
    },
    stateContainer: {
      paddingHorizontal: 20,
      paddingVertical: 24,
    },
    offlineStateContainer: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 8,
    },
    stateText: {
      color: colors.textMuted,
      fontSize: 18,
      fontWeight: '600',
    },
  });
}

function buildFeedItems(
  selectedTab: 'teams' | 'players',
  hideTrends: boolean,
  teamTrends: TrendTeamItem[],
  playerTrends: TrendPlayerItem[],
  emptyMessage: string,
  search: ReturnType<typeof useFollowsScreenModel>['search'],
): FollowsFeedItem[] {
  if (search.hasEnoughChars) {
    if (selectedTab === 'teams') {
      const results = search.results as FollowsSearchResultTeam[];
      if (results.length === 0 && !search.isLoading) {
        return [{ type: 'empty', key: 'empty-search-teams', message: emptyMessage }];
      }
      return results.map(item => ({
        type: 'search-team',
        key: `search-team-${item.teamId}`,
        item,
      }));
    }

    const results = search.results as FollowsSearchResultPlayer[];
    if (results.length === 0 && !search.isLoading) {
      return [{ type: 'empty', key: 'empty-search-players', message: emptyMessage }];
    }
    return results.map(item => ({
      type: 'search-player',
      key: `search-player-${item.playerId}`,
      item,
    }));
  }

  if (hideTrends) {
    return [];
  }

  if (selectedTab === 'teams') {
    if (teamTrends.length === 0) {
      return [{ type: 'empty', key: 'empty-teams', message: emptyMessage }];
    }

    return teamTrends.map(item => ({
      type: 'trend-team',
      key: `trend-team-${item.teamId}`,
      item,
    }));
  }

  if (playerTrends.length === 0) {
    return [{ type: 'empty', key: 'empty-players', message: emptyMessage }];
  }

  return playerTrends.map(item => ({
    type: 'trend-player',
    key: `trend-player-${item.playerId}`,
    item,
  }));
}

export function FollowsScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const model = useFollowsScreenModel();
  const {
    selectedTab,
    setSelectedTab,
    searchQuery,
    setSearchQuery,
    isSearchVisible,
    toggleSearchVisibility,
    search,
    followedTeamIds,
    followedPlayerIds,
    hideTrendsCurrentTab,
    isSectionLoading,
    lastToggleError,
    teamCards,
    playerCards,
    handleToggleTeam,
    handleTogglePlayer,
    handleOpenPlayerDetails,
    handleOpenTeamDetails,
    updateHideTrends,
    asTeamTrends,
    asPlayerTrends,
    lastUpdatedAt,
  } = model;
  const showLimitError = lastToggleError === 'limit_reached';

  const feedItems = useMemo(
    () =>
      buildFeedItems(
        selectedTab,
        hideTrendsCurrentTab,
        asTeamTrends,
        asPlayerTrends,
        search.hasEnoughChars
          ? t('follows.search.empty')
          : t('follows.states.noTrends'),
        search,
      ),
    [
      asPlayerTrends,
      asTeamTrends,
      hideTrendsCurrentTab,
      search,
      selectedTab,
      t,
    ],
  );

  const hasFeedData = useMemo(
    () => feedItems.some(item => item.type !== 'empty'),
    [feedItems],
  );
  const followedTeamIdsSet = useMemo(() => new Set(followedTeamIds), [followedTeamIds]);
  const followedPlayerIdsSet = useMemo(() => new Set(followedPlayerIds), [followedPlayerIds]);
  const offlineUi = useOfflineUiState({
    hasData: hasFeedData,
    isLoading: isSectionLoading || search.isLoading,
    lastUpdatedAt,
  });
  const offlineLastUpdatedAt = offlineUi.lastUpdatedAt
    ? new Date(offlineUi.lastUpdatedAt).toISOString()
    : null;

  const renderItem = useCallback<ListRenderItem<FollowsFeedItem>>(({ item }) => {
    if (item.type === 'empty') {
      return <Text style={styles.infoText}>{item.message}</Text>;
    }

    if (item.type === 'trend-team' || item.type === 'search-team') {
      const isSearch = item.type === 'search-team';
      const trendItem = item.item;
      // FollowsSearchResultTeam has 'country', TrendTeamItem has 'leagueName'
      const subtitle = isSearch
        ? (trendItem as FollowsSearchResultTeam).country
        : (trendItem as TrendTeamItem).leagueName;

      return (
        <FollowsTrendRow
          title={trendItem.teamName}
          subtitle={subtitle}
          avatarUrl={trendItem.teamLogo}
          onPressItem={() => handleOpenTeamDetails(trendItem.teamId)}
          itemAccessibilityLabel={trendItem.teamName}
          isFollowing={followedTeamIdsSet.has(trendItem.teamId)}
          onToggleFollow={() => handleToggleTeam(trendItem.teamId)}
          followLabel={t('follows.actions.follow')}
          unfollowLabel={t('follows.actions.unfollow')}
          accessibilityLabel={`${t('follows.actions.follow')} ${trendItem.teamName}`}
        />
      );
    }

    const trendItem = item.item;
    return (
      <FollowsTrendRow
        title={trendItem.playerName}
        subtitle={[localizePlayerPosition(trendItem.position, t), trendItem.teamName].filter(Boolean).join(' • ')}
        avatarUrl={trendItem.playerPhoto}
        onPressItem={() => handleOpenPlayerDetails(trendItem.playerId)}
        itemAccessibilityLabel={trendItem.playerName}
        isFollowing={followedPlayerIdsSet.has(trendItem.playerId)}
        onToggleFollow={() => handleTogglePlayer(trendItem.playerId)}
        followLabel={t('follows.actions.follow')}
        unfollowLabel={t('follows.actions.unfollow')}
        accessibilityLabel={`${t('follows.actions.follow')} ${trendItem.playerName}`}
      />
    );
  }, [
    handleOpenPlayerDetails,
    handleOpenTeamDetails,
    handleTogglePlayer,
    handleToggleTeam,
    followedPlayerIdsSet,
    followedTeamIdsSet,
    styles.infoText,
    t,
  ]);

  const listHeaderComponent = useMemo(() => (
    <>
      <FollowsHeader
        title={t('follows.title')}
        isSearchVisible={isSearchVisible}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onPressSearchToggle={toggleSearchVisibility}
        placeholder={
          selectedTab === 'teams'
            ? t('follows.search.placeholderTeams')
            : t('follows.search.placeholderPlayers')
        }
      />

      {/* Hide segmented control when searching for a cleaner look, or keep it?
          We'll keep it so users can switch tabs while searching. */}
      {!search.hasEnoughChars || isSearchVisible ? (
        <FollowsSegmentedControl
          selectedTab={selectedTab}
          onChangeTab={setSelectedTab}
          teamsLabel={t('follows.tabs.teams')}
          playersLabel={t('follows.tabs.players')}
        />
      ) : null}


      {showLimitError ? (
        <Text style={styles.limitError}>
          {selectedTab === 'teams'
            ? t('follows.errors.maxTeams', { count: appEnv.followsMaxFollowedTeams })
            : t('follows.errors.maxPlayers', { count: appEnv.followsMaxFollowedPlayers })}
        </Text>
      ) : null}

      {offlineUi.showOfflineBanner ? (
        <View style={styles.offlineStateContainer}>
          <ScreenStateView state="offline" lastUpdatedAt={offlineLastUpdatedAt} />
        </View>
      ) : null}

      {search.hasEnoughChars ? null : (
        <FollowsFollowedSection
          selectedTab={selectedTab}
          teamCards={teamCards}
          playerCards={playerCards}
          isEditMode={false}
          onPressAdd={() => {
            // Now handled by typing in the search bar above
          }}
          onUnfollowTeam={handleToggleTeam}
          onUnfollowPlayer={handleTogglePlayer}
          onPressTeam={handleOpenTeamDetails}
          onPressPlayer={handleOpenPlayerDetails}
          labels={{
            addToFavorites: t('follows.cards.addToFavorites'),
            follow: t('follows.actions.follow'),
            unfollow: t('follows.actions.unfollow'),
            noNextMatch: t('follows.cards.noNextMatch'),
            goals: t('follows.cards.goals'),
            assists: t('follows.cards.assists'),
          }}
        />
      )}

      {isSectionLoading || search.isLoading ? (
        <Text style={styles.infoText}>
          {search.hasEnoughChars
            ? t('follows.search.loading')
            : t('follows.states.loading')}
        </Text>
      ) : null}

      {!search.hasEnoughChars ? (
        <View style={styles.trendsSection}>
          <View style={styles.trendsHeader}>
            <Text style={styles.trendsTitle}>{t('follows.trends.title')}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                updateHideTrends(selectedTab, !hideTrendsCurrentTab)
                  .catch(() => undefined);
              }}
              hitSlop={DEFAULT_HIT_SLOP}
              style={styles.trendsActionButton}
              accessibilityLabel={
                hideTrendsCurrentTab
                  ? t('follows.trends.show')
                  : t('follows.trends.hide')
              }
            >
              <Text style={styles.trendsActionText}>
                {hideTrendsCurrentTab
                  ? t('follows.trends.show')
                  : t('follows.trends.hide')}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </>
  ), [
    handleOpenPlayerDetails,
    handleOpenTeamDetails,
    handleTogglePlayer,
    handleToggleTeam,
    hideTrendsCurrentTab,
    isSearchVisible,
    isSectionLoading,
    offlineLastUpdatedAt,
    offlineUi.showOfflineBanner,
    playerCards,
    search,
    searchQuery,
    selectedTab,
    setSearchQuery,
    setSelectedTab,
    showLimitError,
    teamCards,
    toggleSearchVisibility,
    updateHideTrends,
    styles.limitError,
    styles.offlineStateContainer,
    styles.trendsActionButton,
    styles.trendsActionText,
    styles.trendsHeader,
    styles.trendsSection,
    styles.trendsTitle,
    styles.infoText,
    t,
  ]);

  if (offlineUi.showOfflineNoCache) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.stateContainer}>
          <ScreenStateView state="offline" lastUpdatedAt={offlineLastUpdatedAt} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlashList
        data={feedItems}
        keyExtractor={item => item.key}
        renderItem={renderItem}
        // @ts-ignore FlashList runtime supports estimatedItemSize.
        estimatedItemSize={280}
        ListHeaderComponent={listHeaderComponent}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}
