import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';

type FollowToggleButtonProps = {
  isFollowing: boolean;
  onPress: () => void;
  followLabel: string;
  unfollowLabel: string;
  accessibilityLabel: string;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    button: {
      minHeight: 32,
      paddingVertical: 6,
      paddingHorizontal: 16,
      borderRadius: 16,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
      borderColor: colors.primary,
    },
    buttonFollowing: {
      backgroundColor: 'transparent',
      borderColor: colors.border,
    },
    text: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.primary,
    },
    textFollowing: {
      color: colors.textMuted,
    },
  });
}

export const FollowToggleButton = memo(function FollowToggleButton({
  isFollowing,
  onPress,
  followLabel,
  unfollowLabel,
  accessibilityLabel,
}: FollowToggleButtonProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[styles.button, isFollowing ? styles.buttonFollowing : null]}
    >
      <Text style={[styles.text, isFollowing ? styles.textFollowing : null]}>
        {isFollowing ? unfollowLabel : followLabel}
      </Text>
    </Pressable>
  );
});
