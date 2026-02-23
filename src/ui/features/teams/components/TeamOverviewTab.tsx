import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { TeamIdentity, TeamOverviewData } from '@ui/features/teams/types/teams.types';
import {
  toDisplayDate,
  toDisplayHour,
  toDisplayNumber,
  toDisplayValue,
} from '@ui/features/teams/utils/teamDisplay';
import type { ThemeColors } from '@ui/shared/theme/theme';

type TeamOverviewTabProps = {
  team: TeamIdentity;
  data: TeamOverviewData | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onPressMatch: (matchId: string) => void;
  onPressTeam: (teamId: string) => void;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
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
    nextMeta: {
      color: colors.textMuted,
      fontSize: 15,
      fontWeight: '600',
    },
    nextMatchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    homeTeamPressable: {
      flex: 1,
    },
    awayTeamPressable: {
      flex: 1,
    },
    teamName: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
      flex: 1,
    },
    awayTeamName: {
      textAlign: 'right',
    },
    kickoff: {
      color: colors.text,
      fontSize: 24,
      fontWeight: '900',
      letterSpacing: -1,
      minWidth: 90,
      textAlign: 'center',
    },
    formRow: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
    },
    formBadge: {
      minWidth: 50,
      borderRadius: 10,
      paddingVertical: 6,
      paddingHorizontal: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceElevated,
    },
    formBadgeWin: {
      backgroundColor: 'rgba(21,248,106,0.25)',
    },
    formBadgeDraw: {
      backgroundColor: 'rgba(245,158,11,0.25)',
    },
    formBadgeLoss: {
      backgroundColor: 'rgba(248,113,113,0.28)',
    },
    formBadgeText: {
      color: colors.text,
      fontSize: 15,
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
      gap: 2,
    },
    statLabel: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '700',
    },
    statValue: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '900',
    },
    splitRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
    },
    splitLabel: {
      color: colors.textMuted,
      fontSize: 15,
      fontWeight: '700',
    },
    splitValue: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
      textAlign: 'right',
    },
  });
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

export function TeamOverviewTab({
  team,
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

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.stateCard}>
          <Text style={styles.stateText}>{t('teamDetails.states.loading')}</Text>
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.container}>
        <View style={styles.stateCard}>
          <Text style={styles.stateText}>{t('teamDetails.states.error')}</Text>
          <Pressable onPress={onRetry}>
            <Text style={styles.retryText}>{t('actions.retry')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const nextMatch = data?.nextMatch ?? null;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('teamDetails.overview.nextMatch')}</Text>
        <Text style={styles.nextMeta}>
          {toDisplayDate(nextMatch?.date ?? null)} - {toDisplayValue(nextMatch?.leagueName)}
        </Text>

        <View style={styles.nextMatchRow}>
          <Pressable
            onPress={() => {
              if (nextMatch?.homeTeamId) {
                onPressTeam(nextMatch.homeTeamId);
              }
            }}
            style={styles.homeTeamPressable}
          >
            <Text numberOfLines={1} style={styles.teamName}>
              {toDisplayValue(nextMatch?.homeTeamName)}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              if (nextMatch?.fixtureId) {
                onPressMatch(nextMatch.fixtureId);
              }
            }}
          >
            <Text style={styles.kickoff}>{toDisplayHour(nextMatch?.date ?? null)}</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              if (nextMatch?.awayTeamId) {
                onPressTeam(nextMatch.awayTeamId);
              }
            }}
            style={styles.awayTeamPressable}
          >
            <Text numberOfLines={1} style={[styles.teamName, styles.awayTeamName]}>
              {toDisplayValue(nextMatch?.awayTeamName)}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('teamDetails.overview.recentForm')}</Text>
        <View style={styles.formRow}>
          {(data?.recentForm ?? []).length > 0
            ? (data?.recentForm ?? []).map(item => (
              <View
                key={`form-${item.fixtureId}`}
                style={[styles.formBadge, resolveFormBadgeStyle(item.result, styles)]}
              >
                <Text style={styles.formBadgeText}>{item.score ?? item.result}</Text>
              </View>
            ))
            : (
              <Text style={styles.nextMeta}>{t('teamDetails.states.empty')}</Text>
            )}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('teamDetails.overview.seasonStats')}</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>{t('teamDetails.labels.rank')}</Text>
            <Text style={styles.statValue}>{toDisplayNumber(data?.rank)}</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>{t('teamDetails.labels.points')}</Text>
            <Text style={styles.statValue}>{toDisplayNumber(data?.points)}</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>{t('teamDetails.labels.played')}</Text>
            <Text style={styles.statValue}>{toDisplayNumber(data?.played)}</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>{t('teamDetails.labels.goalDiff')}</Text>
            <Text style={styles.statValue}>{toDisplayNumber(data?.goalDiff)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('teamDetails.overview.clubInfo')}</Text>
        <View style={styles.splitRow}>
          <Text style={styles.splitLabel}>{t('teamDetails.labels.stadium')}</Text>
          <Text numberOfLines={1} style={styles.splitValue}>
            {toDisplayValue(team.venueName)}
          </Text>
        </View>
        <View style={styles.splitRow}>
          <Text style={styles.splitLabel}>{t('teamDetails.labels.capacity')}</Text>
          <Text style={styles.splitValue}>{toDisplayNumber(team.venueCapacity)}</Text>
        </View>
        <View style={styles.splitRow}>
          <Text style={styles.splitLabel}>{t('teamDetails.labels.trophies')}</Text>
          <Text style={styles.splitValue}>{toDisplayNumber(data?.trophyWinsCount)}</Text>
        </View>
      </View>
    </View>
  );
}
