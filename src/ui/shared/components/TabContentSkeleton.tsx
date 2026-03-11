import { StyleSheet, View } from 'react-native';
import { useMemo } from 'react';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';

import { SkeletonBox } from './SkeletonBox';

type TabContentSkeletonProps = {
  rows?: number;
};

const ROW_WIDTHS = ['90%', '70%', '80%', '60%', '75%'] as const;

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      paddingTop: 12,
      gap: 12,
    },
    card: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14,
      gap: 10,
    },
  });
}

export function TabContentSkeleton({ rows = 4 }: TabContentSkeletonProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <SkeletonBox width="100%" height={80} borderRadius={12} />
      <View style={styles.card}>
        {Array.from({ length: rows }, (_, index) => (
          <SkeletonBox
            key={`tab-sk-${index}`}
            width={ROW_WIDTHS[index % ROW_WIDTHS.length]}
            height={14}
            borderRadius={4}
          />
        ))}
      </View>
      <SkeletonBox width="100%" height={60} borderRadius={12} />
    </View>
  );
}
