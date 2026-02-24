import { memo, useCallback, useMemo } from 'react';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { TeamStatsData, TeamTopPlayer } from '@ui/features/teams/types/teams.types';
import { toDisplayNumber, toDisplayValue } from '@ui/features/teams/utils/teamDisplay';
import type { ThemeColors } from '@ui/shared/theme/theme';
import { localizePlayerPosition } from '@ui/shared/i18n/playerPosition';

type TeamStatsTabProps = {
  data: TeamStatsData | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onPressPlayer: (playerId: string) => void;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 16,
      paddingBottom: 24,
      gap: 12,
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
    card: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14,
      gap: 10,
    },
    cardTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '900',
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    rowLabel: {
      color: colors.textMuted,
      fontSize: 15,
      fontWeight: '700',
      flex: 1,
    },
    rowValue: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
    },
    barsWrap: {
      gap: 12,
    },
    barRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    barLabel: {
      width: 66,
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '700',
    },
    barTrack: {
      flex: 1,
      height: 10,
      borderRadius: 999,
      backgroundColor: colors.surfaceElevated,
      overflow: 'hidden',
    },
    barFill: {
      height: 10,
      borderRadius: 999,
      backgroundColor: colors.primary,
    },
    barValue: {
      width: 42,
      textAlign: 'right',
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    playersTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '900',
      marginTop: 6,
    },
    playerCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      marginBottom: 10,
    },
    playerName: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
      flex: 1,
    },
    playerMeta: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
    },
    playerIdentity: {
      flex: 1,
      gap: 2,
    },
    playerRight: {
      alignItems: 'flex-end',
      minWidth: 120,
      gap: 2,
    },
    playerRightText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
  });
}

function formatGoalBreakdown(data: TeamStatsData | undefined) {
  const items = data?.goalBreakdown ?? [];
  const maxValue = Math.max(1, ...items.map(item => item.value ?? 0));

  return items.map(item => ({
    ...item,
    ratio: (item.value ?? 0) / maxValue,
  }));
}

function renderPlayerMeta(player: TeamTopPlayer): string {
  const goals = toDisplayNumber(player.goals);
  const assists = toDisplayNumber(player.assists);
  return `${goals} G · ${assists} A`;
}

type TeamTopPlayerRowProps = {
  player: TeamTopPlayer;
  onPressPlayer: (playerId: string) => void;
  ratingLabel: string;
  positionLabel: string;
  styles: ReturnType<typeof createStyles>;
};

const TeamTopPlayerRow = memo(function TeamTopPlayerRow({
  player,
  onPressPlayer,
  ratingLabel,
  positionLabel,
  styles,
}: TeamTopPlayerRowProps) {
  return (
    <Pressable
      onPress={() => onPressPlayer(player.playerId)}
      style={styles.playerCard}
    >
      <View style={styles.playerIdentity}>
        <Text numberOfLines={1} style={styles.playerName}>
          {toDisplayValue(player.name)}
        </Text>
        <Text style={styles.playerMeta}>{positionLabel}</Text>
      </View>

      <View style={styles.playerRight}>
        <Text style={styles.playerRightText}>{renderPlayerMeta(player)}</Text>
        <Text style={styles.playerMeta}>
          {ratingLabel}: {toDisplayValue(player.rating)}
        </Text>
      </View>
    </Pressable>
  );
});

export function TeamStatsTab({ data, isLoading, isError, onRetry, onPressPlayer }: TeamStatsTabProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const goalBreakdown = useMemo(() => formatGoalBreakdown(data), [data]);
  const topPlayers = useMemo(() => data?.topPlayers ?? [], [data?.topPlayers]);
  const ratingLabel = t('teamDetails.labels.rating');
  const localizePositionLabel = useCallback(
    (value: string | null | undefined) => localizePlayerPosition(value, t),
    [t],
  );

  const renderTopPlayerItem = useCallback<ListRenderItem<TeamTopPlayer>>(
    ({ item }) => (
      <TeamTopPlayerRow
        player={item}
        onPressPlayer={onPressPlayer}
        ratingLabel={ratingLabel}
        positionLabel={localizePositionLabel(item.position)}
        styles={styles}
      />
    ),
    [localizePositionLabel, onPressPlayer, ratingLabel, styles],
  );

  return (
    <View style={styles.container}>
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
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('teamDetails.stats.pointsCard')}</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('teamDetails.labels.rank')}</Text>
              <Text style={styles.rowValue}>{toDisplayNumber(data?.rank)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('teamDetails.labels.points')}</Text>
              <Text style={styles.rowValue}>{toDisplayNumber(data?.points)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('teamDetails.labels.played')}</Text>
              <Text style={styles.rowValue}>{toDisplayNumber(data?.played)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('teamDetails.labels.goalsForAgainst')}</Text>
              <Text style={styles.rowValue}>
                {toDisplayNumber(data?.goalsFor)}-{toDisplayNumber(data?.goalsAgainst)}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('teamDetails.stats.goalsBreakdown')}</Text>
            <View style={styles.barsWrap}>
              {goalBreakdown.length > 0 ? (
                goalBreakdown.map(item => (
                  <View key={item.key} style={styles.barRow}>
                    <Text style={styles.barLabel}>{toDisplayValue(item.label)}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${Math.max(0, Math.min(100, item.ratio * 100))}%` }]} />
                    </View>
                    <Text style={styles.barValue}>{toDisplayNumber(item.value)}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.stateText}>{t('teamDetails.states.empty')}</Text>
              )}
            </View>
          </View>

          <Text style={styles.playersTitle}>{t('teamDetails.stats.topPlayers')}</Text>

          <FlashList
            data={topPlayers}
            keyExtractor={item => item.playerId}
            renderItem={renderTopPlayerItem}
            // @ts-ignore FlashList runtime supports estimatedItemSize.
            estimatedItemSize={116}
            ListEmptyComponent={<Text style={styles.stateText}>{t('teamDetails.states.empty')}</Text>}
          />
        </>
      ) : null}
    </View>
  );
}
