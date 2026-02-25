import { memo, useMemo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

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
      gap: 10,
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
      fontSize: 14,
      fontWeight: '500',
    },
    retryText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '600',
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 22,
      lineHeight: 26,
      fontWeight: '800',
      marginTop: 8,
    },
    card: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 12,
      gap: 10,
    },
    cardTitleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    cardTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
      flex: 1,
      lineHeight: 20,
    },
    cardValue: {
      color: colors.text,
      fontSize: 30,
      lineHeight: 32,
      fontWeight: '800',
      flexShrink: 1,
      textAlign: 'right',
    },
    pointsValue: {
      color: colors.text,
      fontSize: 27,
      lineHeight: 30,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
      letterSpacing: 0.2,
      minWidth: 54,
      textAlign: 'right',
    },
    goalsValue: {
      color: colors.text,
      fontSize: 24,
      lineHeight: 28,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
      letterSpacing: 0.3,
      minWidth: 78,
      textAlign: 'right',
    },
    mutedValue: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
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
      fontSize: 14,
      fontWeight: '600',
      flex: 1,
    },
    rowValue: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
    },
    tableHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 2,
    },
    tableHeadLabel: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
      width: 22,
      textAlign: 'center',
    },
    venueLabel: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
      width: 60,
    },
    tableValue: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '600',
      width: 22,
      textAlign: 'center',
    },
    scoreColumn: {
      width: 40,
    },
    diffColumn: {
      width: 26,
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
      fontSize: 15,
      fontWeight: '700',
    },
    playerRow: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    playerLeft: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    playerPhotoContainer: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    playerPhoto: {
      width: 30,
      height: 30,
      borderRadius: 15,
    },
    playerInfo: {
      flex: 1,
      minWidth: 0,
      gap: 1,
    },
    playerName: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    playerMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    playerMeta: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '500',
      flex: 1,
      minWidth: 0,
    },
    playerTeamLogoContainer: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    playerTeamLogo: {
      width: 12,
      height: 12,
    },
    playerValue: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
      minWidth: 48,
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
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    comparisonTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
      flex: 1,
      lineHeight: 18,
    },
    comparisonValue: {
      color: colors.primary,
      fontSize: 20,
      fontWeight: '800',
    },
    comparisonRank: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '600',
    },
    leaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 6,
    },
    leaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1,
      minWidth: 0,
    },
    leaderRank: {
      color: colors.textMuted,
      width: 14,
      fontSize: 11,
      fontWeight: '600',
      textAlign: 'right',
    },
    leaderLogoContainer: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    leaderLogo: {
      width: 14,
      height: 14,
    },
    leaderName: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '500',
      flex: 1,
    },
    leaderValue: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '600',
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
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
};

const PlayerCategoryCard = memo(function PlayerCategoryCard({
  title,
  players,
  valueSelector,
  localizePosition,
  onPressPlayer,
  colors,
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
          <View style={styles.playerLeft}>
            <View style={styles.playerPhotoContainer}>
              {player.photo ? (
                <Image source={{ uri: player.photo }} style={styles.playerPhoto} resizeMode="cover" />
              ) : (
                <MaterialCommunityIcons name="account" size={18} color={colors.textMuted} />
              )}
            </View>

            <View style={styles.playerInfo}>
              <Text numberOfLines={1} style={styles.playerName}>
                {toDisplayValue(player.name)}
              </Text>

              <View style={styles.playerMetaRow}>
                <Text numberOfLines={1} style={styles.playerMeta}>
                  {localizePosition(player.position)}
                </Text>

                <View style={styles.playerTeamLogoContainer}>
                  {player.teamLogo ? (
                    <Image source={{ uri: player.teamLogo }} style={styles.playerTeamLogo} resizeMode="contain" />
                  ) : (
                    <MaterialCommunityIcons name="shield-outline" size={10} color={colors.textMuted} />
                  )}
                </View>
              </View>
            </View>
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
              {hasValue(data?.points) ? (
                <Text style={styles.pointsValue}>{toDisplayNumber(data?.points)}</Text>
              ) : null}
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
                <Text style={styles.goalsValue}>
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
                colors={colors}
                styles={styles}
              />

              <PlayerCategoryCard
                title={t('teamDetails.stats.categories.scorers')}
                players={data?.topPlayersByCategory?.scorers ?? []}
                valueSelector={player => toDisplayNumber(player.goals)}
                localizePosition={localizePosition}
                onPressPlayer={onPressPlayer}
                colors={colors}
                styles={styles}
              />

              <PlayerCategoryCard
                title={t('teamDetails.stats.categories.assisters')}
                players={data?.topPlayersByCategory?.assisters ?? []}
                valueSelector={player => toDisplayNumber(player.assists)}
                localizePosition={localizePosition}
                onPressPlayer={onPressPlayer}
                colors={colors}
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

                      <View style={styles.leaderLogoContainer}>
                        {leader.teamLogo ? (
                          <Image source={{ uri: leader.teamLogo }} style={styles.leaderLogo} resizeMode="contain" />
                        ) : (
                          <MaterialCommunityIcons name="shield-outline" size={11} color={colors.textMuted} />
                        )}
                      </View>

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
