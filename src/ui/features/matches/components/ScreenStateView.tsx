import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';

export type ScreenState = 'loading' | 'empty' | 'error' | 'offline' | 'slow';

type ScreenStateViewProps = {
  state: ScreenState;
  onRetry?: () => void;
  lastUpdatedAt?: string | null;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14,
      gap: 8,
    },
    title: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '500',
    },
    retryButton: {
      alignSelf: 'flex-start',
      marginTop: 4,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: 'rgba(20,225,92,0.12)',
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    retryText: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: 13,
    },
    skeletonGroup: {
      gap: 10,
    },
    skeletonItem: {
      height: 84,
      borderRadius: 16,
      backgroundColor: colors.skeleton,
    },
  });
}

function formatTimestamp(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  return date.toLocaleString();
}

export function ScreenStateView({ state, onRetry, lastUpdatedAt }: ScreenStateViewProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (state === 'loading') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t('matches.states.loading.title')}</Text>
        <Text style={styles.subtitle}>{t('matches.states.loading.message')}</Text>
        <View style={styles.skeletonGroup}>
          <View style={styles.skeletonItem} />
          <View style={styles.skeletonItem} />
          <View style={styles.skeletonItem} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t(`matches.states.${state}.title`)}</Text>
      <Text style={styles.subtitle}>{t(`matches.states.${state}.message`)}</Text>

      {state === 'offline' ? (
        <Text style={styles.subtitle}>
          {t('matches.states.offline.lastUpdate', {
            value: formatTimestamp(lastUpdatedAt),
          })}
        </Text>
      ) : null}

      {state === 'error' && onRetry ? (
        <Pressable onPress={onRetry} style={styles.retryButton}>
          <Text style={styles.retryText}>{t('actions.retry')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
