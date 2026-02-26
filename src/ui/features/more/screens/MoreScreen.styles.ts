import { StyleSheet } from 'react-native';

import type { ThemeColors } from '@ui/shared/theme/theme';

export function createMoreScreenStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listContent: {
      gap: 22,
      paddingBottom: 26,
    },
    listHeaderSpacer: {
      height: 16,
    },
    title: {
      color: colors.text,
      fontSize: 34,
      fontWeight: '800',
      letterSpacing: -1,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 24,
    },
    loadingWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    loadingText: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '500',
    },
    warningCard: {
      marginHorizontal: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.warning,
      backgroundColor: 'rgba(245,158,11,0.12)',
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 8,
    },
    warningText: {
      color: colors.text,
      fontSize: 13,
      lineHeight: 18,
    },
    warningActionText: {
      color: colors.warning,
      fontSize: 13,
      fontWeight: '700',
    },
  });
}

export type MoreScreenStyles = ReturnType<typeof createMoreScreenStyles>;
