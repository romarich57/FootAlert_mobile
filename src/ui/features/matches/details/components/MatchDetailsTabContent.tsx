import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { MatchFaceOffTab } from '@ui/features/matches/details/components/tabs/MatchFaceOffTab';
import { MatchLineupsTab } from '@ui/features/matches/details/components/tabs/MatchLineupsTab';
import { MatchPrimaryTab } from '@ui/features/matches/details/components/tabs/MatchPrimaryTab';
import { MatchStandingsTab } from '@ui/features/matches/details/components/tabs/MatchStandingsTab';
import { MatchStatsTab } from '@ui/features/matches/details/components/tabs/MatchStatsTab';
import { MatchTimelineTab } from '@ui/features/matches/details/components/tabs/MatchTimelineTab';
import { toRecord, toText } from '@ui/features/matches/details/components/tabs/shared/matchDetailsParsing';
import {
  buildEvents,
  buildStandingsData,
  buildStatRows,
  mergeLineupStats,
} from '@ui/features/matches/details/components/tabs/shared/matchDetailsSelectors';
import { createMatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';
import type { MatchDetailsTabContentProps } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabTypes';

export function MatchDetailsTabContent({
  activeTab,
  lifecycleState,
  fixture,
  events,
  statistics,
  lineupTeams,
  predictions,
  winPercent,
  homePlayersStats,
  awayPlayersStats,
  standings,
  homeTeamId,
  awayTeamId,
  headToHead,
  isLiveRefreshing,
  onRefreshLineups,
  isLineupsRefetching,
}: MatchDetailsTabContentProps) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  const styles = useMemo(() => createMatchDetailsTabStyles(colors), [colors]);

  const eventRows = useMemo(
    () => buildEvents(events, homeTeamId, awayTeamId),
    [awayTeamId, events, homeTeamId],
  );

  const statRows = useMemo(() => buildStatRows(statistics), [statistics]);

  const mergedLineupTeams = useMemo(
    () => mergeLineupStats(lineupTeams, homePlayersStats, awayPlayersStats),
    [awayPlayersStats, homePlayersStats, lineupTeams],
  );

  const standingsData = useMemo(
    () => buildStandingsData(standings, homeTeamId, awayTeamId, lifecycleState, fixture),
    [awayTeamId, fixture, homeTeamId, lifecycleState, standings],
  );

  const insightText = useMemo(() => {
    const predictionsBlock = toRecord(predictions?.predictions);
    const advice = toText(predictionsBlock?.advice);
    return advice || t('matchDetails.primary.insightFallback');
  }, [predictions, t]);

  if (!fixture) {
    return (
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.emptyText}>{t('matchDetails.states.error')}</Text>
        </View>
      </View>
    );
  }

  const venueName = toText(fixture.fixture.venue.name, t('matchDetails.values.unavailable'));
  const venueCity = toText(fixture.fixture.venue.city, t('matchDetails.values.unavailable'));
  const competitionName = fixture.league.name;
  const matchScore =
    typeof fixture.goals.home === 'number' && typeof fixture.goals.away === 'number'
      ? `${fixture.goals.home}-${fixture.goals.away}`
      : '--';

  const homeTeamName = fixture.teams.home.name;
  const awayTeamName = fixture.teams.away.name;

  switch (activeTab) {
    case 'primary':
      return (
        <MatchPrimaryTab
          styles={styles}
          lifecycleState={lifecycleState}
          homeTeamName={homeTeamName}
          awayTeamName={awayTeamName}
          winPercent={winPercent}
          venueName={venueName}
          venueCity={venueCity}
          competitionName={competitionName}
          insightText={insightText}
          isLiveRefreshing={isLiveRefreshing}
          statRows={statRows}
          eventRows={eventRows}
          matchScore={matchScore}
        />
      );

    case 'timeline':
      return <MatchTimelineTab styles={styles} lifecycleState={lifecycleState} eventRows={eventRows} />;

    case 'lineups':
      return (
        <MatchLineupsTab
          styles={styles}
          lifecycleState={lifecycleState}
          lineupTeams={mergedLineupTeams}
          onRefreshLineups={onRefreshLineups}
          isLineupsRefetching={isLineupsRefetching}
        />
      );

    case 'standings':
      return <MatchStandingsTab styles={styles} standingsData={standingsData} />;

    case 'stats':
      return <MatchStatsTab styles={styles} statRows={statRows} />;

    case 'faceOff':
      return (
        <MatchFaceOffTab
          styles={styles}
          headToHead={headToHead}
          homeTeamId={homeTeamId}
          awayTeamId={awayTeamId}
          homeTeamName={homeTeamName}
          awayTeamName={awayTeamName}
          homeTeamLogo={fixture.teams.home.logo}
          awayTeamLogo={fixture.teams.away.logo}
        />
      );

    default:
      return <MatchStatsTab styles={styles} statRows={statRows} />;
  }
}
