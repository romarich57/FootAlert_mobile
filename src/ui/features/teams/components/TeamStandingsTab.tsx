import { memo, useCallback, useMemo, useState } from 'react';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { TeamStandingsData, TeamStandingRow, TeamStandingStats } from '@ui/features/teams/types/teams.types';
import { toDisplayNumber, toDisplayValue } from '@ui/features/teams/utils/teamDisplay';
import type { ThemeColors } from '@ui/shared/theme/theme';

type TeamStandingsTabProps = {
  data: TeamStandingsData | undefined;
  isLoading: boolean;
  isError: boolean;
  hasFetched?: boolean;
  onRetry: () => void;
};

type StandingFeedItem =
  | {
    type: 'header';
    key: string;
    title: string;
  }
  | {
    type: 'row';
    key: string;
    row: TeamStandingRow;
  };

type DisplayMode = 'simple' | 'detailed' | 'form';
type SubFilter = 'all' | 'home' | 'away';

const FORM_COLORS: Record<string, string> = {
  W: '#15F86A',
  D: '#6B7280',
  L: '#EF4444',
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 16,
      paddingBottom: 22,
      backgroundColor: colors.background,
    },
    listContent: {
      paddingBottom: 8,
    },
    filterBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 8,
      marginBottom: 4,
    },
    modeTabs: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 999,
      padding: 2,
    },
    modeTab: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
    },
    modeTabActive: {
      backgroundColor: colors.surfaceElevated,
    },
    modeTabText: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '700',
    },
    modeTabTextActive: {
      color: colors.text,
    },
    subFilterBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      gap: 4,
    },
    subFilterText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
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
    emptyWrap: {
      paddingTop: 20,
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
      backgroundColor: colors.surfaceElevated,
    },
    tableHeaderText: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    tableHeaderRight: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '500',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
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
      width: 24,
    },
    colTeam: {
      flex: 1,
      paddingRight: 4,
      overflow: 'hidden',
    },
    teamInfoContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    standingTeamLogo: {
      width: 18,
      height: 18,
    },
    colStatSmall: {
      width: 22,
      alignItems: 'center',
    },
    colStatMedium: {
      width: 26,
      alignItems: 'center',
    },
    colStatLarge: {
      width: 38,
      alignItems: 'center',
    },
    colPoints: {
      width: 32,
      alignItems: 'flex-end',
    },
    colForm: {
      width: 140,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 4,
    },
    teamText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    cellText: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    cellTextBold: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
    formBox: {
      width: 22,
      height: 22,
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    formBoxText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '800',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      padding: 24,
    },
    modalContent: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 16,
      overflow: 'hidden',
    },
    modalItem: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalItemText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
  });
}

function buildFeedItems(
  data: TeamStandingsData | undefined,
  subFilter: SubFilter,
  defaultGroupTitle: string,
): StandingFeedItem[] {
  if (!data) return [];
  const headerOccurrences = new Map<string, number>();

  return data.groups.flatMap(group => {
    const groupIdentity = group.groupName ?? defaultGroupTitle;
    const headerOccurrence = (headerOccurrences.get(groupIdentity) ?? 0) + 1;
    headerOccurrences.set(groupIdentity, headerOccurrence);

    const header: StandingFeedItem = {
      type: 'header',
      key: `group-${groupIdentity}-${headerOccurrence}`,
      title: group.groupName?.trim() || defaultGroupTitle,
    };

    let processedRows = group.rows;
    if (subFilter !== 'all') {
      processedRows = group.rows
        .map(row => {
          const stats = row[subFilter];
          const points = (stats.win ?? 0) * 3 + (stats.draw ?? 0);
          const goalDiff = (stats.goalsFor ?? 0) - (stats.goalsAgainst ?? 0);
          return {
            ...row,
            points,
            goalDiff,
          };
        })
        .sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
          const aGoalsFor = a[subFilter].goalsFor ?? 0;
          const bGoalsFor = b[subFilter].goalsFor ?? 0;
          return bGoalsFor - aGoalsFor;
        })
        .map((row, index) => ({
          ...row,
          rank: index + 1,
        }));
    }

    const rowOccurrences = new Map<string, number>();
    const rows = processedRows.map<StandingFeedItem>(row => {
      const rowBaseKey = `${groupIdentity}-${row.teamId ?? row.teamName ?? 'unknown'}-${row.rank ?? 'unknown'}`;
      const rowOccurrence = (rowOccurrences.get(rowBaseKey) ?? 0) + 1;
      rowOccurrences.set(rowBaseKey, rowOccurrence);

      return {
        type: 'row',
        key: `row-${rowBaseKey}-${rowOccurrence}`,
        row,
      };
    });

    return [header, ...rows];
  });
}

