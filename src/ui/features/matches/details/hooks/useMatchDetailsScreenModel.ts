import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { fetchLeagueStandings } from '@data/endpoints/competitionsApi';
import {
  classifyFixtureStatus,
  formatStatusLabel,
} from '@data/mappers/fixturesMapper';
import { sanitizeNumericEntityId } from '@ui/app/navigation/routeParams';
import type { RootStackParamList } from '@ui/app/navigation/types';
import { useMatchesRefresh } from '@ui/features/matches/hooks/useMatchesRefresh';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';
import { queryKeys } from '@ui/shared/query/queryKeys';
import type {
  ApiFootballFixtureDto,
  MatchDetailTabDefinition,
  MatchDetailsTabKey,
  MatchLifecycleState,
} from '@ui/features/matches/types/matches.types';

type MatchDetailsRoute = RouteProp<RootStackParamList, 'MatchDetails'>;
type MatchDetailsNavigation = NativeStackNavigationProp<RootStackParamList, 'MatchDetails'>;

type RawRecord = Record<string, unknown>;

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

  return `${parsed.toLocaleDateString()} ${parsed.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
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

  tabs.push(
    {
      key: 'standings',
      label: t('matchDetails.tabs.standings'),
    },
    {
      key: 'stats',
      label: t('matchDetails.tabs.stats'),
    },
    {
      key: 'h2h',
      label: t('matchDetails.tabs.h2h'),
    },
  );

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
  });

  const fixture = fixtureQuery.data ?? null;
  const lifecycleState = useMemo(() => toLifecycleState(fixture), [fixture]);
  const hasPreMatchLineups = useMemo(
    () => toArray(lineupsQuery.data).length > 0,
    [lineupsQuery.data],
  );
  const tabs = useMemo(
    () => toTabDefinitions(lifecycleState, hasPreMatchLineups, t),
    [hasPreMatchLineups, lifecycleState, t],
  );

  useEffect(() => {
    if (!tabs.some(tab => tab.key === activeTab)) {
      setActiveTab('primary');
    }
  }, [activeTab, tabs]);

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
  });

  const statisticsQuery = useQuery({
    queryKey: queryKeys.matchStatistics(safeMatchId ?? 'invalid'),
    enabled: Boolean(safeMatchId),
    queryFn: ({ signal }) =>
      fetchFixtureStatistics({
        fixtureId: safeMatchId ?? '',
        signal,
      }),
    ...featureQueryOptions.matches.statistics,
  });

  const h2hQuery = useQuery({
    queryKey: queryKeys.matchHeadToHead(safeMatchId ?? 'invalid', timezone, 10),
    enabled: Boolean(safeMatchId),
    queryFn: ({ signal }) =>
      fetchFixtureHeadToHead({
        fixtureId: safeMatchId ?? '',
        timezone,
        last: 10,
        signal,
      }),
    ...featureQueryOptions.matches.h2h,
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
    lineupsQuery.isFetching ||
    standingsQuery.isFetching ||
    h2hQuery.isFetching;

  const isOffline = netInfo.isConnected === false || netInfo.isInternetReachable === false;
  const networkLiteMode = isOffline || netInfo.details?.isConnectionExpensive === true;
  const batteryLiteMode = powerState.lowPowerMode === true;

  const refetchLiveData = useCallback(async () => {
    const results = await Promise.all([
      fixtureQuery.refetch(),
      eventsQuery.refetch(),
      statisticsQuery.refetch(),
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
    lineupsQuery.refetch().catch(() => undefined);
    h2hQuery.refetch().catch(() => undefined);
    predictionsQuery.refetch().catch(() => undefined);
    absencesQuery.refetch().catch(() => undefined);
    homePlayersStatsQuery.refetch().catch(() => undefined);
    awayPlayersStatsQuery.refetch().catch(() => undefined);
    standingsQuery.refetch().catch(() => undefined);
  }, [
    absencesQuery,
    awayPlayersStatsQuery,
    eventsQuery,
    fixtureQuery,
    h2hQuery,
    homePlayersStatsQuery,
    lineupsQuery,
    predictionsQuery,
    standingsQuery,
    statisticsQuery,
  ]);

  const predictionsRaw = useMemo(
    () => toRawRecord(predictionsQuery.data?.[0] ?? null),
    [predictionsQuery.data],
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

  return {
    navigation,
    safeMatchId,
    timezone,
    activeTab,
    setActiveTab,
    tabs,
    fixture,
    lifecycleState,
    statusLabel,
    kickoffLabel,
    countdownLabel,
    isInitialLoading: fixtureQuery.isLoading,
    isInitialError: fixtureQuery.isError || !safeMatchId,
    isLiveRefreshing: summaryIsFetching,
    onRetryAll: retryAll,
    events: toArray(eventsQuery.data),
    statistics: toArray(statisticsQuery.data),
    lineups: toArray(lineupsQuery.data),
    h2h: toArray(h2hQuery.data),
    predictions: predictionsRaw,
    winPercent,
    absences: toArray(absencesQuery.data),
    homePlayersStats: toArray(homePlayersStatsQuery.data),
    awayPlayersStats: toArray(awayPlayersStatsQuery.data),
    standings: standingsQuery.data,
    homeTeamId,
    awayTeamId,
  };
}
