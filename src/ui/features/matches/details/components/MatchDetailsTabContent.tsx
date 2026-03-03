import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { MatchFaceOffTab } from '@ui/features/matches/details/components/tabs/MatchFaceOffTab';
import { MatchLineupsTab } from '@ui/features/matches/details/components/tabs/MatchLineupsTab';
import { MatchPreMatchTab } from '@ui/features/matches/details/components/tabs/MatchPreMatchTab';
import { MatchPrimaryTab } from '@ui/features/matches/details/components/tabs/MatchPrimaryTab';
import { MatchStandingsTab } from '@ui/features/matches/details/components/tabs/MatchStandingsTab';
import { MatchStatsTab } from '@ui/features/matches/details/components/tabs/MatchStatsTab';
import { MatchTimelineTab } from '@ui/features/matches/details/components/tabs/MatchTimelineTab';
import { toRecord, toText } from '@ui/features/matches/details/components/tabs/shared/matchDetailsParsing';
import {
  buildEvents,
  buildFinalScorers,
  buildStandingsData,
  buildStatRows,
  mergeLineupStats,
} from '@ui/features/matches/details/components/tabs/shared/matchDetailsSelectors';
import { createMatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';
import type {
  MatchDetailsTabContentProps,
  StatRowsByPeriod,
  StatsPeriodFilter,
} from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabTypes';

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
  datasetErrors,
  datasetErrorReasons,
  dataSources,
  statsRowsByPeriod,
  statsAvailablePeriods,
  preMatchTab,
  postMatchTab,
  onPressMatch,
  onPressTeam,
  onPressPlayer,
  onPressCompetition,
}: MatchDetailsTabContentProps) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  const styles = useMemo(() => createMatchDetailsTabStyles(colors), [colors]);

  const mergedLineupTeams = useMemo(
    () => mergeLineupStats(lineupTeams, homePlayersStats, awayPlayersStats, events),
    [awayPlayersStats, events, homePlayersStats, lineupTeams],
  );

  const eventRows = useMemo(
    () => buildEvents(events, homeTeamId, awayTeamId, mergedLineupTeams),
    [awayTeamId, events, homeTeamId, mergedLineupTeams],
  );

  const finalScorers = useMemo(
    () => buildFinalScorers(eventRows),
    [eventRows],
  );

  const fallbackStatsRowsByPeriod = useMemo<StatRowsByPeriod>(
    () => ({
      all: buildStatRows(statistics),
      first: [],
      second: [],
    }),
    [statistics],
  );

  const effectiveStatsRowsByPeriod = statsRowsByPeriod ?? fallbackStatsRowsByPeriod;
  const statRows = effectiveStatsRowsByPeriod.all;

  const effectiveStatsAvailablePeriods = useMemo<StatsPeriodFilter[]>(() => {
    if (Array.isArray(statsAvailablePeriods) && statsAvailablePeriods.length > 0) {
      return statsAvailablePeriods;
    }

    const inferred = (['all', 'first', 'second'] as const)
      .filter(period => (effectiveStatsRowsByPeriod[period] ?? []).length > 0);
    return inferred.length > 0 ? [...inferred] : ['all'];
  }, [effectiveStatsRowsByPeriod, statsAvailablePeriods]);

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
      if (lifecycleState === 'pre_match' && preMatchTab) {
        return (
          <MatchPreMatchTab
            styles={styles}
            sections={preMatchTab.sectionsOrdered}
            isLoading={preMatchTab.isLoading}
            onPressMatch={onPressMatch}
            onPressTeam={onPressTeam}
            onPressPlayer={onPressPlayer}
            onPressCompetition={onPressCompetition}
          />
        );
      }

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
          statsError={datasetErrors?.statistics === true}
          statsErrorReason={datasetErrorReasons?.statistics}
          eventsError={datasetErrors?.events === true}
          eventsErrorReason={datasetErrorReasons?.events}
          predictionsError={datasetErrors?.predictions === true}
          predictionsErrorReason={datasetErrorReasons?.predictions}
          finalScorers={finalScorers}
          postMatchTab={postMatchTab}
          onPressMatch={onPressMatch}
          onPressTeam={onPressTeam}
          onPressPlayer={onPressPlayer}
          onPressCompetition={onPressCompetition}
        />
      );

    case 'timeline':
      return (
        <MatchTimelineTab
          styles={styles}
          lifecycleState={lifecycleState}
          eventRows={eventRows}
          hasDataError={datasetErrors?.events === true}
          dataErrorReason={datasetErrorReasons?.events}
          onPressPlayer={onPressPlayer}
        />
      );

    case 'lineups':
      return (
        <MatchLineupsTab
          styles={styles}
          lifecycleState={lifecycleState}
          lineupTeams={mergedLineupTeams}
          onRefreshLineups={onRefreshLineups}
          isLineupsRefetching={isLineupsRefetching}
          hasLineupsError={datasetErrors?.lineups === true}
          lineupsErrorReason={datasetErrorReasons?.lineups}
          lineupsDataSource={dataSources?.lineups}
          onPressPlayer={onPressPlayer}
          onPressTeam={onPressTeam}
        />
      );

    case 'standings':
      return <MatchStandingsTab styles={styles} standingsData={standingsData} />;

    case 'stats':
      return (
        <MatchStatsTab
          styles={styles}
          statRowsByPeriod={effectiveStatsRowsByPeriod}
          statsAvailablePeriods={effectiveStatsAvailablePeriods}
          hasDataError={datasetErrors?.statistics === true}
          dataErrorReason={datasetErrorReasons?.statistics}
        />
      );

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
          hasDataError={datasetErrors?.faceOff === true}
          dataErrorReason={datasetErrorReasons?.faceOff}
          onPressMatch={onPressMatch}
          onPressTeam={onPressTeam}
          onPressCompetition={onPressCompetition}
        />
      );

    default:
      return (
        <MatchStatsTab
          styles={styles}
          statRowsByPeriod={effectiveStatsRowsByPeriod}
          statsAvailablePeriods={effectiveStatsAvailablePeriods}
        />
      );
  }
}
