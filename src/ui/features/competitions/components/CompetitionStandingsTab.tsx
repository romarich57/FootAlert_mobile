import { useCallback, useMemo, useState } from 'react';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { Modal, Pressable, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { StandingsTabSkeleton } from '@ui/features/competitions/components/StandingsTabSkeleton';
import { useCompetitionBracket } from '@ui/features/competitions/hooks/useCompetitionBracket';
import { useCompetitionStandings } from '@ui/features/competitions/hooks/useCompetitionStandings';
import { createTeamStandingsTabStyles } from '@ui/features/teams/components/TeamStandingsTab.styles';
import { TeamStandingRowItem } from '@ui/features/teams/components/standings/TeamStandingRowItem';
import {
  buildStandingFeedItems,
  type DisplayMode,
  type StandingFeedItem,
  type SubFilter,
} from '@ui/features/teams/components/standings/teamStandingsFeed';
import type { TeamStandingsData, TeamStandingRow } from '@ui/features/teams/types/teams.types';
import type { StandingGroup } from '../types/competitions.types';
import { KnockoutBracketView } from './KnockoutBracketView';

type CompetitionStandingsTabProps = {
  competitionId: number;
  season: number;
  allowBracket?: boolean;
  onPressTeam?: (teamId: string) => void;
};

function mapCompetitionGroupsToFeedData(groups: StandingGroup[] | undefined): TeamStandingsData | undefined {
  if (!groups) {
    return undefined;
  }

  return {
    groups: groups.map(group => ({
      groupName: group.groupName || null,
      rows: group.rows.map<TeamStandingRow>(row => ({
        rank: row.rank,
        teamId: String(row.teamId),
        teamName: row.teamName,
        teamLogo: row.teamLogo,
        played: row.played,
        goalDiff: row.goalsDiff,
        points: row.points,
        isTargetTeam: false,
        form: row.form,
        update: null,
        all: {
          played: row.played,
          win: row.win,
          draw: row.draw,
          lose: row.lose,
          goalsFor: row.goalsFor,
          goalsAgainst: row.goalsAgainst,
        },
        home: row.home,
        away: row.away,
      })),
    })),
  };
}

export function CompetitionStandingsTab({
  competitionId,
  season,
  allowBracket = true,
  onPressTeam,
}: CompetitionStandingsTabProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createTeamStandingsTabStyles(colors), [colors]);
  const [mode, setMode] = useState<DisplayMode>('simple');
  const [subFilter, setSubFilter] = useState<SubFilter>('all');
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  const standingsQuery = useCompetitionStandings(competitionId, season);
  const bracketQuery = useCompetitionBracket(competitionId, season, {
    enabled: allowBracket,
  });

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

  const defaultGroupTitle = t('competitionDetails.standings.defaultGroup');
  const feedData = useMemo(
    () => mapCompetitionGroupsToFeedData(standingsQuery.data),
    [standingsQuery.data],
  );
  const feedItems = useMemo(
    () => buildStandingFeedItems(feedData, subFilter, defaultGroupTitle),
    [feedData, subFilter, defaultGroupTitle],
  );
  const hasRows = feedItems.length > 0;

  const competitionKind = bracketQuery.data?.competitionKind ?? 'league';
  const showBracket = Boolean(bracketQuery.data?.bracket?.length) && (
    competitionKind === 'cup' || competitionKind === 'mixed'
  );
  const showStandings = competitionKind !== 'cup';

  const keyExtractor = useCallback((item: StandingFeedItem) => item.key, []);

  const renderTableHeader = useCallback(() => (
    <View style={styles.tableHeader}>
      <View style={styles.colRank}><Text style={styles.tableHeaderText}>#</Text></View>
      <View style={styles.colTeam}><Text style={styles.tableHeaderText}>{t('teamDetails.standings.headers.team')}</Text></View>

      {mode === 'simple' ? (
        <>
          <View style={styles.colStatMedium}><Text style={styles.tableHeaderText}>{t('teamDetails.standings.headers.played')}</Text></View>
          <View style={styles.colStatMedium}><Text style={styles.tableHeaderText}>{t('teamDetails.standings.headers.goalDiff')}</Text></View>
          <View style={styles.colPoints}><Text style={styles.tableHeaderText}>{t('teamDetails.standings.headers.points')}</Text></View>
        </>
      ) : null}

      {mode === 'detailed' ? (
        <>
          <View style={styles.colStatSmall}><Text style={styles.tableHeaderText}>{t('teamDetails.standings.headers.played')}</Text></View>
          <View style={styles.colStatSmall}><Text style={styles.tableHeaderText}>{t('teamDetails.standings.headers.win')}</Text></View>
          <View style={styles.colStatSmall}><Text style={styles.tableHeaderText}>{t('teamDetails.standings.headers.draw')}</Text></View>
          <View style={styles.colStatSmall}><Text style={styles.tableHeaderText}>{t('teamDetails.standings.headers.loss')}</Text></View>
          <View style={styles.colStatLarge}><Text style={styles.tableHeaderText}>{t('teamDetails.standings.headers.goalsForAgainst')}</Text></View>
          <View style={styles.colStatMedium}><Text style={styles.tableHeaderText}>{t('teamDetails.standings.headers.goalDiff')}</Text></View>
          <View style={styles.colPoints}><Text style={styles.tableHeaderText}>{t('teamDetails.standings.headers.points')}</Text></View>
        </>
      ) : null}

      {mode === 'form' ? (
        <View style={styles.colForm}>
          <Text style={styles.tableHeaderRight}>{t('teamDetails.standings.headers.formLastFive')}</Text>
        </View>
      ) : null}
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
  ), [colors.text, mode, modeLabels, styles, subFilter, subFilterLabels]);

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
          onPressTeam={onPressTeam}
        />
      );
    },
    [formLabels, mode, onPressTeam, renderTableHeader, styles, subFilter],
  );

  if (competitionKind === 'cup') {
    return showBracket ? (
      <View style={styles.container}>
        <KnockoutBracketView
          rounds={bracketQuery.data!.bracket!}
          sectionTitle={t('competitionDetails.bracket.title')}
        />
      </View>
    ) : (
      <View style={styles.container}>
        <View style={styles.stateCard}>
          <Text style={styles.stateText}>{t('competitionDetails.standings.unavailable')}</Text>
        </View>
      </View>
    );
  }

  if (standingsQuery.isLoading && !hasRows) {
    return <StandingsTabSkeleton />;
  }

  if ((standingsQuery.error || !showStandings || !hasRows) && !showBracket) {
    return (
      <View style={styles.container}>
        <View style={styles.stateCard}>
          <Text style={styles.stateText}>{t('competitionDetails.standings.unavailable')}</Text>
        </View>
      </View>
    );
  }

  if (!hasRows && showBracket) {
    return (
      <View style={styles.container}>
        <KnockoutBracketView
          rounds={bracketQuery.data!.bracket!}
          sectionTitle={t('competitionDetails.bracket.title')}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashList
        data={feedItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemType={item => item.type}
        ListHeaderComponent={renderListHeader}
        ListFooterComponent={showBracket ? (
          <KnockoutBracketView
            rounds={bracketQuery.data!.bracket!}
            sectionTitle={t('competitionDetails.bracket.title')}
          />
        ) : null}
        contentContainerStyle={styles.listContent}
        estimatedItemSize={58}
      />

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
