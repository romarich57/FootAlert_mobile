import type { TFunction } from 'i18next';
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

type RelativeTimeUnit = 'minute' | 'hour' | 'day';

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

function resolveRelativeTime(timestamp: number): {
  value: number;
  unit: RelativeTimeUnit;
} {
  const now = Date.now();
  const diffMs = timestamp - now;
  const diffMinutes = Math.round(diffMs / 60_000);

  if (Math.abs(diffMinutes) < 60) {
    return {
      value: diffMinutes,
      unit: 'minute',
    };
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return {
      value: diffHours,
      unit: 'hour',
    };
  }

  return {
    value: Math.round(diffHours / 24),
    unit: 'day',
  };
}

function normalizeRelativeTimeLanguage(language: string): 'en' | 'fr' {
  return language.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

function formatRelativeTimestampFallback(
  value: number,
  unit: RelativeTimeUnit,
  t: TFunction,
): string {
  if (value === 0) {
    return t('freshness.relative.now');
  }

  const direction = value < 0 ? 'past' : 'future';
  return t(`freshness.relative.${direction}.${unit}`, {
    count: Math.abs(value),
  });
}

function formatRelativeTimestamp(timestamp: number, language: string, t: TFunction): string {
  const { value, unit } = resolveRelativeTime(timestamp);
  const normalizedLanguage = normalizeRelativeTimeLanguage(language);

  if (typeof Intl.RelativeTimeFormat === 'function') {
    return new Intl.RelativeTimeFormat(normalizedLanguage, { numeric: 'auto' }).format(value, unit);
  }

  return formatRelativeTimestampFallback(value, unit, t);
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

  const relativeTime = useMemo(() => {
    if (!timestamp) {
      return null;
    }

    return resolveRelativeTime(timestamp);
  }, [timestamp]);

  if (!visible || (!timestamp && !isRefreshing)) {
    return null;
  }

  if (!isRefreshing && relativeTime?.value === 0) {
    return null;
  }

  const label = isRefreshing
    ? t('freshness.refreshing')
    : t('freshness.updated', {
        value: formatRelativeTimestamp(
          timestamp as number,
          i18n.resolvedLanguage ?? i18n.language,
          t,
        ),
      });

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}
