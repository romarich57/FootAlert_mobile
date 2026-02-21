import { useMemo } from 'react';
import { Image, StyleSheet, Text, View, Pressable } from 'react-native';

import { FollowToggleButton } from '@ui/features/follows/components/FollowToggleButton';
import type { FollowedTeamCard as FollowedTeamCardType } from '@ui/features/follows/types/follows.types';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

function formatMatchDate(dateIso: string): string {
  if (!dateIso) {
    return '';
  }

  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      width: 200,
      minHeight: 200,
      borderRadius: 16,
      backgroundColor: colors.surfaceElevated,
      padding: 16,
      justifyContent: 'space-between',
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    teamLogoContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    teamLogo: {
      width: 32,
      height: 32,
    },
    teamName: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '700',
      flexShrink: 1,
      marginTop: 12,
      marginBottom: 16,
    },
    nextRow: {
      gap: 4,
    },
    nextMatchTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    nextMatchLabel: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
    },
    nextMatchDate: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    noMatch: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '500',
    },
    removeButton: {
      padding: 4,
      backgroundColor: 'rgba(255,0,0,0.1)',
      borderRadius: 16,
    },
  });
}

type FollowedTeamCardProps = {
  card: FollowedTeamCardType;
  unfollowLabel?: string;
  followLabel?: string;
  onUnfollow: (teamId: string) => void;
  noNextMatchLabel: string;
  isEditMode?: boolean;
};

export function FollowedTeamCard({
  card,
  unfollowLabel,
  followLabel,
  onUnfollow,
  noNextMatchLabel,
  isEditMode,
}: FollowedTeamCardProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Image source={{ uri: card.teamLogo }} style={styles.teamLogo} resizeMode="contain" />
        <Text numberOfLines={1} style={styles.teamName}>
          {card.teamName}
        </Text>
      </View>

      <View style={styles.nextRow}>
        {card.nextMatch ? (
          <>
            <Text numberOfLines={1} style={styles.nextMatchLabel}>
              vs {card.nextMatch.opponentTeamName}
            </Text>
            <Text style={styles.nextMatchDate}>{formatMatchDate(card.nextMatch.startDate)}</Text>
          </>
        ) : (
          <Text style={styles.noMatch}>{noNextMatchLabel}</Text>
        )}
      </View>

      <View>
        {isEditMode ? (
          <Pressable onPress={() => onUnfollow(card.teamId)} style={styles.removeButton}>
            <MaterialCommunityIcons name="minus-circle" size={24} color={colors.danger} />
          </Pressable>
        ) : (
          <FollowToggleButton
            isFollowing
            onPress={() => onUnfollow(card.teamId)}
            followLabel={followLabel!}
            unfollowLabel={unfollowLabel!}
            accessibilityLabel={`${unfollowLabel} ${card.teamName}`}
          />
        )}
      </View>
    </View>
  );
}
