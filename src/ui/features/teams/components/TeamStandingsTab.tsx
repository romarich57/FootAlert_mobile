import { useCallback, useMemo, useState } from 'react';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { createTeamStandingsTabStyles } from '@ui/features/teams/components/TeamStandingsTab.styles';
import {
  buildStandingFeedItems,
  type DisplayMode,
  type StandingFeedItem,
  type SubFilter,
} from '@ui/features/teams/components/standings/teamStandingsFeed';
import { TeamStandingRowItem } from '@ui/features/teams/components/standings/TeamStandingRowItem';
import type { TeamStandingsData } from '@ui/features/teams/types/teams.types';

type TeamStandingsTabProps = {
  data: TeamStandingsData | undefined;
  isLoading: boolean;
  isError: boolean;
  hasFetched?: boolean;
  disableVirtualization?: boolean;
  onRetry: () => void;
};

export function TeamStandingsTab({
  data,
  isLoading,
  isError,
  hasFetched = true,
  disableVirtualization = false,
  onRetry,
}: TeamStandingsTabProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createTeamStandingsTabStyles(colors), [colors]);

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
    () => buildStandingFeedItems(data, subFilter, defaultGroupTitle),
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
        <TeamStandingRowItem
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
          <ActivityIndicator size="large" color={colors.primary} style={{ alignSelf: 'center' }} />
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
        disableVirtualization ? (
          <View style={styles.listContent}>
            {renderListHeader()}
            {feedItems.length > 0 ? (
              feedItems.map((item, index) => (
                <View key={keyExtractor(item)}>
                  {renderItem({ item, index, target: 'Cell' } as any)}
                </View>
              ))
            ) : hasFetched ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.stateText}>{t('teamDetails.states.empty')}</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <FlashList
            data={feedItems}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            ListHeaderComponent={renderListHeader}
            contentContainerStyle={styles.listContent}
            estimatedItemSize={58}
            ListEmptyComponent={
              hasFetched ? (
                <View style={styles.emptyWrap}>
                  <Text style={styles.stateText}>{t('teamDetails.states.empty')}</Text>
                </View>
              ) : null
            }
          />
        )
      ) : null}

      <Modal visible={filterModalOpen} transparent animationType="fade" onRequestClose={() => setFilterModalOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setFilterModalOpen(false)}>
          <View style={styles.modalContent}>
            {(Object.keys(subFilterLabels) as SubFilter[]).map(key => (
              <Pressable
                key={key}
                style={styles.modalItem}
                onPress={() => {
                  setSubFilter(key);
                  setFilterModalOpen(false);
                }}
              >
                <Text style={styles.modalItemText}>{subFilterLabels[key]}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
