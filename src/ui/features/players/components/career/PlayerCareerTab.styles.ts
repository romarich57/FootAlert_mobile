import { StyleSheet } from 'react-native';

import type { ThemeColors } from '@ui/shared/theme/theme';

export function createPlayerCareerTabStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      paddingBottom: 40,
      gap: 14,
    },
    segmentedContainer: {
      marginBottom: 8,
      borderRadius: 24,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 4,
      flexDirection: 'row',
    },
    segmentedButton: {
      flex: 1,
      borderRadius: 20,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentedButtonActive: {
      backgroundColor: colors.surfaceElevated,
    },
    segmentedLabel: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.textMuted,
    },
    segmentedLabelActive: {
      color: colors.text,
    },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    cardTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '800',
      flex: 1,
      paddingRight: 10,
    },
    rowSeparator: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    seasonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      gap: 10,
    },
    teamLogo: {
      width: 36,
      height: 36,
      borderRadius: 18,
    },
    teamLogoFallback: {
      opacity: 0,
    },
    seasonIdentity: {
      flex: 1,
      minWidth: 0,
      justifyContent: 'center',
    },
    teamName: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '700',
    },
    subText: {
      color: colors.textMuted,
      fontSize: 15,
      marginTop: 2,
    },
    seasonStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    statCell: {
      width: 34,
      alignItems: 'center',
    },
    statValue: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '700',
    },
    ratingBadge: {
      minWidth: 46,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ratingText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
    },
    ratingPlaceholder: {
      minWidth: 46,
      height: 26,
    },
    metricHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    metricHeaderCell: {
      width: 34,
      alignItems: 'center',
    },
    teamRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      paddingVertical: 16,
    },
    teamIdentity: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
      minWidth: 0,
    },
    teamStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    teamStatCell: {
      width: 34,
      alignItems: 'center',
      justifyContent: 'center',
    },
    teamStatValue: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
      textAlign: 'center',
    },
    sectionSpacer: {
      marginTop: 14,
    },
    legend: {
      flexDirection: 'row',
      gap: 22,
      marginTop: 8,
      paddingLeft: 6,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    legendText: {
      color: colors.textMuted,
      fontSize: 15,
      fontWeight: '600',
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 15,
      paddingVertical: 12,
      textAlign: 'center',
    },
  });
}

export type PlayerCareerTabStyles = ReturnType<typeof createPlayerCareerTabStyles>;
