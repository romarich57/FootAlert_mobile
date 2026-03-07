import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FollowToggleButton } from '@ui/features/follows/components/FollowToggleButton';
import { DiscoveryEntityAvatar } from '@ui/features/follows/components/DiscoveryEntityAvatar';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';

type FollowsTrendRowProps = {
  entityId: string;
  title: string;
  subtitle: string;
  avatarUrl: string;
  isFollowing: boolean;
  onToggleFollow: () => void;
  onPressItem?: () => void;
  imageType?: 'team' | 'player';
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
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    avatarContainerPlayer: {
      backgroundColor: colors.surfaceElevated,
    },
    avatarContainerTeam: {
      backgroundColor: 'transparent',
    },
    avatarTeam: {
      width: 40,
      height: 40,
    },
    avatarPlayer: {
      width: 40,
      height: 40,
    },
    title: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
      marginTop: 2,
    },
  });
}

export const FollowsTrendRow = memo(function FollowsTrendRow({
  entityId,
  title,
  subtitle,
  avatarUrl,
  isFollowing,
  onToggleFollow,
  onPressItem,
  imageType = 'team',
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
          <View style={[styles.avatarContainer, imageType === 'player' ? styles.avatarContainerPlayer : styles.avatarContainerTeam]}>
            <DiscoveryEntityAvatar
              kind={imageType}
              entityId={entityId}
              imageUrl={avatarUrl}
              name={title}
              imageStyle={imageType === 'player' ? styles.avatarPlayer : styles.avatarTeam}
              resizeMode={imageType === 'player' ? 'cover' : 'contain'}
            />
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
          <View style={[styles.avatarContainer, imageType === 'player' ? styles.avatarContainerPlayer : styles.avatarContainerTeam]}>
            <DiscoveryEntityAvatar
              kind={imageType}
              entityId={entityId}
              imageUrl={avatarUrl}
              name={title}
              imageStyle={imageType === 'player' ? styles.avatarPlayer : styles.avatarTeam}
              resizeMode={imageType === 'player' ? 'cover' : 'contain'}
            />
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
