import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';
import type { SectionInProgressViewProps } from '@ui/shared/components/SectionInProgressView.types';

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

export function SectionInProgressView({
  title,
  subtitle,
  testID = 'section-in-progress-view',
  titleTestID = 'section-in-progress-title',
  subtitleTestID = 'section-in-progress-subtitle',
  accessibilityLabel,
}: SectionInProgressViewProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const resolvedTitle = title ?? t('placeholders.inProgress');
  const resolvedSubtitle = subtitle ?? t('placeholders.inProgressSubtitle');
  const resolvedAccessibilityLabel =
    accessibilityLabel ?? `${resolvedTitle}. ${resolvedSubtitle}`;

  return (
    <View
      accessible
      accessibilityLabel={resolvedAccessibilityLabel}
      style={styles.container}
      testID={testID}
    >
      <Text style={styles.title} testID={titleTestID}>
        {resolvedTitle}
      </Text>
      <Text style={styles.subtitle} testID={subtitleTestID}>
        {resolvedSubtitle}
      </Text>
    </View>
  );
}
