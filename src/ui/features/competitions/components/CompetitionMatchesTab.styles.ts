import { StyleSheet } from 'react-native';

import type { ThemeColors } from '@ui/shared/theme/theme';

export function createCompetitionMatchesTabStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 16,
      textAlign: 'center',
      lineHeight: 24,
      marginTop: 24,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    headerTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    headerActions: {
      flexDirection: 'row',
      gap: 16,
    },
    headerActionText: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '500',
    },
    roundHeader: {
      backgroundColor: colors.surfaceElevated,
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginTop: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.surface,
    },
    roundHeaderText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    fixtureCard: {
      backgroundColor: colors.surface,
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceElevated,
    },
    fixtureTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    matchStatus: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    matchStatusLive: {
      color: colors.primary,
    },
    matchDate: {
      color: colors.textMuted,
      fontSize: 12,
    },
    teamsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    teamBlock: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    teamBlockAway: {
      justifyContent: 'flex-end',
      textAlign: 'right',
    },
    teamLogo: {
      width: 28,
      height: 28,
    },
    teamName: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '600',
      flex: 1,
    },
    teamNameAway: {
      textAlign: 'right',
    },
    scoreBlock: {
      width: 60,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceElevated,
      paddingVertical: 6,
      borderRadius: 8,
      marginHorizontal: 12,
    },
    scoreText: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '900',
      letterSpacing: 2,
    },
    footerLoader: {
      paddingVertical: 16,
      alignItems: 'center',
    },
  });
}
