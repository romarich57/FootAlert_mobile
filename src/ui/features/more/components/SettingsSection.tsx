import { useMemo, type PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';

type SettingsSectionProps = PropsWithChildren<{
  title: string;
}>;

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      gap: 10,
    },
    title: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '800',
      paddingHorizontal: 16,
      marginBottom: 4,
    },
    card: {
      marginHorizontal: 16,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.cardBackground,
      overflow: 'hidden',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
  });
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}
