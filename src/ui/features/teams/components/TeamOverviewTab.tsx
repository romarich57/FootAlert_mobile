import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type {
  TeamCompetitionOption,
  TeamIdentity,
  TeamOverviewData,
  TeamTopPlayer,
} from '@ui/features/teams/types/teams.types';
import {
  toDisplayDate,
  toDisplayHour,
  toDisplayNumber,
  toDisplaySeasonLabel,
  toDisplayValue,
  toPercent,
} from '@ui/features/teams/utils/teamDisplay';
import type { ThemeColors } from '@ui/shared/theme/theme';

type TeamOverviewTabProps = {
  team: TeamIdentity;
  competitions: TeamCompetitionOption[];
  selectedSeason: number | null;
  data: TeamOverviewData | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onPressMatch: (matchId: string) => void;
  onPressTeam: (teamId: string) => void;
};

type PlayerCategoryKey = 'ratings' | 'scorers' | 'assisters';
type TeamOverviewListItemKey =
  | 'next-match'
  | 'recent-form'
  | 'season-overview'
  | 'mini-standing'
  | 'standing-history'
  | 'coach-performance'
  | 'player-leaders'
  | 'competitions'
  | 'stadium-info';

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      gap: 14,
      paddingHorizontal: 16,
      paddingBottom: 30,
    },
    stateCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14,
      gap: 8,
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
    card: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14,
      gap: 12,
    },
    cardTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      minWidth: 0,
    },
    sectionSubtitle: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '700',
      flexShrink: 1,
      textAlign: 'right',
    },
    nextMetaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    nextMeta: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
      flexShrink: 1,
    },
    leaguePill: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      maxWidth: '70%',
    },
    leaguePillText: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '700',
    },
    nextMatchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    teamSide: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
    },
    teamBadge: {
      width: 32,
      height: 32,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    teamBadgeImage: {
      width: 26,
      height: 26,
    },
    teamName: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
      textAlign: 'center',
    },
    kickoffWrap: {
      alignItems: 'center',
      gap: 4,
      minWidth: 70,
    },
    kickoff: {
      color: colors.text,
      fontSize: 24,
      fontWeight: '900',
      letterSpacing: -1,
      textAlign: 'center',
    },
    kickoffLabel: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    formRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
    },
    formItem: {
      flex: 1,
      alignItems: 'center',
      gap: 8,
      minWidth: 52,
    },
    formBadge: {
      minWidth: 48,
      borderRadius: 11,
      paddingVertical: 6,
      paddingHorizontal: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    formBadgeWin: {
      backgroundColor: 'rgba(21,248,106,0.22)',
    },
    formBadgeDraw: {
      backgroundColor: 'rgba(245,158,11,0.25)',
    },
    formBadgeLoss: {
      backgroundColor: 'rgba(248,113,113,0.28)',
    },
    formBadgeText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    formLogo: {
      width: 22,
      height: 22,
    },
    formLogoWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    formLogoFallback: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '800',
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    statCell: {
      width: '48%',
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      gap: 3,
    },
    statLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    statLabel: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '700',
      flexShrink: 1,
    },
    statIcon: {
      width: 14,
      textAlign: 'center',
    },
    statValue: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '900',
    },
    statValuePositive: {
      color: '#22F08A',
    },
    statValueNegative: {
      color: '#F87171',
    },
    statValueNeutral: {
      color: colors.text,
    },
    pitch: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: '#2A2D2B',
      paddingHorizontal: 10,
      paddingVertical: 12,
      gap: 12,
    },
    pitchHalfLine: {
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.12)',
    },
    lineupRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 6,
      minHeight: 66,
    },
    lineupPlayer: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
    },
    lineupAvatarBlock: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    lineupAvatarWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    lineupAvatar: {
      width: 40,
      height: 40,
    },
    lineupRating: {
      position: 'absolute',
      top: -5,
      right: -4,
      borderRadius: 9,
      backgroundColor: colors.primary,
      minWidth: 24,
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderWidth: 1,
      borderColor: '#0B0B0B',
      alignItems: 'center',
    },
    lineupRatingText: {
      color: '#000',
      fontSize: 10,
      fontWeight: '900',
    },
    lineupName: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
      textAlign: 'center',
      lineHeight: 15,
      minHeight: 30,
    },
    tableHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingBottom: 6,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 4,
    },
    tableRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 4,
    },
    tableRowTarget: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 8,
      paddingHorizontal: 4,
    },
    colRank: {
      width: 26,
      alignItems: 'center',
    },
    colTeam: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minWidth: 0,
    },
    colSmall: {
      width: 24,
      alignItems: 'center',
    },
    colDiff: {
      width: 38,
      alignItems: 'center',
    },
    colPoints: {
      width: 34,
      alignItems: 'center',
    },
    tableHeaderText: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
    },
    tableCellText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    tableCellTextBold: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '900',
    },
    miniStandingTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
      flexShrink: 1,
    },
    miniStandingHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minWidth: 0,
    },
    miniStandingLeagueLogo: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.surfaceElevated,
    },
    teamLogo: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.surfaceElevated,
    },
    teamRowName: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
      flexShrink: 1,
    },
    historyHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minWidth: 0,
      maxWidth: '48%',
      flexShrink: 1,
      justifyContent: 'flex-end',
    },
    historyLeagueBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: 'rgba(34,240,138,0.35)',
      backgroundColor: 'rgba(34,240,138,0.12)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      maxWidth: '100%',
      minWidth: 0,
    },
    historyLeagueLogo: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.surfaceElevated,
    },
    historyLeagueName: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '800',
      flexShrink: 1,
      minWidth: 0,
    },
    historyTitle: {
      flex: 1,
      minWidth: 0,
      marginRight: 6,
    },
    historyChart: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: '#121E1A',
      padding: 10,
      gap: 10,
    },
    historyGraphCanvas: {
      height: 90,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: 'rgba(7,20,16,0.85)',
      overflow: 'hidden',
    },
    historyColumns: {
      ...StyleSheet.absoluteFillObject,
      flexDirection: 'row',
    },
    historyColumn: {
      flex: 1,
      borderRightWidth: 1,
      borderRightColor: 'rgba(255,255,255,0.08)',
    },
    historyColumnAlt: {
      backgroundColor: 'rgba(255,255,255,0.03)',
    },
    historyColumnCurrent: {
      backgroundColor: 'rgba(34,240,138,0.16)',
    },
    historyColumnLast: {
      borderRightWidth: 0,
    },
    historyConnectionHorizontal: {
      position: 'absolute',
      height: 2.5,
      backgroundColor: 'rgba(114,234,193,0.8)',
      borderRadius: 999,
    },
    historyConnectionVertical: {
      position: 'absolute',
      width: 2.5,
      backgroundColor: 'rgba(114,234,193,0.45)',
      borderRadius: 999,
    },
    historyItem: {
      position: 'absolute',
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    historyItemText: {
      fontSize: 15,
      fontWeight: '800',
    },
    historySeasonRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
    },
    historySeasonItem: {
      flex: 1,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',
      backgroundColor: 'rgba(255,255,255,0.02)',
      paddingVertical: 5,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 0,
    },
    historySeasonItemActive: {
      borderColor: 'rgba(34,240,138,0.55)',
      backgroundColor: 'rgba(34,240,138,0.22)',
    },
    historySeasonText: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
      textAlign: 'center',
    },
    historySeasonTextActive: {
      color: colors.text,
      fontWeight: '900',
    },
    coachHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    coachAvatarWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      overflow: 'hidden',
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    coachAvatar: {
      width: 44,
      height: 44,
    },
    coachName: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
      flexShrink: 1,
    },
    coachInfoWrap: {
      flex: 1,
      minWidth: 0,
    },
    coachMeta: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },
    coachStatsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    coachStat: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: 10,
      paddingVertical: 8,
      gap: 2,
    },
    coachStatLabel: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '700',
    },
    coachStatValue: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '900',
    },
    coachRecord: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '700',
    },
    leadersGrid: {
      flexDirection: 'row',
      gap: 10,
      flexWrap: 'wrap',
    },
    leaderCard: {
      width: '48%',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      padding: 10,
      gap: 8,
      minHeight: 140,
    },
    leaderTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
    leaderMainName: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '900',
      lineHeight: 20,
    },
    leaderMainRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    leaderMainAvatarWrap: {
      width: 42,
      height: 42,
      borderRadius: 21,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    leaderMainAvatar: {
      width: 42,
      height: 42,
    },
    leaderMainTextWrap: {
      flex: 1,
      minWidth: 0,
    },
    leaderMainValue: {
      color: colors.primary,
      fontSize: 24,
      fontWeight: '900',
    },
    leaderItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1,
      minWidth: 0,
    },
    leaderItemAvatarWrap: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    leaderItemAvatar: {
      width: 24,
      height: 24,
    },
    leaderAvatarFallback: {
      color: colors.textMuted,
      fontSize: 10,
      fontWeight: '800',
    },
    leaderItemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    leaderItemName: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
      flexShrink: 1,
    },
    leaderItemValue: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
    competitionsList: {
      gap: 10,
    },
    competitionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: 10,
      paddingVertical: 9,
    },
    competitionLogo: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.surface,
    },
    competitionTextWrap: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    competitionName: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
    competitionSeason: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '700',
    },
    splitRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
    },
    splitLabel: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '700',
      flexShrink: 1,
    },
    splitValue: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
      textAlign: 'right',
      flexShrink: 1,
    },
    stadiumName: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '900',
    },
    stadiumMeta: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
    },
    stadiumHero: {
      minHeight: 126,
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    stadiumHeroImage: {
      ...StyleSheet.absoluteFillObject,
      width: '100%',
      height: '100%',
    },
    stadiumHeroOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.42)',
    },
    stadiumHeroContent: {
      paddingHorizontal: 12,
      paddingVertical: 12,
      justifyContent: 'flex-end',
      flex: 1,
      gap: 4,
    },
    stadiumHeroName: {
      color: '#FFFFFF',
      fontSize: 20,
      fontWeight: '900',
      textShadowColor: 'rgba(0,0,0,0.4)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    stadiumHeroMeta: {
      color: 'rgba(255,255,255,0.88)',
      fontSize: 14,
      fontWeight: '700',
      textShadowColor: 'rgba(0,0,0,0.4)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
  });
}

