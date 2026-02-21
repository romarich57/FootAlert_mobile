import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { appEnv } from '@data/config/env';
import {
  FollowedCarousel,
  FollowedPlayerCard,
  FollowedTeamCard,
  FollowsEmptyFollowedCard,
  FollowsHeader,
  FollowsSegmentedControl,
  FollowsTrendRow,
} from '@ui/features/follows/components';
import { useFollowedPlayersCards } from '@ui/features/follows/hooks/useFollowedPlayersCards';
import { useFollowedTeamsCards } from '@ui/features/follows/hooks/useFollowedTeamsCards';
import { useFollowsActions } from '@ui/features/follows/hooks/useFollowsActions';
import { useFollowsTrends } from '@ui/features/follows/hooks/useFollowsTrends';
import type {
  FollowEntityTab,
  TrendPlayerItem,
  TrendTeamItem,
} from '@ui/features/follows/types/follows.types';
import type { RootStackParamList } from '@ui/app/navigation/types';
import type { ThemeColors } from '@ui/shared/theme/theme';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
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

export function FollowsScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [selectedTab, setSelectedTab] = useState<FollowEntityTab>('teams');
  const [isEditMode, setIsEditMode] = useState(false);

  const {
    followedTeamIds,
    followedPlayerIds,
    hideTrendsTeams,
    hideTrendsPlayers,
    isLoading,
    lastToggleError,
    clearToggleError,
    toggleTeamFollow,
    togglePlayerFollow,
    updateHideTrends,
  } = useFollowsActions();

  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris',
    [],
  );

  const teamCardsQuery = useFollowedTeamsCards({
    teamIds: followedTeamIds,
    timezone,
  });

  const playerCardsQuery = useFollowedPlayersCards({
    playerIds: followedPlayerIds,
  });

  const hideTrendsCurrentTab = selectedTab === 'teams' ? hideTrendsTeams : hideTrendsPlayers;

  const trendsQuery = useFollowsTrends({
    tab: selectedTab,
    hidden: hideTrendsCurrentTab,
  });

  const handleOpenSearch = useCallback(() => {
    navigation.navigate('FollowsSearch', {
      initialTab: selectedTab,
    });
  }, [navigation, selectedTab]);

  const handleToggleTeam = useCallback(
    (teamId: string) => {
      clearToggleError();
      toggleTeamFollow(teamId).catch(() => undefined);
    },
    [clearToggleError, toggleTeamFollow],
  );

  const handleTogglePlayer = useCallback(
    (playerId: string) => {
      clearToggleError();
      togglePlayerFollow(playerId).catch(() => undefined);
    },
    [clearToggleError, togglePlayerFollow],
  );

  const teamCards = teamCardsQuery.data ?? [];
  const playerCards = playerCardsQuery.data ?? [];

  const trendsItems = useMemo(() => {
    return trendsQuery.data ?? [];
  }, [trendsQuery.data]);

  const isSectionLoading =
    isLoading ||
    (selectedTab === 'teams' ? teamCardsQuery.isLoading : playerCardsQuery.isLoading);

  const showLimitError = lastToggleError === 'limit_reached';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <FollowsHeader
          title={t('follows.title')}
          onPressSearch={handleOpenSearch}
          searchA11yLabel={t('follows.search.openSearch')}
          isEditMode={isEditMode}
          onPressEdit={() => setIsEditMode(!isEditMode)}
          editLabel={t('follows.actions.edit')}
          saveLabel={t('follows.actions.done')}
        />

        <FollowsSegmentedControl
          selectedTab={selectedTab}
          onChangeTab={setSelectedTab}
          teamsLabel={t('follows.tabs.teams')}
          playersLabel={t('follows.tabs.players')}
        />

        {showLimitError ? (
          <Text style={styles.limitError}>
            {selectedTab === 'teams'
              ? t('follows.errors.maxTeams', { count: appEnv.followsMaxFollowedTeams })
              : t('follows.errors.maxPlayers', { count: appEnv.followsMaxFollowedPlayers })}
          </Text>
        ) : null}

        {selectedTab === 'teams' ? (
          <FollowedCarousel
            items={teamCards}
            keyExtractor={item => item.teamId}
            renderItem={item => (
              <FollowedTeamCard
                card={item}
                unfollowLabel={t('follows.actions.unfollow')}
                followLabel={t('follows.actions.follow')}
                onUnfollow={handleToggleTeam}
                noNextMatchLabel={t('follows.cards.noNextMatch')}
                isEditMode={isEditMode}
              />
            )}
            emptyState={
              <FollowsEmptyFollowedCard
                onPress={handleOpenSearch}
                label={t('follows.cards.addToFavorites')}
              />
            }
          />
        ) : (
          <FollowedCarousel
            items={playerCards}
            keyExtractor={item => item.playerId}
            renderItem={item => (
              <FollowedPlayerCard
                card={item}
                followLabel={t('follows.actions.follow')}
                unfollowLabel={t('follows.actions.unfollow')}
                onUnfollow={handleTogglePlayer}
                goalsLabel={t('follows.cards.goals')}
                assistsLabel={t('follows.cards.assists')}
                isEditMode={isEditMode}
              />
            )}
            emptyState={
              <FollowsEmptyFollowedCard
                onPress={handleOpenSearch}
                label={t('follows.cards.addToFavorites')}
              />
            }
          />
        )}

        {isSectionLoading ? <Text style={styles.infoText}>{t('follows.states.loading')}</Text> : null}

        <View style={styles.trendsSection}>
          <View style={styles.trendsHeader}>
            <Text style={styles.trendsTitle}>{t('follows.trends.title')}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                updateHideTrends(selectedTab, !hideTrendsCurrentTab).catch(() => undefined);
              }}
              accessibilityLabel={
                hideTrendsCurrentTab ? t('follows.trends.show') : t('follows.trends.hide')
              }
            >
              <Text style={styles.trendsActionText}>
                {hideTrendsCurrentTab ? t('follows.trends.show') : t('follows.trends.hide')}
              </Text>
            </Pressable>
          </View>

          {!hideTrendsCurrentTab && trendsItems.length === 0 ? (
            <Text style={styles.infoText}>{t('follows.states.noTrends')}</Text>
          ) : null}

          {!hideTrendsCurrentTab && selectedTab === 'teams'
            ? (trendsItems as TrendTeamItem[]).map(item => (
              <FollowsTrendRow
                key={`trend-team-${item.teamId}`}
                title={item.teamName}
                subtitle={item.leagueName}
                avatarUrl={item.teamLogo}
                isFollowing={followedTeamIds.includes(item.teamId)}
                onToggleFollow={() => handleToggleTeam(item.teamId)}
                followLabel={t('follows.actions.follow')}
                unfollowLabel={t('follows.actions.unfollow')}
                accessibilityLabel={`${t('follows.actions.follow')} ${item.teamName}`}
              />
            ))
            : null}

          {!hideTrendsCurrentTab && selectedTab === 'players'
            ? (trendsItems as TrendPlayerItem[]).map(item => (
              <FollowsTrendRow
                key={`trend-player-${item.playerId}`}
                title={item.playerName}
                subtitle={[item.position, item.teamName].filter(Boolean).join(' • ')}
                avatarUrl={item.playerPhoto}
                isFollowing={followedPlayerIds.includes(item.playerId)}
                onToggleFollow={() => handleTogglePlayer(item.playerId)}
                followLabel={t('follows.actions.follow')}
                unfollowLabel={t('follows.actions.unfollow')}
                accessibilityLabel={`${t('follows.actions.follow')} ${item.playerName}`}
              />
            ))
            : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
