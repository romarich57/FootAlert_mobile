import { useMemo } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';

import { FollowToggleButton } from '@ui/features/follows/components/FollowToggleButton';
import type { FollowedTeamCard as FollowedTeamCardType } from '@ui/features/follows/types/follows.types';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { AppImage } from '@ui/shared/media/AppImage';
import type { ThemeColors } from '@ui/shared/theme/theme';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

function toDisplayValue(value: string | null | undefined): string {
  if (typeof value !== 'string') {
    return '';
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : '';
}

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
      width: 120,
      minHeight: 120,
      borderRadius: 16,
      backgroundColor: colors.surfaceElevated,
      padding: 12,
      justifyContent: 'space-between',
    },
    contentPressable: {
      gap: 8,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    teamLogo: {
      width: 32,
      height: 32,
    },
    teamName: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
      flexShrink: 1,
      marginTop: 8,
      marginBottom: 10,
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
      fontSize: 11,
      fontWeight: '600',
    },
    nextMatchDate: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '600',
    },
    noMatch: {
      color: colors.textMuted,
      fontSize: 12,
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
  onPressTeam?: (teamId: string) => void;
  noNextMatchLabel: string;
  isEditMode?: boolean;
};

export function FollowedTeamCard({
  card,
  unfollowLabel,
  followLabel,
  onUnfollow,
  onPressTeam,
  noNextMatchLabel,
  isEditMode,
}: FollowedTeamCardProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const teamName = toDisplayValue(card.teamName);
  const opponentTeamName = toDisplayValue(card.nextMatch?.opponentTeamName);

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={teamName}
        onPress={() => {
          if (isEditMode || !onPressTeam) {
            return;
          }

          onPressTeam(card.teamId);
        }}
        style={styles.contentPressable}
      >
        <View style={styles.topRow}>
          <AppImage source={{ uri: card.teamLogo }} style={styles.teamLogo} resizeMode="contain" />
          <Text numberOfLines={1} style={styles.teamName}>
            {teamName}
          </Text>
        </View>

        <View style={styles.nextRow}>
          {card.nextMatch ? (
            <>
              {opponentTeamName ? (
                <Text numberOfLines={1} style={styles.nextMatchLabel}>
                  vs {opponentTeamName}
                </Text>
              ) : null}
              <Text style={styles.nextMatchDate}>{formatMatchDate(card.nextMatch.startDate)}</Text>
            </>
          ) : (
            <Text style={styles.noMatch}>{noNextMatchLabel}</Text>
          )}
        </View>
      </Pressable>

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
            accessibilityLabel={`${unfollowLabel} ${teamName}`}
          />
        )}
      </View>
    </View>
  );
}
