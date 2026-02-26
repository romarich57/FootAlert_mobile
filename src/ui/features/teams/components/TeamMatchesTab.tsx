import { memo, useCallback, useMemo, useState } from 'react';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { TeamMatchItem, TeamMatchesData } from '@ui/features/teams/types/teams.types';
import { createTeamMatchesTabStyles } from '@ui/features/teams/components/TeamMatchesTab.styles';
import {
  toDisplayDate,
  toDisplayHour,
  toDisplayScore,
  toDisplayValue,
} from '@ui/features/teams/utils/teamDisplay';
import { DEFAULT_HIT_SLOP } from '@ui/shared/theme/theme';

type VenueFilter = 'all' | 'home' | 'away';

type TeamMatchesTabProps = {
  teamId: string;
  data: TeamMatchesData | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onPressMatch: (matchId: string) => void;
  onPressTeam: (teamId: string) => void;
};

type MatchFeedItem =
  | {
    type: 'header';
    key: string;
    title: string;
  }
  | {
    type: 'match';
    key: string;
    match: TeamMatchItem;
  };

function applyVenueFilter(items: TeamMatchItem[], teamId: string, filter: VenueFilter): TeamMatchItem[] {
  if (filter === 'all') {
    return items;
  }

  return items.filter(item => {
    if (filter === 'home') {
      return item.homeTeamId === teamId;
    }

    return item.awayTeamId === teamId;
  });
}

function buildFeedItems(
  data: TeamMatchesData | undefined,
  teamId: string,
  filter: VenueFilter,
  labels: {
    live: string;
    upcoming: string;
    past: string;
  },
): MatchFeedItem[] {
  if (!data) {
    return [];
  }

  const live = applyVenueFilter(data.live, teamId, filter);
  const upcoming = applyVenueFilter(data.upcoming, teamId, filter);
  const past = applyVenueFilter(data.past, teamId, filter);

  const toItems = (title: string, keyPrefix: string, matches: TeamMatchItem[]): MatchFeedItem[] => {
    if (matches.length === 0) {
      return [];
    }

    return [
      {
        type: 'header',
        key: `${keyPrefix}-header`,
        title,
      },
      ...matches.map(match => ({
        type: 'match' as const,
        key: `${keyPrefix}-${match.fixtureId}`,
        match,
      })),
    ];
  };

  return [
    ...toItems(labels.live, 'live', live),
    ...toItems(labels.upcoming, 'upcoming', upcoming),
    ...toItems(labels.past, 'past', past),
  ];
}

