import { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { TeamIdentity } from '@ui/features/teams/types/teams.types';
import { toDisplayValue } from '@ui/features/teams/utils/teamDisplay';
import type { ThemeColors } from '@ui/shared/theme/theme';

type TeamHeaderProps = {
  team: TeamIdentity;
  isFollowed: boolean;
  onBack: () => void;
  onToggleFollow: () => void;
  backLabel: string;
  followLabel: string;
  unfollowLabel: string;
};

function createStyles(colors: ThemeColors, topInset: number) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.background,
      paddingTop: topInset + 10,
      paddingHorizontal: 18,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 14,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    iconButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 1,
      borderColor: colors.chipBorder,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    title: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
      flex: 1,
      textAlign: 'center',
    },
    followButton: {
      minWidth: 90,
      height: 36,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: isFollowedColor(colors, false),
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      paddingHorizontal: 16,
    },
    followButtonActive: {
      borderColor: colors.primary,
      backgroundColor: 'rgba(21,248,106,0.14)',
    },
    followText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    followTextActive: {
      color: colors.primary,
    },
    profileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    logoWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    logo: {
      width: 40,
      height: 40,
    },
    profileTextWrap: {
      flex: 1,
      gap: 4,
    },
    teamName: {
      color: colors.text,
      fontSize: 24,
      fontWeight: '800',
      letterSpacing: -0.5,
    },
    teamCountry: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '500',
    },
  });
}

function isFollowedColor(colors: ThemeColors, isFollowed: boolean): string {
  return isFollowed ? colors.primary : colors.chipBorder;
}

export function TeamHeader({
  team,
  isFollowed,
  onBack,
  onToggleFollow,
  backLabel,
  followLabel,
  unfollowLabel,
}: TeamHeaderProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, insets.top), [colors, insets.top]);

  const hasLogo = Boolean(team.logo);

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          onPress={onBack}
          style={styles.iconButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color={colors.text} />
        </Pressable>

        <Text numberOfLines={1} style={styles.title}>
          {toDisplayValue(team.name)}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isFollowed ? unfollowLabel : followLabel}
          onPress={onToggleFollow}
          style={[styles.followButton, isFollowed ? styles.followButtonActive : null]}
        >
          <Text style={[styles.followText, isFollowed ? styles.followTextActive : null]}>
            {isFollowed ? unfollowLabel : followLabel}
          </Text>
        </Pressable>
      </View>

      <View style={styles.profileRow}>
        <View style={styles.logoWrap}>
          {hasLogo ? (
            <Image source={{ uri: team.logo ?? undefined }} style={styles.logo} resizeMode="contain" />
          ) : (
            <View style={styles.logo} />
          )}
        </View>
        <View style={styles.profileTextWrap}>
          <Text numberOfLines={1} style={styles.teamName}>
            {toDisplayValue(team.name)}
          </Text>
          <Text numberOfLines={1} style={styles.teamCountry}>
            {toDisplayValue(team.country)}
          </Text>
        </View>
      </View>
    </View>
  );
}
