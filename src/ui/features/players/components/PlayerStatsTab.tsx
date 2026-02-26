import React, { useMemo, useState, type ReactElement } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { PlayerSeasonStats } from '@ui/features/players/types/players.types';
import type { TeamCompetitionOption } from '@ui/features/teams/types/teams.types';
import { TeamCompetitionSeasonSelector } from '@ui/features/teams/components/TeamCompetitionSeasonSelector';
import { toDisplayValue } from '@ui/features/players/utils/playerDisplay';
import {
  DEFAULT_HIT_SLOP,
  MIN_TOUCH_TARGET,
  type ThemeColors,
} from '@ui/shared/theme/theme';
import { StatBar } from './StatBar';

type PlayerStatsTabProps = {
  stats: PlayerSeasonStats;
  leagueName: string | null;
  competitions: TeamCompetitionOption[];
  selectedSeason: number | null;
  selectedLeagueId: string | null;
  onSelectLeagueSeason: (leagueId: string, season: number) => void;
};

type StatMode = 'total' | 'per90';
type StatSectionKey =
  | 'shooting'
  | 'passing'
  | 'dribbles'
  | 'defense'
  | 'discipline'
  | 'goalkeeper'
  | 'penalties';

type StatRowConfig = {
  label: string;
  value: number | null;
  max: number;
  color: string;
};

type PlayerStatsContentItem = {
  key: string;
  content: ReactElement;
};

function per90(value: number | null, minutes: number | null): number | null {
  if (value === null || minutes === null || minutes <= 0) {
    return null;
  }
  return Number(((value / minutes) * 90).toFixed(2));
}

function toPercentValue(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return '-';
  }

  return `${value}%`;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    contentPadding: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 60,
      gap: 16,
    },
    infoBanner: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.warning,
      backgroundColor: `${colors.warning}20`,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    infoBannerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    infoBannerIcon: {
      color: colors.warning,
    },
    infoBannerText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
      flex: 1,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 14,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    cardTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
      flexShrink: 1,
    },
    cardTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexShrink: 1,
    },
    cardSubtitle: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
      flexShrink: 1,
      textAlign: 'right',
    },
    labelWithIconRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    labelWithIconRowStart: {
      justifyContent: 'flex-start',
    },
    labelIcon: {
      color: colors.textMuted,
    },
    labelIconPrimary: {
      color: colors.primary,
    },
    kpiTopRow: {
      flexDirection: 'row',
      gap: 10,
    },
    kpiTopTile: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      paddingVertical: 12,
      paddingHorizontal: 10,
      gap: 6,
      minHeight: 88,
      justifyContent: 'center',
      alignItems: 'center',
    },
    kpiTopTileGoals: {
      borderColor: `${colors.success}55`,
      backgroundColor: `${colors.success}1A`,
    },
    kpiTopTileAssists: {
      borderColor: `${colors.primary}50`,
      backgroundColor: `${colors.primary}1A`,
    },
    kpiTopTileRating: {
      borderColor: `${colors.warning}55`,
      backgroundColor: `${colors.warning}1A`,
    },
    kpiTopLabel: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '700',
      textAlign: 'center',
    },
    kpiTopValue: {
      color: colors.text,
      fontSize: 28,
      fontWeight: '900',
    },
    kpiTopValuePrimary: {
      color: colors.primary,
    },
    kpiBottomRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
    },
    kpiBottomTile: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      paddingVertical: 10,
      paddingHorizontal: 8,
      minHeight: 72,
    },
    kpiBottomValue: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '800',
      marginBottom: 4,
    },
    kpiBottomLabel: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      flexShrink: 1,
    },
    kpiBottomLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      width: '100%',
      minWidth: 0,
    },
    kpiBottomLabelIcon: {
      color: colors.textMuted,
      flexShrink: 0,
    },
    shotGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    shotTile: {
      width: '48.5%',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: 10,
      paddingVertical: 12,
      gap: 4,
    },
    shotTileLabel: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '700',
    },
    shotTileValue: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '900',
    },
    perfHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 2,
      gap: 8,
    },
    perfTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexShrink: 1,
    },
    perfTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
      flexShrink: 1,
    },
    perfSubtitle: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
      flexShrink: 1,
      textAlign: 'right',
    },
    toggleRow: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceElevated,
      borderRadius: 22,
      padding: 3,
      marginTop: 4,
      marginBottom: 4,
    },
    toggleButton: {
      flex: 1,
      minHeight: MIN_TOUCH_TARGET,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 20,
    },
    toggleButtonActive: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    toggleLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    toggleIcon: {
      color: colors.textMuted,
    },
    toggleIconActive: {
      color: colors.primary,
    },
    toggleText: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '700',
    },
    toggleTextActive: {
      color: colors.primary,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 14,
      marginBottom: 4,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
  });
}

