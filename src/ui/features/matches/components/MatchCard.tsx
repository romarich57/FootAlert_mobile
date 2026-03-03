import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { MatchItem } from '@ui/features/matches/types/matches.types';
import type { ThemeColors } from '@ui/shared/theme/theme';

type MatchCardProps = {
  match: MatchItem;
  onPress: (match: MatchItem) => void;
  onPressNotification: (match: MatchItem) => void;
  onToggleFollow: (match: MatchItem) => void;
  isFollowed: boolean;
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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      borderRadius: 16,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 10,
      paddingVertical: 8,
      gap: 6,
      marginBottom: 8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 52,
    },
    contentRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      minWidth: 0,
      gap: 8,
    },
    teamSlot: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minWidth: 0,
    },
    teamSlotAway: {
      justifyContent: 'flex-start',
    },
    teamSlotHome: {
      justifyContent: 'flex-end',
    },
    teamName: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
      flexShrink: 1,
    },
    teamNameHome: {
      textAlign: 'right',
    },
    teamNameAway: {
      textAlign: 'left',
    },
    teamLogo: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.surfaceElevated,
    },
    teamLogoFallback: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    centerScore: {
      width: 70,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      flexShrink: 0,
    },
    kickoffTime: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    scoreText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: 10,
      opacity: 0.75,
      minHeight: 18,
      paddingRight: 4,
    },
  });
}

function renderTeamLogo(params: {
  side: 'home' | 'away';
  logoUrl: string;
  isUnavailable: boolean;
  onError: () => void;
  styles: ReturnType<typeof createStyles>;
  fixtureId: string;
}) {
  const { side, logoUrl, isUnavailable, onError, styles, fixtureId } = params;

  if (isUnavailable) {
    return (
      <View
        style={styles.teamLogoFallback}
        testID={`match-team-logo-placeholder-${side}-${fixtureId}`}
      />
    );
  }

  return (
    <Image
      source={{ uri: logoUrl }}
      style={styles.teamLogo}
      testID={`match-team-logo-${side}-${fixtureId}`}
      onError={onError}
    />
  );
}

export function MatchCard({
  match,
  onPress,
  onPressNotification,
  onToggleFollow,
  isFollowed,
  onPressHomeTeam,
  onPressAwayTeam,
}: MatchCardProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [homeLogoUnavailable, setHomeLogoUnavailable] = useState(!match.homeTeamLogo);
  const [awayLogoUnavailable, setAwayLogoUnavailable] = useState(!match.awayTeamLogo);

  const isUpcoming = match.status === 'upcoming';

  useEffect(() => {
    setHomeLogoUnavailable(!match.homeTeamLogo);
    setAwayLogoUnavailable(!match.awayTeamLogo);
  }, [match.awayTeamLogo, match.fixtureId, match.homeTeamLogo]);

  const handleNotificationPress = (event?: GestureResponderEvent) => {
    event?.stopPropagation?.();
    onPressNotification(match);
  };

  const handleFollowPress = (event?: GestureResponderEvent) => {
    event?.stopPropagation?.();
    onToggleFollow(match);
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

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(match)}
      testID={`match-card-${match.fixtureId}`}
      style={styles.card}
    >
      <View style={styles.row}>

        <View style={styles.contentRow}>
          <Pressable style={[styles.teamSlot, styles.teamSlotHome]} onPress={handleHomeTeamPress}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={[styles.teamName, styles.teamNameHome]}
            >
              {match.homeTeamName}
            </Text>
            {renderTeamLogo({
              side: 'home',
              logoUrl: match.homeTeamLogo,
              isUnavailable: homeLogoUnavailable,
              onError: () => setHomeLogoUnavailable(true),
              styles,
              fixtureId: match.fixtureId,
            })}
          </Pressable>

          <View style={styles.centerScore}>
            {isUpcoming ? (
              <Text style={styles.kickoffTime}>{formatKickoffTime(match.startDate)}</Text>
            ) : (
              <Text style={styles.scoreText}>
                {(match.homeGoals ?? 0).toString()} - {(match.awayGoals ?? 0).toString()}
              </Text>
            )}
          </View>

          <Pressable style={[styles.teamSlot, styles.teamSlotAway]} onPress={handleAwayTeamPress}>
            {renderTeamLogo({
              side: 'away',
              logoUrl: match.awayTeamLogo,
              isUnavailable: awayLogoUnavailable,
              onError: () => setAwayLogoUnavailable(true),
              styles,
              fixtureId: match.fixtureId,
            })}
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={[styles.teamName, styles.teamNameAway]}
            >
              {match.awayTeamName}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            hitSlop={8}
            onPress={handleNotificationPress}
            testID={`match-notification-button-${match.fixtureId}`}
          >
            <MaterialCommunityIcons name="bell-outline" size={16} color={colors.textMuted} />
          </Pressable>
          <Pressable
            hitSlop={8}
            onPress={handleFollowPress}
            testID={`match-follow-button-${match.fixtureId}`}
          >
            <MaterialCommunityIcons
              name={isFollowed ? 'star' : 'star-outline'}
              size={18}
              color={isFollowed ? colors.primary : colors.textMuted}
            />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}