function toDecimal(value: number | null | undefined, precision = 1): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '';
  }

  return value.toFixed(precision);
}

function resolveFormBadgeStyle(result: 'W' | 'D' | 'L' | '', styles: ReturnType<typeof createStyles>) {
  if (result === 'W') {
    return styles.formBadgeWin;
  }

  if (result === 'D') {
    return styles.formBadgeDraw;
  }

  if (result === 'L') {
    return styles.formBadgeLoss;
  }

  return null;
}

function shortName(value: string | null | undefined): string {
  const text = toDisplayValue(value);
  if (!text) {
    return '';
  }

  const parts = text.split(' ').filter(Boolean);
  return parts[parts.length - 1] ?? text;
}

function categoryValue(player: TeamTopPlayer | null, category: PlayerCategoryKey): string {
  if (!player) {
    return '';
  }

  if (category === 'ratings') {
    return toDecimal(player.rating, 2);
  }

  if (category === 'scorers') {
    return toDisplayNumber(player.goals);
  }

  return toDisplayNumber(player.assists);
}

function resolveStatValueVariant(
  key: 'rank' | 'points' | 'played' | 'goalDiff',
  value: number | null | undefined,
): 'positive' | 'negative' | 'neutral' {
  if (typeof value !== 'number') {
    return 'neutral';
  }

  if (key === 'rank') {
    if (value <= 4) {
      return 'positive';
    }
    if (value >= 12) {
      return 'negative';
    }
    return 'neutral';
  }

  if (key === 'goalDiff') {
    if (value > 0) {
      return 'positive';
    }
    if (value < 0) {
      return 'negative';
    }
  }

  if (key === 'points' && value >= 1) {
    return 'positive';
  }

  return 'neutral';
}

