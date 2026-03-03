import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';

type Props = {
  stepCount: number;
  currentIndex: number;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    dot: {
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.border,
    },
    dotActive: {
      backgroundColor: colors.primary,
    },
  });
}

function Dot({ isActive, colors }: { isActive: boolean; colors: ThemeColors }) {
  const styles = useMemo(() => createStyles(colors), [colors]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: withSpring(isActive ? 20 : 8, { damping: 15, stiffness: 120 }),
  }));

  return (
    <Animated.View
      style={[styles.dot, isActive ? styles.dotActive : null, animatedStyle]}
    />
  );
}

export function StepIndicator({ stepCount, currentIndex }: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      {Array.from({ length: stepCount }, (_, i) => (
        <Dot key={i} isActive={i === currentIndex} colors={colors} />
      ))}
    </View>
  );
}
