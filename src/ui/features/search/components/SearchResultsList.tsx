import { useMemo } from 'react';
import { FlashList } from '@shopify/flash-list';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { appEnv } from '@data/config/env';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type {
  SearchEntityTab,
  SearchPlayerResult,
  SearchTeamResult,
} from '@ui/features/search/types/search.types';
import { localizePlayerPosition } from '@ui/shared/i18n/playerPosition';
import { AppImage } from '@ui/shared/media/AppImage';
import { DEFAULT_HIT_SLOP, MIN_TOUCH_TARGET, type ThemeColors } from '@ui/shared/theme/theme';

type SearchResultsListProps = {
  selectedTab: SearchEntityTab;
  hasEnoughChars: boolean;
  query: string;
  teamResults: SearchTeamResult[];
  playerResults: SearchPlayerResult[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onPressTeam: (teamId: string) => void;
  onPressPlayer: (playerId: string) => void;
};

type SearchListItem =
  | {
    type: 'team';
    key: string;
    item: SearchTeamResult;
  }
  | {
    type: 'player';
    key: string;
    item: SearchPlayerResult;
  };

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 32,
      gap: 10,
    },
    resultCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      minHeight: MIN_TOUCH_TARGET,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    logoWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    logo: {
      width: 22,
      height: 22,
    },
    textWrap: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    title: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '500',
    },
    stateContainer: {
      paddingHorizontal: 16,
      paddingVertical: 16,
      gap: 10,
    },
    stateText: {
      color: colors.textMuted,
      fontSize: 15,
      fontWeight: '500',
    },
    retryButton: {
      alignSelf: 'flex-start',
      minHeight: MIN_TOUCH_TARGET,
      justifyContent: 'center',
    },
    retryText: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: '700',
    },
  });
}

function buildItems(
  selectedTab: SearchEntityTab,
  teamResults: SearchTeamResult[],
  playerResults: SearchPlayerResult[],
): SearchListItem[] {
  if (selectedTab === 'teams') {
    return teamResults.map(item => ({
      type: 'team',
      key: `team-${item.teamId}`,
      item,
    }));
  }

  return playerResults.map(item => ({
    type: 'player',
    key: `player-${item.playerId}`,
    item,
  }));
}

export function SearchResultsList({
  selectedTab,
  hasEnoughChars,
  query,
  teamResults,
  playerResults,
  isLoading,
  isError,
  onRetry,
  onPressTeam,
  onPressPlayer,
}: SearchResultsListProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const items = useMemo(
    () => buildItems(selectedTab, teamResults, playerResults),
    [playerResults, selectedTab, teamResults],
  );

  if (!query.trim().length) {
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.stateText}>{t('screens.search.hint')}</Text>
      </View>
    );
  }

  if (!hasEnoughChars) {
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.stateText}>
          {t('screens.search.minChars', { count: appEnv.followsSearchMinChars })}
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.stateText}>{t('screens.search.loading')}</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.stateText}>{t('screens.search.error')}</Text>
        <Pressable
          style={styles.retryButton}
          onPress={onRetry}
          hitSlop={DEFAULT_HIT_SLOP}
          testID="search-results-retry-button"
        >
          <Text style={styles.retryText}>{t('actions.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.stateText}>{t('screens.search.empty')}</Text>
      </View>
    );
  }

  return (
    <FlashList
      data={items}
      keyExtractor={item => item.key}
      estimatedItemSize={76}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => {
        if (item.type === 'team') {
          return (
            <Pressable
              onPress={() => onPressTeam(item.item.teamId)}
              style={styles.resultCard}
              hitSlop={DEFAULT_HIT_SLOP}
              testID={`search-result-team-${item.item.teamId}`}
            >
              <View style={styles.logoWrap}>
                {item.item.teamLogo ? (
                  <AppImage
                    source={{ uri: item.item.teamLogo }}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                ) : (
                  <MaterialCommunityIcons name="shield-outline" size={18} color={colors.textMuted} />
                )}
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.item.teamName}
                </Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {item.item.country}
                </Text>
              </View>
            </Pressable>
          );
        }

        const subtitle = [
          localizePlayerPosition(item.item.position, t),
          item.item.teamName,
          item.item.leagueName,
        ]
          .filter(Boolean)
          .join(' • ');

        return (
          <Pressable
            onPress={() => onPressPlayer(item.item.playerId)}
            style={styles.resultCard}
            hitSlop={DEFAULT_HIT_SLOP}
            testID={`search-result-player-${item.item.playerId}`}
          >
            <View style={styles.logoWrap}>
              {item.item.playerPhoto ? (
                <AppImage source={{ uri: item.item.playerPhoto }} style={styles.logo} resizeMode="cover" />
              ) : (
                <MaterialCommunityIcons name="account-outline" size={18} color={colors.textMuted} />
              )}
            </View>
            <View style={styles.textWrap}>
              <Text style={styles.title} numberOfLines={1}>
                {item.item.playerName}
              </Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            </View>
          </Pressable>
        );
      }}
    />
  );
}
