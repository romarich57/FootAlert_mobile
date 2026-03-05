import { View, StyleSheet } from 'react-native';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { SkeletonBox } from '@ui/shared/components';

// Skeleton pour l'écran détail d'un joueur : header photo + infos + stats
export function PlayerDetailsSkeleton() {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header : photo joueur + informations */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <SkeletonBox width={80} height={80} borderRadius={40} />
        <View style={styles.playerInfo}>
          <SkeletonBox width={160} height={22} borderRadius={6} />
          <SkeletonBox width={110} height={16} borderRadius={4} />
          <View style={styles.metaRow}>
            <SkeletonBox width={70} height={14} borderRadius={4} />
            <SkeletonBox width={70} height={14} borderRadius={4} />
          </View>
        </View>
      </View>

      {/* Barre d'onglets */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {TAB_WIDTHS.map(tab => (
          <SkeletonBox key={tab.key} width={tab.width} height={16} borderRadius={4} />
        ))}
      </View>

      {/* Stats placeholder */}
      <View style={styles.statsBlock}>
        <View style={styles.statsRow}>
          {STAT_ITEMS.map(stat => (
            <View key={stat.key} style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <SkeletonBox width={40} height={24} borderRadius={4} />
              <SkeletonBox width={60} height={12} borderRadius={4} />
            </View>
          ))}
        </View>
        <SkeletonBox width="100%" height={100} borderRadius={8} />
      </View>
    </View>
  );
}

const TAB_WIDTHS = [
  { key: 'tab-1', width: 50 },
  { key: 'tab-2', width: 56 },
  { key: 'tab-3', width: 44 },
  { key: 'tab-4', width: 58 },
];

const STAT_ITEMS = [
  { key: 'stat-1' },
  { key: 'stat-2' },
  { key: 'stat-3' },
  { key: 'stat-4' },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  playerInfo: {
    flex: 1,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  statsBlock: {
    padding: 16,
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
});
