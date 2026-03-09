import { StyleSheet } from 'react-native';

import type { ThemeColors } from '@ui/shared/theme/theme';

export function createTeamDetailsScreenStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
    },
    stateWrap: {
      padding: 16,
    },
    stateCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 8,
    },
    stateText: {
      color: colors.textMuted,
      fontSize: 15,
      fontWeight: '600',
    },
  });
}
