import { useMemo } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';

import {
  classifyFixtureStatus,
  formatStatusLabel,
} from '@data/mappers/fixturesMapper';
import { buildStatRows } from '@ui/features/matches/details/components/tabs/shared/matchDetailsSelectors';
import type {
  MatchDetailsDatasetErrorReason,
  StatRowsByPeriod,
  StatsPeriodFilter,
} from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabTypes';
import { buildPostMatchSections, buildPreMatchSections } from '@ui/features/matches/details/hooks/matchDetailsSections';
import { buildTeamLineups } from '@ui/features/matches/details/hooks/matchDetailsLineupBuilder';
import { composeMatchDetailsViewModel } from '@ui/features/matches/details/hooks/matchDetailsViewModel';
import {
  filterPlayersStatsByTeam,
  formatCountdown,
  formatKickoff,
  isWithinPreMatchLineupsVisibilityWindow,
  resolveDatasetWithFallback,
  toArray,
  toNullableText,
  toRawRecord,
  toTeamMatchesSnapshot,
} from '@ui/features/matches/details/hooks/matchDetailsDataTransforms';
import type {
  ApiFootballFixtureDto,
  MatchLifecycleState,
} from '@ui/features/matches/types/matches.types';
import type {
  MatchStandingsData,
} from '@ui/features/matches/details/hooks/matchDetailsDataTransforms';
import type {
  TeamTopPlayersByCategory,
} from '@ui/features/teams/types/teams.types';

type TranslationFn = (key: string, options?: Record<string, unknown>) => string;
type QueryLike<TData = unknown> = {
  data: UseQueryResult<TData>['data'];
  error: unknown;
  isError: boolean;
  isLoading: boolean;
  isFetching: boolean;
};

type UseMatchDetailsDerivedStateInput = {
  t: TranslationFn;
  locale: string;
  fixture: ApiFootballFixtureDto | null;
  lifecycleState: MatchLifecycleState;
  homeTeamId: string | null;
  awayTeamId: string | null;
  leagueId: number | undefined;
  canUseHalfStatistics: boolean;
  lineupsQuery: QueryLike;
  eventsQuery: QueryLike;
  statisticsQuery: QueryLike;
  statisticsFirstHalfQuery: QueryLike;
  statisticsSecondHalfQuery: QueryLike;
  predictionsQuery: QueryLike;
  absencesQuery: QueryLike;
  headToHeadQuery: QueryLike;
  homePlayersStatsQuery: QueryLike;
  awayPlayersStatsQuery: QueryLike;
  standingsQuery: QueryLike<MatchStandingsData>;
  homeTeamMatchesQuery: QueryLike;
  awayTeamMatchesQuery: QueryLike;
  homeLeadersQuery: QueryLike<TeamTopPlayersByCategory | null>;
  awayLeadersQuery: QueryLike<TeamTopPlayersByCategory | null>;
};

