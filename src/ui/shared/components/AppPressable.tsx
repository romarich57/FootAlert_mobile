import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  type AccessibilityRole,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { DEFAULT_HIT_SLOP, MIN_TOUCH_TARGET } from '@ui/shared/theme/theme';

type AppPressableProps = Omit<
  PressableProps,
  'accessibilityRole' | 'accessibilityLabel' | 'children' | 'style'
> & {
  accessibilityRole: AccessibilityRole;
  accessibilityLabel: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  enforceMinTouchTarget?: boolean;
};

export function AppPressable({
  accessibilityRole,
  accessibilityLabel,
  children,
  style,
  enforceMinTouchTarget = true,
  hitSlop = DEFAULT_HIT_SLOP,
  ...pressableProps
}: AppPressableProps) {
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      hitSlop={hitSlop}
      style={[enforceMinTouchTarget ? styles.touchTarget : null, style]}
      {...pressableProps}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touchTarget: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
  },
});