const StandingRowItem = memo(function StandingRowItem({
  row,
  mode,
  subFilter,
  formLabels,
  styles,
}: {
  row: TeamStandingRow;
  mode: DisplayMode;
  subFilter: SubFilter;
  formLabels: Record<'W' | 'D' | 'L', string>;
  styles: ReturnType<typeof createStyles>;
}) {
  const stats: TeamStandingStats = row[subFilter] || row.all;

  return (
    <View style={[styles.row, row.isTargetTeam ? styles.rowTarget : null]}>
      <View style={styles.colRank}>
        <Text style={styles.cellText}>{toDisplayNumber(row.rank)}</Text>
      </View>
      <View style={[styles.colTeam, styles.teamInfoContainer]}>
        {row.teamLogo ? (
          <Image source={{ uri: row.teamLogo }} style={styles.standingTeamLogo} resizeMode="contain" />
        ) : null}
        <Text numberOfLines={1} style={styles.teamText}>
          {toDisplayValue(row.teamName)}
        </Text>
      </View>

      {mode === 'simple' && (
        <>
          <View style={styles.colStatMedium}><Text style={styles.cellText}>{toDisplayNumber(stats.played)}</Text></View>
          <View style={styles.colStatMedium}><Text style={styles.cellText}>{toDisplayNumber(row.goalDiff)}</Text></View>
          <View style={styles.colPoints}><Text style={styles.cellTextBold}>{toDisplayNumber(row.points)}</Text></View>
        </>
      )}

      {mode === 'detailed' && (
        <>
          <View style={styles.colStatSmall}><Text style={styles.cellText}>{toDisplayNumber(stats.played)}</Text></View>
          <View style={styles.colStatSmall}><Text style={styles.cellText}>{toDisplayNumber(stats.win)}</Text></View>
          <View style={styles.colStatSmall}><Text style={styles.cellText}>{toDisplayNumber(stats.draw)}</Text></View>
          <View style={styles.colStatSmall}><Text style={styles.cellText}>{toDisplayNumber(stats.lose)}</Text></View>
          <View style={styles.colStatLarge}>
            <Text style={styles.cellText}>{stats.goalsFor ?? 0}-{stats.goalsAgainst ?? 0}</Text>
          </View>
          <View style={styles.colStatMedium}><Text style={styles.cellText}>{toDisplayNumber(row.goalDiff)}</Text></View>
          <View style={styles.colPoints}><Text style={styles.cellTextBold}>{toDisplayNumber(row.points)}</Text></View>
        </>
      )}

      {mode === 'form' && (
        <View style={styles.colForm}>
          {row.form?.split('').map((char, formSlot) => (
            <View
              key={`${row.teamId ?? row.teamName ?? 'team'}-form-${char}-${formSlot}`}
              style={[styles.formBox, { backgroundColor: FORM_COLORS[char] || '#333' }]}
            >
              <Text style={styles.formBoxText}>{formLabels[char as 'W' | 'D' | 'L'] || char}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
});

export function TeamStandingsTab({
  data,
  isLoading,
  isError,
  hasFetched = true,
  onRetry,
}: TeamStandingsTabProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [mode, setMode] = useState<DisplayMode>('simple');
  const [subFilter, setSubFilter] = useState<SubFilter>('all');
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  const modeLabels: Record<DisplayMode, string> = useMemo(
    () => ({
      simple: t('teamDetails.standings.displayModes.simple'),
      detailed: t('teamDetails.standings.displayModes.detailed'),
      form: t('teamDetails.standings.displayModes.form'),
    }),
    [t],
  );

  const subFilterLabels: Record<SubFilter, string> = useMemo(
    () => ({
      all: t('teamDetails.standings.subFilters.all'),
      home: t('teamDetails.standings.subFilters.home'),
      away: t('teamDetails.standings.subFilters.away'),
    }),
    [t],
  );

  const formLabels: Record<'W' | 'D' | 'L', string> = useMemo(
    () => ({
      W: t('teamDetails.standings.headers.win'),
      D: t('teamDetails.standings.headers.draw'),
      L: t('teamDetails.standings.headers.loss'),
    }),
    [t],
  );

  const defaultGroupTitle = t('teamDetails.standings.defaultGroup');
  const feedItems = useMemo(
    () => buildFeedItems(data, subFilter, defaultGroupTitle),
    [data, subFilter, defaultGroupTitle],
  );
  const hasRows = feedItems.length > 0;
  const shouldShowLoadingState = isLoading && !hasRows;
  const shouldShowErrorState = isError && !hasRows;
  const keyExtractor = useCallback((item: StandingFeedItem) => item.key, []);

  const renderTableHeader = useCallback(() => (
    <View style={styles.tableHeader}>
      <View style={styles.colRank}><Text style={styles.tableHeaderText}>#</Text></View>
      <View style={styles.colTeam}><Text style={styles.tableHeaderText}>{t('teamDetails.standings.headers.team')}</Text></View>

      {mode === 'simple' && (
        <>
          <View style={styles.colStatMedium}><Text style={styles.tableHeaderText}>{t('teamDetails.standings.headers.played')}</Text></View>
          <View style={styles.colStatMedium}><Text style={styles.tableHeaderText}>{t('teamDetails.standings.headers.goalDiff')}</Text></View>
          <View style={styles.colPoints}><Text style={styles.tableHeaderText}>{t('teamDetails.standings.headers.points')}</Text></View>
        </>
      )}

      {mode === 'detailed' && (
        <>
          <View style={styles.colStatSmall}><Text style={styles.tableHeaderText}>{t('teamDetails.standings.headers.played')}</Text></View>
          <View style={styles.colStatSmall}><Text style={styles.tableHeaderText}>{t('teamDetails.standings.headers.win')}</Text></View>
          <View style={styles.colStatSmall}><Text style={styles.tableHeaderText}>{t('teamDetails.standings.headers.draw')}</Text></View>
          <View style={styles.colStatSmall}><Text style={styles.tableHeaderText}>{t('teamDetails.standings.headers.loss')}</Text></View>
          <View style={styles.colStatLarge}><Text style={styles.tableHeaderText}>+/-</Text></View>
          <View style={styles.colStatMedium}><Text style={styles.tableHeaderText}>{t('teamDetails.standings.headers.goalDiff')}</Text></View>
          <View style={styles.colPoints}><Text style={styles.tableHeaderText}>{t('teamDetails.standings.headers.points')}</Text></View>
        </>
      )}

      {mode === 'form' && (
        <View style={styles.colForm}>
          <Text style={styles.tableHeaderRight}>{t('teamDetails.standings.headers.formLastFive')}</Text>
        </View>
      )}
    </View>
  ), [mode, styles, t]);

  const renderListHeader = useCallback(() => (
    <View style={styles.filterBar}>
      <View style={styles.modeTabs}>
        {(['simple', 'detailed', 'form'] as DisplayMode[]).map(modeKey => (
          <Pressable
            key={modeKey}
            style={[styles.modeTab, mode === modeKey ? styles.modeTabActive : null]}
            onPress={() => setMode(modeKey)}
          >
            <Text style={[styles.modeTabText, mode === modeKey ? styles.modeTabTextActive : null]}>
              {modeLabels[modeKey]}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.subFilterBtn} onPress={() => setFilterModalOpen(true)}>
        <Text style={styles.subFilterText}>{subFilterLabels[subFilter]}</Text>
        <MaterialCommunityIcons name="menu-down" size={18} color={colors.text} />
      </Pressable>
    </View>
  ), [styles, mode, modeLabels, subFilter, subFilterLabels, colors.text]);

  const renderItem = useCallback<ListRenderItem<StandingFeedItem>>(
    ({ item }) => {
      if (item.type === 'header') {
        return (
          <View>
            <Text style={styles.groupHeader}>{item.title}</Text>
            {renderTableHeader()}
          </View>
        );
      }

      return (
        <StandingRowItem
          row={item.row}
          mode={mode}
          subFilter={subFilter}
          formLabels={formLabels}
          styles={styles}
        />
      );
    },
    [styles, mode, subFilter, formLabels, renderTableHeader],
  );

  return (
    <View style={styles.container}>
      {shouldShowLoadingState ? (
        <View style={styles.stateCard}>
          <Text style={styles.stateText}>{t('teamDetails.states.loading')}</Text>
        </View>
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
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={renderListHeader}
          contentContainerStyle={styles.listContent}
          // @ts-ignore
          estimatedItemSize={58}
          ListEmptyComponent={
            hasFetched ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.stateText}>{t('teamDetails.states.empty')}</Text>
              </View>
            ) : null
          }
        />
      ) : null}

      {/* Modal for SubFilter */}
      <Modal visible={filterModalOpen} transparent animationType="fade" onRequestClose={() => setFilterModalOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setFilterModalOpen(false)}>
          <View style={styles.modalContent}>
            {(Object.keys(subFilterLabels) as SubFilter[]).map(k => (
              <Pressable
                key={k}
                style={styles.modalItem}
                onPress={() => {
                  setSubFilter(k);
                  setFilterModalOpen(false);
                }}
              >
                <Text style={styles.modalItemText}>{subFilterLabels[k]}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
