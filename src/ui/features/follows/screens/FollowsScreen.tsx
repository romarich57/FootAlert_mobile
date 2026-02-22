import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { appEnv } from '@data/config/env';
import {
  FollowsFollowedSection,
  FollowsHeader,
  FollowsSegmentedControl,
  FollowsTrendRow,
} from '@ui/features/follows/components';
import { useFollowsScreenModel } from '@ui/features/follows/hooks/useFollowsScreenModel';
import type {
  TrendPlayerItem,
  TrendTeamItem,
} from '@ui/features/follows/types/follows.types';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';

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
  });
}

function buildFeedItems(
  selectedTab: 'teams' | 'players',
  hideTrends: boolean,
  teamTrends: TrendTeamItem[],
  playerTrends: TrendPlayerItem[],
  emptyMessage: string,
): FollowsFeedItem[] {
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
  const showLimitError = model.lastToggleError === 'limit_reached';

  const feedItems = useMemo(
    () =>
      buildFeedItems(
        model.selectedTab,
        model.hideTrendsCurrentTab,
        model.asTeamTrends,
        model.asPlayerTrends,
        t('follows.states.noTrends'),
      ),
    [
      model.asPlayerTrends,
      model.asTeamTrends,
      model.hideTrendsCurrentTab,
      model.selectedTab,
      t,
    ],
  );

  const renderItem: ListRenderItem<FollowsFeedItem> = ({ item }) => {
    if (item.type === 'empty') {
      return <Text style={styles.infoText}>{item.message}</Text>;
    }

    if (item.type === 'trend-team') {
      const trendItem = item.item;
      return (
        <FollowsTrendRow
          title={trendItem.teamName}
          subtitle={trendItem.leagueName}
          avatarUrl={trendItem.teamLogo}
          onPressItem={() => model.handleOpenTeamDetails(trendItem.teamId)}
          itemAccessibilityLabel={trendItem.teamName}
          isFollowing={model.followedTeamIds.includes(trendItem.teamId)}
          onToggleFollow={() => model.handleToggleTeam(trendItem.teamId)}
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
        subtitle={[trendItem.position, trendItem.teamName].filter(Boolean).join(' • ')}
        avatarUrl={trendItem.playerPhoto}
        onPressItem={() => model.handleOpenPlayerDetails(trendItem.playerId)}
        itemAccessibilityLabel={trendItem.playerName}
        isFollowing={model.followedPlayerIds.includes(trendItem.playerId)}
        onToggleFollow={() => model.handleTogglePlayer(trendItem.playerId)}
        followLabel={t('follows.actions.follow')}
        unfollowLabel={t('follows.actions.unfollow')}
        accessibilityLabel={`${t('follows.actions.follow')} ${trendItem.playerName}`}
      />
    );
  };

  const listHeaderComponent = (
    <>
      <FollowsHeader
        title={t('follows.title')}
        onPressSearch={model.handleOpenSearch}
        searchA11yLabel={t('follows.search.openSearch')}
        isEditMode={model.isEditMode}
        onPressEdit={() => model.setIsEditMode(!model.isEditMode)}
        editLabel={t('follows.actions.edit')}
        saveLabel={t('follows.actions.done')}
      />

      <FollowsSegmentedControl
        selectedTab={model.selectedTab}
        onChangeTab={model.setSelectedTab}
        teamsLabel={t('follows.tabs.teams')}
        playersLabel={t('follows.tabs.players')}
      />

      {showLimitError ? (
        <Text style={styles.limitError}>
          {model.selectedTab === 'teams'
            ? t('follows.errors.maxTeams', { count: appEnv.followsMaxFollowedTeams })
            : t('follows.errors.maxPlayers', { count: appEnv.followsMaxFollowedPlayers })}
        </Text>
      ) : null}

      <FollowsFollowedSection
        selectedTab={model.selectedTab}
        teamCards={model.teamCards}
        playerCards={model.playerCards}
        isEditMode={model.isEditMode}
        onPressAdd={model.handleOpenSearch}
        onUnfollowTeam={model.handleToggleTeam}
        onUnfollowPlayer={model.handleTogglePlayer}
        onPressTeam={model.handleOpenTeamDetails}
        onPressPlayer={model.handleOpenPlayerDetails}
        labels={{
          addToFavorites: t('follows.cards.addToFavorites'),
          follow: t('follows.actions.follow'),
          unfollow: t('follows.actions.unfollow'),
          noNextMatch: t('follows.cards.noNextMatch'),
          goals: t('follows.cards.goals'),
          assists: t('follows.cards.assists'),
        }}
      />

      {model.isSectionLoading ? (
        <Text style={styles.infoText}>{t('follows.states.loading')}</Text>
      ) : null}

      <View style={styles.trendsSection}>
        <View style={styles.trendsHeader}>
          <Text style={styles.trendsTitle}>{t('follows.trends.title')}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              model
                .updateHideTrends(model.selectedTab, !model.hideTrendsCurrentTab)
                .catch(() => undefined);
            }}
            accessibilityLabel={
              model.hideTrendsCurrentTab
                ? t('follows.trends.show')
                : t('follows.trends.hide')
            }
          >
            <Text style={styles.trendsActionText}>
              {model.hideTrendsCurrentTab
                ? t('follows.trends.show')
                : t('follows.trends.hide')}
            </Text>
          </Pressable>
        </View>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlashList
        data={feedItems}
        keyExtractor={item => item.key}
        renderItem={renderItem}
        ListHeaderComponent={listHeaderComponent}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}
