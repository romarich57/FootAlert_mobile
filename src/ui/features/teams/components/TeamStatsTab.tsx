import { memo, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type {
  TeamComparisonMetric,
  TeamStatsData,
  TeamStatsRecord,
  TeamTopPlayer,
} from '@ui/features/teams/types/teams.types';
import { toDisplayNumber, toDisplayValue } from '@ui/features/teams/utils/teamDisplay';
import type { ThemeColors } from '@ui/shared/theme/theme';
import { localizePlayerPosition } from '@ui/shared/i18n/playerPosition';

type TeamStatsTabProps = {
  data: TeamStatsData | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onPressPlayer: (playerId: string) => void;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 16,
      paddingBottom: 24,
      gap: 12,
    },
    stateCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 8,
      marginTop: 12,
    },
    stateText: {
      color: colors.textMuted,
      fontSize: 15,
      fontWeight: '600',
    },
    retryText: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: '700',
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 30,
      lineHeight: 34,
      fontWeight: '900',
      marginTop: 8,
    },
    card: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14,
      gap: 12,
    },
    cardTitleRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 12,
    },
    cardTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '900',
      flex: 1,
    },
    cardValue: {
      color: colors.text,
      fontSize: 40,
      lineHeight: 42,
      fontWeight: '900',
    },
    mutedValue: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '700',
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    rowLabel: {
      color: colors.textMuted,
      fontSize: 15,
      fontWeight: '700',
      flex: 1,
    },
    rowValue: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '800',
    },
    tableHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 2,
    },
    tableHeadLabel: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '800',
      width: 32,
      textAlign: 'center',
    },
    venueLabel: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
      width: 86,
    },
    tableValue: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '700',
      width: 32,
      textAlign: 'center',
    },
    scoreColumn: {
      width: 56,
    },
    diffColumn: {
      width: 38,
    },
    barsWrap: {
      gap: 10,
    },
    barRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    barLabel: {
      width: 72,
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '700',
    },
    barTrack: {
      flex: 1,
      height: 10,
      borderRadius: 999,
      overflow: 'hidden',
      backgroundColor: colors.surfaceElevated,
    },
    barFill: {
      height: 10,
      borderRadius: 999,
      backgroundColor: colors.primary,
    },
    barValue: {
      width: 28,
      textAlign: 'right',
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    playersGrid: {
      gap: 10,
    },
    playersCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 12,
      gap: 8,
    },
    playersCardTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '800',
    },
    playerRow: {
      minHeight: 40,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    playerInfo: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    playerName: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
    },
    playerMeta: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    playerValue: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
      minWidth: 54,
      textAlign: 'right',
    },
    comparisonCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 12,
      gap: 8,
    },
    comparisonTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    comparisonTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
      flex: 1,
    },
    comparisonValue: {
      color: colors.primary,
      fontSize: 24,
      fontWeight: '900',
    },
    comparisonRank: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '700',
    },
    leaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    leaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
      minWidth: 0,
    },
    leaderRank: {
      color: colors.textMuted,
      width: 16,
      fontSize: 12,
      fontWeight: '700',
      textAlign: 'right',
    },
    leaderName: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
      flex: 1,
    },
    leaderValue: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
      minWidth: 44,
      textAlign: 'right',
    },
  });
}

