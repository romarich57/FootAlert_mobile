import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      paddingHorizontal: 24,
      gap: 12,
    },
    title: {
      color: colors.text,
      fontSize: 32,
      textAlign: 'center',
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 15,
      textAlign: 'center',
    },
  });
}

export function SectionInProgressView() {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('placeholders.inProgress')}</Text>
      <Text style={styles.subtitle}>{t('placeholders.inProgressSubtitle')}</Text>
    </View>
  );
}