const BAR_GREEN = '#22C55E';
const BAR_ORANGE = '#F59E0B';
const BAR_RED = '#EF4444';
const BAR_BLUE = '#3B82F6';

export function PlayerStatsTab({
  stats,
  leagueName,
  competitions,
  selectedSeason,
  selectedLeagueId,
  onSelectLeagueSeason,
}: PlayerStatsTabProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [mode, setMode] = useState<StatMode>('total');

  const shotAccuracy =
    typeof stats.shots === 'number' &&
    typeof stats.shotsOnTarget === 'number' &&
    stats.shots > 0
      ? Number(((stats.shotsOnTarget / stats.shots) * 100).toFixed(1))
      : null;

  const shotConversion =
    typeof stats.shots === 'number' &&
    typeof stats.goals === 'number' &&
    stats.shots > 0
      ? Number(((stats.goals / stats.shots) * 100).toFixed(1))
      : null;

  const v = (value: number | null): number | null => {
    if (mode === 'per90') {
      return per90(value, stats.minutes);
    }
    return value;
  };

  const maxOfArr = (...values: (number | null)[]): number => {
    const numbers = values.filter((value): value is number => value !== null && value > 0);
    return numbers.length > 0 ? Math.max(...numbers) : 1;
  };

  const tirRows: StatRowConfig[] = [
    {
      label: t('playerDetails.stats.labels.goals'),
      value: v(stats.goals),
      max: maxOfArr(v(stats.goals), v(stats.shots), v(stats.shotsOnTarget)),
      color: BAR_GREEN,
    },
    {
      label: t('playerDetails.stats.labels.penaltyGoals'),
      value: v(stats.penaltyGoals),
      max: maxOfArr(v(stats.goals), v(stats.penaltyGoals)),
      color: BAR_GREEN,
    },
    {
      label: t('playerDetails.stats.labels.shots'),
      value: v(stats.shots),
      max: maxOfArr(v(stats.shots)),
      color: BAR_BLUE,
    },
    {
      label: t('playerDetails.stats.labels.shotsOnTarget'),
      value: v(stats.shotsOnTarget),
      max: maxOfArr(v(stats.shots)),
      color: BAR_GREEN,
    },
  ];

  const passeRows: StatRowConfig[] = [
    {
      label: t('playerDetails.stats.labels.assistsDetailed'),
      value: v(stats.assists),
      max: maxOfArr(v(stats.assists), v(stats.keyPasses)),
      color: BAR_GREEN,
    },
    {
      label: t('playerDetails.stats.labels.keyPasses'),
      value: v(stats.keyPasses),
      max: maxOfArr(v(stats.keyPasses), v(stats.assists)),
      color: BAR_GREEN,
    },
    {
      label: t('playerDetails.stats.labels.totalPasses'),
      value: v(stats.passes),
      max: maxOfArr(v(stats.passes)),
      color: BAR_BLUE,
    },
    {
      label: t('playerDetails.stats.labels.passesAccuracy'),
      value: stats.passesAccuracy,
      max: 100,
      color: BAR_GREEN,
    },
  ];

  const dribbleRows: StatRowConfig[] = [
    {
      label: t('playerDetails.stats.labels.dribblesAttempts'),
      value: v(stats.dribblesAttempts),
      max: maxOfArr(v(stats.dribblesAttempts)),
      color: BAR_BLUE,
    },
    {
      label: t('playerDetails.stats.labels.dribblesSuccess'),
      value: v(stats.dribblesSuccess),
      max: maxOfArr(v(stats.dribblesAttempts)),
      color: BAR_GREEN,
    },
  ];

  const defenseRows: StatRowConfig[] = [
    {
      label: t('playerDetails.stats.labels.tackles'),
      value: v(stats.tackles),
      max: maxOfArr(v(stats.tackles), v(stats.interceptions), v(stats.blocks)),
      color: BAR_GREEN,
    },
    {
      label: t('playerDetails.stats.labels.interceptions'),
      value: v(stats.interceptions),
      max: maxOfArr(v(stats.tackles), v(stats.interceptions)),
      color: BAR_GREEN,
    },
    {
      label: t('playerDetails.stats.labels.blocks'),
      value: v(stats.blocks),
      max: maxOfArr(v(stats.tackles), v(stats.blocks)),
      color: BAR_ORANGE,
    },
    {
      label: t('playerDetails.stats.labels.duelsWon'),
      value: v(stats.duelsWon),
      max: maxOfArr(v(stats.duelsTotal)),
      color: BAR_GREEN,
    },
    {
      label: t('playerDetails.stats.labels.duelsTotal'),
      value: v(stats.duelsTotal),
      max: maxOfArr(v(stats.duelsTotal)),
      color: BAR_BLUE,
    },
  ];

  const disciplineRows: StatRowConfig[] = [
    {
      label: t('playerDetails.stats.labels.foulsCommitted'),
      value: v(stats.foulsCommitted),
      max: maxOfArr(v(stats.foulsCommitted), v(stats.foulsDrawn)),
      color: BAR_ORANGE,
    },
    {
      label: t('playerDetails.stats.labels.foulsDrawn'),
      value: v(stats.foulsDrawn),
      max: maxOfArr(v(stats.foulsCommitted), v(stats.foulsDrawn)),
      color: BAR_GREEN,
    },
    {
      label: t('playerDetails.stats.labels.dribblesBeaten'),
      value: v(stats.dribblesBeaten),
      max: maxOfArr(v(stats.dribblesBeaten)),
      color: BAR_RED,
    },
    {
      label: t('playerDetails.stats.labels.yellowCards'),
      value: v(stats.yellowCards),
      max: maxOfArr(v(stats.yellowCards), v(stats.redCards), 10),
      color: BAR_ORANGE,
    },
    {
      label: t('playerDetails.stats.labels.redCards'),
      value: v(stats.redCards),
      max: maxOfArr(v(stats.yellowCards), v(stats.redCards), 3),
      color: BAR_RED,
    },
  ];

  const hasGoalkeeperStats = stats.saves !== null || stats.goalsConceded !== null;
  const gardienRows: StatRowConfig[] = hasGoalkeeperStats
    ? [
        {
          label: t('playerDetails.stats.labels.saves'),
          value: v(stats.saves),
          max: maxOfArr(v(stats.saves), v(stats.goalsConceded)),
          color: BAR_GREEN,
        },
        {
          label: t('playerDetails.stats.labels.goalsConceded'),
          value: v(stats.goalsConceded),
          max: maxOfArr(v(stats.saves), v(stats.goalsConceded)),
          color: BAR_RED,
        },
      ]
    : [];

  const penaltyRows: StatRowConfig[] = [
    {
      label: t('playerDetails.stats.labels.penaltiesWon'),
      value: v(stats.penaltiesWon),
      max: maxOfArr(v(stats.penaltiesWon), v(stats.penaltiesMissed), v(stats.penaltiesCommitted)),
      color: BAR_GREEN,
    },
    {
      label: t('playerDetails.stats.labels.penaltiesMissed'),
      value: v(stats.penaltiesMissed),
      max: maxOfArr(v(stats.penaltiesWon), v(stats.penaltiesMissed)),
      color: BAR_RED,
    },
    {
      label: t('playerDetails.stats.labels.penaltiesCommitted'),
      value: v(stats.penaltiesCommitted),
      max: maxOfArr(v(stats.penaltiesCommitted)),
      color: BAR_ORANGE,
    },
  ];

  const renderSection = (sectionKey: StatSectionKey, rows: StatRowConfig[]) => {
    const hasData = rows.some(row => row.value !== null);
    if (!hasData) {
      return null;
    }

    const title = t(`playerDetails.stats.sections.${sectionKey}`);

    return (
      <View>
        <View style={styles.sectionTitleRow}>
          <MaterialCommunityIcons
            name={resolveSectionIconName(sectionKey)}
            size={16}
            color={colors.textMuted}
          />
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {rows.map(row => (
          <StatBar
            key={`${sectionKey}-${row.label}`}
            label={row.label}
            value={row.value}
            maxValue={row.max}
            barColor={row.color}
          />
        ))}
      </View>
    );
  };

  const renderLabelWithIcon = (
    iconName: string,
    label: string,
    options?: {
      isPrimary?: boolean;
      start?: boolean;
    },
  ) => (
    <View style={[styles.labelWithIconRow, options?.start ? styles.labelWithIconRowStart : null]}>
      <MaterialCommunityIcons
        name={iconName}
        size={14}
        style={[styles.labelIcon, options?.isPrimary ? styles.labelIconPrimary : null]}
      />
      <Text style={styles.kpiTopLabel}>{label}</Text>
    </View>
  );

  const renderBottomLabelWithIcon = (iconName: string, label: string) => (
    <View style={styles.kpiBottomLabelRow}>
      <MaterialCommunityIcons name={iconName} size={13} style={styles.kpiBottomLabelIcon} />
      <Text
        style={styles.kpiBottomLabel}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
      >
        {label}
      </Text>
    </View>
  );

  const renderShotLabelWithIcon = (iconName: string, label: string) => (
    <View style={[styles.labelWithIconRow, styles.labelWithIconRowStart]}>
      <MaterialCommunityIcons name={iconName} size={14} style={styles.labelIcon} />
      <Text style={styles.shotTileLabel}>{label}</Text>
    </View>
  );

  const contentItems: PlayerStatsContentItem[] = [];
  const hasSeasonSummaryCard = [
    stats.goals,
    stats.assists,
    stats.rating,
    stats.matches,
    stats.starts,
    stats.minutes,
  ].some(value => value !== null && value !== '');
  const hasShotsCard = [stats.shots, stats.shotsOnTarget, shotAccuracy, shotConversion].some(
    value => value !== null,
  );
  const hasPerformanceSections = [
    tirRows,
    passeRows,
    dribbleRows,
    defenseRows,
    disciplineRows,
    gardienRows,
    penaltyRows,
  ].some(rows => rows.some(row => row.value !== null));

  if (competitions.length === 0) {
    contentItems.push({
      key: 'no-competition-banner',
      content: (
        <View style={styles.infoBanner}>
          <View style={styles.infoBannerContent}>
            <MaterialCommunityIcons
              name="information-outline"
              size={16}
              style={styles.infoBannerIcon}
            />
            <Text style={styles.infoBannerText}>
              {t('playerDetails.stats.states.noCompetitionAvailable')}
            </Text>
          </View>
        </View>
      ),
    });
  }

  if (hasSeasonSummaryCard) {
    contentItems.push({
      key: 'season-stats-card',
      content: (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <MaterialCommunityIcons name="chart-box-outline" size={18} color={colors.text} />
              <Text style={styles.cardTitle}>{t('teamDetails.overview.seasonStats')}</Text>
            </View>
            <Text style={styles.cardSubtitle}>{toDisplayValue(leagueName)}</Text>
          </View>

          <View style={styles.kpiTopRow}>
            <View style={[styles.kpiTopTile, styles.kpiTopTileGoals]}>
              {renderLabelWithIcon('soccer', t('playerDetails.stats.labels.goals'))}
              <Text style={styles.kpiTopValue}>{toDisplayValue(stats.goals)}</Text>
            </View>
            <View style={[styles.kpiTopTile, styles.kpiTopTileAssists]}>
              {renderLabelWithIcon('swap-horizontal', t('playerDetails.stats.labels.assists'))}
              <Text style={styles.kpiTopValue}>{toDisplayValue(stats.assists)}</Text>
            </View>
            <View style={[styles.kpiTopTile, styles.kpiTopTileRating]}>
              {renderLabelWithIcon('star', t('playerDetails.stats.labels.rating'), { isPrimary: true })}
              <Text style={[styles.kpiTopValue, styles.kpiTopValuePrimary]}>
                {toDisplayValue(stats.rating)}
              </Text>
            </View>
          </View>

          <View style={styles.kpiBottomRow}>
            <View style={styles.kpiBottomTile}>
              <Text style={styles.kpiBottomValue}>{toDisplayValue(stats.matches)}</Text>
              {renderBottomLabelWithIcon('calendar-month-outline', t('playerDetails.stats.labels.matches'))}
            </View>
            <View style={styles.kpiBottomTile}>
              <Text style={styles.kpiBottomValue}>{toDisplayValue(stats.starts)}</Text>
              {renderBottomLabelWithIcon('account-check-outline', t('playerDetails.stats.labels.starts'))}
            </View>
            <View style={styles.kpiBottomTile}>
              <Text style={styles.kpiBottomValue}>{toDisplayValue(stats.minutes)}</Text>
              {renderBottomLabelWithIcon('timer-outline', t('playerDetails.stats.labels.minutes'))}
            </View>
          </View>
        </View>
      ),
    });
  }

  if (hasShotsCard) {
    contentItems.push({
      key: 'shots-card',
      content: (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <MaterialCommunityIcons name="target-variant" size={18} color={colors.text} />
              <Text style={styles.cardTitle}>{t('playerDetails.stats.labels.seasonShots')}</Text>
            </View>
            <Text style={styles.cardSubtitle}>{toDisplayValue(leagueName)}</Text>
          </View>

          <View style={styles.shotGrid}>
            <View style={styles.shotTile}>
              {renderShotLabelWithIcon('target-variant', t('playerDetails.stats.labels.shots'))}
              <Text style={styles.shotTileValue}>{toDisplayValue(stats.shots)}</Text>
            </View>
            <View style={styles.shotTile}>
              {renderShotLabelWithIcon('bullseye', t('playerDetails.stats.labels.shotsOnTarget'))}
              <Text style={styles.shotTileValue}>{toDisplayValue(stats.shotsOnTarget)}</Text>
            </View>
            <View style={styles.shotTile}>
              {renderShotLabelWithIcon('chart-line', t('playerDetails.stats.labels.shotAccuracy'))}
              <Text style={styles.shotTileValue}>{toPercentValue(shotAccuracy)}</Text>
            </View>
            <View style={styles.shotTile}>
              {renderShotLabelWithIcon('percent', t('playerDetails.stats.labels.shotConversion'))}
              <Text style={styles.shotTileValue}>{toPercentValue(shotConversion)}</Text>
            </View>
          </View>
        </View>
      ),
    });
  }

  if (hasPerformanceSections) {
    contentItems.push({
      key: 'season-performance-card',
      content: (
        <View style={styles.card}>
          <View style={styles.perfHeader}>
            <View style={styles.perfTitleRow}>
              <MaterialCommunityIcons name="chart-line" size={18} color={colors.text} />
              <Text style={styles.perfTitle}>{t('playerDetails.stats.labels.seasonPerformance')}</Text>
            </View>
            <Text style={styles.perfSubtitle}>
              {t('playerDetails.stats.labels.seasonPerformanceDetails')}
            </Text>
          </View>

          <View style={styles.toggleRow}>
            <Pressable
              style={[styles.toggleButton, mode === 'total' ? styles.toggleButtonActive : null]}
              onPress={() => setMode('total')}
              hitSlop={DEFAULT_HIT_SLOP}
            >
              <View style={styles.toggleLabelRow}>
                <MaterialCommunityIcons
                  name="counter"
                  size={14}
                  style={[styles.toggleIcon, mode === 'total' ? styles.toggleIconActive : null]}
                />
                <Text style={[styles.toggleText, mode === 'total' ? styles.toggleTextActive : null]}>
                  {t('playerDetails.stats.labels.total')}
                </Text>
              </View>
            </Pressable>
            <Pressable
              style={[styles.toggleButton, mode === 'per90' ? styles.toggleButtonActive : null]}
              onPress={() => setMode('per90')}
              hitSlop={DEFAULT_HIT_SLOP}
            >
              <View style={styles.toggleLabelRow}>
                <MaterialCommunityIcons
                  name="speedometer-medium"
                  size={14}
                  style={[styles.toggleIcon, mode === 'per90' ? styles.toggleIconActive : null]}
                />
                <Text style={[styles.toggleText, mode === 'per90' ? styles.toggleTextActive : null]}>
                  {t('playerDetails.stats.labels.perNinety')}
                </Text>
              </View>
            </Pressable>
          </View>

          {renderSection('shooting', tirRows)}
          {renderSection('passing', passeRows)}
          {renderSection('dribbles', dribbleRows)}
          {renderSection('defense', defenseRows)}
          {renderSection('discipline', disciplineRows)}
          {gardienRows.length > 0 ? renderSection('goalkeeper', gardienRows) : null}
          {renderSection('penalties', penaltyRows)}
        </View>
      ),
    });
  }

  if (contentItems.length === 0) {
    contentItems.push({
      key: 'stats-empty-state',
      content: (
        <View style={styles.infoBanner}>
          <View style={styles.infoBannerContent}>
            <MaterialCommunityIcons
              name="information-outline"
              size={16}
              style={styles.infoBannerIcon}
            />
            <Text style={styles.infoBannerText}>
              {t('playerDetails.stats.states.noStatsAvailable')}
            </Text>
          </View>
        </View>
      ),
    });
  }

  return (
    <View style={styles.container}>
      {competitions.length > 0 ? (
        <TeamCompetitionSeasonSelector
          competitions={competitions}
          selectedLeagueId={selectedLeagueId}
          selectedSeason={selectedSeason}
          onSelect={onSelectLeagueSeason}
          modalTitle={t('teamDetails.filters.selectCompetitionSeason')}
          doneLabel={t('common.done')}
        />
      ) : null}

      <FlashList
        data={contentItems}
        keyExtractor={item => item.key}
        getItemType={() => 'player-stats-section'}
        // @ts-ignore FlashList runtime supports estimatedItemSize.
        estimatedItemSize={250}
        renderItem={({ item }) => item.content}
        style={styles.container}
        contentContainerStyle={styles.contentPadding}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
      />
    </View>
  );
}

function resolveSectionIconName(sectionKey: StatSectionKey): string {
  switch (sectionKey) {
    case 'shooting':
      return 'soccer';
    case 'passing':
      return 'swap-horizontal';
    case 'dribbles':
      return 'run-fast';
    case 'defense':
      return 'shield-outline';
    case 'discipline':
      return 'alert-circle-outline';
    case 'goalkeeper':
      return 'account-circle-outline';
    case 'penalties':
      return 'alpha-p-circle-outline';
    default:
      return 'chart-box-outline';
  }
}
