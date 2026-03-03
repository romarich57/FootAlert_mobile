import { useMemo } from 'react';
import { FlashList } from '@shopify/flash-list';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { appEnv } from '@data/config/env';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { buildSearchItems, formatMatchKickoff } from '@ui/features/search/components/searchResultsItems';
import { AppPressable } from '@ui/shared/components';
import type {
  SearchCompetitionResult,
  SearchEntityTab,
  SearchMatchResult,
  SearchPlayerResult,
  SearchTeamResult,
} from '@ui/features/search/types/search.types';
import { localizePlayerPosition } from '@ui/shared/i18n/playerPosition';
import { AppImage } from '@ui/shared/media/AppImage';
import { MIN_TOUCH_TARGET, type ThemeColors } from '@ui/shared/theme/theme';

type SearchResultsListProps = {
  selectedTab: SearchEntityTab;
  hasEnoughChars: boolean;
  query: string;
  teamResults: SearchTeamResult[];
  playerResults: SearchPlayerResult[];
  competitionResults: SearchCompetitionResult[];
  matchResults: SearchMatchResult[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onPressTeam: (teamId: string) => void;
  onPressPlayer: (playerId: string) => void;
  onPressCompetition: (competitionId: string) => void;
  onPressMatch: (fixtureId: string) => void;
};
function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 32,
      gap: 10,
    },
    sectionHeader: {
      paddingTop: 8,
      paddingBottom: 6,
    },
    sectionHeaderText: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
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

export function SearchResultsList({
  selectedTab,
  hasEnoughChars,
  query,
  teamResults,
  playerResults,
  competitionResults,
  matchResults,
  isLoading,
  isError,
  onRetry,
  onPressTeam,
  onPressPlayer,
  onPressCompetition,
  onPressMatch,
}: SearchResultsListProps) {
  const { colors } = useAppTheme();
  const { i18n, t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const items = useMemo(
    () =>
      buildSearchItems(
        selectedTab,
        {
          teams: t('screens.search.tabs.teams'),
          competitions: t('screens.search.tabs.competitions'),
          players: t('screens.search.tabs.players'),
          matches: t('screens.search.tabs.matches'),
        },
        teamResults,
        competitionResults,
        playerResults,
        matchResults,
      ),
    [competitionResults, matchResults, playerResults, selectedTab, t, teamResults],
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
        <AppPressable
          style={styles.retryButton}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={t('actions.retry')}
          testID="search-results-retry-button"
        >
          <Text style={styles.retryText}>{t('actions.retry')}</Text>
        </AppPressable>
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
      estimatedItemSize={74}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => {
        if (item.type === 'section-header') {
          return (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{item.title}</Text>
            </View>
          );
        }

        if (item.type === 'team') {
          return (
            <AppPressable
              onPress={() => onPressTeam(item.item.teamId)}
              style={styles.resultCard}
              accessibilityRole="button"
              accessibilityLabel={`${item.item.teamName} ${item.item.country}`.trim()}
              testID={`search-result-team-${item.item.teamId}`}
            >
              <View style={styles.logoWrap}>
                {item.item.teamLogo ? (
                  <AppImage source={{ uri: item.item.teamLogo }} style={styles.logo} resizeMode="contain" />
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
            </AppPressable>
          );
        }

        if (item.type === 'player') {
          const subtitle = [
            localizePlayerPosition(item.item.position, t),
            item.item.teamName,
            item.item.leagueName,
          ]
            .filter(Boolean)
            .join(' • ');

          return (
            <AppPressable
              onPress={() => onPressPlayer(item.item.playerId)}
              style={styles.resultCard}
              accessibilityRole="button"
              accessibilityLabel={`${item.item.playerName} ${subtitle}`.trim()}
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
            </AppPressable>
          );
        }

        if (item.type === 'competition') {
          const subtitle = [item.item.country, item.item.type].filter(Boolean).join(' • ');
          return (
            <AppPressable
              onPress={() => onPressCompetition(item.item.competitionId)}
              style={styles.resultCard}
              accessibilityRole="button"
              accessibilityLabel={`${item.item.competitionName} ${subtitle}`.trim()}
              testID={`search-result-competition-${item.item.competitionId}`}
            >
              <View style={styles.logoWrap}>
                {item.item.competitionLogo ? (
                  <AppImage source={{ uri: item.item.competitionLogo }} style={styles.logo} resizeMode="contain" />
                ) : (
                  <MaterialCommunityIcons name="trophy-outline" size={18} color={colors.textMuted} />
                )}
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.item.competitionName}
                </Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              </View>
            </AppPressable>
          );
        }

        const kickoff = formatMatchKickoff(item.item.kickoffAt, i18n.language.startsWith('fr') ? 'fr' : 'en');
        const title = `${item.item.homeTeamName} vs ${item.item.awayTeamName}`;
        const subtitle = [item.item.competitionName, kickoff || item.item.statusShort]
          .filter(Boolean)
          .join(' • ');

        return (
          <AppPressable
            onPress={() => onPressMatch(item.item.fixtureId)}
            style={styles.resultCard}
            accessibilityRole="button"
            accessibilityLabel={`${title} ${subtitle}`.trim()}
            testID={`search-result-match-${item.item.fixtureId}`}
          >
            <View style={styles.logoWrap}>
              <MaterialCommunityIcons name="soccer" size={18} color={colors.textMuted} />
            </View>
            <View style={styles.textWrap}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            </View>
          </AppPressable>
        );
      }}
    />
  );
}
