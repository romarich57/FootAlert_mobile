import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  useIsFocused,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { useNetInfo } from '@react-native-community/netinfo';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { usePowerState } from 'react-native-device-info';
import { useTranslation } from 'react-i18next';

import {
  fetchFixtureAbsences,
  fetchFixtureById,
  fetchFixtureEvents,
  fetchFixtureHeadToHead,
  fetchFixtureLineups,
  fetchFixturePlayersStatsByTeam,
  fetchFixturePredictions,
  fetchFixtureStatistics,
} from '@data/endpoints/matchesApi';
import { ApiError } from '@data/api/http/client';
import { fetchLeagueStandings } from '@data/endpoints/competitionsApi';
import {
  classifyFixtureStatus,
  formatStatusLabel,
  mapMatchLineupTeam,
} from '@data/mappers/fixturesMapper';
import { sanitizeNumericEntityId } from '@ui/app/navigation/routeParams';
import type { RootStackParamList } from '@ui/app/navigation/types';
import { useMatchesRefresh } from '@ui/features/matches/hooks/useMatchesRefresh';
import { buildStatRows } from '@ui/features/matches/details/components/tabs/shared/matchDetailsSelectors';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';
import { queryKeys } from '@ui/shared/query/queryKeys';
import type {
  ApiFootballFixtureDto,
  MatchDetailTabDefinition,
  MatchDetailsTabKey,
  MatchLifecycleState,
  MatchLineupAbsence,
  MatchLineupTeam,
} from '@ui/features/matches/types/matches.types';
import type {
  MatchDetailsDatasetErrorReason,
  StatRowsByPeriod,
  StatsPeriodFilter,
} from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabTypes';

type MatchDetailsRoute = RouteProp<RootStackParamList, 'MatchDetails'>;
type MatchDetailsNavigation = NativeStackNavigationProp<RootStackParamList, 'MatchDetails'>;

type RawRecord = Record<string, unknown>;
type MatchDetailsDatasetSource = 'query' | 'fixture_fallback' | 'none';

type DatasetResolution = {
  data: unknown[];
  source: MatchDetailsDatasetSource;
  isError: boolean;
  errorReason: MatchDetailsDatasetErrorReason;
};

