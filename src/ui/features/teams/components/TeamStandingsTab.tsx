import { useMemo } from 'react';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { TeamStandingsData, TeamStandingRow } from '@ui/features/teams/types/teams.types';
import { toDisplayNumber, toDisplayValue } from '@ui/features/teams/utils/teamDisplay';
import type { ThemeColors } from '@ui/shared/theme/theme';

type TeamStandingsTabProps = {
  data: TeamStandingsData | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
};

type StandingFeedItem =
  | {
    type: 'header';
    key: string;
    title: string | null;
  }
  | {
    type: 'row';
    key: string;
    row: TeamStandingRow;
  };

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 16,
      paddingBottom: 22,
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
    tableHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 12,
    },
    tableHeaderText: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    rowTarget: {
      backgroundColor: 'rgba(21,248,106,0.13)',
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
    },
    groupHeader: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
      marginTop: 12,
      marginBottom: 6,
    },
    colRank: {
      width: 38,
    },
    colTeam: {
      flex: 1,
      paddingRight: 8,
    },
    colPlayed: {
      width: 48,
      alignItems: 'flex-end',
    },
    colGoalDiff: {
      width: 58,
      alignItems: 'flex-end',
    },
    colPoints: {
      width: 56,
      alignItems: 'flex-end',
    },
    teamText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    cellText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    cellTextBold: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
  });
}

function buildFeedItems(data: TeamStandingsData | undefined): StandingFeedItem[] {
  if (!data) {
    return [];
  }

  return data.groups.flatMap((group, groupIndex) => {
    const header: StandingFeedItem = {
      type: 'header',
      key: `group-${groupIndex}`,
      title: group.groupName,
    };

    const rows = group.rows.map<StandingFeedItem>((row, rowIndex) => ({
      type: 'row',
      key: `group-${groupIndex}-row-${rowIndex}-${row.teamId ?? 'unknown'}`,
      row,
    }));

    return [header, ...rows];
  });
}

export function TeamStandingsTab({ data, isLoading, isError, onRetry }: TeamStandingsTabProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const feedItems = useMemo(() => buildFeedItems(data), [data]);

  const renderItem: ListRenderItem<StandingFeedItem> = ({ item }) => {
    if (item.type === 'header') {
      return <Text style={styles.groupHeader}>{toDisplayValue(item.title)}</Text>;
    }

    return (
      <View style={[styles.row, item.row.isTargetTeam ? styles.rowTarget : null]}>
        <View style={styles.colRank}>
          <Text style={styles.cellText}>{toDisplayNumber(item.row.rank)}</Text>
        </View>
        <View style={styles.colTeam}>
          <Text numberOfLines={1} style={styles.teamText}>
            {toDisplayValue(item.row.teamName)}
          </Text>
        </View>
        <View style={styles.colPlayed}>
          <Text style={styles.cellText}>{toDisplayNumber(item.row.played)}</Text>
        </View>
        <View style={styles.colGoalDiff}>
          <Text style={styles.cellText}>{toDisplayNumber(item.row.goalDiff)}</Text>
        </View>
        <View style={styles.colPoints}>
          <Text style={styles.cellTextBold}>{toDisplayNumber(item.row.points)}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.tableHeader}>
        <View style={styles.colRank}>
          <Text style={styles.tableHeaderText}>#</Text>
        </View>
        <View style={styles.colTeam}>
          <Text style={styles.tableHeaderText}>{t('teamDetails.labels.team')}</Text>
        </View>
        <View style={styles.colPlayed}>
          <Text style={styles.tableHeaderText}>J</Text>
        </View>
        <View style={styles.colGoalDiff}>
          <Text style={styles.tableHeaderText}>DB</Text>
        </View>
        <View style={styles.colPoints}>
          <Text style={styles.tableHeaderText}>{t('teamDetails.labels.points')}</Text>
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
          data={feedItems}
          renderItem={renderItem}
          keyExtractor={item => item.key}
          ListEmptyComponent={<Text style={styles.stateText}>{t('teamDetails.states.empty')}</Text>}
        />
      ) : null}
    </View>
  );
}
