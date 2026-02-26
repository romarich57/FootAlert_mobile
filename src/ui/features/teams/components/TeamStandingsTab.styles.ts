import { StyleSheet } from 'react-native';

import type { ThemeColors } from '@ui/shared/theme/theme';

export function createTeamStandingsTabStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 16,
      paddingBottom: 22,
      backgroundColor: colors.background,
    },
    listContent: {
      paddingBottom: 8,
    },
    filterBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 8,
      marginBottom: 4,
    },
    modeTabs: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 999,
      padding: 2,
    },
    modeTab: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
    },
    modeTabActive: {
      backgroundColor: colors.surfaceElevated,
    },
    modeTabText: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '700',
    },
    modeTabTextActive: {
      color: colors.text,
    },
    subFilterBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      gap: 4,
    },
    subFilterText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
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
    emptyWrap: {
      paddingTop: 20,
    },
    retryText: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: '700',
    },
    tableHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surfaceElevated,
    },
    tableHeaderText: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    tableHeaderRight: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '500',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    rowTarget: {
      backgroundColor: 'rgba(21,248,106,0.13)',
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
    },
    groupHeader: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
      marginTop: 12,
      marginBottom: 6,
    },
    colRank: {
      width: 24,
    },
    colTeam: {
      flex: 1,
      paddingRight: 4,
      overflow: 'hidden',
    },
    teamInfoContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    standingTeamLogo: {
      width: 18,
      height: 18,
    },
    colStatSmall: {
      width: 22,
      alignItems: 'center',
    },
    colStatMedium: {
      width: 26,
      alignItems: 'center',
    },
    colStatLarge: {
      width: 38,
      alignItems: 'center',
    },
    colPoints: {
      width: 32,
      alignItems: 'flex-end',
    },
    colForm: {
      width: 140,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 4,
    },
    teamText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    cellText: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    cellTextBold: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
    formBox: {
      width: 22,
      height: 22,
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    formBoxText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '800',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      padding: 24,
    },
    modalContent: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 16,
      overflow: 'hidden',
    },
    modalItem: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalItemText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
  });
}