function toShortInitials(value: string | null | undefined): string {
  const name = shortName(value);
  if (!name) {
    return '?';
  }

  return name.slice(0, 2).toUpperCase();
}

function toCompactSeasonLabel(value: number): string {
  const nextYearShort = String((value + 1) % 100).padStart(2, '0');
  return `${value}/${nextYearShort}`;
}

function resolveHistoryRankColor(
  rank: number | null,
  isCurrentSeason: boolean,
): { fill: string; border: string; text: string } {
  if (isCurrentSeason) {
    return {
      fill: '#22F08A',
      border: '#C5FFE1',
      text: '#04220F',
    };
  }

  if (typeof rank !== 'number') {
    return {
      fill: '#2F2F2F',
      border: 'rgba(255,255,255,0.35)',
      text: '#E5E7EB',
    };
  }

  if (rank <= 3) {
    return {
      fill: '#34D399',
      border: '#A7F3D0',
      text: '#052E20',
    };
  }

  if (rank <= 6) {
    return {
      fill: '#60A5FA',
      border: '#BFDBFE',
      text: '#081A35',
    };
  }

  if (rank <= 10) {
    return {
      fill: '#FBBF24',
      border: '#FDE68A',
      text: '#3A2300',
    };
  }

  return {
    fill: '#F87171',
    border: '#FECACA',
    text: '#3B0A0A',
  };
}

type HistoryVisualPoint = {
  season: number;
  rank: number | null;
  x: number;
  y: number;
  isLatest: boolean;
};

