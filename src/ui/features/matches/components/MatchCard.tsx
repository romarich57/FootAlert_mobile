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
import type { ThemeColors } from '@ui/shared/theme/theme';

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

function buildTeamInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return '--';
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBackground,
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
      position: 'relative',
    },
    cardLive: {
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOpacity: 0.5,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 0 },
      elevation: 12,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    notificationButton: {
      width: 36,
      height: 36,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
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
      gap: 8,
    },
    teamLogo: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
    },
    teamLogoFallback: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    teamLogoFallbackText: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.6,
    },
    teamName: {
      color: colors.text,
      fontWeight: '700',
      fontSize: 15,
      textAlign: 'center',
    },
    scoreWrapper: {
      minWidth: 92,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    },
    scoreText: {
      color: colors.text,
      fontSize: 42,
      fontWeight: '900',
      letterSpacing: -1,
    },
    dividerText: {
      color: colors.textMuted,
      fontSize: 26,
      fontWeight: '700',
    },
    kickoffTime: {
      color: colors.primary,
      fontSize: 34,
      fontWeight: '900',
      letterSpacing: -1,
    },
    statusCaption: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'center',
    },
    broadcastRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 4,
    },
    broadcastText: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
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
    teamName: string,
  ) => {
    if (isUnavailable) {
      return (
        <View style={styles.teamLogoFallback} testID={`match-team-logo-fallback-${side}-${match.fixtureId}`}>
          <Text style={styles.teamLogoFallbackText}>{buildTeamInitials(teamName)}</Text>
        </View>
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
        <Pressable
          accessibilityRole="button"
          onPress={handleNotificationPress}
          testID={`match-notification-button-${match.fixtureId}`}
          style={styles.notificationButton}
        >
          <MaterialCommunityIcons name="bell-outline" size={18} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.teamsRow}>
        <Pressable style={styles.teamBlock} onPress={handleHomeTeamPress}>
          {renderTeamLogo(
            'home',
            match.homeTeamLogo,
            homeLogoUnavailable,
            () => setHomeLogoUnavailable(true),
            match.homeTeamName,
          )}
          <Text numberOfLines={1} style={styles.teamName}>
            {match.homeTeamName}
          </Text>
        </Pressable>

        <View style={styles.scoreWrapper}>
          {canDisplayScore ? (
            <View style={styles.teamsRow}>
              <Text style={styles.scoreText}>{match.homeGoals ?? 0}</Text>
              <Text style={styles.dividerText}>-</Text>
              <Text style={styles.scoreText}>{match.awayGoals ?? 0}</Text>
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
            match.awayTeamName,
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
