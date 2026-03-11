import { StyleSheet, View } from 'react-native';
import { useMemo } from 'react';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { SkeletonBox } from '@ui/shared/components/SkeletonBox';
import type { ThemeColors } from '@ui/shared/theme/theme';

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 16,
      paddingTop: 16,
      gap: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerText: {
      gap: 6,
      flex: 1,
    },
    tabBar: {
      flexDirection: 'row',
      gap: 12,
      paddingVertical: 8,
    },
    content: {
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

export function CompetitionDetailsSkeleton() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SkeletonBox width={48} height={48} borderRadius={24} />
        <View style={styles.headerText}>
          <SkeletonBox width={140} height={20} borderRadius={4} />
          <SkeletonBox width={100} height={14} borderRadius={4} />
        </View>
      </View>

      <View style={styles.tabBar}>
        <SkeletonBox width={70} height={28} borderRadius={14} />
        <SkeletonBox width={55} height={28} borderRadius={14} />
        <SkeletonBox width={80} height={28} borderRadius={14} />
        <SkeletonBox width={65} height={28} borderRadius={14} />
      </View>

      <View style={styles.content}>
        <SkeletonBox width="100%" height={80} borderRadius={12} />
        <View style={styles.card}>
          <SkeletonBox width="90%" height={14} borderRadius={4} />
          <SkeletonBox width="70%" height={14} borderRadius={4} />
          <SkeletonBox width="80%" height={14} borderRadius={4} />
        </View>
        <SkeletonBox width="100%" height={60} borderRadius={12} />
      </View>
    </View>
  );
}
