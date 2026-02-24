import { memo, useCallback, useMemo, useState } from 'react';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
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

type TeamTransferItem = NonNullable<TeamTransfersData['arrivals']>[number];

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
      alignItems: 'center',
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 10,
    },
    transferPhotoContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.surfaceElevated,
      overflow: 'hidden',
    },
    transferPhoto: {
      width: '100%',
      height: '100%',
    },
    transferFallbackIcon: {
      margin: 10,
    },
    transferPlayerInfo: {
      flex: 1,
    },
    transferPlayer: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    transferDate: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '500',
      marginTop: 2,
    },
    transferTeamsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginVertical: 4,
      backgroundColor: 'rgba(255,255,255,0.02)',
      borderRadius: 12,
      padding: 12,
    },
    transferTeamCol: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
    },
    teamLogoContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    teamLogo: {
      width: 24,
      height: 24,
    },
    transferTeamText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'center',
    },
    transferArrow: {
      marginHorizontal: 12,
      opacity: 0.5,
    },
    transferMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    transferMeta: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '500',
    },
    transferMetaValue: {
      color: colors.text,
      fontWeight: '700',
      fontSize: 13,
    },
  });
}

type TeamTransferRowProps = {
  item: TeamTransferItem;
  transferTypeLabel: string;
  styles: ReturnType<typeof createStyles>;
};

const TeamTransferRow = memo(function TeamTransferRow({
  item,
  transferTypeLabel,
  styles,
}: TeamTransferRowProps) {
  return (
    <View style={styles.transferCard}>
      <View style={styles.transferTopRow}>
        <View style={styles.transferPhotoContainer}>
          {item.playerPhoto ? (
            <Image source={{ uri: item.playerPhoto }} style={styles.transferPhoto} resizeMode="cover" />
          ) : (
            <MaterialCommunityIcons
              name="account"
              size={24}
              color={styles.transferMeta.color}
              style={styles.transferFallbackIcon}
            />
          )}
        </View>
        <View style={styles.transferPlayerInfo}>
          <Text numberOfLines={1} style={styles.transferPlayer}>
            {toDisplayValue(item.playerName)}
          </Text>
          <Text style={styles.transferDate}>{toDisplayDate(item.date)}</Text>
        </View>
      </View>

      <View style={styles.transferTeamsRow}>
        <View style={styles.transferTeamCol}>
          <View style={styles.teamLogoContainer}>
            {item.fromTeamLogo ? (
              <Image source={{ uri: item.fromTeamLogo }} style={styles.teamLogo} resizeMode="contain" />
            ) : null}
          </View>
          <Text numberOfLines={2} style={styles.transferTeamText}>
            {toDisplayValue(item.fromTeamName)}
          </Text>
        </View>

        <MaterialCommunityIcons name="arrow-right-bold" size={20} color={styles.transferMeta.color} style={styles.transferArrow} />

        <View style={styles.transferTeamCol}>
          <View style={styles.teamLogoContainer}>
            {item.toTeamLogo ? (
              <Image source={{ uri: item.toTeamLogo }} style={styles.teamLogo} resizeMode="contain" />
            ) : null}
          </View>
          <Text numberOfLines={2} style={styles.transferTeamText}>
            {toDisplayValue(item.toTeamName)}
          </Text>
        </View>
      </View>

      <View style={styles.transferMetaRow}>
        <Text style={styles.transferMeta}>
          {transferTypeLabel}: <Text style={styles.transferMetaValue}>{toDisplayValue(item.type)}</Text>
        </Text>
      </View>
    </View>
  );
});

export function TeamTransfersTab({ data, isLoading, isError, onRetry }: TeamTransfersTabProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [direction, setDirection] = useState<TeamTransferDirection>('arrival');

  const list = direction === 'arrival' ? data?.arrivals ?? [] : data?.departures ?? [];
  const transferTypeLabel = t('teamDetails.labels.transferType');

  const renderTransferItem = useCallback<ListRenderItem<TeamTransferItem>>(
    ({ item }) => (
      <TeamTransferRow
        item={item}
        transferTypeLabel={transferTypeLabel}
        styles={styles}
      />
    ),
    [styles, transferTypeLabel],
  );

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
          renderItem={renderTransferItem}
          // @ts-ignore
          estimatedItemSize={140}
          ListEmptyComponent={<Text style={styles.stateText}>{t('teamDetails.states.empty')}</Text>}
        />
      ) : null}
    </View>
  );
}
