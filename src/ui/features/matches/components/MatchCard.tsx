import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { LiveBadge } from '@ui/features/matches/components/LiveBadge';
import type { MatchItem } from '@ui/features/matches/types/matches.types';
import { IconActionButton } from '@ui/shared/components';
import { type ThemeColors } from '@ui/shared/theme/theme';

type MatchCardProps = {
  match: MatchItem;
  onPress: (match: MatchItem) => void;
  onPressNotification: (match: MatchItem) => void;
  onPressHomeTeam?: (teamId: string) => void;
  onPressAwayTeam?: (teamId: string) => void;
};

function formatKickoffTime(date: string): string {
  const value = new Date(date);
  return value.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatGoalValue(goal: number | null): string {
  return typeof goal === 'number' && Number.isFinite(goal) ? String(goal) : '';
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      borderRadius: 20,
      backgroundColor: colors.cardBackground,
      paddingHorizontal: 16,
      paddingVertical: 18,
      gap: 16,
      position: 'relative',
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    cardLive: {
      borderColor: colors.primary,
      backgroundColor: colors.surface,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    notificationButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    teamsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    teamBlock: {
      flex: 1,
      alignItems: 'center',
      gap: 10,
    },
    teamLogo: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.surfaceElevated,
    },
    teamLogoFallback: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    teamName: {
      color: colors.text,
      fontWeight: '600',
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 18,
    },
    scoreWrapper: {
      minWidth: 100,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    scoreText: {
      color: colors.text,
      fontSize: 32,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    dividerText: {
      color: colors.textMuted,
      fontSize: 20,
      fontWeight: '400',
      marginHorizontal: 4,
    },
    kickoffTime: {
      color: colors.text,
      fontSize: 24,
      fontWeight: '700',
    },
    statusCaption: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '500',
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    broadcastRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      opacity: 0.8,
    },
    broadcastText: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '500',
    },
  });
}

export function MatchCard({
  match,
  onPress,
  onPressNotification,
  onPressHomeTeam,
  onPressAwayTeam,
}: MatchCardProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [homeLogoUnavailable, setHomeLogoUnavailable] = useState(!match.homeTeamLogo);
  const [awayLogoUnavailable, setAwayLogoUnavailable] = useState(!match.awayTeamLogo);

  const isLive = match.status === 'live';
  const isUpcoming = match.status === 'upcoming';
  const canDisplayScore = !isUpcoming;
  const kickoffTime = formatKickoffTime(match.startDate);

  useEffect(() => {
    setHomeLogoUnavailable(!match.homeTeamLogo);
    setAwayLogoUnavailable(!match.awayTeamLogo);
  }, [match.awayTeamLogo, match.fixtureId, match.homeTeamLogo]);

  const handleNotificationPress = (event?: GestureResponderEvent) => {
    event?.stopPropagation?.();
    onPressNotification(match);
  };

  const handleHomeTeamPress = (event?: GestureResponderEvent) => {
    event?.stopPropagation?.();
    if (onPressHomeTeam) {
      onPressHomeTeam(match.homeTeamId);
    }
  };

  const handleAwayTeamPress = (event?: GestureResponderEvent) => {
    event?.stopPropagation?.();
    if (onPressAwayTeam) {
      onPressAwayTeam(match.awayTeamId);
    }
  };

  const renderTeamLogo = (
    side: 'home' | 'away',
    logoUrl: string,
    isUnavailable: boolean,
    onError: () => void,
  ) => {
    if (isUnavailable) {
      return (
        <View style={styles.teamLogoFallback} testID={`match-team-logo-placeholder-${side}-${match.fixtureId}`} />
      );
    }

    return (
      <Image
        source={{ uri: logoUrl }}
        style={styles.teamLogo}
        testID={`match-team-logo-${side}-${match.fixtureId}`}
        onError={onError}
      />
    );
  };

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(match)}
      testID={`match-card-${match.fixtureId}`}
      style={[styles.card, isLive ? styles.cardLive : undefined]}
    >
      <View style={styles.topRow}>
        {isLive ? <LiveBadge minute={match.minute} /> : <View />}
        <IconActionButton
          accessibilityLabel={t('actions.openNotifications')}
          onPress={handleNotificationPress}
          testID={`match-notification-button-${match.fixtureId}`}
          style={styles.notificationButton}
        >
          <MaterialCommunityIcons name="bell-outline" size={18} color={colors.text} />
        </IconActionButton>
      </View>

      <View style={styles.teamsRow}>
        <Pressable style={styles.teamBlock} onPress={handleHomeTeamPress}>
          {renderTeamLogo(
            'home',
            match.homeTeamLogo,
            homeLogoUnavailable,
            () => setHomeLogoUnavailable(true),
          )}
          <Text numberOfLines={1} style={styles.teamName}>
            {match.homeTeamName}
          </Text>
        </Pressable>

        <View style={styles.scoreWrapper}>
          {canDisplayScore ? (
            <View style={styles.teamsRow}>
              <Text style={styles.scoreText}>{formatGoalValue(match.homeGoals)}</Text>
              <Text style={styles.dividerText}>-</Text>
              <Text style={styles.scoreText}>{formatGoalValue(match.awayGoals)}</Text>
            </View>
          ) : (
            <Text style={styles.kickoffTime}>{kickoffTime}</Text>
          )}
          <Text style={styles.statusCaption}>
            {isUpcoming ? t('matches.status.upcoming') : match.venue}
          </Text>
        </View>

        <Pressable style={styles.teamBlock} onPress={handleAwayTeamPress}>
          {renderTeamLogo(
            'away',
            match.awayTeamLogo,
            awayLogoUnavailable,
            () => setAwayLogoUnavailable(true),
          )}
          <Text numberOfLines={1} style={styles.teamName}>
            {match.awayTeamName}
          </Text>
        </Pressable>
      </View>

      <View style={styles.broadcastRow}>
        <MaterialCommunityIcons
          name={match.hasBroadcast ? 'television-play' : 'television-off'}
          size={16}
          color={colors.textMuted}
        />
        <Text style={styles.broadcastText}>
          {match.hasBroadcast ? t('matches.broadcast.available') : t('matches.broadcast.unknown')}
        </Text>
      </View>
    </Pressable>
  );
}
