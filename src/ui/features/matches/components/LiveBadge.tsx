import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';

type LiveBadgeProps = {
  minute: number | null;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    badge: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderRadius: 999,
      borderColor: colors.primary,
      backgroundColor: 'rgba(20, 225, 92, 0.08)',
      paddingVertical: 3,
      paddingHorizontal: 8,
      gap: 6,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOpacity: 1,
      shadowRadius: 4,
      elevation: 4,
    },
    text: {
      color: colors.primary,
      fontSize: 10,
      fontWeight: '900',
      textTransform: 'uppercase',
    },
  });
}

export function LiveBadge({ minute }: LiveBadgeProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const liveLabel = minute ? `${t('matches.liveLabel')} ${minute}'` : t('matches.liveLabel');

  return (
    <View style={styles.badge}>
      <View style={styles.dot} />
      <Text style={styles.text}>{liveLabel}</Text>
    </View>
  );
}
