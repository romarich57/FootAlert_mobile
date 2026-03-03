import { useMemo } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type {
  TeamCompetitionOption,
  TeamIdentity,
  TeamOverviewData,
} from '@ui/features/teams/types/teams.types';

import { OverviewCoachPerformanceCard } from './overview/OverviewCoachPerformanceCard';
import { OverviewCompetitionsCard } from './overview/OverviewCompetitionsCard';
import { OverviewMiniStandingCard } from './overview/OverviewMiniStandingCard';
import { OverviewNextMatchCard } from './overview/OverviewNextMatchCard';
import { OverviewPlayerLeadersCard } from './overview/OverviewPlayerLeadersCard';
import { OverviewRecentFormCard } from './overview/OverviewRecentFormCard';
import { OverviewSeasonOverviewCard } from './overview/OverviewSeasonOverviewCard';
import { OverviewStadiumInfoCard } from './overview/OverviewStadiumInfoCard';
import { OverviewStandingHistoryCard } from './overview/OverviewStandingHistoryCard';
import { createTeamOverviewStyles } from './overview/TeamOverviewTab.styles';
import type {
  PlayerCategoryKey,
  TeamOverviewListItemKey,
} from './overview/overviewSelectors';

type TeamOverviewTabProps = {
  team: TeamIdentity;
  competitions: TeamCompetitionOption[];
  selectedSeason: number | null;
  data: TeamOverviewData | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  hasFetched: boolean;
  hasFetchedAfterMount: boolean;
  onRetry: () => void;
  onPressMatch: (matchId: string) => void;
  onPressTeam: (teamId: string) => void;
};

type LeaderSection = {
  key: PlayerCategoryKey;
  title: string;
  players: TeamOverviewData['playerLeaders'][PlayerCategoryKey];
};

type SeasonStatCard = {
  key: 'rank' | 'points' | 'played' | 'goalDiff';
  iconName: string;
  label: string;
  value: number | null;
};