function PlayerBubble({
  player,
  styles,
}: {
  player: TeamTopPlayer | null;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.lineupPlayer}>
      <View style={styles.lineupAvatarBlock}>
        <View style={styles.lineupAvatarWrap}>
          {player?.photo ? <Image source={{ uri: player.photo }} style={styles.lineupAvatar} /> : null}
        </View>
        {typeof player?.rating === 'number' ? (
          <View style={styles.lineupRating}>
            <Text style={styles.lineupRatingText}>{toDecimal(player.rating, 1)}</Text>
          </View>
        ) : null}
      </View>
      <Text numberOfLines={2} style={styles.lineupName}>
        {shortName(player?.name)}
      </Text>
    </View>
  );
}

export function TeamOverviewTab({
  team,
  competitions,
  selectedSeason,
  data,
  isLoading,
  isError,
  onRetry,
  onPressMatch,
  onPressTeam,
}: TeamOverviewTabProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [historyChartWidth, setHistoryChartWidth] = useState(0);

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

  const leaderSections = useMemo(
    () => [
      {
        key: 'scorers' as const,
        title: t('teamDetails.stats.categories.scorers'),
        players: data?.playerLeaders.scorers ?? [],
      },
      {
        key: 'assisters' as const,
        title: t('teamDetails.stats.categories.assisters'),
        players: data?.playerLeaders.assisters ?? [],
      },
      {
        key: 'ratings' as const,
        title: t('teamDetails.stats.categories.rating'),
        players: data?.playerLeaders.ratings ?? [],
      },
    ],
    [data?.playerLeaders.assisters, data?.playerLeaders.ratings, data?.playerLeaders.scorers, t],
  );

  const seasonStatCards = useMemo(
    () => [
      {
        key: 'rank' as const,
        iconName: 'medal-outline',
        label: t('teamDetails.labels.rank'),
        value: data?.seasonStats.rank ?? null,
      },
      {
        key: 'points' as const,
        iconName: 'star-outline',
        label: t('teamDetails.labels.points'),
        value: data?.seasonStats.points ?? null,
      },
      {
        key: 'played' as const,
        iconName: 'calendar-month-outline',
        label: t('teamDetails.labels.played'),
        value: data?.seasonStats.played ?? null,
      },
      {
        key: 'goalDiff' as const,
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

  const historyVisualPoints = useMemo<HistoryVisualPoint[]>(() => {
    const points = historyPoints;
    if (points.length === 0 || historyChartWidth <= 0) {
      return [];
    }

    const chartHeight = 90;
    const pointRadius = 18;
    const horizontalPadding = pointRadius + 2;
    const verticalPadding = pointRadius + 2;
    const drawableHeight = chartHeight - verticalPadding * 2;
    const drawableWidth = Math.max(1, historyChartWidth - horizontalPadding * 2);
    const ranks = points
      .map(point => point.rank)
      .filter((rank): rank is number => typeof rank === 'number');
    const maxRank = Math.max(5, ...ranks, 1);
    const denominator = Math.max(1, maxRank - 1);

    return points.map((point, index) => {
      const safeRank = typeof point.rank === 'number' ? point.rank : maxRank;
      const normalized = (safeRank - 1) / denominator;
      const x =
        points.length <= 1
          ? historyChartWidth / 2
          : horizontalPadding + (drawableWidth * index) / (points.length - 1);
      const y = verticalPadding + normalized * drawableHeight;

      return {
        season: point.season,
        rank: point.rank,
        x,
        y,
        isLatest: index === points.length - 1,
      };
    });
  }, [historyChartWidth, historyPoints]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.stateCard}>
            <Text style={styles.stateText}>{t('teamDetails.states.loading')}</Text>
          </View>
        </View>
      </View>
    );
  }

  if (isError) {
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

  const nextMatch = data?.nextMatch ?? null;
  const coachPerformance = data?.coachPerformance;
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
        // @ts-ignore FlashList runtime supports estimatedItemSize.
        estimatedItemSize={280}
        renderItem={({ item }) => {
          if (item === 'next-match') {
            return (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t('teamDetails.overview.nextMatch')}</Text>

                {nextMatch ? (
                  <>
                    <View style={styles.nextMetaRow}>
                      <Text style={styles.nextMeta}>{toDisplayDate(nextMatch.date)}</Text>
                      <View style={styles.leaguePill}>
                        <Text numberOfLines={1} style={styles.leaguePillText}>
                          {toDisplayValue(nextMatch.leagueName)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.nextMatchRow}>
                      <Pressable
                        onPress={() => {
                          if (nextMatch.homeTeamId) {
                            onPressTeam(nextMatch.homeTeamId);
                          }
                        }}
                        style={styles.teamSide}
                      >
                        <View style={styles.teamBadge}>
                          {nextMatch.homeTeamLogo ? (
                            <Image source={{ uri: nextMatch.homeTeamLogo }} style={styles.teamBadgeImage} />
                          ) : null}
                        </View>
                        <Text numberOfLines={2} style={styles.teamName}>
                          {toDisplayValue(nextMatch.homeTeamName)}
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => {
                          if (nextMatch.fixtureId) {
                            onPressMatch(nextMatch.fixtureId);
                          }
                        }}
                        style={styles.kickoffWrap}
                      >
                        <Text style={styles.kickoff}>{toDisplayHour(nextMatch.date)}</Text>
                        <Text style={styles.kickoffLabel}>{t('teamDetails.overview.kickoff')}</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => {
                          if (nextMatch.awayTeamId) {
                            onPressTeam(nextMatch.awayTeamId);
                          }
                        }}
                        style={styles.teamSide}
                      >
                        <View style={styles.teamBadge}>
                          {nextMatch.awayTeamLogo ? (
                            <Image source={{ uri: nextMatch.awayTeamLogo }} style={styles.teamBadgeImage} />
                          ) : null}
                        </View>
                        <Text numberOfLines={2} style={styles.teamName}>
                          {toDisplayValue(nextMatch.awayTeamName)}
                        </Text>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <Text style={styles.stateText}>{t('teamDetails.states.empty')}</Text>
                )}
              </View>
            );
          }

          if (item === 'recent-form') {
            return (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t('teamDetails.overview.recentForm')}</Text>
                <View style={styles.formRow}>
                  {(data?.recentForm ?? []).length > 0 ? (
                    (data?.recentForm ?? []).map(formItem => (
                      <View key={`form-${formItem.fixtureId}`} style={styles.formItem}>
                        <View style={[styles.formBadge, resolveFormBadgeStyle(formItem.result, styles)]}>
                          <Text style={styles.formBadgeText}>{formItem.score ?? formItem.result}</Text>
                        </View>
                        <View style={styles.formLogoWrap}>
                          {formItem.opponentLogo ? (
                            <Image source={{ uri: formItem.opponentLogo }} style={styles.formLogo} resizeMode="contain" />
                          ) : (
                            <Text style={styles.formLogoFallback}>{toShortInitials(formItem.opponentName)}</Text>
                          )}
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.stateText}>{t('teamDetails.states.empty')}</Text>
                  )}
                </View>
              </View>
            );
          }

          if (item === 'season-overview') {
            return (
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.cardTitle}>{t('teamDetails.overview.seasonStats')}</Text>
                  <Text style={styles.sectionSubtitle}>{t('teamDetails.overview.estimatedLineup')}</Text>
                </View>

                <View style={styles.statsGrid}>
                  {seasonStatCards.map(card => {
                    const variant = resolveStatValueVariant(card.key, card.value);
                    const valueVariantStyle =
                      variant === 'positive'
                        ? styles.statValuePositive
                        : variant === 'negative'
                          ? styles.statValueNegative
                          : styles.statValueNeutral;

                    return (
                      <View key={`season-stat-${card.key}`} style={styles.statCell}>
                        <View style={styles.statLabelRow}>
                          <MaterialCommunityIcons
                            testID={`team-overview-season-stat-icon-${card.key}`}
                            name={card.iconName}
                            size={14}
                            color={colors.textMuted}
                            style={styles.statIcon}
                          />
                          <Text numberOfLines={1} style={styles.statLabel}>
                            {card.label}
                          </Text>
                        </View>
                        <Text style={[styles.statValue, valueVariantStyle]}>{toDisplayNumber(card.value)}</Text>
                      </View>
                    );
                  })}
                </View>

                <View style={styles.pitch}>
                  <View style={styles.lineupRow}>
                    {(data?.seasonLineup.attackers ?? []).map(player => (
                      <PlayerBubble key={`att-${player.playerId}`} player={player} styles={styles} />
                    ))}
                  </View>
                  <View style={styles.pitchHalfLine} />
                  <View style={styles.lineupRow}>
                    {(data?.seasonLineup.midfielders ?? []).map(player => (
                      <PlayerBubble key={`mid-${player.playerId}`} player={player} styles={styles} />
                    ))}
                  </View>
                  <View style={styles.lineupRow}>
                    {(data?.seasonLineup.defenders ?? []).map(player => (
                      <PlayerBubble key={`def-${player.playerId}`} player={player} styles={styles} />
                    ))}
                  </View>
                  <View style={styles.lineupRow}>
                    <PlayerBubble player={data?.seasonLineup.goalkeeper ?? null} styles={styles} />
                  </View>
                </View>
              </View>
            );
          }

          if (item === 'mini-standing') {
            return (
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.cardTitle}>{t('teamDetails.overview.miniStanding')}</Text>
                  <View style={styles.miniStandingHeaderRight}>
                    {data?.miniStanding?.leagueLogo ? (
                      <Image source={{ uri: data.miniStanding.leagueLogo }} style={styles.miniStandingLeagueLogo} />
                    ) : null}
                    <Text numberOfLines={1} style={styles.miniStandingTitle}>
                      {toDisplayValue(data?.miniStanding?.leagueName)}
                    </Text>
                  </View>
                </View>

                {(data?.miniStanding?.rows.length ?? 0) > 0 ? (
                  <>
                    <View style={styles.tableHeader}>
                      <View style={styles.colRank}><Text style={styles.tableHeaderText}>#</Text></View>
                      <View style={styles.colTeam}><Text style={styles.tableHeaderText}>{t('teamDetails.standings.headers.team')}</Text></View>
                      <View style={styles.colSmall}><Text style={styles.tableHeaderText}>{t('teamDetails.standings.headers.played')}</Text></View>
                      <View style={styles.colSmall}><Text style={styles.tableHeaderText}>{t('teamDetails.standings.headers.win')}</Text></View>
                      <View style={styles.colSmall}><Text style={styles.tableHeaderText}>{t('teamDetails.standings.headers.draw')}</Text></View>
                      <View style={styles.colSmall}><Text style={styles.tableHeaderText}>{t('teamDetails.standings.headers.loss')}</Text></View>
                      <View style={styles.colDiff}><Text style={styles.tableHeaderText}>{t('teamDetails.standings.headers.goalDiff')}</Text></View>
                      <View style={styles.colPoints}><Text style={styles.tableHeaderText}>{t('teamDetails.standings.headers.points')}</Text></View>
                    </View>

                    {(data?.miniStanding?.rows ?? []).map(row => (
                      <View
                        key={`mini-standing-${row.teamId ?? row.rank ?? 'unknown'}`}
                        style={[styles.tableRow, row.isTargetTeam ? styles.tableRowTarget : null]}
                      >
                        <View style={styles.colRank}>
                          <Text style={row.isTargetTeam ? styles.tableCellTextBold : styles.tableCellText}>
                            {toDisplayNumber(row.rank)}
                          </Text>
                        </View>
                        <View style={styles.colTeam}>
                          {row.teamLogo ? <Image source={{ uri: row.teamLogo }} style={styles.teamLogo} /> : null}
                          <Text numberOfLines={1} style={styles.teamRowName}>
                            {toDisplayValue(row.teamName)}
                          </Text>
                        </View>
                        <View style={styles.colSmall}><Text style={styles.tableCellText}>{toDisplayNumber(row.played)}</Text></View>
                        <View style={styles.colSmall}><Text style={styles.tableCellText}>{toDisplayNumber(row.all.win)}</Text></View>
                        <View style={styles.colSmall}><Text style={styles.tableCellText}>{toDisplayNumber(row.all.draw)}</Text></View>
                        <View style={styles.colSmall}><Text style={styles.tableCellText}>{toDisplayNumber(row.all.lose)}</Text></View>
                        <View style={styles.colDiff}><Text style={styles.tableCellText}>{toDisplayNumber(row.goalDiff)}</Text></View>
                        <View style={styles.colPoints}>
                          <Text style={row.isTargetTeam ? styles.tableCellTextBold : styles.tableCellText}>
                            {toDisplayNumber(row.points)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </>
                ) : (
                  <Text style={styles.stateText}>{t('teamDetails.states.empty')}</Text>
                )}
              </View>
            );
          }

          if (item === 'standing-history') {
            return (
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <Text numberOfLines={1} style={[styles.cardTitle, styles.historyTitle]}>
                    {t('teamDetails.overview.standingHistory')}
                  </Text>
                  {(historyLeague.logo || historyLeague.name) ? (
                    <View style={styles.historyHeaderRight}>
                      <View style={styles.historyLeagueBadge}>
                        {historyLeague.logo ? (
                          <Image source={{ uri: historyLeague.logo }} style={styles.historyLeagueLogo} />
                        ) : null}
                        <Text numberOfLines={1} style={styles.historyLeagueName}>
                          {toDisplayValue(historyLeague.name)}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </View>
                {(historyPoints.length > 0) ? (
                  <View style={styles.historyChart}>
                    <View
                      style={styles.historyGraphCanvas}
                      onLayout={event => {
                        const width = event.nativeEvent.layout.width;
                        if (Math.abs(width - historyChartWidth) > 1) {
                          setHistoryChartWidth(width);
                        }
                      }}
                    >
                      <View style={styles.historyColumns}>
                        {historyPoints.map((point, index, array) => (
                          <View
                            key={`history-col-${point.season}`}
                            style={[
                              styles.historyColumn,
                              index % 2 === 1 ? styles.historyColumnAlt : null,
                              index === array.length - 1 ? styles.historyColumnCurrent : null,
                              index === array.length - 1 ? styles.historyColumnLast : null,
                            ]}
                          />
                        ))}
                      </View>

                      {historyVisualPoints.slice(1).map((point, index) => {
                        const previous = historyVisualPoints[index];
                        const horizontalWidth = Math.max(2, point.x - previous.x);
                        const verticalTop = Math.min(previous.y, point.y);
                        const verticalHeight = Math.max(2, Math.abs(point.y - previous.y));

                        return (
                          <View key={`history-connection-${point.season}`}>
                            <View
                              style={[
                                styles.historyConnectionHorizontal,
                                {
                                  left: previous.x,
                                  top: previous.y,
                                  width: horizontalWidth,
                                },
                              ]}
                            />
                            <View
                              style={[
                                styles.historyConnectionVertical,
                                {
                                  left: point.x,
                                  top: verticalTop,
                                  height: verticalHeight,
                                },
                              ]}
                            />
                          </View>
                        );
                      })}

                      {historyVisualPoints.map(point => {
                        const rankColor = resolveHistoryRankColor(point.rank, point.isLatest);

                        return (
                          <View
                            key={`history-point-${point.season}`}
                            style={[
                              styles.historyItem,
                              {
                                left: point.x - 18,
                                top: point.y - 18,
                                backgroundColor: rankColor.fill,
                                borderColor: rankColor.border,
                              },
                            ]}
                          >
                            <Text style={[styles.historyItemText, { color: rankColor.text }]}>
                              {toDisplayNumber(point.rank, '-')}
                            </Text>
                          </View>
                        );
                      })}
                    </View>

                    <View style={styles.historySeasonRow}>
                      {historyPoints.map((point, index, array) => (
                        <View
                          key={`history-season-${point.season}`}
                          style={[
                            styles.historySeasonItem,
                            index === array.length - 1 ? styles.historySeasonItemActive : null,
                          ]}
                        >
                          <Text
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.82}
                            style={[
                              styles.historySeasonText,
                              index === array.length - 1 ? styles.historySeasonTextActive : null,
                            ]}
                          >
                            {toCompactSeasonLabel(point.season)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : (
                  <Text style={styles.stateText}>{t('teamDetails.states.empty')}</Text>
                )}
              </View>
            );
          }

          if (item === 'coach-performance') {
            return (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t('teamDetails.overview.coachPerformance')}</Text>

                {coachPerformance?.coach ? (
                  <>
                    <View style={styles.coachHeader}>
                      <View style={styles.coachAvatarWrap}>
                        {coachPerformance.coach.photo ? (
                          <Image source={{ uri: coachPerformance.coach.photo }} style={styles.coachAvatar} />
                        ) : null}
                      </View>
                      <View style={styles.coachInfoWrap}>
                        <Text numberOfLines={1} style={styles.coachName}>
                          {toDisplayValue(coachPerformance.coach.name)}
                        </Text>
                        <Text style={styles.coachMeta}>
                          {toDisplayValue(coachPerformance.played)} {t('teamDetails.labels.played')}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.coachStatsRow}>
                      <View style={styles.coachStat}>
                        <Text style={styles.coachStatLabel}>{t('teamDetails.overview.coachWinRate')}</Text>
                        <Text style={styles.coachStatValue}>{toPercent(coachPerformance.winRate)}</Text>
                      </View>
                      <View style={styles.coachStat}>
                        <Text style={styles.coachStatLabel}>{t('teamDetails.overview.coachPointsPerMatch')}</Text>
                        <Text style={styles.coachStatValue}>{toDecimal(coachPerformance.pointsPerMatch, 2)}</Text>
                      </View>
                    </View>

                    <Text style={styles.coachRecord}>
                      {`${toDisplayNumber(coachPerformance.wins)}G • ${toDisplayNumber(coachPerformance.draws)}N • ${toDisplayNumber(coachPerformance.losses)}D`}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.stateText}>{t('teamDetails.overview.coachNoData')}</Text>
                )}
              </View>
            );
          }

          if (item === 'player-leaders') {
            return (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t('teamDetails.overview.playerLeaders')}</Text>
                <View style={styles.leadersGrid}>
                  {leaderSections.map(section => {
                    const mainPlayer = section.players[0] ?? null;
                    const restPlayers = section.players.slice(1, 3);

                    return (
                      <View key={section.key} style={styles.leaderCard}>
                        <Text style={styles.leaderTitle}>{section.title}</Text>

                        <View style={styles.leaderMainRow}>
                          <View style={styles.leaderMainAvatarWrap}>
                            {mainPlayer?.photo ? (
                              <Image source={{ uri: mainPlayer.photo }} style={styles.leaderMainAvatar} />
                            ) : (
                              <Text style={styles.leaderAvatarFallback}>{toShortInitials(mainPlayer?.name)}</Text>
                            )}
                          </View>
                          <View style={styles.leaderMainTextWrap}>
                            <Text numberOfLines={2} style={styles.leaderMainName}>
                              {toDisplayValue(mainPlayer?.name)}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.leaderMainValue}>{categoryValue(mainPlayer, section.key)}</Text>

                        {restPlayers.map(player => (
                          <View key={`${section.key}-${player.playerId}`} style={styles.leaderItemRow}>
                            <View style={styles.leaderItemLeft}>
                              <View style={styles.leaderItemAvatarWrap}>
                                {player.photo ? (
                                  <Image source={{ uri: player.photo }} style={styles.leaderItemAvatar} />
                                ) : (
                                  <Text style={styles.leaderAvatarFallback}>{toShortInitials(player.name)}</Text>
                                )}
                              </View>
                              <Text numberOfLines={1} style={styles.leaderItemName}>
                                {toDisplayValue(player.name)}
                              </Text>
                            </View>
                            <Text style={styles.leaderItemValue}>{categoryValue(player, section.key)}</Text>
                          </View>
                        ))}
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          }

          if (item === 'competitions') {
            return (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t('teamDetails.overview.competitions')}</Text>
                {(competitionsForSeason.length > 0) ? (
                  <View style={styles.competitionsList}>
                    {competitionsForSeason.map(competitionItem => (
                      <View key={`competition-${competitionItem.leagueId}-${competitionItem.season}`} style={styles.competitionRow}>
                        {competitionItem.leagueLogo ? <Image source={{ uri: competitionItem.leagueLogo }} style={styles.competitionLogo} /> : null}
                        <View style={styles.competitionTextWrap}>
                          <Text numberOfLines={1} style={styles.competitionName}>
                            {toDisplayValue(competitionItem.leagueName)}
                          </Text>
                          <Text style={styles.competitionSeason}>{toDisplaySeasonLabel(competitionItem.season)}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.stateText}>{t('teamDetails.states.empty')}</Text>
                )}
              </View>
            );
          }

          if (item === 'stadium-info') {
            return (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t('teamDetails.overview.stadiumInfo')}</Text>

                <View style={styles.stadiumHero}>
                  {team.venueImage ? <Image source={{ uri: team.venueImage }} style={styles.stadiumHeroImage} /> : null}
                  <View style={styles.stadiumHeroOverlay} />
                  <View style={styles.stadiumHeroContent}>
                    <Text style={styles.stadiumHeroName}>{toDisplayValue(team.venueName)}</Text>
                    <Text style={styles.stadiumHeroMeta}>
                      {`${toDisplayValue(team.venueCity)}${team.country ? `, ${team.country}` : ''}`}
                    </Text>
                  </View>
                </View>

                <View style={styles.splitRow}>
                  <Text style={styles.splitLabel}>🏟️ {t('teamDetails.labels.capacity')}</Text>
                  <Text style={styles.splitValue}>{toDisplayNumber(team.venueCapacity)}</Text>
                </View>
                <View style={styles.splitRow}>
                  <Text style={styles.splitLabel}>📅 {t('teamDetails.labels.founded')}</Text>
                  <Text style={styles.splitValue}>{toDisplayNumber(team.founded)}</Text>
                </View>
                <View style={styles.splitRow}>
                  <Text style={styles.splitLabel}>🌱 {t('teamDetails.labels.surface')}</Text>
                  <Text style={styles.splitValue}>{t('teamDetails.overview.surfaceUnknown')}</Text>
                </View>
              </View>
            );
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
