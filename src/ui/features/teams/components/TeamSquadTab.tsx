import { memo, useCallback, useMemo } from 'react';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { TabContentSkeleton } from '@ui/shared/components';
import type {
  TeamSquadData,
  TeamSquadPlayer,
  TeamSquadRole,
} from '@ui/features/teams/types/teams.types';
import { toDisplayNumber, toDisplayValue } from '@ui/features/teams/utils/teamDisplay';
import type { ThemeColors } from '@ui/shared/theme/theme';

type TeamSquadTabProps = {
  data: TeamSquadData | undefined;
  isLoading: boolean;
  isError: boolean;
  hasFetched?: boolean;
  onRetry: () => void;
};

type SquadFeedItem =
  | {
    type: 'header';
    key: string;
    title: string;
  }
  | {
    type: 'player';
    key: string;
    player: Partial<TeamSquadPlayer>;
  };

const ROLE_ORDER: Array<TeamSquadRole> = [
  'coach',
  'goalkeepers',
  'defenders',
  'midfielders',
  'attackers',
  'other',
];

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
    loadingIndicator: {
      alignSelf: 'center',
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
    groupHeader: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
      marginTop: 18,
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerAge: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
      paddingHorizontal: 4,
    },
    playerCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
      gap: 10,
    },
    playerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 12,
    },
    playerPhotoContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    playerPhoto: {
      width: '100%',
      height: '100%',
    },
    playerNumber: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    playerName: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    playerAge: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
      minWidth: 40,
      textAlign: 'right',
    },
  });
}
function buildFeedItems(
  squadData: TeamSquadData | undefined,
  labels: Record<TeamSquadRole, string>,
): SquadFeedItem[] {
  if (!squadData) return [];

  const grouped = new Map<TeamSquadRole, Partial<TeamSquadPlayer>[]>();
  ROLE_ORDER.forEach(role => grouped.set(role, []));

  squadData.players.forEach(player => {
    grouped.get(player.role)?.push(player);
  });

  if (squadData.coach) {
    grouped.get('coach')?.push({
      playerId: squadData.coach.id ?? 'coach',
      name: squadData.coach.name,
      photo: squadData.coach.photo,
      age: squadData.coach.age,
      role: 'coach',
    });
  }

  return ROLE_ORDER.flatMap(role => {
    const rolePlayers = grouped.get(role) ?? [];
    if (rolePlayers.length === 0) {
      return [];
    }

    const header: SquadFeedItem = {
      type: 'header',
      key: `header-${role}`,
      title: labels[role],
    };

    const rows: SquadFeedItem[] = rolePlayers.map(player => ({
      type: 'player',
      key: `player-${role}-${player.playerId}`,
      player,
    }));

    return [header, ...rows];
  });
}

const SquadPlayerRow = memo(function SquadPlayerRow({
  player,
  styles,
}: {
  player: Partial<TeamSquadPlayer>;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.playerCard}>
      <View style={styles.playerLeft}>
        <View style={styles.playerPhotoContainer}>
          {player.photo ? (
            <Image source={{ uri: player.photo }} style={styles.playerPhoto} resizeMode="cover" />
          ) : (
            <MaterialCommunityIcons name="account" size={24} color={styles.playerNumber.color} />
          )}
        </View>
        <Text numberOfLines={1} style={styles.playerName}>
          {player.number ? <Text style={styles.playerNumber}>{player.number} </Text> : null}
          {toDisplayValue(player.name)}
        </Text>
      </View>
      <Text style={styles.playerAge}>
        {toDisplayNumber(player.age)}
      </Text>
    </View>
  );
});

export function TeamSquadTab({
  data,
  isLoading,
  isError,
  hasFetched = true,
  onRetry,
}: TeamSquadTabProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const roleLabels = useMemo(
    () => ({
      coach: t('teamDetails.squad.coach'),
      goalkeepers: t('teamDetails.squad.roles.goalkeepers'),
      defenders: t('teamDetails.squad.roles.defenders'),
      midfielders: t('teamDetails.squad.roles.midfielders'),
      attackers: t('teamDetails.squad.roles.attackers'),
      other: t('teamDetails.squad.roles.other'),
    }),
    [t],
  );

  const feedItems = useMemo(
    () =>
      buildFeedItems(
        data,
        roleLabels,
      ),
    [data, roleLabels],
  );
  const keyExtractor = useCallback((item: SquadFeedItem) => item.key, []);
  const hasRows = feedItems.length > 0;
  const shouldShowLoadingState = (isLoading || !hasFetched) && !hasRows;
  const shouldShowErrorState = isError && !hasRows;

  const renderItem = useCallback<ListRenderItem<SquadFeedItem>>(
    ({ item }) => {
      if (item.type === 'header') {
        return (
          <View style={styles.headerRow}>
            <Text style={styles.groupHeader}>{item.title}</Text>
            <Text style={styles.headerAge}>{t('teamDetails.labels.age')}</Text>
          </View>
        );
      }

      return (
        <SquadPlayerRow
          player={item.player}
          styles={styles}
        />
      );
    },
    [styles, t],
  );

  return (
    <View style={styles.container}>

      {shouldShowLoadingState ? (
        <TabContentSkeleton />
      ) : null}

      {shouldShowErrorState ? (
        <View style={styles.stateCard}>
          <Text style={styles.stateText}>{t('teamDetails.states.error')}</Text>
          <Pressable onPress={onRetry}>
            <Text style={styles.retryText}>{t('actions.retry')}</Text>
          </Pressable>
        </View>
      ) : null}

      {!shouldShowLoadingState && !shouldShowErrorState ? (
        <FlashList
          data={feedItems}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          estimatedItemSize={72}
          ListEmptyComponent={
            hasFetched ? <Text style={styles.stateText}>{t('teamDetails.states.empty')}</Text> : null
          }
        />
      ) : null}
    </View>
  );
}