export function TeamOverviewTab({
  team,
  competitions,
  selectedSeason,
  data,
  isLoading,
  isFetching,
  isError,
  hasFetched,
  hasFetchedAfterMount,
  onRetry,
  onPressMatch,
  onPressTeam,
}: TeamOverviewTabProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createTeamOverviewStyles(colors), [colors]);

  const competitionsForSeason = useMemo(
    () =>
      competitions
        .filter(item => typeof selectedSeason === 'number' && item.seasons.includes(selectedSeason))
        .map(item => ({
          leagueId: item.leagueId,
          leagueLogo: item.leagueLogo,
          leagueName: item.leagueName,
          season: selectedSeason,
        })),
    [competitions, selectedSeason],
  );

  const leaderSections = useMemo<LeaderSection[]>(
    () => [
      {
        key: 'scorers',
        title: t('teamDetails.stats.categories.scorers'),
        players: data?.playerLeaders.scorers ?? [],
      },
      {
        key: 'assisters',
        title: t('teamDetails.stats.categories.assisters'),
        players: data?.playerLeaders.assisters ?? [],
      },
      {
        key: 'ratings',
        title: t('teamDetails.stats.categories.rating'),
        players: data?.playerLeaders.ratings ?? [],
      },
    ],
    [data?.playerLeaders.assisters, data?.playerLeaders.ratings, data?.playerLeaders.scorers, t],
  );

  const seasonStatCards = useMemo<SeasonStatCard[]>(
    () => [
      {
        key: 'rank',
        iconName: 'medal-outline',
        label: t('teamDetails.labels.rank'),
        value: data?.seasonStats.rank ?? null,
      },
      {
        key: 'points',
        iconName: 'star-outline',
        label: t('teamDetails.labels.points'),
        value: data?.seasonStats.points ?? null,
      },
      {
        key: 'played',
        iconName: 'calendar-month-outline',
        label: t('teamDetails.labels.played'),
        value: data?.seasonStats.played ?? null,
      },
      {
        key: 'goalDiff',
        iconName: 'soccer',
        label: t('teamDetails.labels.goalDiff'),
        value: data?.seasonStats.goalDiff ?? null,
      },
    ],
    [data?.seasonStats.goalDiff, data?.seasonStats.played, data?.seasonStats.points, data?.seasonStats.rank, t],
  );

  const historyPoints = useMemo(
    () => [...(data?.standingHistory ?? [])].sort((a, b) => a.season - b.season),
    [data?.standingHistory],
  );

  const historyLeague = useMemo(() => {
    const matchedCompetition =
      competitions.find(item =>
        typeof selectedSeason === 'number' ? item.seasons.includes(selectedSeason) : true,
      ) ?? competitions[0] ?? null;

    return {
      name: data?.miniStanding?.leagueName ?? matchedCompetition?.leagueName ?? null,
      logo: data?.miniStanding?.leagueLogo ?? matchedCompetition?.leagueLogo ?? null,
    };
  }, [competitions, data?.miniStanding?.leagueLogo, data?.miniStanding?.leagueName, selectedSeason]);

  const hasRenderableData = typeof data !== 'undefined';
  const hasFetchAttempt = hasFetchedAfterMount || hasFetched;
  const shouldShowErrorState = !hasRenderableData && isError && hasFetchAttempt && !isFetching && !isLoading;

  if (shouldShowErrorState) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.stateCard}>
            <Text style={styles.stateText}>{t('teamDetails.states.error')}</Text>
            <Pressable onPress={onRetry}>
              <Text style={styles.retryText}>{t('actions.retry')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  if (!hasRenderableData) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" color={colors.primary} style={styles.loadingIndicator} />
          </View>
        </View>
      </View>
    );
  }

  const overviewItems: TeamOverviewListItemKey[] = [
    'next-match',
    'recent-form',
    'season-overview',
    'mini-standing',
    'standing-history',
    'coach-performance',
    'player-leaders',
    'competitions',
    'stadium-info',
  ];

  return (
    <View style={styles.container}>
      <FlashList
        data={overviewItems}
        keyExtractor={item => item}
        getItemType={() => 'team-overview-section'}
        estimatedItemSize={280}
        renderItem={({ item }) => {
          if (item === 'next-match') {
            return (
              <OverviewNextMatchCard
                styles={styles}
                t={t}
                nextMatch={data?.nextMatch ?? null}
                onPressMatch={onPressMatch}
                onPressTeam={onPressTeam}
              />
            );
          }

          if (item === 'recent-form') {
            return (
              <OverviewRecentFormCard
                styles={styles}
                t={t}
                recentForm={data?.recentForm ?? []}
              />
            );
          }

          if (item === 'season-overview') {
            return (
              <OverviewSeasonOverviewCard
                styles={styles}
                colors={colors}
                t={t}
                seasonStatCards={seasonStatCards}
                seasonLineup={data?.seasonLineup}
              />
            );
          }

          if (item === 'mini-standing') {
            return (
              <OverviewMiniStandingCard
                styles={styles}
                t={t}
                miniStanding={data?.miniStanding ?? null}
              />
            );
          }

          if (item === 'standing-history') {
            return (
              <OverviewStandingHistoryCard
                styles={styles}
                t={t}
                historyPoints={historyPoints}
                historyLeague={historyLeague}
              />
            );
          }

          if (item === 'coach-performance') {
            return (
              <OverviewCoachPerformanceCard
                styles={styles}
                t={t}
                coachPerformance={data?.coachPerformance ?? null}
              />
            );
          }

          if (item === 'player-leaders') {
            return (
              <OverviewPlayerLeadersCard
                styles={styles}
                t={t}
                leaderSections={leaderSections}
              />
            );
          }

          if (item === 'competitions') {
            return (
              <OverviewCompetitionsCard
                styles={styles}
                t={t}
                competitionsForSeason={competitionsForSeason}
              />
            );
          }

          if (item === 'stadium-info') {
            return <OverviewStadiumInfoCard styles={styles} t={t} team={team} />;
          }

          return null;
        }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
      />
    </View>
  );
}
