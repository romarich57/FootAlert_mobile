import { useCallback, useMemo, type ReactElement } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { TeamStatsData } from '@ui/features/teams/types/teams.types';
import { localizePlayerPosition } from '@ui/shared/i18n/playerPosition';

import { TeamComparisonMetricsSection } from './stats/TeamComparisonMetricsSection';
import { TeamGoalsCard } from './stats/TeamGoalsCard';
import { TeamPointsCard } from './stats/TeamPointsCard';
import { createTeamStatsTabStyles } from './stats/TeamStatsTab.styles';
import { TeamTopPlayersSection } from './stats/TeamTopPlayersSection';
import { resolveTeamStatsVisibility } from './stats/teamStatsSelectors';

type TeamStatsTabProps = {
  data: TeamStatsData | undefined;
  isLoading: boolean;
  isError: boolean;
  hasFetched?: boolean;
  onRetry: () => void;
  onPressPlayer: (playerId: string) => void;
};

type TeamStatsContentItem = {
  key: string;
  content: ReactElement;
};

export function TeamStatsTab({
  data,
  isLoading,
  isError,
  hasFetched = true,
  onRetry,
  onPressPlayer,
}: TeamStatsTabProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createTeamStatsTabStyles(colors), [colors]);

  const visibility = useMemo(() => resolveTeamStatsVisibility(data), [data]);
  const comparisonMetrics = useMemo(() => data?.comparisonMetrics ?? [], [data]);

  const hasContentData =
    visibility.pointsCardVisible ||
    visibility.goalsCardVisible ||
    visibility.playersCardVisible ||
    comparisonMetrics.length > 0;

  const shouldShowLoadingState = (isLoading || !hasFetched) && !hasContentData;
  const shouldShowErrorState = isError && !hasContentData;
  const localizePosition = useCallback(
    (value: string | null | undefined) => localizePlayerPosition(value, t),
    [t],
  );

  const contentItems = useMemo<TeamStatsContentItem[]>(() => {
    const items: TeamStatsContentItem[] = [];

    if (shouldShowLoadingState) {
      items.push({
        key: 'loading-state',
        content: (
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" color={colors.primary} style={styles.loadingIndicator} />
          </View>
        ),
      });
    }

    if (shouldShowErrorState) {
      items.push({
        key: 'error-state',
        content: (
          <View style={styles.stateCard}>
            <Text style={styles.stateText}>{t('teamDetails.states.error')}</Text>
            <Pressable onPress={onRetry}>
              <Text style={styles.retryText}>{t('actions.retry')}</Text>
            </Pressable>
          </View>
        ),
      });
    }

    if (!shouldShowLoadingState && !shouldShowErrorState && visibility.pointsCardVisible) {
      items.push({
        key: 'points-card',
        content: <TeamPointsCard data={data} styles={styles} t={t} />,
      });
    }

    if (!shouldShowLoadingState && !shouldShowErrorState && visibility.goalsCardVisible) {
      items.push({
        key: 'goals-card',
        content: <TeamGoalsCard data={data} styles={styles} t={t} />,
      });
    }

    if (!shouldShowLoadingState && !shouldShowErrorState && visibility.playersCardVisible) {
      items.push({
        key: 'top-players',
        content: (
          <TeamTopPlayersSection
            data={data}
            styles={styles}
            colors={colors}
            t={t}
            onPressPlayer={onPressPlayer}
            localizePosition={localizePosition}
          />
        ),
      });
    }

    if (!shouldShowLoadingState && !shouldShowErrorState && comparisonMetrics.length > 0) {
      items.push({
        key: 'comparison-metrics',
        content: (
          <TeamComparisonMetricsSection
            metrics={comparisonMetrics}
            styles={styles}
            colors={colors}
            t={t}
          />
        ),
      });
    }

    if (
      !shouldShowLoadingState &&
      !shouldShowErrorState &&
      hasFetched &&
      !visibility.pointsCardVisible &&
      !visibility.goalsCardVisible &&
      !visibility.playersCardVisible &&
      comparisonMetrics.length === 0
    ) {
      items.push({
        key: 'empty-state',
        content: (
          <View style={styles.stateCard}>
            <Text style={styles.stateText}>{t('teamDetails.states.empty')}</Text>
          </View>
        ),
      });
    }

    return items;
  }, [
    colors,
    comparisonMetrics,
    data,
    localizePosition,
    onPressPlayer,
    onRetry,
    shouldShowErrorState,
    shouldShowLoadingState,
    styles,
    t,
    hasFetched,
    visibility.goalsCardVisible,
    visibility.playersCardVisible,
    visibility.pointsCardVisible,
  ]);

  return (
    <View style={styles.container}>
      <FlashList
        data={contentItems}
        keyExtractor={item => item.key}
        getItemType={() => 'team-stats-section'}
        estimatedItemSize={240}
        renderItem={({ item }) => item.content}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
      />
    </View>
  );
}
