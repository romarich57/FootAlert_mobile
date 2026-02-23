import { memo, useCallback, useMemo, useState } from 'react';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type {
  TeamSquadData,
  TeamSquadPlayer,
  TeamSquadRole,
} from '@ui/features/teams/types/teams.types';
import { toDisplayNumber, toDisplayValue } from '@ui/features/teams/utils/teamDisplay';
import type { ThemeColors } from '@ui/shared/theme/theme';
import { localizePlayerPosition } from '@ui/shared/i18n/playerPosition';

type TeamSquadTabProps = {
  data: TeamSquadData | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
};

type SquadFilter = 'all' | Exclude<TeamSquadRole, 'coach'>;

type SquadFeedItem =
  | {
    type: 'header';
    key: string;
    title: string;
  }
  | {
    type: 'player';
    key: string;
    player: TeamSquadPlayer;
  };

const ROLE_ORDER: Array<Exclude<TeamSquadRole, 'coach'>> = [
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
    searchInput: {
      marginTop: 12,
      minHeight: 44,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.chipBorder,
      backgroundColor: colors.surface,
      color: colors.text,
      fontSize: 16,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    filtersRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
      flexWrap: 'wrap',
    },
    chip: {
      minHeight: 40,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.chipBorder,
      backgroundColor: colors.chipBackground,
      justifyContent: 'center',
      paddingHorizontal: 12,
    },
    chipActive: {
      borderColor: colors.primary,
      backgroundColor: 'rgba(21,248,106,0.18)',
    },
    chipText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    chipTextActive: {
      color: colors.primary,
    },
    coachCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 12,
      gap: 4,
      marginTop: 6,
    },
    coachTitle: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    coachName: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '900',
    },
    coachMeta: {
      color: colors.textMuted,
      fontSize: 15,
      fontWeight: '600',
    },
    groupHeader: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '900',
      marginTop: 12,
      marginBottom: 6,
      textTransform: 'uppercase',
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
      gap: 10,
    },
    playerIdentity: {
      flex: 1,
    },
    playerNumber: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '700',
      width: 26,
    },
    playerName: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
      flex: 1,
    },
    playerPosition: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    playerAge: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
      minWidth: 50,
      textAlign: 'right',
    },
  });
}

function matchesSearch(
  player: TeamSquadPlayer,
  query: string,
  localizePositionLabel: (value: string | null | undefined) => string,
): boolean {
  if (!query) {
    return true;
  }

  const normalizedQuery = query.toLowerCase();
  const fields = [player.name ?? '', player.position ?? '', localizePositionLabel(player.position)];

  return fields.some(field => field.toLowerCase().includes(normalizedQuery));
}

function buildFeedItems(
  players: TeamSquadPlayer[],
  filter: SquadFilter,
  query: string,
  labels: Record<Exclude<TeamSquadRole, 'coach'>, string>,
  localizePositionLabel: (value: string | null | undefined) => string,
): SquadFeedItem[] {
  const filteredByRole =
    filter === 'all'
      ? players
      : players.filter(player => player.role === filter);

  const filteredBySearch = filteredByRole.filter(player =>
    matchesSearch(player, query, localizePositionLabel),
  );

  const grouped = new Map<Exclude<TeamSquadRole, 'coach'>, TeamSquadPlayer[]>();

  ROLE_ORDER.forEach(role => {
    grouped.set(role, filteredBySearch.filter(player => player.role === role));
  });

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
      key: `player-${player.playerId}`,
      player,
    }));

    return [header, ...rows];
  });
}

const SquadPlayerRow = memo(function SquadPlayerRow({
  player,
  yearsSuffixLabel,
  positionLabel,
  styles,
}: {
  player: TeamSquadPlayer;
  yearsSuffixLabel: string;
  positionLabel: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.playerCard}>
      <View style={styles.playerLeft}>
        <Text style={styles.playerNumber}>{toDisplayNumber(player.number)}</Text>
        <View style={styles.playerIdentity}>
          <Text numberOfLines={1} style={styles.playerName}>
            {toDisplayValue(player.name)}
          </Text>
          <Text style={styles.playerPosition}>{positionLabel}</Text>
        </View>
      </View>
      <Text style={styles.playerAge}>
        {toDisplayNumber(player.age)} {yearsSuffixLabel}
      </Text>
    </View>
  );
});

export function TeamSquadTab({ data, isLoading, isError, onRetry }: TeamSquadTabProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [searchValue, setSearchValue] = useState('');
  const [roleFilter, setRoleFilter] = useState<SquadFilter>('all');
  const localizePositionLabel = useCallback(
    (value: string | null | undefined) => localizePlayerPosition(value, t),
    [t],
  );

  const roleLabels = useMemo(
    () => ({
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
        data?.players ?? [],
        roleFilter,
        searchValue.trim(),
        roleLabels,
        localizePositionLabel,
      ),
    [data?.players, localizePositionLabel, roleFilter, roleLabels, searchValue],
  );
  const keyExtractor = useCallback((item: SquadFeedItem) => item.key, []);

  const renderItem = useCallback<ListRenderItem<SquadFeedItem>>(
    ({ item }) => {
      if (item.type === 'header') {
        return <Text style={styles.groupHeader}>{item.title}</Text>;
      }

      return (
        <SquadPlayerRow
          player={item.player}
          yearsSuffixLabel={t('teamDetails.labels.yearsSuffix')}
          positionLabel={localizePositionLabel(item.player.position)}
          styles={styles}
        />
      );
    },
    [localizePositionLabel, styles, t],
  );

  return (
    <View style={styles.container}>
      <TextInput
        value={searchValue}
        onChangeText={setSearchValue}
        placeholder={t('teamDetails.squad.searchPlaceholder')}
        placeholderTextColor={colors.textMuted}
        style={styles.searchInput}
      />

      <View style={styles.filtersRow}>
        {(['all', ...ROLE_ORDER] as SquadFilter[]).map(filter => {
          const isActive = filter === roleFilter;
          const label =
            filter === 'all'
              ? t('teamDetails.squad.roles.all')
              : roleLabels[filter];

          return (
            <Pressable
              key={filter}
              onPress={() => setRoleFilter(filter)}
              style={[styles.chip, isActive ? styles.chipActive : null]}
            >
              <Text style={[styles.chipText, isActive ? styles.chipTextActive : null]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.coachCard}>
        <Text style={styles.coachTitle}>{t('teamDetails.squad.coach')}</Text>
        <Text style={styles.coachName}>{toDisplayValue(data?.coach?.name)}</Text>
        <Text style={styles.coachMeta}>
          {t('teamDetails.labels.age')}: {toDisplayNumber(data?.coach?.age)}
        </Text>
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
          data={feedItems}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={styles.stateText}>{t('teamDetails.states.empty')}</Text>}
        />
      ) : null}
    </View>
  );
}