function toRawRecord(value: unknown): RawRecord | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  return value as RawRecord;
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toText(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function shouldRetryMatchDetailsRequest(maxRetries: number) {
  return (failureCount: number, error: unknown): boolean => {
    if (error instanceof ApiError && error.status === 404) {
      return false;
    }

    return failureCount < maxRetries;
  };
}

function resolveDatasetWithFallback({
  queryData,
  fallbackData,
  queryError,
  isQueryError,
}: {
  queryData: unknown;
  fallbackData: unknown;
  queryError: unknown;
  isQueryError: boolean;
}): DatasetResolution {
  const queryRows = toArray(queryData);
  const fallbackRows = toArray(fallbackData);
  const shouldUseFallback = fallbackRows.length > 0 && (isQueryError || queryRows.length === 0);
  const resolvedRows = shouldUseFallback ? fallbackRows : queryRows;

  if (resolvedRows.length > 0) {
    return {
      data: resolvedRows,
      source: shouldUseFallback ? 'fixture_fallback' : 'query',
      isError: false,
      errorReason: 'none',
    };
  }

  const isEndpointUnavailable = queryError instanceof ApiError && queryError.status === 404;
  const errorReason: MatchDetailsDatasetErrorReason = isQueryError
    ? (isEndpointUnavailable ? 'endpoint_not_available' : 'request_failed')
    : 'none';

  return {
    data: [],
    source: isQueryError ? 'none' : 'query',
    isError: isQueryError,
    errorReason,
  };
}

function filterPlayersStatsByTeam(rows: unknown[], teamId: string | null): unknown[] {
  if (!teamId) {
    return [];
  }

  return rows.filter(row => {
    const rawRow = toRawRecord(row);
    const rawTeam = toRawRecord(rawRow?.team);
    const rawTeamId = rawTeam?.id;

    if (typeof rawTeamId === 'number' && Number.isFinite(rawTeamId)) {
      return String(rawTeamId) === teamId;
    }

    return typeof rawTeamId === 'string' && rawTeamId === teamId;
  });
}

function toLifecycleState(fixture: ApiFootballFixtureDto | null): MatchLifecycleState {
  if (!fixture) {
    return 'pre_match';
  }

  const normalized = classifyFixtureStatus(
    fixture.fixture.status.short,
    fixture.fixture.status.long,
    fixture.fixture.status.elapsed,
  );
  if (normalized === 'live') {
    return 'live';
  }
  if (normalized === 'finished') {
    return 'finished';
  }

  return 'pre_match';
}

function formatKickoff(dateIso: string | null | undefined): string {
  if (!dateIso) {
    return '';
  }

  const parsed = new Date(dateIso);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return parsed.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatCountdown(dateIso: string | null | undefined, t: (key: string, options?: Record<string, unknown>) => string): string {
  if (!dateIso) {
    return '';
  }

  const targetDate = new Date(dateIso);
  if (Number.isNaN(targetDate.getTime())) {
    return '';
  }

  const diffMs = targetDate.getTime() - Date.now();
  if (diffMs <= 0) {
    return '';
  }

  const totalMinutes = Math.floor(diffMs / 60_000);
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return t('matchDetails.header.countdown.days', { days, hours });
  }

  if (totalHours > 0) {
    return t('matchDetails.header.countdown.hours', { hours: totalHours, minutes });
  }

  return t('matchDetails.header.countdown.minutes', { minutes: Math.max(minutes, 1) });
}

function extractFixtureSeason(fixture: ApiFootballFixtureDto | null): number | null {
  const seasonValue = fixture?.league.season;
  if (typeof seasonValue === 'number' && Number.isFinite(seasonValue)) {
    return seasonValue;
  }

  const kickoff = fixture?.fixture.date;
  if (!kickoff) {
    return null;
  }

  const parsed = new Date(kickoff);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const month = parsed.getUTCMonth();
  const year = parsed.getUTCFullYear();
  return month >= 6 ? year : year - 1;
}

function pickTeamIdsFromFixture(fixture: ApiFootballFixtureDto | null): {
  homeTeamId: string | null;
  awayTeamId: string | null;
} {
  if (!fixture) {
    return {
      homeTeamId: null,
      awayTeamId: null,
    };
  }

  const homeTeamId = Number.isFinite(fixture.teams.home.id)
    ? String(fixture.teams.home.id)
    : null;
  const awayTeamId = Number.isFinite(fixture.teams.away.id)
    ? String(fixture.teams.away.id)
    : null;

  return {
    homeTeamId,
    awayTeamId,
  };
}

function toTabDefinitions(
  lifecycleState: MatchLifecycleState,
  hasLineups: boolean,
  hasStandings: boolean,
  hasStatistics: boolean,
  t: (key: string) => string,
): MatchDetailTabDefinition[] {
  const tabs: MatchDetailTabDefinition[] = [
    {
      key: 'primary',
      label: lifecycleState === 'pre_match'
        ? t('matchDetails.tabs.preMatch')
        : t('matchDetails.tabs.summary'),
    },
  ];

  if (lifecycleState !== 'pre_match') {
    tabs.push({
      key: 'timeline',
      label: t('matchDetails.tabs.timeline'),
    });
  }

  if (lifecycleState !== 'pre_match' || hasLineups) {
    tabs.push({
      key: 'lineups',
      label: t('matchDetails.tabs.lineups'),
    });
  }

  if (hasStandings) {
    tabs.push({
      key: 'standings',
      label: t('matchDetails.tabs.standings'),
    });
  }

  if (hasStatistics) {
    tabs.push({
      key: 'stats',
      label: t('matchDetails.tabs.stats'),
    });
  }

  tabs.push({
    key: 'faceOff',
    label: t('matchDetails.tabs.faceOff'),
  });

  return tabs;
}

export function useMatchDetailsScreenModel() {
  const { t } = useTranslation();
  const navigation = useNavigation<MatchDetailsNavigation>();
  const route = useRoute<MatchDetailsRoute>();
  const isFocused = useIsFocused();
  const netInfo = useNetInfo();
  const powerState = usePowerState();
  const [activeTab, setActiveTab] = useState<MatchDetailsTabKey>('primary');
  const safeMatchId = sanitizeNumericEntityId(route.params.matchId);

  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris',
    [],
  );

  const fixtureQuery = useQuery({
    queryKey: queryKeys.matchDetails(safeMatchId ?? 'invalid', timezone),
    enabled: Boolean(safeMatchId),
    queryFn: ({ signal }) =>
      fetchFixtureById({
        fixtureId: safeMatchId ?? '',
        timezone,
        signal,
      }),
    ...featureQueryOptions.matches.details,
    refetchOnMount: 'always',
    retry: shouldRetryMatchDetailsRequest(featureQueryOptions.matches.details.retry),
  });

  const lineupsQuery = useQuery({
    queryKey: queryKeys.matchLineups(safeMatchId ?? 'invalid'),
    enabled: Boolean(safeMatchId),
    queryFn: ({ signal }) =>
      fetchFixtureLineups({
        fixtureId: safeMatchId ?? '',
        signal,
      }),
    ...featureQueryOptions.matches.lineups,
    // Always remount-refetch to avoid persisted pre-match empty cache.
    refetchOnMount: 'always',
    retry: shouldRetryMatchDetailsRequest(featureQueryOptions.matches.lineups.retry),
  });

  const fixture = fixtureQuery.data ?? null;
  const lifecycleState = useMemo(() => toLifecycleState(fixture), [fixture]);
  const { homeTeamId, awayTeamId } = useMemo(() => pickTeamIdsFromFixture(fixture), [fixture]);
  const season = useMemo(() => extractFixtureSeason(fixture), [fixture]);
  const leagueId = fixture?.league?.id;

  const eventsQuery = useQuery({
    queryKey: queryKeys.matchEvents(safeMatchId ?? 'invalid'),
    enabled: Boolean(safeMatchId),
    queryFn: ({ signal }) =>
      fetchFixtureEvents({
        fixtureId: safeMatchId ?? '',
        signal,
      }),
    ...featureQueryOptions.matches.events,
    refetchOnMount: 'always',
    retry: shouldRetryMatchDetailsRequest(featureQueryOptions.matches.events.retry),
  });

  const statisticsQuery = useQuery({
    queryKey: queryKeys.matchStatistics(safeMatchId ?? 'invalid', 'all'),
    enabled: Boolean(safeMatchId),
    queryFn: ({ signal }) =>
      fetchFixtureStatistics({
        fixtureId: safeMatchId ?? '',
        period: 'all',
        signal,
      }),
    ...featureQueryOptions.matches.statistics,
    refetchOnMount: 'always',
    retry: shouldRetryMatchDetailsRequest(featureQueryOptions.matches.statistics.retry),
  });

  const canUseHalfStatistics =
    Boolean(safeMatchId) &&
    lifecycleState !== 'pre_match' &&
    typeof season === 'number' &&
    season >= 2024;

  const statisticsFirstHalfQuery = useQuery({
    queryKey: queryKeys.matchStatistics(safeMatchId ?? 'invalid', 'first'),
    enabled: canUseHalfStatistics,
    queryFn: ({ signal }) =>
      fetchFixtureStatistics({
        fixtureId: safeMatchId ?? '',
        period: 'first',
        signal,
      }),
    ...featureQueryOptions.matches.statistics,
    refetchOnMount: 'always',
    retry: shouldRetryMatchDetailsRequest(featureQueryOptions.matches.statistics.retry),
  });

  const statisticsSecondHalfQuery = useQuery({
    queryKey: queryKeys.matchStatistics(safeMatchId ?? 'invalid', 'second'),
    enabled: canUseHalfStatistics,
    queryFn: ({ signal }) =>
      fetchFixtureStatistics({
        fixtureId: safeMatchId ?? '',
        period: 'second',
        signal,
      }),
    ...featureQueryOptions.matches.statistics,
    refetchOnMount: 'always',
    retry: shouldRetryMatchDetailsRequest(featureQueryOptions.matches.statistics.retry),
  });

  const predictionsQuery = useQuery({
    queryKey: queryKeys.matchPredictions(safeMatchId ?? 'invalid'),
    enabled: Boolean(safeMatchId),
    queryFn: ({ signal }) =>
      fetchFixturePredictions({
        fixtureId: safeMatchId ?? '',
        signal,
      }),
    ...featureQueryOptions.matches.predictions,
    retry: shouldRetryMatchDetailsRequest(featureQueryOptions.matches.predictions.retry),
  });

  const absencesQuery = useQuery({
    queryKey: queryKeys.matchAbsences(safeMatchId ?? 'invalid', timezone),
    enabled: Boolean(safeMatchId),
    queryFn: ({ signal }) =>
      fetchFixtureAbsences({
        fixtureId: safeMatchId ?? '',
        timezone,
        signal,
      }),
    ...featureQueryOptions.matches.absences,
    retry: shouldRetryMatchDetailsRequest(featureQueryOptions.matches.absences.retry),
  });

  const headToHeadQuery = useQuery({
    queryKey: queryKeys.matchHeadToHead(safeMatchId ?? 'invalid'),
    enabled: Boolean(safeMatchId),
    queryFn: ({ signal }) =>
      fetchFixtureHeadToHead({
        fixtureId: safeMatchId ?? '',
        last: 10,
        timezone,
        signal,
      }),
    ...featureQueryOptions.matches.headToHead,
    retry: shouldRetryMatchDetailsRequest(featureQueryOptions.matches.headToHead.retry),
  });

  const homePlayersStatsQuery = useQuery({
    queryKey: queryKeys.matchPlayersStatsByTeam(safeMatchId ?? 'invalid', homeTeamId ?? 'unknown'),
    enabled: Boolean(safeMatchId) && Boolean(homeTeamId),
    queryFn: ({ signal }) =>
      fetchFixturePlayersStatsByTeam({
        fixtureId: safeMatchId ?? '',
        teamId: homeTeamId ?? '',
        signal,
      }),
    ...featureQueryOptions.matches.playersStats,
    refetchOnMount: 'always',
    retry: shouldRetryMatchDetailsRequest(featureQueryOptions.matches.playersStats.retry),
  });

  const awayPlayersStatsQuery = useQuery({
    queryKey: queryKeys.matchPlayersStatsByTeam(safeMatchId ?? 'invalid', awayTeamId ?? 'unknown'),
    enabled: Boolean(safeMatchId) && Boolean(awayTeamId),
    queryFn: ({ signal }) =>
      fetchFixturePlayersStatsByTeam({
        fixtureId: safeMatchId ?? '',
        teamId: awayTeamId ?? '',
        signal,
      }),
    ...featureQueryOptions.matches.playersStats,
    refetchOnMount: 'always',
    retry: shouldRetryMatchDetailsRequest(featureQueryOptions.matches.playersStats.retry),
  });

  const standingsQuery = useQuery({
    queryKey: queryKeys.competitions.standings(
      typeof leagueId === 'number' ? leagueId : undefined,
      typeof season === 'number' ? season : undefined,
    ),
    enabled: typeof leagueId === 'number' && typeof season === 'number',
    queryFn: ({ signal }) => fetchLeagueStandings(leagueId as number, season as number, signal),
    ...featureQueryOptions.competitions.standings,
  });

  const hasStandings = useMemo(
    () => (standingsQuery.data?.league?.standings?.length ?? 0) > 0,
    [standingsQuery.data],
  );

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

  const hasPreMatchLineups = useMemo(
    () => resolvedLineups.data.length > 0,
    [resolvedLineups.data],
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

  const hasStatistics = statsAvailablePeriods.length > 0;

  const tabs = useMemo(
    () => toTabDefinitions(lifecycleState, hasPreMatchLineups, hasStandings, hasStatistics, t),
    [hasPreMatchLineups, hasStandings, hasStatistics, lifecycleState, t],
  );

  useEffect(() => {
    if (!tabs.some((tab: MatchDetailTabDefinition) => tab.key === activeTab)) {
      setActiveTab(tabs[0]?.key ?? 'primary');
    }
  }, [tabs, activeTab]);

  const kickoffLabel = useMemo(
    () => formatKickoff(fixture?.fixture.date),
    [fixture?.fixture.date],
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

  const isOffline = netInfo.isConnected === false || netInfo.isInternetReachable === false;
  const networkLiteMode = isOffline || netInfo.details?.isConnectionExpensive === true;
  const batteryLiteMode = powerState.lowPowerMode === true;

  const refetchLiveData = useCallback(async () => {
    const results = await Promise.all([
      fixtureQuery.refetch(),
      eventsQuery.refetch(),
      statisticsQuery.refetch(),
      statisticsFirstHalfQuery.refetch(),
      statisticsSecondHalfQuery.refetch(),
      lineupsQuery.refetch(),
      homePlayersStatsQuery.refetch(),
      awayPlayersStatsQuery.refetch(),
      standingsQuery.refetch(),
    ]);

    return {
      isError: results.some(result => result.isError),
    };
  }, [
    awayPlayersStatsQuery,
    eventsQuery,
    fixtureQuery,
    homePlayersStatsQuery,
    lineupsQuery,
    standingsQuery,
    statisticsFirstHalfQuery,
    statisticsSecondHalfQuery,
    statisticsQuery,
  ]);

  useMatchesRefresh({
    enabled: isFocused && Boolean(safeMatchId) && !isOffline,
    hasLiveMatches: lifecycleState === 'live',
    isSlowNetwork: networkLiteMode,
    networkLiteMode,
    batteryLiteMode,
    refetch: refetchLiveData,
  });

  const retryAll = useCallback(() => {
    fixtureQuery.refetch().catch(() => undefined);
    eventsQuery.refetch().catch(() => undefined);
    statisticsQuery.refetch().catch(() => undefined);
    statisticsFirstHalfQuery.refetch().catch(() => undefined);
    statisticsSecondHalfQuery.refetch().catch(() => undefined);
    lineupsQuery.refetch().catch(() => undefined);
    predictionsQuery.refetch().catch(() => undefined);
    absencesQuery.refetch().catch(() => undefined);
    homePlayersStatsQuery.refetch().catch(() => undefined);
    awayPlayersStatsQuery.refetch().catch(() => undefined);
    headToHeadQuery.refetch().catch(() => undefined);
    standingsQuery.refetch().catch(() => undefined);
  }, [
    absencesQuery,
    awayPlayersStatsQuery,
    eventsQuery,
    fixtureQuery,
    headToHeadQuery,
    homePlayersStatsQuery,
    lineupsQuery,
    predictionsQuery,
    standingsQuery,
    statisticsFirstHalfQuery,
    statisticsSecondHalfQuery,
    statisticsQuery,
  ]);

  const onRefreshLineups = useCallback(() => {
    lineupsQuery.refetch().catch(() => undefined);
  }, [lineupsQuery]);

  const predictionsRaw = useMemo(
    () => toRawRecord(resolvedPredictions.data[0] ?? null),
    [resolvedPredictions.data],
  );

  const winPercent = useMemo(() => {
    const predictions = toRawRecord(predictionsRaw?.predictions);
    const percent = toRawRecord(predictions?.percent);

    return {
      home: toText(percent?.home, '0%'),
      draw: toText(percent?.draw, '0%'),
      away: toText(percent?.away, '0%'),
    };
  }, [predictionsRaw]);

  const isInitialLoading = fixtureQuery.isLoading;
  const isInitialError = fixtureQuery.isError || !safeMatchId;

  const queryLineupsRaw = toArray(lineupsQuery.data);
  const autoRefetchedFinishedLineupsRef = useRef<string | null>(null);

  useEffect(() => {
    if (!safeMatchId) {
      autoRefetchedFinishedLineupsRef.current = null;
      return;
    }

    const guardKey = `${safeMatchId}:finished`;
    if (lifecycleState !== 'finished') {
      if (autoRefetchedFinishedLineupsRef.current === guardKey) {
        autoRefetchedFinishedLineupsRef.current = null;
      }
      return;
    }

    if (queryLineupsRaw.length > 0 || lineupsQuery.isFetching) {
      return;
    }

    if (autoRefetchedFinishedLineupsRef.current === guardKey) {
      return;
    }

    autoRefetchedFinishedLineupsRef.current = guardKey;
    lineupsQuery.refetch().catch(() => undefined);
  }, [lifecycleState, lineupsQuery, queryLineupsRaw.length, safeMatchId]);

  const teamLineups = useMemo(() => {
    const absencesMap = new Map<string, MatchLineupAbsence[]>();
    resolvedAbsences.data.forEach(item => {
      const rawItem = typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : {};
      const teamId = String(rawItem?.teamId ?? '');
      const entries = Array.isArray(rawItem?.response) ? rawItem.response : [];

      const absenceRows = entries.map((e: unknown) => {
        const entryRecord = typeof e === 'object' && e !== null ? (e as Record<string, unknown>) : {};
        const playerRecord = typeof entryRecord?.player === 'object' && entryRecord?.player !== null ? (entryRecord.player as Record<string, unknown>) : {};
        const playerIdValue = playerRecord?.id;
        const playerId =
          typeof playerIdValue === 'number' && Number.isFinite(playerIdValue)
            ? String(playerIdValue)
            : typeof playerIdValue === 'string'
              ? playerIdValue
              : null;
        const playerName = typeof playerRecord?.name === 'string' ? playerRecord.name.trim() : '';
        const playerPhoto = typeof playerRecord?.photo === 'string' ? playerRecord.photo : null;
        const reason = typeof playerRecord?.reason === 'string' ? playerRecord.reason.trim() : null;
        const type = typeof playerRecord?.type === 'string' ? playerRecord.type.trim() : null;
        const status = typeof entryRecord?.status === 'string' ? entryRecord.status.trim() : null;

        if (!playerName) {
          return null;
        }

        return {
          id: playerId,
          name: playerName,
          photo: playerPhoto,
          reason,
          status,
          type,
        } satisfies MatchLineupAbsence;
      }).filter((entry): entry is MatchLineupAbsence => entry !== null);
      if (teamId && absenceRows.length > 0) {
        absencesMap.set(teamId, absenceRows);
      }
    });

    const mappedLineups = resolvedLineups.data
      .map(raw => mapMatchLineupTeam(raw))
      .filter((team): team is Omit<MatchLineupTeam, 'absences'> => team !== null)
      .map(team => ({
        ...team,
        absences: absencesMap.get(team.teamId) ?? [],
      } as MatchLineupTeam));

    return mappedLineups;
  }, [resolvedAbsences.data, resolvedLineups.data]);

  const datasetErrors = useMemo(
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

  const datasetErrorReasons = useMemo(
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

  const dataSources = useMemo(
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

  return {
    isPreMatch: lifecycleState === 'pre_match',
    isLive: lifecycleState === 'live',
    isFinished: lifecycleState === 'finished',
    isInitialLoading,
    isInitialError,
    isLiveRefreshing: summaryIsFetching,
    onRetryAll: retryAll,
    onRefreshLineups,
    isLineupsRefetching: lineupsQuery.isFetching,
    navigation,
    safeMatchId,
    activeTab,
    setActiveTab,
    lifecycleState,
    tabs,
    fixture,
    statusLabel,
    kickoffLabel,
    countdownLabel,
    events: resolvedEvents.data,
    statistics: resolvedStatistics.data,
    statsRowsByPeriod,
    statsAvailablePeriods,
    lineupTeams: teamLineups,
    predictions: predictionsRaw,
    winPercent,
    absences: resolvedAbsences.data,
    homePlayersStats: resolvedHomePlayersStats.data,
    awayPlayersStats: resolvedAwayPlayersStats.data,
    standings: standingsQuery.data,
    homeTeamId,
    awayTeamId,
    headToHead: resolvedHeadToHead.data,
    datasetErrors,
    datasetErrorReasons,
    dataSources,
  };
}
