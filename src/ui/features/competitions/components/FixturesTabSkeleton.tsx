import { View, StyleSheet } from 'react-native';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { SkeletonBox } from '@ui/shared/components';

// Skeleton pour l'onglet des matchs d'une compétition : 3 cards simulant logos + score
export function FixturesTabSkeleton() {
  const { colors } = useAppTheme();

  return (
    <View style={styles.container}>
      {SKELETON_CARDS.map(card => (
        <View
          key={card.key}
          style={[
            styles.card,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          {/* Ligne de statut / date */}
          <View style={styles.statusRow}>
            <SkeletonBox width={50} height={12} borderRadius={4} />
            <SkeletonBox width={70} height={12} borderRadius={4} />
          </View>

          {/* Ligne équipes + score */}
          <View style={styles.teamsRow}>
            {/* Équipe domicile */}
            <View style={styles.teamBlock}>
              <SkeletonBox width={32} height={32} borderRadius={16} />
              <SkeletonBox width={card.homeWidth} height={14} borderRadius={4} />
            </View>

            {/* Score central */}
            <SkeletonBox width={48} height={24} borderRadius={6} />

            {/* Équipe extérieure */}
            <View style={[styles.teamBlock, styles.teamBlockAway]}>
              <SkeletonBox width={card.awayWidth} height={14} borderRadius={4} />
              <SkeletonBox width={32} height={32} borderRadius={16} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

// 3 cards skeleton avec largeurs de noms variables
const SKELETON_CARDS = [
  { key: 'sk-card-1', homeWidth: 80, awayWidth: 90 },
  { key: 'sk-card-2', homeWidth: 100, awayWidth: 70 },
  { key: 'sk-card-3', homeWidth: 75, awayWidth: 95 },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    gap: 10,
  },
  card: {
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  teamBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'flex-end',
  },
  teamBlockAway: {
    justifyContent: 'flex-start',
  },
});
