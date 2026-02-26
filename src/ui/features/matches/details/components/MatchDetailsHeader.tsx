import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { IconActionButton } from '@ui/shared/components';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { AppImage } from '@ui/shared/media/AppImage';
import type { ThemeColors } from '@ui/shared/theme/theme';
import type { ApiFootballFixtureDto, MatchLifecycleState } from '@ui/features/matches/types/matches.types';

type MatchDetailsHeaderProps = {
  fixture: ApiFootballFixtureDto;
  lifecycleState: MatchLifecycleState;
  statusLabel: string;
  kickoffLabel: string;
  countdownLabel: string;
  onBack: () => void;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 14,
      gap: 12,
    },
    topActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    rightActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    actionButton: {
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    followButton: {
      minHeight: 36,
      borderRadius: 999,
      backgroundColor: `${colors.primary}1F`,
      borderWidth: 1,
      borderColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 12,
    },
    followText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    teamsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    teamBlock: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
    },
    teamLogoWrap: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    teamLogo: {
      width: 34,
      height: 34,
    },
    teamName: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
      textAlign: 'center',
    },
    centerBlock: {
      minWidth: 106,
      alignItems: 'center',
      gap: 4,
    },
    scoreText: {
      color: colors.text,
      fontSize: 30,
      fontWeight: '900',
      letterSpacing: 0.4,
    },
    statusBadge: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    liveBadge: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}20`,
    },
    statusText: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    liveText: {
      color: colors.primary,
    },
    kickoffText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    countdownText: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    endedText: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    placeholderText: {
      color: colors.textMuted,
      fontSize: 16,
      fontWeight: '700',
    },
  });
}

function toDisplayScore(fixture: ApiFootballFixtureDto): string {
  const homeGoals = fixture.goals.home;
  const awayGoals = fixture.goals.away;

  if (typeof homeGoals !== 'number' || typeof awayGoals !== 'number') {
    return '-';
  }

  return `${homeGoals}-${awayGoals}`;
}

function TeamLogo({ logo, fallback, styles }: { logo: string; fallback: string; styles: ReturnType<typeof createStyles> }) {
  if (!logo) {
    return <Text style={styles.placeholderText}>{fallback}</Text>;
  }

  return (
    <AppImage
      source={{ uri: logo }}
      style={styles.teamLogo}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
}

export function MatchDetailsHeader({
  fixture,
  lifecycleState,
  statusLabel,
  kickoffLabel,
  countdownLabel,
  onBack,
}: MatchDetailsHeaderProps) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const homeTeam = fixture.teams.home;
  const awayTeam = fixture.teams.away;

  return (
    <View style={styles.container}>
      <View style={styles.topActions}>
        <IconActionButton
          accessibilityLabel={t('actions.back')}
          onPress={onBack}
          style={styles.actionButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color={colors.text} />
        </IconActionButton>

        <View style={styles.rightActions}>
          <View style={styles.followButton}>
            <Text style={styles.followText}>{t('matchDetails.actions.follow')}</Text>
          </View>
          <IconActionButton
            accessibilityLabel={t('matchDetails.actions.notifications')}
            onPress={() => undefined}
            style={styles.actionButton}
          >
            <MaterialCommunityIcons name="bell-outline" size={18} color={colors.text} />
          </IconActionButton>
          <IconActionButton
            accessibilityLabel={t('matchDetails.actions.favorite')}
            onPress={() => undefined}
            style={styles.actionButton}
          >
            <MaterialCommunityIcons name="star-outline" size={18} color={colors.text} />
          </IconActionButton>
          <IconActionButton
            accessibilityLabel={t('matchDetails.actions.menu')}
            onPress={() => undefined}
            style={styles.actionButton}
          >
            <MaterialCommunityIcons name="dots-vertical" size={18} color={colors.text} />
          </IconActionButton>
        </View>
      </View>

      <View style={styles.teamsRow}>
        <View style={styles.teamBlock}>
          <View style={styles.teamLogoWrap}>
            <TeamLogo logo={homeTeam.logo} fallback="H" styles={styles} />
          </View>
          <Text numberOfLines={2} style={styles.teamName}>{homeTeam.name}</Text>
        </View>

        <View style={styles.centerBlock}>
          {lifecycleState === 'pre_match' ? (
            <>
              <Text style={styles.kickoffText}>{kickoffLabel || '--:--'}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{statusLabel}</Text>
              </View>
              <Text style={styles.countdownText}>{countdownLabel || t('matchDetails.header.countdown.soon')}</Text>
            </>
          ) : null}

          {lifecycleState === 'live' ? (
            <>
              <Text style={styles.scoreText}>{toDisplayScore(fixture)}</Text>
              <View style={[styles.statusBadge, styles.liveBadge]}>
                <Text style={[styles.statusText, styles.liveText]}>{t('matches.liveLabel')}</Text>
              </View>
              <Text style={styles.countdownText}>{statusLabel}</Text>
            </>
          ) : null}

          {lifecycleState === 'finished' ? (
            <>
              <Text style={styles.scoreText}>{toDisplayScore(fixture)}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{t('matchDetails.header.final')}</Text>
              </View>
              <Text style={styles.endedText}>{t('matchDetails.header.finished')}</Text>
            </>
          ) : null}
        </View>

        <View style={styles.teamBlock}>
          <View style={styles.teamLogoWrap}>
            <TeamLogo logo={awayTeam.logo} fallback="A" styles={styles} />
          </View>
          <Text numberOfLines={2} style={styles.teamName}>{awayTeam.name}</Text>
        </View>
      </View>
    </View>
  );
}