export function useMatchDetailsDerivedState({
  t,
  locale,
  fixture,
  lifecycleState,
  homeTeamId,
  awayTeamId,
  leagueId,
  canUseHalfStatistics,
  lineupsQuery,
  eventsQuery,
  statisticsQuery,
  statisticsFirstHalfQuery,
  statisticsSecondHalfQuery,
  predictionsQuery,
  absencesQuery,
  headToHeadQuery,
  homePlayersStatsQuery,
  awayPlayersStatsQuery,
  standingsQuery,
  homeTeamMatchesQuery,
  awayTeamMatchesQuery,
  homeLeadersQuery,
  awayLeadersQuery,
}: UseMatchDetailsDerivedStateInput) {
  const fixtureRecord = useMemo(() => toRawRecord(fixture), [fixture]);

  const resolvedEvents = useMemo(
    () =>
      resolveDatasetWithFallback({
        queryData: eventsQuery.data,
        fallbackData: fixtureRecord?.events,
        queryError: eventsQuery.error,
        isQueryError: eventsQuery.isError,
      }),
    [eventsQuery.data, eventsQuery.error, eventsQuery.isError, fixtureRecord],
  );

  const resolvedStatistics = useMemo(
    () =>
      resolveDatasetWithFallback({
        queryData: statisticsQuery.data,
        fallbackData: fixtureRecord?.statistics,
        queryError: statisticsQuery.error,
        isQueryError: statisticsQuery.isError,
      }),
    [fixtureRecord, statisticsQuery.data, statisticsQuery.error, statisticsQuery.isError],
  );

  const resolvedLineups = useMemo(
    () =>
      resolveDatasetWithFallback({
        queryData: lineupsQuery.data,
        fallbackData: fixtureRecord?.lineups,
        queryError: lineupsQuery.error,
        isQueryError: lineupsQuery.isError,
      }),
    [fixtureRecord, lineupsQuery.data, lineupsQuery.error, lineupsQuery.isError],
  );

  const resolvedPredictions = useMemo(
    () =>
      resolveDatasetWithFallback({
        queryData: predictionsQuery.data,
        fallbackData: fixtureRecord?.predictions,
        queryError: predictionsQuery.error,
        isQueryError: predictionsQuery.isError,
      }),
    [fixtureRecord, predictionsQuery.data, predictionsQuery.error, predictionsQuery.isError],
  );

  const resolvedAbsences = useMemo(
    () =>
      resolveDatasetWithFallback({
        queryData: absencesQuery.data,
        fallbackData: fixtureRecord?.absences,
        queryError: absencesQuery.error,
        isQueryError: absencesQuery.isError,
      }),
    [absencesQuery.data, absencesQuery.error, absencesQuery.isError, fixtureRecord],
  );

  const resolvedHeadToHead = useMemo(
    () =>
      resolveDatasetWithFallback({
        queryData: headToHeadQuery.data,
        fallbackData: fixtureRecord?.headToHead,
        queryError: headToHeadQuery.error,
        isQueryError: headToHeadQuery.isError,
      }),
    [fixtureRecord, headToHeadQuery.data, headToHeadQuery.error, headToHeadQuery.isError],
  );

  const fixturePlayersRows = useMemo(() => toArray(fixtureRecord?.players), [fixtureRecord]);

  const resolvedHomePlayersStats = useMemo(
    () =>
      resolveDatasetWithFallback({
        queryData: homePlayersStatsQuery.data,
        fallbackData: filterPlayersStatsByTeam(fixturePlayersRows, homeTeamId),
        queryError: homePlayersStatsQuery.error,
        isQueryError: homePlayersStatsQuery.isError,
      }),
    [
      fixturePlayersRows,
      homePlayersStatsQuery.data,
      homePlayersStatsQuery.error,
      homePlayersStatsQuery.isError,
      homeTeamId,
    ],
  );

  const resolvedAwayPlayersStats = useMemo(
    () =>
      resolveDatasetWithFallback({
        queryData: awayPlayersStatsQuery.data,
        fallbackData: filterPlayersStatsByTeam(fixturePlayersRows, awayTeamId),
        queryError: awayPlayersStatsQuery.error,
        isQueryError: awayPlayersStatsQuery.isError,
      }),
    [
      awayPlayersStatsQuery.data,
      awayPlayersStatsQuery.error,
      awayPlayersStatsQuery.isError,
      awayTeamId,
      fixturePlayersRows,
    ],
  );

  const statsRowsByPeriod = useMemo<StatRowsByPeriod>(
    () => ({
      all: buildStatRows(resolvedStatistics.data),
      first: canUseHalfStatistics ? buildStatRows(toArray(statisticsFirstHalfQuery.data)) : [],
      second: canUseHalfStatistics ? buildStatRows(toArray(statisticsSecondHalfQuery.data)) : [],
    }),
    [
      canUseHalfStatistics,
      resolvedStatistics.data,
      statisticsFirstHalfQuery.data,
      statisticsSecondHalfQuery.data,
    ],
  );

  const statsAvailablePeriods = useMemo<StatsPeriodFilter[]>(
    () =>
      (['all', 'first', 'second'] as const).filter(
        period => statsRowsByPeriod[period].length > 0,
      ),
    [statsRowsByPeriod],
  );

  const predictionsRaw = useMemo(
    () => toRawRecord(resolvedPredictions.data[0] ?? null),
    [resolvedPredictions.data],
  );

  const predictionsPercent = useMemo(() => {
    const predictions = toRawRecord(predictionsRaw?.predictions);
    const percent = toRawRecord(predictions?.percent);

    return {
      home: toNullableText(percent?.home),
      draw: toNullableText(percent?.draw),
      away: toNullableText(percent?.away),
    };
  }, [predictionsRaw]);

  const winPercent = useMemo(
    () => ({
      home: predictionsPercent.home ?? '0%',
      draw: predictionsPercent.draw ?? '0%',
      away: predictionsPercent.away ?? '0%',
    }),
    [predictionsPercent.away, predictionsPercent.draw, predictionsPercent.home],
  );

  const homeTeamMatches = useMemo(
    () => toTeamMatchesSnapshot(homeTeamMatchesQuery.data),
    [homeTeamMatchesQuery.data],
  );
  const awayTeamMatches = useMemo(
    () => toTeamMatchesSnapshot(awayTeamMatchesQuery.data),
    [awayTeamMatchesQuery.data],
  );

  const preMatchIsLoading =
    lifecycleState === 'pre_match' && (
      predictionsQuery.isLoading ||
      predictionsQuery.isFetching ||
      standingsQuery.isLoading ||
      standingsQuery.isFetching ||
      homeTeamMatchesQuery.isLoading ||
      homeTeamMatchesQuery.isFetching ||
      awayTeamMatchesQuery.isLoading ||
      awayTeamMatchesQuery.isFetching ||
      homeLeadersQuery.isLoading ||
      homeLeadersQuery.isFetching ||
      awayLeadersQuery.isLoading ||
      awayLeadersQuery.isFetching
    );

  const postMatchIsLoading =
    lifecycleState === 'finished' && (
      standingsQuery.isLoading ||
      standingsQuery.isFetching ||
      homeTeamMatchesQuery.isLoading ||
      homeTeamMatchesQuery.isFetching ||
      awayTeamMatchesQuery.isLoading ||
      awayTeamMatchesQuery.isFetching
    );

  const preMatchTab = useMemo(
    () =>
      buildPreMatchSections({
        isLoading: preMatchIsLoading,
        fixture,
        fixtureRecord,
        predictionsPercent,
        winPercent,
        leagueId,
        locale,
        homeTeamId,
        awayTeamId,
        homeRecentMatches: homeTeamMatches.all,
        awayRecentMatches: awayTeamMatches.all,
        standings: standingsQuery.data,
        homeLeaders: homeLeadersQuery.data ?? null,
        awayLeaders: awayLeadersQuery.data ?? null,
      }),
    [
      awayLeadersQuery.data,
      awayTeamId,
      awayTeamMatches.all,
      fixture,
      fixtureRecord,
      homeLeadersQuery.data,
      homeTeamId,
      homeTeamMatches.all,
      leagueId,
      locale,
      predictionsPercent,
      preMatchIsLoading,
      standingsQuery.data,
      winPercent,
    ],
  );

  const postMatchTab = useMemo(
    () =>
      buildPostMatchSections({
        isLoading: postMatchIsLoading,
        fixture,
        fixtureRecord,
        leagueId,
        locale,
        homeTeamId,
        awayTeamId,
        homeTeamMatches: homeTeamMatches.all,
        awayTeamMatches: awayTeamMatches.all,
        standings: standingsQuery.data,
      }),
    [
      awayTeamId,
      awayTeamMatches.all,
      fixture,
      fixtureRecord,
      homeTeamId,
      homeTeamMatches.all,
      leagueId,
      locale,
      postMatchIsLoading,
      standingsQuery.data,
    ],
  );

  const kickoffLabel = useMemo(
    () => formatKickoff(fixture?.fixture.date, locale),
    [fixture?.fixture.date, locale],
  );

  const countdownLabel = useMemo(
    () => formatCountdown(fixture?.fixture.date, t),
    [fixture?.fixture.date, t],
  );

  const statusLabel = useMemo(() => {
    if (!fixture) {
      return '';
    }

    const normalizedStatus = classifyFixtureStatus(
      fixture.fixture.status.short,
      fixture.fixture.status.long,
      fixture.fixture.status.elapsed,
    );
    if (normalizedStatus === 'upcoming') {
      return t('matches.status.upcoming');
    }

    return formatStatusLabel(
      normalizedStatus,
      fixture.fixture.status.elapsed,
      fixture.fixture.status.short,
    );
  }, [fixture, t]);

  const summaryIsFetching =
    eventsQuery.isFetching ||
    statisticsQuery.isFetching ||
    statisticsFirstHalfQuery.isFetching ||
    statisticsSecondHalfQuery.isFetching ||
    lineupsQuery.isFetching ||
    standingsQuery.isFetching;

  const isAnyDetailsQueryFetching =
    lineupsQuery.isFetching ||
    eventsQuery.isFetching ||
    statisticsQuery.isFetching ||
    statisticsFirstHalfQuery.isFetching ||
    statisticsSecondHalfQuery.isFetching ||
    predictionsQuery.isFetching ||
    absencesQuery.isFetching ||
    homePlayersStatsQuery.isFetching ||
    awayPlayersStatsQuery.isFetching ||
    headToHeadQuery.isFetching ||
    standingsQuery.isFetching ||
    homeTeamMatchesQuery.isFetching ||
    awayTeamMatchesQuery.isFetching ||
    homeLeadersQuery.isFetching ||
    awayLeadersQuery.isFetching;

  const lineupTeams = useMemo(
    () =>
      buildTeamLineups({
        absences: resolvedAbsences.data,
        lineups: resolvedLineups.data,
      }),
    [resolvedAbsences.data, resolvedLineups.data],
  );

  const datasetErrors = useMemo<Record<string, boolean>>(
    () => ({
      events: resolvedEvents.isError,
      statistics: resolvedStatistics.isError,
      lineups: resolvedLineups.isError,
      predictions: resolvedPredictions.isError,
      absences: resolvedAbsences.isError,
      faceOff: resolvedHeadToHead.isError,
      homePlayersStats: resolvedHomePlayersStats.isError,
      awayPlayersStats: resolvedAwayPlayersStats.isError,
    }),
    [
      resolvedAbsences.isError,
      resolvedAwayPlayersStats.isError,
      resolvedEvents.isError,
      resolvedHeadToHead.isError,
      resolvedHomePlayersStats.isError,
      resolvedLineups.isError,
      resolvedPredictions.isError,
      resolvedStatistics.isError,
    ],
  );

  const datasetErrorReasons = useMemo<Record<string, MatchDetailsDatasetErrorReason>>(
    () => ({
      events: resolvedEvents.errorReason,
      statistics: resolvedStatistics.errorReason,
      lineups: resolvedLineups.errorReason,
      predictions: resolvedPredictions.errorReason,
      absences: resolvedAbsences.errorReason,
      faceOff: resolvedHeadToHead.errorReason,
      homePlayersStats: resolvedHomePlayersStats.errorReason,
      awayPlayersStats: resolvedAwayPlayersStats.errorReason,
    }),
    [
      resolvedAbsences.errorReason,
      resolvedAwayPlayersStats.errorReason,
      resolvedEvents.errorReason,
      resolvedHeadToHead.errorReason,
      resolvedHomePlayersStats.errorReason,
      resolvedLineups.errorReason,
      resolvedPredictions.errorReason,
      resolvedStatistics.errorReason,
    ],
  );

  const dataSources = useMemo<Record<string, string>>(
    () => ({
      events: resolvedEvents.source,
      statistics: resolvedStatistics.source,
      lineups: resolvedLineups.source,
      predictions: resolvedPredictions.source,
      absences: resolvedAbsences.source,
      homePlayersStats: resolvedHomePlayersStats.source,
      awayPlayersStats: resolvedAwayPlayersStats.source,
      faceOff: resolvedHeadToHead.source,
    }),
    [
      resolvedAbsences.source,
      resolvedAwayPlayersStats.source,
      resolvedEvents.source,
      resolvedHeadToHead.source,
      resolvedHomePlayersStats.source,
      resolvedLineups.source,
      resolvedPredictions.source,
      resolvedStatistics.source,
    ],
  );

  const standingsGroups = standingsQuery.data?.league?.standings;
  const hasStandingsData = Array.isArray(standingsGroups)
    && standingsGroups.some(groupRows => Array.isArray(groupRows) && groupRows.length > 0);
  const hasTimelineData = resolvedEvents.data.length > 0;
  const hasLineupsData = lineupTeams.length > 0;
  const hasStatsData = statsAvailablePeriods.length > 0;
  const hasFaceOffData = resolvedHeadToHead.data.length > 0;
  const canShowPreMatchLineupsTab =
    lifecycleState === 'pre_match'
    && hasLineupsData
    && isWithinPreMatchLineupsVisibilityWindow(fixture?.fixture.date);

  const tabs = useMemo(
    () =>
      composeMatchDetailsViewModel(
        lifecycleState,
        t,
        {
          showTimeline:
            lifecycleState === 'pre_match'
              ? false
              : lifecycleState === 'finished'
                ? hasTimelineData
                : true,
          showLineups:
            lifecycleState === 'pre_match'
              ? canShowPreMatchLineupsTab
              : lifecycleState === 'finished'
                ? hasLineupsData
                : true,
          showStandings: lifecycleState === 'finished' ? hasStandingsData : true,
          showStats:
            lifecycleState === 'pre_match'
              ? false
              : lifecycleState === 'finished'
                ? hasStatsData
                : true,
          showFaceOff: lifecycleState === 'finished' ? hasFaceOffData : true,
        },
      ).tabs,
    [
      canShowPreMatchLineupsTab,
      hasFaceOffData,
      hasLineupsData,
      hasStandingsData,
      hasStatsData,
      hasTimelineData,
      lifecycleState,
      t,
    ],
  );

  const lastUpdatedAt =
    typeof fixture?.fixture.timestamp === 'number' && Number.isFinite(fixture.fixture.timestamp)
      ? fixture.fixture.timestamp * 1000
      : null;

  return {
    summaryIsFetching,
    isAnyDetailsQueryFetching,
    tabs,
    lastUpdatedAt,
    statusLabel,
    kickoffLabel,
    countdownLabel,
    events: resolvedEvents.data,
    statistics: resolvedStatistics.data,
    statsRowsByPeriod,
    statsAvailablePeriods,
    preMatchTab,
    postMatchTab,
    lineupTeams,
    predictions: predictionsRaw,
    winPercent,
    absences: resolvedAbsences.data,
    homePlayersStats: resolvedHomePlayersStats.data,
    awayPlayersStats: resolvedAwayPlayersStats.data,
    standings: standingsQuery.data,
    headToHead: resolvedHeadToHead.data,
    datasetErrors,
    datasetErrorReasons,
    dataSources,
  };
}
