import { StyleSheet } from 'react-native';

import type { ThemeColors } from '@ui/shared/theme/theme';

export function createCompetitionsScreenStyles(colors: ThemeColors, topInset: number) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerSpace: {
      height: topInset,
      backgroundColor: colors.surface,
    },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      color: colors.text,
      fontSize: 28,
      fontWeight: '800',
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceElevated,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 48,
      marginHorizontal: 16,
      marginTop: 8,
      marginBottom: 12,
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: 16,
      marginLeft: 8,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
      marginTop: 8,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '700',
    },
    editButtonText: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: '600',
    },
    sectionContent: {
      paddingBottom: 16,
      backgroundColor: colors.surface,
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 14,
      textAlign: 'center',
      padding: 16,
    },
    loadingText: {
      color: colors.textMuted,
      fontSize: 14,
      textAlign: 'center',
      marginTop: 16,
    },
    loadingContainer: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    stateWrap: {
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    listContent: {
      paddingBottom: 64,
    },
    countryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    countryFlagContainer: {
      width: 24,
      height: 24,
      marginRight: 12,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: colors.surfaceElevated,
      justifyContent: 'center',
      alignItems: 'center',
    },
    countryFlag: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    countryName: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
      flex: 1,
    },
  });
}
