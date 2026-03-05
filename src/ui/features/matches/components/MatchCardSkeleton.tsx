import { View, StyleSheet } from 'react-native';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { SkeletonBox } from '@ui/shared/components';

// Skeleton reproduisant la forme d'une MatchCard : logos + score central + footer
export function MatchCardSkeleton() {
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.cardBackground,
          borderColor: colors.cardBorder,
        },
      ]}
    >
      {/* Ligne principale : équipe domicile - score - équipe extérieure */}
      <View style={styles.row}>
        {/* Équipe domicile */}
        <View style={[styles.teamSlot, styles.teamSlotHome]}>
          <SkeletonBox width={80} height={14} borderRadius={4} />
          <SkeletonBox width={24} height={24} borderRadius={12} />
        </View>

        {/* Score central */}
        <View style={styles.centerScore}>
          <SkeletonBox width={48} height={18} borderRadius={4} />
        </View>

        {/* Équipe extérieure */}
        <View style={[styles.teamSlot, styles.teamSlotAway]}>
          <SkeletonBox width={24} height={24} borderRadius={12} />
          <SkeletonBox width={80} height={14} borderRadius={4} />
        </View>
      </View>

      {/* Footer : icônes d'action */}
      <View style={styles.footer}>
        <SkeletonBox width={16} height={16} borderRadius={4} />
        <SkeletonBox width={18} height={18} borderRadius={4} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
  },
  teamSlot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  teamSlotHome: {
    justifyContent: 'flex-end',
  },
  teamSlotAway: {
    justifyContent: 'flex-start',
  },
  centerScore: {
    width: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 4,
    minHeight: 18,
  },
});
