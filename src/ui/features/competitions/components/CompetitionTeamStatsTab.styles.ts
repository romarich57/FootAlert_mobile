import { StyleSheet } from 'react-native';

import {
  MIN_TOUCH_TARGET,
  type ThemeColors,
} from '@ui/shared/theme/theme';

export function createCompetitionTeamStatsTabStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 15,
      textAlign: 'center',
    },
    scrollContent: {
      paddingHorizontal: 14,
      paddingVertical: 14,
      paddingBottom: 30,
      gap: 12,
    },
    sectionCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 12,
      gap: 10,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
      flex: 1,
    },
    sectionSubtitle: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
    },
    badge: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    badgeText: {
      color: colors.text,
      fontSize: 11,
      fontWeight: '800',
    },
    chipsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: 11,
      paddingVertical: 6,
      minHeight: MIN_TOUCH_TARGET,
      minWidth: MIN_TOUCH_TARGET,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipActive: {
      borderColor: colors.primary,
      backgroundColor: 'rgba(21, 248, 106, 0.14)',
    },
    chipText: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '700',
    },
    chipTextActive: {
      color: colors.text,
    },
    advancedCta: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: 'rgba(21, 248, 106, 0.14)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 11,
      paddingHorizontal: 14,
      minHeight: MIN_TOUCH_TARGET,
    },
    advancedCtaText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
    },
    stateCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      minHeight: 74,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
      gap: 8,
    },
    stateText: {
      color: colors.textMuted,
      fontSize: 13,
      textAlign: 'center',
    },
    partialText: {
      color: colors.warning,
      fontSize: 12,
      fontWeight: '700',
    },
    progressText: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
    },
  });
}
