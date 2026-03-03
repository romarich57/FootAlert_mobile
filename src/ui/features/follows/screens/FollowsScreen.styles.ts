import { StyleSheet } from 'react-native';

import type { ThemeColors } from '@ui/shared/theme/theme';
import { MIN_TOUCH_TARGET } from '@ui/shared/theme/theme';

export function createFollowsScreenStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listContent: {
      paddingBottom: 28,
    },
    trendsSection: {
      paddingHorizontal: 20,
      paddingTop: 14,
      gap: 12,
    },
    trendsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 44,
      marginBottom: 4,
    },
    trendsTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '800',
    },
    trendsActionText: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: '600',
    },
    trendsActionButton: {
      minHeight: MIN_TOUCH_TARGET,
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    infoText: {
      color: colors.textMuted,
      fontSize: 18,
      fontWeight: '600',
      paddingHorizontal: 20,
      paddingTop: 8,
    },
    limitError: {
      color: colors.warning,
      fontSize: 16,
      fontWeight: '700',
      paddingHorizontal: 20,
      paddingBottom: 6,
    },
    stateContainer: {
      paddingHorizontal: 20,
      paddingVertical: 24,
    },
    offlineStateContainer: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 8,
    },
    stateText: {
      color: colors.textMuted,
      fontSize: 18,
      fontWeight: '600',
    },
  });
}
