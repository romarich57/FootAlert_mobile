import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RootStackParamList } from '@ui/app/navigation/types';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { appEnv } from '@data/config/env';
import { FollowsSegmentedControl, FollowsTrendRow } from '@ui/features/follows/components';
import { useFollowsActions } from '@ui/features/follows/hooks/useFollowsActions';
import { useFollowsSearch } from '@ui/features/follows/hooks/useFollowsSearch';
import type {
  FollowEntityTab,
  FollowsSearchResultPlayer,
  FollowsSearchResultTeam,
} from '@ui/features/follows/types/follows.types';
import type { ThemeColors } from '@ui/shared/theme/theme';

const SEARCH_ROUTE_FALLBACK: RootStackParamList['FollowsSearch'] = { initialTab: 'teams' };

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 8,
    },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      borderWidth: 1,
      borderColor: colors.chipBorder,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    title: {
      color: colors.text,
      fontSize: 28,
      fontWeight: '800',
      letterSpacing: -0.4,
    },
    searchInput: {
      marginHorizontal: 16,
      marginTop: 14,
      borderWidth: 1,
      borderColor: colors.chipBorder,
      borderRadius: 16,
      backgroundColor: colors.surface,
      color: colors.text,
      fontSize: 18,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    stateContainer: {
      paddingHorizontal: 20,
      paddingVertical: 24,
    },
    stateText: {
      color: colors.textMuted,
      fontSize: 18,
      fontWeight: '600',
    },
    listContent: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 24,
      gap: 12,
    },
  });
}

export function FollowsSearchScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'FollowsSearch'>>();
  const routeParams = route.params ?? SEARCH_ROUTE_FALLBACK;

  const [selectedTab, setSelectedTab] = useState<FollowEntityTab>(routeParams.initialTab);
  const [query, setQuery] = useState('');

  const {
    followedTeamIds,
    followedPlayerIds,
    toggleTeamFollow,
    togglePlayerFollow,
  } = useFollowsActions();

  const search = useFollowsSearch({
    tab: selectedTab,
    query,
  });

  const handleToggleTeam = useCallback(
    (teamId: string) => {
      toggleTeamFollow(teamId).catch(() => undefined);
    },
    [toggleTeamFollow],
  );

  const handleTogglePlayer = useCallback(
    (playerId: string) => {
      togglePlayerFollow(playerId).catch(() => undefined);
    },
    [togglePlayerFollow],
  );

  const handleOpenPlayerDetails = useCallback(
    (playerId: string) => {
      navigation.navigate('PlayerDetails', { playerId });
    },
    [navigation],
  );

  const handleOpenTeamDetails = useCallback(
    (teamId: string) => {
      navigation.navigate('TeamDetails', { teamId });
    },
    [navigation],
  );

  const renderTeamRow = useCallback(
    (item: FollowsSearchResultTeam) => {
      return (
        <FollowsTrendRow
          title={item.teamName}
          subtitle={item.country}
          avatarUrl={item.teamLogo}
          onPressItem={() => handleOpenTeamDetails(item.teamId)}
          itemAccessibilityLabel={item.teamName}
          isFollowing={followedTeamIds.includes(item.teamId)}
          onToggleFollow={() => handleToggleTeam(item.teamId)}
          followLabel={t('follows.actions.follow')}
          unfollowLabel={t('follows.actions.unfollow')}
          accessibilityLabel={`${t('follows.actions.follow')} ${item.teamName}`}
        />
      );
    },
    [followedTeamIds, handleOpenTeamDetails, handleToggleTeam, t],
  );

  const renderPlayerRow = useCallback(
    (item: FollowsSearchResultPlayer) => {
      return (
        <FollowsTrendRow
          title={item.playerName}
          subtitle={[item.position, item.teamName].filter(Boolean).join(' • ')}
          avatarUrl={item.playerPhoto}
          onPressItem={() => handleOpenPlayerDetails(item.playerId)}
          itemAccessibilityLabel={item.playerName}
          isFollowing={followedPlayerIds.includes(item.playerId)}
          onToggleFollow={() => handleTogglePlayer(item.playerId)}
          followLabel={t('follows.actions.follow')}
          unfollowLabel={t('follows.actions.unfollow')}
          accessibilityLabel={`${t('follows.actions.follow')} ${item.playerName}`}
        />
      );
    },
    [followedPlayerIds, handleOpenPlayerDetails, handleTogglePlayer, t],
  );

  const teamResults =
    selectedTab === 'teams' ? (search.results as FollowsSearchResultTeam[]) : [];
  const playerResults =
    selectedTab === 'players' ? (search.results as FollowsSearchResultPlayer[]) : [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('follows.search.back')}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{t('follows.search.title')}</Text>
      </View>

      <FollowsSegmentedControl
        selectedTab={selectedTab}
        onChangeTab={setSelectedTab}
        teamsLabel={t('follows.tabs.teams')}
        playersLabel={t('follows.tabs.players')}
      />

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={
          selectedTab === 'teams'
            ? t('follows.search.placeholderTeams')
            : t('follows.search.placeholderPlayers')
        }
        placeholderTextColor={colors.textMuted}
        style={styles.searchInput}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {!search.hasEnoughChars ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>
            {t('follows.search.minChars', {
              count: appEnv.followsSearchMinChars,
            })}
          </Text>
        </View>
      ) : null}

      {search.hasEnoughChars && search.isLoading ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>{t('follows.search.loading')}</Text>
        </View>
      ) : null}

      {search.hasEnoughChars &&
      !search.isLoading &&
      teamResults.length === 0 &&
      playerResults.length === 0 ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>{t('follows.search.empty')}</Text>
        </View>
      ) : null}

      {selectedTab === 'teams' && teamResults.length > 0 ? (
        <FlashList
          data={teamResults}
          keyExtractor={item => `team-${item.teamId}`}
          renderItem={({ item }) => renderTeamRow(item)}
          contentContainerStyle={styles.listContent}
        />
      ) : null}

      {selectedTab === 'players' && playerResults.length > 0 ? (
        <FlashList
          data={playerResults}
          keyExtractor={item => `player-${item.playerId}`}
          renderItem={({ item }) => renderPlayerRow(item)}
          contentContainerStyle={styles.listContent}
        />
      ) : null}
    </SafeAreaView>
  );
}
