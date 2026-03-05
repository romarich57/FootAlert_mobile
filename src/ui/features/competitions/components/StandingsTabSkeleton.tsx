import { View, StyleSheet } from 'react-native';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { SkeletonBox } from '@ui/shared/components';

// Skeleton du tableau de classement : 6 lignes simulant les colonnes rang/équipe/stats
export function StandingsTabSkeleton() {
  const { colors } = useAppTheme();

  return (
    <View style={styles.container}>
      {/* En-tête de colonne */}
      <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
        <SkeletonBox width={24} height={12} />
        <SkeletonBox width={80} height={12} />
        <SkeletonBox width={24} height={12} />
        <SkeletonBox width={24} height={12} />
        <SkeletonBox width={24} height={12} />
        <SkeletonBox width={60} height={12} />
      </View>

      {/* 6 lignes de classement */}
      {SKELETON_ROWS.map(row => (
        <View
          key={row.key}
          style={[styles.row, { borderBottomColor: colors.surfaceElevated }]}
        >
          <SkeletonBox width={20} height={14} borderRadius={4} />
          <View style={styles.teamCell}>
            <SkeletonBox width={24} height={24} borderRadius={12} />
            <SkeletonBox width={row.nameWidth} height={14} borderRadius={4} />
          </View>
          <SkeletonBox width={20} height={14} borderRadius={4} />
          <SkeletonBox width={20} height={14} borderRadius={4} />
          <SkeletonBox width={20} height={14} borderRadius={4} />
          <SkeletonBox width={60} height={14} borderRadius={4} />
        </View>
      ))}
    </View>
  );
}

// Données statiques pour les 6 lignes skeleton avec largeurs variables
const SKELETON_ROWS = [
  { key: 'sk-row-1', nameWidth: 110 },
  { key: 'sk-row-2', nameWidth: 90 },
  { key: 'sk-row-3', nameWidth: 120 },
  { key: 'sk-row-4', nameWidth: 80 },
  { key: 'sk-row-5', nameWidth: 100 },
  { key: 'sk-row-6', nameWidth: 70 },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    height: 52,
  },
  teamCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 8,
  },
});
