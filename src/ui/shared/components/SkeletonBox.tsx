import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';

type SkeletonBoxProps = {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
};

// Composant skeleton réutilisable avec animation de pulsation Reanimated
export function SkeletonBox({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonBoxProps) {
  const { colors } = useAppTheme();
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.9, { duration: 800 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // Les dimensions et la couleur sont appliquées via style inline (valeurs dynamiques)
  const baseStyle = StyleSheet.flatten([
    {
      width,
      height,
      borderRadius,
      backgroundColor: colors.skeleton,
    } as ViewStyle,
    style,
  ]);

  return (
    <Animated.View
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
      style={[baseStyle, animatedStyle]}
    />
  );
}
