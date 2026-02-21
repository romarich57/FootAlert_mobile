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
      fontSize: 18,
      fontWeight: '700',
      paddingHorizontal: 20,
    },
    card: {
      marginHorizontal: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      overflow: 'hidden',
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
