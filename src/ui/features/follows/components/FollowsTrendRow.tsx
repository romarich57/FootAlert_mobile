import { memo, useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { FollowToggleButton } from '@ui/features/follows/components/FollowToggleButton';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';

type FollowsTrendRowProps = {
  title: string;
  subtitle: string;
  avatarUrl: string;
  isFollowing: boolean;
  onToggleFollow: () => void;
  onPressItem?: () => void;
  itemAccessibilityLabel?: string;
  followLabel: string;
  unfollowLabel: string;
  accessibilityLabel: string;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      minHeight: 64,
      gap: 12,
    },
    left: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flexShrink: 1,
      flex: 1,
    },
    avatarContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.surfaceElevated,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatar: {
      width: 32,
      height: 32,
    },
    title: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
      marginTop: 2,
    },
  });
}

export const FollowsTrendRow = memo(function FollowsTrendRow({
  title,
  subtitle,
  avatarUrl,
  isFollowing,
  onToggleFollow,
  onPressItem,
  itemAccessibilityLabel,
  followLabel,
  unfollowLabel,
  accessibilityLabel,
}: FollowsTrendRowProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      {onPressItem ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={itemAccessibilityLabel ?? title}
          style={styles.left}
          onPress={onPressItem}
        >
          <View style={styles.avatarContainer}>
            <Image source={{ uri: avatarUrl }} style={styles.avatar} resizeMode="contain" />
          </View>
          <View>
            <Text numberOfLines={1} style={styles.title}>
              {title}
            </Text>
            <Text numberOfLines={1} style={styles.subtitle}>
              {subtitle}
            </Text>
          </View>
        </Pressable>
      ) : (
        <View style={styles.left}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: avatarUrl }} style={styles.avatar} resizeMode="contain" />
          </View>
          <View>
            <Text numberOfLines={1} style={styles.title}>
              {title}
            </Text>
            <Text numberOfLines={1} style={styles.subtitle}>
              {subtitle}
            </Text>
          </View>
        </View>
      )}

      <FollowToggleButton
        isFollowing={isFollowing}
        onPress={onToggleFollow}
        followLabel={followLabel}
        unfollowLabel={unfollowLabel}
        accessibilityLabel={accessibilityLabel}
      />
    </View>
  );
});
