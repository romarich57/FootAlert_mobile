import { StyleSheet } from 'react-native';

import { MIN_TOUCH_TARGET, type ThemeColors } from '@ui/shared/theme/theme';

export function createSearchResultsListStyles(colors: ThemeColors) {
  return StyleSheet.create({
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 32,
      gap: 10,
    },
    sectionHeader: {
      paddingTop: 8,
      paddingBottom: 6,
    },
    sectionHeaderText: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    resultCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      minHeight: MIN_TOUCH_TARGET,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    logoWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    logo: {
      width: 22,
      height: 22,
    },
    textWrap: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    title: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '500',
    },
    stateContainer: {
      paddingHorizontal: 16,
      paddingVertical: 16,
      gap: 10,
    },
    stateText: {
      color: colors.textMuted,
      fontSize: 15,
      fontWeight: '500',
    },
    retryButton: {
      alignSelf: 'flex-start',
      minHeight: MIN_TOUCH_TARGET,
      justifyContent: 'center',
    },
    retryText: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: '700',
    },
  });
}
