import { useMemo } from 'react';
import { Image, StyleSheet, Text, View, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';

import { FollowToggleButton } from '@ui/features/follows/components/FollowToggleButton';
import type { FollowedPlayerCard as FollowedPlayerCardType } from '@ui/features/follows/types/follows.types';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { localizePlayerPosition } from '@ui/shared/i18n/playerPosition';

function toDisplayValue(value: string | number | null | undefined): string {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '?';
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : '?';
  }

  return '?';
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      width: 250,
      minHeight: 250,
      borderRadius: 16,
      backgroundColor: colors.surfaceElevated,
      padding: 16,
      justifyContent: 'space-between',
    },
    contentPressable: {
      gap: 8,
    },
    top: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    playerPhotoContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    playerPhoto: {
      width: 64,
      height: 64,
      borderRadius: 32,
    },
    playerInfo: {
      marginTop: 12,
      gap: 4,
    },
    playerName: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '700',
    },
    position: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
    },
    clubRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 8,
    },
    clubLogo: {
      width: 16,
      height: 16,
    },
    clubName: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
      flexShrink: 1,
    },
    leagueName: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '500',
      marginTop: 4,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
    },
    statBox: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.chipBorder,
      paddingHorizontal: 8,
      paddingVertical: 6,
      minWidth: 60,
    },
    statLabel: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    statValue: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    removeButton: {
      padding: 4,
      backgroundColor: 'rgba(255,0,0,0.1)',
      borderRadius: 16,
    },
  });
}

type FollowedPlayerCardProps = {
  card: FollowedPlayerCardType;
  followLabel?: string;
  unfollowLabel?: string;
  onUnfollow: (playerId: string) => void;
  onPressPlayer?: (playerId: string) => void;
  goalsLabel: string;
  assistsLabel: string;
  isEditMode?: boolean;
};

export function FollowedPlayerCard({
  card,
  followLabel,
  unfollowLabel,
  onUnfollow,
  onPressPlayer,
  goalsLabel,
  assistsLabel,
  isEditMode,
}: FollowedPlayerCardProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const localizedPosition = localizePlayerPosition(card.position, t);

  return (
    <View style={styles.card}>
      <Pressable
        disabled={!onPressPlayer || isEditMode}
        onPress={() => onPressPlayer?.(card.playerId)}
        accessibilityRole="button"
        accessibilityLabel={toDisplayValue(card.playerName)}
        style={styles.contentPressable}
      >
        <View style={styles.top}>
          <Image source={{ uri: card.playerPhoto }} style={styles.playerPhoto} resizeMode="cover" />
          <View style={styles.playerInfo}>
            <Text numberOfLines={1} style={styles.playerName}>
              {toDisplayValue(card.playerName)}
            </Text>
            <Text numberOfLines={1} style={styles.position}>
              {localizedPosition}
            </Text>
          </View>
        </View>

        <View style={styles.clubRow}>
          <Image source={{ uri: card.teamLogo }} style={styles.clubLogo} resizeMode="contain" />
          <Text numberOfLines={1} style={styles.clubName}>
            {toDisplayValue(card.teamName)}
          </Text>
        </View>

        <Text numberOfLines={1} style={styles.leagueName}>
          {toDisplayValue(card.leagueName)}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>{goalsLabel}</Text>
            <Text style={styles.statValue}>{toDisplayValue(card.goals)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>{assistsLabel}</Text>
            <Text style={styles.statValue}>{toDisplayValue(card.assists)}</Text>
          </View>
        </View>
      </Pressable>

      <View>
        {isEditMode ? (
          <Pressable onPress={() => onUnfollow(card.playerId)} style={styles.removeButton}>
            <MaterialCommunityIcons name="minus-circle" size={24} color={colors.danger} />
          </Pressable>
        ) : (
          <FollowToggleButton
            isFollowing
            onPress={() => onUnfollow(card.playerId)}
            followLabel={followLabel!}
            unfollowLabel={unfollowLabel!}
            accessibilityLabel={`${unfollowLabel} ${toDisplayValue(card.playerName)}`}
          />
        )}
      </View>
    </View>
  );
}
