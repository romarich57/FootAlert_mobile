import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { DEFAULT_HIT_SLOP, MIN_TOUCH_TARGET } from '@ui/shared/theme/theme';

type IconActionButtonProps = Omit<PressableProps, 'accessibilityRole' | 'accessibilityLabel' | 'children' | 'style'> & {
  accessibilityLabel: string;
  children: ReactNode;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function IconActionButton({
  accessibilityLabel,
  children,
  size = MIN_TOUCH_TARGET,
  style,
  hitSlop = DEFAULT_HIT_SLOP,
  ...pressableProps
}: IconActionButtonProps) {
  const resolvedSize = Math.max(size, MIN_TOUCH_TARGET);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={hitSlop}
      style={[styles.base, { width: resolvedSize, height: resolvedSize, borderRadius: resolvedSize / 2 }, style]}
      {...pressableProps}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
