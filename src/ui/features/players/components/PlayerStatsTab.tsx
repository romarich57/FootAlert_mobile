import React, { useMemo, useState, type ReactElement } from 'react';
import { Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { PlayerSeasonStats } from '@ui/features/players/types/players.types';
import type { TeamCompetitionOption } from '@ui/features/teams/types/teams.types';
import { TeamCompetitionSeasonSelector } from '@ui/features/teams/components/TeamCompetitionSeasonSelector';

import { PlayerStatsHeaderCard } from './stats/PlayerStatsHeaderCard';
import { PlayerStatsPerformanceCard } from './stats/PlayerStatsPerformanceCard';
import { PlayerStatsShotsCard } from './stats/PlayerStatsShotsCard';
import { createPlayerStatsTabStyles } from './stats/PlayerStatsTab.styles';
import {
  buildPlayerStatsRows,
  computeShotAccuracy,
  computeShotConversion,
  type StatMode,
} from './stats/playerStatsRows';

type PlayerStatsTabProps = {
  stats: PlayerSeasonStats;
  leagueName: string | null;
  competitions: TeamCompetitionOption[];
  selectedSeason: number | null;
  selectedLeagueId: string | null;
  onSelectLeagueSeason: (leagueId: string, season: number) => void;
};

type PlayerStatsContentItem = {
  key: string;
  content: ReactElement;
};

export function PlayerStatsTab({
  stats,
  leagueName,
  competitions,
  selectedSeason,
  selectedLeagueId,
  onSelectLeagueSeason,
}: PlayerStatsTabProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createPlayerStatsTabStyles(colors), [colors]);
  const [mode, setMode] = useState<StatMode>('total');

  const rows = useMemo(() => buildPlayerStatsRows(stats, mode, t), [mode, stats, t]);
  const shotAccuracy = useMemo(() => computeShotAccuracy(stats), [stats]);
  const shotConversion = useMemo(() => computeShotConversion(stats), [stats]);

  const contentItems = useMemo<PlayerStatsContentItem[]>(() => {
    const items: PlayerStatsContentItem[] = [];

    if (competitions.length === 0) {
      items.push({
        key: 'no-competition-banner',
        content: (
          <View style={styles.infoBanner}>
            <View style={styles.infoBannerContent}>
              <MaterialCommunityIcons
                name="information-outline"
                size={16}
                style={styles.infoBannerIcon}
              />
              <Text style={styles.infoBannerText}>
                {t('playerDetails.stats.states.noCompetitionAvailable')}
              </Text>
            </View>
          </View>
        ),
      });
    }

    items.push({
      key: 'season-stats-card',
      content: (
        <PlayerStatsHeaderCard
          styles={styles}
          colors={colors}
          t={t}
          stats={stats}
          leagueName={leagueName}
        />
      ),
    });

    items.push({
      key: 'shots-card',
      content: (
        <PlayerStatsShotsCard
          styles={styles}
          colors={colors}
          t={t}
          stats={stats}
          leagueName={leagueName}
          shotAccuracy={shotAccuracy}
          shotConversion={shotConversion}
        />
      ),
    });

    items.push({
      key: 'season-performance-card',
      content: (
        <PlayerStatsPerformanceCard
          styles={styles}
          colors={colors}
          t={t}
          mode={mode}
          onChangeMode={setMode}
          rows={rows}
        />
      ),
    });

    return items;
  }, [colors, competitions.length, leagueName, mode, rows, shotAccuracy, shotConversion, stats, styles, t]);

  return (
    <View style={styles.container} testID="player-stats-tab">
      {competitions.length > 0 ? (
        <TeamCompetitionSeasonSelector
          competitions={competitions}
          selectedLeagueId={selectedLeagueId}
          selectedSeason={selectedSeason}
          onSelect={onSelectLeagueSeason}
          modalTitle={t('teamDetails.filters.selectCompetitionSeason')}
          doneLabel={t('common.done')}
        />
      ) : null}

      <FlashList
        data={contentItems}
        keyExtractor={item => item.key}
        getItemType={() => 'player-stats-section'}
        estimatedItemSize={250}
        renderItem={({ item }) => item.content}
        style={styles.container}
        contentContainerStyle={styles.contentPadding}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
      />
    </View>
  );
}
