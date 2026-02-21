import { useMemo } from 'react';
import { FlashList } from '@shopify/flash-list';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { TeamTrophiesData } from '@ui/features/teams/types/teams.types';
import { toDisplayNumber, toDisplayValue } from '@ui/features/teams/utils/teamDisplay';
import type { ThemeColors } from '@ui/shared/theme/theme';

type TeamTrophiesTabProps = {
  data: TeamTrophiesData | undefined;
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
    summaryCard: {
      marginTop: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14,
      gap: 10,
    },
    summaryTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '900',
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    summaryLabel: {
      color: colors.textMuted,
      fontSize: 16,
      fontWeight: '700',
    },
    summaryValue: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '900',
    },
    groupCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 12,
      marginTop: 10,
      gap: 8,
    },
    groupTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
    },
    groupMeta: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
    },
    seasonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    seasonText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
      flex: 1,
    },
    placeText: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
  });
}

export function TeamTrophiesTab({ data, isLoading, isError, onRetry }: TeamTrophiesTabProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>{t('teamDetails.trophies.title')}</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t('teamDetails.labels.totalTrophies')}</Text>
          <Text style={styles.summaryValue}>{toDisplayNumber(data?.total)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t('teamDetails.labels.totalWins')}</Text>
          <Text style={styles.summaryValue}>{toDisplayNumber(data?.totalWins)}</Text>
        </View>
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
          data={data?.groups ?? []}
          keyExtractor={item => `${item.competition}-${item.country ?? 'country'}`}
          renderItem={({ item }) => (
            <View style={styles.groupCard}>
              <Text style={styles.groupTitle}>{toDisplayValue(item.competition)}</Text>
              <Text style={styles.groupMeta}>
                {toDisplayValue(item.country)} • {t('teamDetails.labels.totalWins')}: {toDisplayNumber(item.winsCount)}
              </Text>

              {item.items.map(trophy => (
                <View key={trophy.id} style={styles.seasonRow}>
                  <Text style={styles.seasonText}>{toDisplayValue(trophy.season)}</Text>
                  <Text style={styles.placeText}>{toDisplayValue(trophy.place)}</Text>
                </View>
              ))}
            </View>
          )}
          ListEmptyComponent={<Text style={styles.stateText}>{t('teamDetails.states.empty')}</Text>}
        />
      ) : null}
    </View>
  );
}
