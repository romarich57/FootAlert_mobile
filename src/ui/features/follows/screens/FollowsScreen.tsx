import { useCallback, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
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
import {
  buildFollowsFeedItems,
  type FollowsFeedItem,
} from '@ui/features/follows/screens/FollowsScreen.helpers';
import { createFollowsScreenStyles } from '@ui/features/follows/screens/FollowsScreen.styles';
import { ScreenStateView } from '@ui/features/matches/components/ScreenStateView';
import type {
  FollowsSearchResultTeam,
  TrendTeamItem,
} from '@ui/features/follows/types/follows.types';
import { useOfflineUiState } from '@ui/shared/hooks';
import { localizePlayerPosition } from '@ui/shared/i18n/playerPosition';
import { DEFAULT_HIT_SLOP } from '@ui/shared/theme/theme';

export function FollowsScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createFollowsScreenStyles(colors), [colors]);

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
        buildFollowsFeedItems({
          selectedTab,
          hideTrends: hideTrendsCurrentTab,
          isDiscoveryLoading: isSectionLoading,
          teamTrends: asTeamTrends,
          playerTrends: asPlayerTrends,
          emptyMessage: search.hasEnoughChars
          ? t('follows.search.empty')
          : t('follows.states.noTrends'),
        search,
      }),
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
      const subtitle = isSearch
        ? (trendItem as FollowsSearchResultTeam).country
        : (trendItem as TrendTeamItem).leagueName;

      return (
        <FollowsTrendRow
          title={trendItem.teamName}
          subtitle={subtitle}
          avatarUrl={trendItem.teamLogo}
          imageType="team"
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
        imageType="player"
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
            // Search input is the entrypoint for adding new follows.
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
          {search.hasEnoughChars ? t('follows.search.loading') : t('follows.states.loading')}
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
                {hideTrendsCurrentTab ? t('follows.trends.show') : t('follows.trends.hide')}
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
        estimatedItemSize={280}
        ListHeaderComponent={listHeaderComponent}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}
