import { StyleSheet } from 'react-native';

import { MIN_TOUCH_TARGET, type ThemeColors } from '@ui/shared/theme/theme';

export function createTeamMatchesTabStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 16,
      paddingBottom: 24,
      gap: 10,
    },
    stateCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 8,
      marginTop: 12,
    },
    stateText: {
      color: colors.textMuted,
      fontSize: 15,
      fontWeight: '600',
    },
    retryText: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: '700',
    },
    filtersRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
      marginBottom: 4,
    },
    chip: {
      minHeight: MIN_TOUCH_TARGET,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.chipBorder,
      backgroundColor: colors.chipBackground,
      justifyContent: 'center',
      paddingHorizontal: 14,
    },
    chipActive: {
      borderColor: colors.primary,
      backgroundColor: 'rgba(21,248,106,0.18)',
    },
    chipText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
    },
    chipTextActive: {
      color: colors.primary,
    },
    sectionHeader: {
      marginTop: 10,
      marginBottom: 8,
      color: colors.text,
      fontSize: 20,
      fontWeight: '900',
    },
    matchCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 16,
      gap: 12,
      marginBottom: 10,
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
    },
    metaLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    metaIcon: {
      width: 14,
      height: 14,
      borderRadius: 7,
    },
    metaText: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },
    teamsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    teamSide: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: MIN_TOUCH_TARGET,
      gap: 8,
    },
    teamSideRight: {
      flexDirection: 'row-reverse',
    },
    teamLogoContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    teamLogo: {
      width: 20,
      height: 20,
    },
    teamName: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
      flex: 1,
    },
    awayTeamName: {
      textAlign: 'right',
    },
    middleArea: {
      minWidth: 70,
      alignItems: 'center',
      justifyContent: 'center',
    },
    middleScoreBox: {
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    middleScoreText: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '900',
      textAlign: 'center',
      letterSpacing: 2,
    },
    middleHourText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
      textAlign: 'center',
    },
  });
}
