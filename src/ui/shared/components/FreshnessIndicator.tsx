import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';

type FreshnessIndicatorProps = {
  lastUpdatedAt?: number | string | null;
  isRefreshing?: boolean;
  visible?: boolean;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    text: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
  });
}

function formatRelativeTimestamp(timestamp: number, language: string): string {
  const now = Date.now();
  const diffMs = timestamp - now;
  const diffMinutes = Math.round(diffMs / 60_000);
  const rtf = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });

  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, 'minute');
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, 'hour');
  }

  const diffDays = Math.round(diffHours / 24);
  return rtf.format(diffDays, 'day');
}

export function FreshnessIndicator({
  lastUpdatedAt,
  isRefreshing = false,
  visible = true,
}: FreshnessIndicatorProps) {
  const { colors } = useAppTheme();
  const { i18n, t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const timestamp = useMemo(() => {
    if (typeof lastUpdatedAt === 'number' && Number.isFinite(lastUpdatedAt)) {
      return lastUpdatedAt;
    }

    if (typeof lastUpdatedAt === 'string') {
      const parsed = Date.parse(lastUpdatedAt);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }, [lastUpdatedAt]);

  if (!visible || (!timestamp && !isRefreshing)) {
    return null;
  }

  const label = isRefreshing
    ? t('freshness.refreshing')
    : t('freshness.updated', {
        value: formatRelativeTimestamp(timestamp as number, i18n.resolvedLanguage ?? i18n.language),
      });

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}