function hasValue(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function formatDecimal(value: number | null | undefined, digits = 1): string {
  if (!hasValue(value)) {
    return '';
  }

  return value.toFixed(digits);
}

function formatComparisonValue(metric: TeamComparisonMetric): string {
  if (metric.key === 'possession') {
    return `${formatDecimal(metric.value, 1)}%`;
  }

  if (
    metric.key === 'pointsPerMatch' ||
    metric.key === 'goalsScoredPerMatch' ||
    metric.key === 'goalsConcededPerMatch' ||
    metric.key === 'shotsOnTargetPerMatch' ||
    metric.key === 'shotsPerMatch' ||
    metric.key === 'expectedGoalsPerMatch'
  ) {
    return formatDecimal(metric.value, 1);
  }

  return toDisplayNumber(metric.value);
}

function hasVenueStats(stats: TeamStatsRecord | null): boolean {
  if (!stats) {
    return false;
  }

  return (
    stats.played !== null ||
    stats.wins !== null ||
    stats.draws !== null ||
    stats.losses !== null ||
    stats.goalsFor !== null ||
    stats.goalsAgainst !== null ||
    stats.goalDiff !== null ||
    stats.points !== null
  );
}

function teamComparisonLabel(t: (key: string) => string, key: TeamComparisonMetric['key']): string {
  return t(`teamDetails.stats.comparisons.metrics.${key}`);
}

type PlayerCategoryCardProps = {
  title: string;
  players: TeamTopPlayer[];
  valueSelector: (player: TeamTopPlayer) => string;
  localizePosition: (value: string | null | undefined) => string;
  onPressPlayer: (playerId: string) => void;
  styles: ReturnType<typeof createStyles>;
};

const PlayerCategoryCard = memo(function PlayerCategoryCard({
  title,
  players,
  valueSelector,
  localizePosition,
  onPressPlayer,
  styles,
}: PlayerCategoryCardProps) {
  if (players.length === 0) {
    return null;
  }

  return (
    <View style={styles.playersCard}>
      <Text style={styles.playersCardTitle}>{title}</Text>
      {players.map(player => (
        <Pressable
          key={`${title}-${player.playerId}`}
          onPress={() => onPressPlayer(player.playerId)}
          style={styles.playerRow}
        >
          <View style={styles.playerInfo}>
            <Text numberOfLines={1} style={styles.playerName}>
              {toDisplayValue(player.name)}
            </Text>
            <Text style={styles.playerMeta}>{localizePosition(player.position)}</Text>
          </View>
          <Text style={styles.playerValue}>{valueSelector(player)}</Text>
        </Pressable>
      ))}
    </View>
  );
});

function GoalsBreakdownBars({
  goalBreakdown,
  styles,
}: {
  goalBreakdown: TeamStatsData['goalBreakdown'];
  styles: ReturnType<typeof createStyles>;
}) {
  if (goalBreakdown.length === 0) {
    return null;
  }

  const maxValue = Math.max(1, ...goalBreakdown.map(item => item.value ?? 0));

  return (
    <View style={styles.barsWrap}>
      {goalBreakdown.map(item => {
        const value = item.value ?? 0;
        const widthPercent = Math.max(0, Math.min(100, (value / maxValue) * 100));

        return (
          <View key={item.key} style={styles.barRow}>
            <Text style={styles.barLabel}>{item.label}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${widthPercent}%` }]} />
            </View>
            <Text style={styles.barValue}>{toDisplayNumber(item.value)}</Text>
          </View>
        );
      })}
    </View>
  );
}

function VenueStatsRow({
  label,
  stats,
  styles,
}: {
  label: string;
  stats: TeamStatsRecord;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.tableHeader}>
      <Text style={styles.venueLabel}>{label}</Text>
      <Text style={styles.tableValue}>{toDisplayNumber(stats.played)}</Text>
      <Text style={styles.tableValue}>{toDisplayNumber(stats.wins)}</Text>
      <Text style={styles.tableValue}>{toDisplayNumber(stats.draws)}</Text>
      <Text style={styles.tableValue}>{toDisplayNumber(stats.losses)}</Text>
      <Text style={[styles.tableValue, styles.scoreColumn]}>
        {toDisplayNumber(stats.goalsFor)}-{toDisplayNumber(stats.goalsAgainst)}
      </Text>
      <Text style={[styles.tableValue, styles.diffColumn]}>{toDisplayNumber(stats.goalDiff)}</Text>
      <Text style={styles.tableValue}>{toDisplayNumber(stats.points)}</Text>
    </View>
  );
}

export function TeamStatsTab({ data, isLoading, isError, onRetry, onPressPlayer }: TeamStatsTabProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const pointsCardVisible =
    hasValue(data?.points) ||
    hasValue(data?.rank) ||
    hasVenueStats(data?.pointsByVenue?.home ?? null) ||
    hasVenueStats(data?.pointsByVenue?.away ?? null);

  const goalsCardVisible =
    hasValue(data?.goalsFor) ||
    hasValue(data?.goalsAgainst) ||
    hasValue(data?.goalsForPerMatch) ||
    hasValue(data?.goalsAgainstPerMatch) ||
    hasValue(data?.cleanSheets) ||
    hasValue(data?.failedToScore) ||
    (data?.goalBreakdown?.length ?? 0) > 0;

  const playersCardVisible =
    (data?.topPlayersByCategory?.ratings.length ?? 0) > 0 ||
    (data?.topPlayersByCategory?.scorers.length ?? 0) > 0 ||
    (data?.topPlayersByCategory?.assisters.length ?? 0) > 0;

  const comparisonMetrics = data?.comparisonMetrics ?? [];
  const localizePosition = (value: string | null | undefined) =>
    localizePlayerPosition(value, t);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateText}>{t('teamDetails.states.loading')}</Text>
          </View>
        ) : null}

        {isError ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateText}>{t('teamDetails.states.error')}</Text>
            <Pressable onPress={onRetry}>
              <Text style={styles.retryText}>{t('actions.retry')}</Text>
            </Pressable>
          </View>
        ) : null}

        {!isLoading && !isError && pointsCardVisible ? (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>{t('teamDetails.stats.pointsCard')}</Text>
              {hasValue(data?.points) ? <Text style={styles.cardValue}>{toDisplayNumber(data?.points)}</Text> : null}
            </View>

            {hasValue(data?.rank) ? (
              <Text style={styles.mutedValue}>
                {t('teamDetails.labels.rank')} {toDisplayNumber(data?.rank)}
              </Text>
            ) : null}

            {hasVenueStats(data?.pointsByVenue?.home ?? null) ||
            hasVenueStats(data?.pointsByVenue?.away ?? null) ? (
              <>
                <View style={styles.divider} />

                <View style={styles.tableHeader}>
                  <Text style={styles.venueLabel}>{t('teamDetails.stats.venue')}</Text>
                  <Text style={styles.tableHeadLabel}>J</Text>
                  <Text style={styles.tableHeadLabel}>G</Text>
                  <Text style={styles.tableHeadLabel}>N</Text>
                  <Text style={styles.tableHeadLabel}>D</Text>
                  <Text style={[styles.tableHeadLabel, styles.scoreColumn]}>+/-</Text>
                  <Text style={[styles.tableHeadLabel, styles.diffColumn]}>DB</Text>
                  <Text style={styles.tableHeadLabel}>Pts</Text>
                </View>

                {data?.pointsByVenue?.home ? (
                  <VenueStatsRow
                    label={t('teamDetails.stats.home')}
                    stats={data.pointsByVenue.home}
                    styles={styles}
                  />
                ) : null}
                {data?.pointsByVenue?.away ? (
                  <VenueStatsRow
                    label={t('teamDetails.stats.away')}
                    stats={data.pointsByVenue.away}
                    styles={styles}
                  />
                ) : null}
              </>
            ) : null}
          </View>
        ) : null}

        {!isLoading && !isError && goalsCardVisible ? (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>{t('teamDetails.stats.goalsCard')}</Text>
              {(hasValue(data?.goalsFor) || hasValue(data?.goalsAgainst)) ? (
                <Text style={styles.cardValue}>
                  {toDisplayNumber(data?.goalsFor)}-{toDisplayNumber(data?.goalsAgainst)}
                </Text>
              ) : null}
            </View>

            {hasValue(data?.goalsForPerMatch) ? (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>{t('teamDetails.stats.goalsScoredPerMatch')}</Text>
                <Text style={styles.rowValue}>{formatDecimal(data?.goalsForPerMatch, 1)}</Text>
              </View>
            ) : null}

            {hasValue(data?.goalsAgainstPerMatch) ? (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>{t('teamDetails.stats.goalsConcededPerMatch')}</Text>
                <Text style={styles.rowValue}>{formatDecimal(data?.goalsAgainstPerMatch, 1)}</Text>
              </View>
            ) : null}

            {hasValue(data?.cleanSheets) ? (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>{t('teamDetails.stats.cleanSheets')}</Text>
                <Text style={styles.rowValue}>{toDisplayNumber(data?.cleanSheets)}</Text>
              </View>
            ) : null}

            {hasValue(data?.failedToScore) ? (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>{t('teamDetails.stats.failedToScore')}</Text>
                <Text style={styles.rowValue}>{toDisplayNumber(data?.failedToScore)}</Text>
              </View>
            ) : null}

            <GoalsBreakdownBars goalBreakdown={data?.goalBreakdown ?? []} styles={styles} />
          </View>
        ) : null}

        {!isLoading && !isError && playersCardVisible ? (
          <>
            <Text style={styles.sectionTitle}>{t('teamDetails.stats.topPlayers')}</Text>
            <View style={styles.playersGrid}>
              <PlayerCategoryCard
                title={t('teamDetails.stats.categories.rating')}
                players={data?.topPlayersByCategory?.ratings ?? []}
                valueSelector={player => formatDecimal(player.rating, 2)}
                localizePosition={localizePosition}
                onPressPlayer={onPressPlayer}
                styles={styles}
              />

              <PlayerCategoryCard
                title={t('teamDetails.stats.categories.scorers')}
                players={data?.topPlayersByCategory?.scorers ?? []}
                valueSelector={player => toDisplayNumber(player.goals)}
                localizePosition={localizePosition}
                onPressPlayer={onPressPlayer}
                styles={styles}
              />

              <PlayerCategoryCard
                title={t('teamDetails.stats.categories.assisters')}
                players={data?.topPlayersByCategory?.assisters ?? []}
                valueSelector={player => toDisplayNumber(player.assists)}
                localizePosition={localizePosition}
                onPressPlayer={onPressPlayer}
                styles={styles}
              />
            </View>
          </>
        ) : null}

        {!isLoading && !isError && comparisonMetrics.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>{t('teamDetails.stats.comparisons.title')}</Text>

            {comparisonMetrics.map(metric => (
              <View key={metric.key} style={styles.comparisonCard}>
                <View style={styles.comparisonTopRow}>
                  <Text style={styles.comparisonTitle}>{teamComparisonLabel(t, metric.key)}</Text>
                  <Text style={styles.comparisonValue}>{formatComparisonValue(metric)}</Text>
                </View>

                <Text style={styles.comparisonRank}>
                  {t('teamDetails.stats.comparisons.rank', {
                    rank: metric.rank,
                    total: metric.totalTeams,
                  })}
                </Text>

                {metric.leaders.map((leader, index) => (
                  <View key={`${metric.key}-${leader.teamId}-${index}`} style={styles.leaderRow}>
                    <View style={styles.leaderLeft}>
                      <Text style={styles.leaderRank}>{index + 1}</Text>
                      <Text style={styles.leaderName} numberOfLines={1}>
                        {toDisplayValue(leader.teamName)}
                      </Text>
                    </View>
                    <Text style={styles.leaderValue}>
                      {metric.key === 'possession'
                        ? `${formatDecimal(leader.value, 1)}%`
                        : formatDecimal(leader.value, 1)}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </>
        ) : null}

        {!isLoading && !isError && !pointsCardVisible && !goalsCardVisible && !playersCardVisible && comparisonMetrics.length === 0 ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateText}>{t('teamDetails.states.empty')}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