const TeamMatchRow = memo(function TeamMatchRow({
  match,
  styles,
  onPressMatch,
  onPressTeam,
}: {
  match: TeamMatchItem;
  styles: ReturnType<typeof createTeamMatchesTabStyles>;
  onPressMatch: (matchId: string) => void;
  onPressTeam: (teamId: string) => void;
}) {
  const isUpcoming = match.status === 'upcoming';
  const scoreText = isUpcoming
    ? toDisplayHour(match.date)
    : toDisplayScore(match.homeGoals, match.awayGoals);

  return (
    <Pressable
      style={styles.matchCard}
      onPress={() => onPressMatch(match.fixtureId)}
      hitSlop={DEFAULT_HIT_SLOP}
    >
      <View style={styles.metaRow}>
        <View style={styles.metaLeft}>
          <Text style={styles.metaText}>{toDisplayDate(match.date)}</Text>
        </View>
        <View style={styles.metaLeft}>
          {match.leagueLogo ? (
            <Image source={{ uri: match.leagueLogo }} style={styles.metaIcon} resizeMode="contain" />
          ) : (
            <MaterialCommunityIcons name="trophy-outline" size={14} color={styles.metaText.color} />
          )}
          <Text numberOfLines={1} style={styles.metaText}>
            {toDisplayValue(match.leagueName)}
          </Text>
        </View>
      </View>

      <View style={styles.teamsRow}>
        <Pressable
          onPress={event => {
            event.stopPropagation();
            if (match.homeTeamId) {
              onPressTeam(match.homeTeamId);
            }
          }}
          style={styles.teamSide}
          hitSlop={DEFAULT_HIT_SLOP}
        >
          <View style={styles.teamLogoContainer}>
            {match.homeTeamLogo ? (
              <Image source={{ uri: match.homeTeamLogo }} style={styles.teamLogo} resizeMode="contain" />
            ) : null}
          </View>
          <Text numberOfLines={2} style={styles.teamName}>
            {toDisplayValue(match.homeTeamName)}
          </Text>
        </Pressable>

        <View style={styles.middleArea}>
          {isUpcoming ? (
            <Text style={styles.middleHourText}>{scoreText}</Text>
          ) : (
            <View style={styles.middleScoreBox}>
              <Text style={styles.middleScoreText}>{scoreText}</Text>
            </View>
          )}
        </View>

        <Pressable
          onPress={event => {
            event.stopPropagation();
            if (match.awayTeamId) {
              onPressTeam(match.awayTeamId);
            }
          }}
          style={[styles.teamSide, styles.teamSideRight]}
          hitSlop={DEFAULT_HIT_SLOP}
        >
          <View style={styles.teamLogoContainer}>
            {match.awayTeamLogo ? (
              <Image source={{ uri: match.awayTeamLogo }} style={styles.teamLogo} resizeMode="contain" />
            ) : null}
          </View>
          <Text numberOfLines={2} style={[styles.teamName, styles.awayTeamName]}>
            {toDisplayValue(match.awayTeamName)}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
});

export function TeamMatchesTab({
  teamId,
  data,
  isLoading,
  isError,
  onRetry,
  onPressMatch,
  onPressTeam,
}: TeamMatchesTabProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createTeamMatchesTabStyles(colors), [colors]);
  const [venueFilter, setVenueFilter] = useState<VenueFilter>('all');

  const feedItems = useMemo(
    () =>
      buildFeedItems(data, teamId, venueFilter, {
        live: t('teamDetails.matches.liveSection'),
        upcoming: t('teamDetails.matches.upcomingSection'),
        past: t('teamDetails.matches.pastSection'),
      }),
    [data, teamId, t, venueFilter],
  );
  const keyExtractor = useCallback((item: MatchFeedItem) => item.key, []);

  const renderItem = useCallback<ListRenderItem<MatchFeedItem>>(
    ({ item }) => {
      if (item.type === 'header') {
        return <Text style={styles.sectionHeader}>{item.title}</Text>;
      }

      return (
        <TeamMatchRow
          match={item.match}
          styles={styles}
          onPressMatch={onPressMatch}
          onPressTeam={onPressTeam}
        />
      );
    },
    [onPressMatch, onPressTeam, styles],
  );

  return (
    <View style={styles.container}>
      <View style={styles.filtersRow}>
        {(['all', 'home', 'away'] as VenueFilter[]).map(filter => {
          const isActive = venueFilter === filter;
          const label = t(`teamDetails.matches.filters.${filter}`);

          return (
            <Pressable
              key={filter}
              onPress={() => setVenueFilter(filter)}
              style={[styles.chip, isActive ? styles.chipActive : null]}
              hitSlop={DEFAULT_HIT_SLOP}
            >
              <Text style={[styles.chipText, isActive ? styles.chipTextActive : null]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator size="large" color={colors.primary} style={{ alignSelf: 'center' }} />
        </View>
      ) : null}

      {isError ? (
        <View style={styles.stateCard}>
          <Text style={styles.stateText}>{t('teamDetails.states.error')}</Text>
          <Pressable onPress={onRetry} hitSlop={DEFAULT_HIT_SLOP}>
            <Text style={styles.retryText}>{t('actions.retry')}</Text>
          </Pressable>
        </View>
      ) : null}

      {!isLoading && !isError ? (
        <FlashList
          data={feedItems}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          estimatedItemSize={120}
          ListEmptyComponent={<Text style={styles.stateText}>{t('teamDetails.states.empty')}</Text>}
        />
      ) : null}
    </View>
  );
}
