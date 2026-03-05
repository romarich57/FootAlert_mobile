import { View, StyleSheet } from 'react-native';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { SkeletonBox } from '@ui/shared/components';

// Skeleton pour l'écran détail d'une équipe : header avatar + texte + 4 onglets
export function TeamDetailsSkeleton() {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header : logo + nom + métadonnées */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <SkeletonBox width={60} height={60} borderRadius={30} />
        <View style={styles.headerText}>
          <SkeletonBox width={140} height={20} borderRadius={6} />
          <SkeletonBox width={100} height={14} borderRadius={4} />
        </View>
      </View>

      {/* Barre d'onglets */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {TAB_WIDTHS.map(tab => (
          <SkeletonBox key={tab.key} width={tab.width} height={16} borderRadius={4} />
        ))}
      </View>

      {/* Contenu placeholder */}
      <View style={styles.content}>
        <SkeletonBox width="90%" height={14} borderRadius={4} />
        <SkeletonBox width="70%" height={14} borderRadius={4} />
        <SkeletonBox width="80%" height={14} borderRadius={4} />
        <SkeletonBox width="60%" height={14} borderRadius={4} style={styles.spacer} />
        <SkeletonBox width="100%" height={80} borderRadius={8} />
      </View>
    </View>
  );
}

const TAB_WIDTHS = [
  { key: 'tab-1', width: 55 },
  { key: 'tab-2', width: 48 },
  { key: 'tab-3', width: 60 },
  { key: 'tab-4', width: 52 },
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
    borderBottomWidth: 1,
  },
  headerText: {
    flex: 1,
    gap: 8,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  content: {
    padding: 16,
    gap: 10,
  },
  spacer: {
    marginBottom: 8,
  },
});
