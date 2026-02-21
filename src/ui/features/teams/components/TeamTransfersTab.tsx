import { useMemo, useState } from 'react';
import { FlashList } from '@shopify/flash-list';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { TeamTransferDirection, TeamTransfersData } from '@ui/features/teams/types/teams.types';
import { toDisplayDate, toDisplayValue } from '@ui/features/teams/utils/teamDisplay';
import type { ThemeColors } from '@ui/shared/theme/theme';

type TeamTransfersTabProps = {
  data: TeamTransfersData | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 16,
      paddingBottom: 24,
      gap: 10,
    },
    stateCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 8,
      marginTop: 12,
    },
    stateText: {
      color: colors.textMuted,
      fontSize: 15,
      fontWeight: '600',
    },
    retryText: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: '700',
    },
    toggleWrap: {
      marginTop: 12,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.chipBorder,
      padding: 4,
      flexDirection: 'row',
      backgroundColor: colors.chipBackground,
      gap: 4,
    },
    toggleButton: {
      flex: 1,
      minHeight: 40,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    toggleButtonActive: {
      backgroundColor: 'rgba(21,248,106,0.2)',
      borderWidth: 1,
      borderColor: colors.primary,
    },
    toggleText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    toggleTextActive: {
      color: colors.primary,
    },
    transferCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 12,
      gap: 8,
      marginTop: 10,
    },
    transferTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
    },
    transferPlayer: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
      flex: 1,
    },
    transferDate: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '500',
    },
    transferLine: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    transferMeta: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '500',
    },
  });
}

export function TeamTransfersTab({ data, isLoading, isError, onRetry }: TeamTransfersTabProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [direction, setDirection] = useState<TeamTransferDirection>('arrival');

  const list = direction === 'arrival' ? data?.arrivals ?? [] : data?.departures ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.toggleWrap}>
        {(['arrival', 'departure'] as TeamTransferDirection[]).map(value => {
          const isActive = direction === value;
          const label =
            value === 'arrival'
              ? t('teamDetails.transfers.arrivals')
              : t('teamDetails.transfers.departures');

          return (
            <Pressable
              key={value}
              onPress={() => setDirection(value)}
              style={[styles.toggleButton, isActive ? styles.toggleButtonActive : null]}
            >
              <Text style={[styles.toggleText, isActive ? styles.toggleTextActive : null]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <View style={styles.stateCard}>
          <Text style={styles.stateText}>{t('teamDetails.states.loading')}</Text>
        </View>
      ) : null}

      {isError ? (
        <View style={styles.stateCard}>
          <Text style={styles.stateText}>{t('teamDetails.states.error')}</Text>
          <Pressable onPress={onRetry}>
            <Text style={styles.retryText}>{t('actions.retry')}</Text>
          </Pressable>
        </View>
      ) : null}

      {!isLoading && !isError ? (
        <FlashList
          data={list}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.transferCard}>
              <View style={styles.transferTopRow}>
                <Text numberOfLines={1} style={styles.transferPlayer}>
                  {toDisplayValue(item.playerName)}
                </Text>
                <Text style={styles.transferDate}>{toDisplayDate(item.date)}</Text>
              </View>

              <Text numberOfLines={1} style={styles.transferLine}>
                {toDisplayValue(item.fromTeamName)} → {toDisplayValue(item.toTeamName)}
              </Text>

              <Text style={styles.transferMeta}>
                {t('teamDetails.labels.transferType')}: {toDisplayValue(item.type)}
              </Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.stateText}>{t('teamDetails.states.empty')}</Text>}
        />
      ) : null}
    </View>
  );
}
