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
      paddingHorizontal: 12,
      gap: 16,
      backgroundColor: 'transparent',
    },
    topActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    rightActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12, // Increased gap slightly for the flat icons
    },
    actionButton: {
      // Remove bg and border
    },
    teamsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      paddingBottom: 16,
    },
    teamBlock: {
      flex: 1,
      alignItems: 'center',
      gap: 8,
    },
    teamLogoWrap: {
      width: 50,
      height: 50,
      alignItems: 'center',
      justifyContent: 'center',
    },
    teamLogo: {
      width: 50,
      height: 50,
    },
    teamName: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
    },
    centerBlock: {
      minWidth: 106,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    scoreText: {
      color: colors.text,
      fontSize: 32,
      fontWeight: '700',
      letterSpacing: 0.4,
    },
    kickoffText: {
      color: colors.text,
      fontSize: 28,
      fontWeight: '700',
    },
    countdownText: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },
    endedText: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
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
          <IconActionButton
            accessibilityLabel={t('matchDetails.actions.notifications')}
            onPress={() => undefined}
            style={styles.actionButton}
          >
            <MaterialCommunityIcons name="bell-outline" size={22} color={colors.text} />
          </IconActionButton>
          <IconActionButton
            accessibilityLabel={t('matchDetails.actions.favorite')}
            onPress={() => undefined}
            style={styles.actionButton}
          >
            <MaterialCommunityIcons name="star-outline" size={22} color={colors.text} />
          </IconActionButton>
          <IconActionButton
            accessibilityLabel={t('matchDetails.actions.menu')}
            onPress={() => undefined}
            style={styles.actionButton}
          >
            <MaterialCommunityIcons name="dots-vertical" size={22} color={colors.text} />
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
              <Text style={styles.countdownText}>{countdownLabel || 'Bientôt'}</Text>
            </>
          ) : null}

          {lifecycleState === 'live' ? (
            <>
              <Text style={styles.scoreText}>{toDisplayScore(fixture)}</Text>
            </>
          ) : null}

          {lifecycleState === 'finished' ? (
            <>
              <Text style={styles.scoreText}>{toDisplayScore(fixture)}</Text>
              <Text style={styles.endedText}>Fin du match</Text>
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
