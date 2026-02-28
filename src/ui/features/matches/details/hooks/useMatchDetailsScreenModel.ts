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
  fetchTeamFixtures,
  fetchTeamPlayers,
} from '@data/endpoints/teamsApi';
import {
  classifyFixtureStatus,
  formatStatusLabel,
  mapMatchLineupTeam,
} from '@data/mappers/fixturesMapper';
import {
  mapFixturesToTeamMatches,
  mapPlayersToTopPlayers,
  mapPlayersToTopPlayersByCategory,
} from '@data/mappers/teamsMapper';
import { sanitizeNumericEntityId } from '@ui/app/navigation/routeParams';
import type { RootStackParamList } from '@ui/app/navigation/types';
import { useMatchesRefresh } from '@ui/features/matches/hooks/useMatchesRefresh';
import { buildStatRows } from '@ui/features/matches/details/components/tabs/shared/matchDetailsSelectors';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';
import { queryKeys } from '@ui/shared/query/queryKeys';
import type {
  ApiFootballFixtureDto,
  MatchDetailTabDefinition,
  MatchPostMatchSection,
  MatchPostMatchTabViewModel,
  MatchPreMatchLeaderPlayer,
  MatchPreMatchRecentResult,
  MatchPreMatchSection,
  MatchPreMatchTabViewModel,
  MatchDetailsTabKey,
  MatchLifecycleState,
  MatchLineupAbsence,
  MatchLineupTeam,
} from '@ui/features/matches/types/matches.types';
import type {
  TeamApiPlayerDto,
  TeamMatchesData,
  TeamTopPlayer,
  TeamTopPlayersByCategory,
} from '@ui/features/teams/types/teams.types';
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

function toNullableText(value: unknown): string | null {
  const normalized = toText(value);
  return normalized.length > 0 ? normalized : null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function toId(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  return null;
}

type FetchTeamMatchesSnapshotParams = {
  teamId: string;
  leagueId: number;
  season: number;
  timezone: string;
  signal?: AbortSignal;
};

async function fetchTeamMatchesSnapshot({
  teamId,
  leagueId,
  season,
  timezone,
  signal,
}: FetchTeamMatchesSnapshotParams): Promise<TeamMatchesData> {
  const fixtures = await fetchTeamFixtures(
    {
      teamId,
      leagueId: String(leagueId),
      season,
      timezone,
    },
    signal,
  );

  return mapFixturesToTeamMatches(fixtures);
}

async function fetchAllTeamPlayers({
  teamId,
  leagueId,
  season,
  signal,
}: {
  teamId: string;
  leagueId: number;
  season: number;
  signal?: AbortSignal;
}): Promise<TeamApiPlayerDto[]> {
  const firstPage = await fetchTeamPlayers(
    {
      teamId,
      leagueId: String(leagueId),
      season,
      page: 1,
    },
    signal,
  );

  const totalPages = Math.max(1, firstPage.paging?.total ?? 1);
  if (totalPages <= 1) {
    return firstPage.response ?? [];
  }

  const nextPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      fetchTeamPlayers(
        {
          teamId,
          leagueId: String(leagueId),
          season,
          page: index + 2,
        },
        signal,
      )),
  );

  return [firstPage, ...nextPages].flatMap(page => page.response ?? []);
}

async function fetchTeamLeadersByCategory({
  teamId,
  leagueId,
  season,
  signal,
}: {
  teamId: string;
  leagueId: number;
  season: number;
  signal?: AbortSignal;
}): Promise<TeamTopPlayersByCategory> {
  const players = await fetchAllTeamPlayers({
    teamId,
    leagueId,
    season,
    signal,
  });

  const leadersByCategory = mapPlayersToTopPlayersByCategory(players, 1, {
    teamId,
    leagueId: String(leagueId),
    season,
  });

  const topPlayers = mapPlayersToTopPlayers(players, 30, {
    teamId,
    leagueId: String(leagueId),
    season,
  });

  const fallbackTopScorer = [...topPlayers]
    .filter(player => player.goals !== null)
    .sort((first, second) => {
      const byGoals = (second.goals ?? -1) - (first.goals ?? -1);
      if (byGoals !== 0) {
        return byGoals;
      }

      return (second.rating ?? -1) - (first.rating ?? -1);
    })
    .slice(0, 1);

  const fallbackTopAssister = [...topPlayers]
    .filter(player => player.assists !== null)
    .sort((first, second) => {
      const byAssists = (second.assists ?? -1) - (first.assists ?? -1);
      if (byAssists !== 0) {
        return byAssists;
      }

      return (second.rating ?? -1) - (first.rating ?? -1);
    })
    .slice(0, 1);

  return {
    ratings: leadersByCategory.ratings,
    scorers: leadersByCategory.scorers.length > 0 ? leadersByCategory.scorers : fallbackTopScorer,
    assisters: leadersByCategory.assisters.length > 0 ? leadersByCategory.assisters : fallbackTopAssister,
  };
}

function normalizePreMatchResult({
  homeGoals,
  awayGoals,
  isHomeTeam,
}: {
  homeGoals: number | null;
  awayGoals: number | null;
  isHomeTeam: boolean;
}): MatchPreMatchRecentResult['result'] {
  if (homeGoals === null || awayGoals === null) {
    return '';
  }

  if (homeGoals === awayGoals) {
    return 'D';
  }

  if (isHomeTeam) {
    return homeGoals > awayGoals ? 'W' : 'L';
  }

  return awayGoals > homeGoals ? 'W' : 'L';
}

type TeamContextMatch = TeamMatchesData['all'][number];

const EMPTY_TEAM_MATCHES: TeamMatchesData = {
  all: [],
  upcoming: [],
  live: [],
  past: [],
};

function toRecentResultRows({
  matches,
  teamId,
  leagueId,
}: {
  matches: TeamContextMatch[];
  teamId: string;
  leagueId: number;
}): MatchPreMatchRecentResult[] {
  const sameCompetitionFinished = matches
    .filter(match => {
      const matchLeagueId = toId(match.leagueId);
      if (!matchLeagueId || matchLeagueId !== String(leagueId)) {
        return false;
      }

      return match.status === 'finished';
    });

  const sourceRows = sameCompetitionFinished.length > 0
    ? sameCompetitionFinished
    : matches.filter(match => match.status === 'finished');

  return sourceRows
    .sort((first, second) => {
      const firstDate = first.date ? new Date(first.date).getTime() : 0;
      const secondDate = second.date ? new Date(second.date).getTime() : 0;
      return secondDate - firstDate;
    })
    .slice(0, 5)
    .map(match => {
      const isHomeTeam = match.homeTeamId === teamId;
      const score =
        typeof match.homeGoals === 'number' && typeof match.awayGoals === 'number'
          ? `${match.homeGoals}-${match.awayGoals}`
          : null;

      return {
        fixtureId: match.fixtureId,
        homeTeamName: match.homeTeamName,
        homeTeamLogo: match.homeTeamLogo,
        awayTeamName: match.awayTeamName,
        awayTeamLogo: match.awayTeamLogo,
        homeGoals: match.homeGoals,
        awayGoals: match.awayGoals,
        score,
        result: normalizePreMatchResult({
          homeGoals: match.homeGoals,
          awayGoals: match.awayGoals,
          isHomeTeam,
        }),
      } satisfies MatchPreMatchRecentResult;
    });
}

function toUpcomingRows({
  matches,
  leagueId,
}: {
  matches: TeamContextMatch[];
  leagueId: number;
}) {
  const sameCompetitionUpcoming = matches.filter(match => {
    const matchLeagueId = toId(match.leagueId);
    return match.status === 'upcoming' && matchLeagueId === String(leagueId);
  });

  const sourceRows = sameCompetitionUpcoming.length > 0
    ? sameCompetitionUpcoming
    : matches.filter(match => match.status === 'upcoming');

  return sourceRows
    .sort((first, second) => {
      const firstDate = first.date ? new Date(first.date).getTime() : Number.MAX_SAFE_INTEGER;
      const secondDate = second.date ? new Date(second.date).getTime() : Number.MAX_SAFE_INTEGER;
      return firstDate - secondDate;
    })
    .slice(0, 3)
    .map(match => ({
      fixtureId: match.fixtureId,
      leagueId: match.leagueId,
      leagueName: match.leagueName,
      leagueLogo: match.leagueLogo,
      dateIso: match.date,
      kickoffDisplay: formatKickoffWithDate(match.date),
      homeTeamName: match.homeTeamName,
      homeTeamLogo: match.homeTeamLogo,
      awayTeamName: match.awayTeamName,
      awayTeamLogo: match.awayTeamLogo,
      homeGoals: match.homeGoals,
      awayGoals: match.awayGoals,
    }));
}

function toTeamMatchesSnapshot(value: unknown): TeamMatchesData {
  const rawValue = toRawRecord(value);
  if (!rawValue) {
    return EMPTY_TEAM_MATCHES;
  }

  const all = toArray(rawValue.all) as TeamContextMatch[];
  const upcoming = toArray(rawValue.upcoming) as TeamContextMatch[];
  const live = toArray(rawValue.live) as TeamContextMatch[];
  const past = toArray(rawValue.past) as TeamContextMatch[];

  return {
    all,
    upcoming,
    live,
    past,
  };
}

function toLeaderPlayer(player: TeamTopPlayer | null | undefined): MatchPreMatchLeaderPlayer | null {
  if (!player || !player.playerId) {
    return null;
  }

  return {
    playerId: player.playerId,
    name: player.name,
    photo: player.photo,
    teamLogo: player.teamLogo,
    position: player.position,
    goals: player.goals,
    assists: player.assists,
    rating: player.rating,
  };
}

function pickWeather(fixture: ApiFootballFixtureDto | null, fixtureRecord: RawRecord | null) {
  const fixtureRecordNode = toRawRecord(fixtureRecord?.fixture);
  const fixtureWeatherNode =
    toRawRecord(fixtureRecordNode?.weather) ??
    toRawRecord(fixture?.fixture.weather) ??
    toRawRecord(fixtureRecord?.weather);

  if (!fixtureWeatherNode) {
    return null;
  }

  return {
    temperature:
      toNumber(fixtureWeatherNode.temp) ??
      toNumber(fixtureWeatherNode.temperature) ??
      toNumber(fixtureWeatherNode.temp_c) ??
      toNumber(fixtureWeatherNode.temperatureC),
    feelsLike:
      toNumber(fixtureWeatherNode.feels_like) ??
      toNumber(fixtureWeatherNode.feelsLike) ??
      toNumber(fixtureWeatherNode.feels_like_c) ??
      toNumber(fixtureWeatherNode.feelsLikeC),
    humidity: toNumber(fixtureWeatherNode.humidity),
    windSpeed:
      toNumber(fixtureWeatherNode.wind_kph) ??
      toNumber(fixtureWeatherNode.windSpeed),
    description:
      toNullableText(fixtureWeatherNode.description) ??
      toNullableText(fixtureWeatherNode.text) ??
      toNullableText(fixtureWeatherNode.main),
    icon: toNullableText(fixtureWeatherNode.icon),
  };
}

function hasWeatherData(
  weather: ReturnType<typeof pickWeather>,
): boolean {
  if (!weather) {
    return false;
  }

  return (
    typeof weather.temperature === 'number' ||
    typeof weather.feelsLike === 'number' ||
    typeof weather.humidity === 'number' ||
    typeof weather.windSpeed === 'number' ||
    Boolean(weather.description) ||
    Boolean(weather.icon)
  );
}

function formatKickoffWithDate(dateIso: string | null | undefined): string | null {
  if (!dateIso) {
    return null;
  }

  const parsed = new Date(dateIso);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
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

function buildPreMatchSections({
  isLoading,
  fixture,
  fixtureRecord,
  predictionsPercent,
  winPercent,
  leagueId,
  homeTeamId,
  awayTeamId,
  homeRecentMatches,
  awayRecentMatches,
  standings,
  homeLeaders,
  awayLeaders,
}: {
  isLoading: boolean;
  fixture: ApiFootballFixtureDto | null;
  fixtureRecord: RawRecord | null;
  predictionsPercent: {
    home: string | null;
    draw: string | null;
    away: string | null;
  };
  winPercent: {
    home: string;
    draw: string;
    away: string;
  };
  leagueId: number | undefined;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeRecentMatches: TeamContextMatch[];
  awayRecentMatches: TeamContextMatch[];
  standings: {
    league?: {
      name?: string;
      standings?: Array<Array<{
        rank: number;
        team: {
          id: number;
          name: string;
          logo: string;
        };
        points: number;
        goalsDiff: number;
        all: {
          played: number;
          win: number;
          draw: number;
          lose: number;
        };
      }>>;
    };
  } | null | undefined;
  homeLeaders: TeamTopPlayersByCategory | null;
  awayLeaders: TeamTopPlayersByCategory | null;
}): MatchPreMatchTabViewModel {
  const homeTeamName = fixture?.teams.home.name ?? '';
  const awayTeamName = fixture?.teams.away.name ?? '';

  const fixtureNode = toRawRecord(fixtureRecord?.fixture);
  const venueNode = toRawRecord(fixtureNode?.venue);
  const leagueNode = toRawRecord(fixtureRecord?.league);

  const venueName = toNullableText(fixture?.fixture.venue.name) ?? toNullableText(venueNode?.name);
  const venueCity = toNullableText(fixture?.fixture.venue.city) ?? toNullableText(venueNode?.city);
  const venueCapacity = toNumber(fixture?.fixture.venue.capacity) ?? toNumber(venueNode?.capacity);
  const venueSurface = toNullableText(fixture?.fixture.venue.surface) ?? toNullableText(venueNode?.surface);
  const weather = pickWeather(fixture, fixtureRecord);

  const roundValue = toNullableText(fixture?.league.round) ?? toNullableText(leagueNode?.round);
  const competitionType = toNullableText(fixture?.league.type) ?? toNullableText(leagueNode?.type);
  const refereeValue = toNullableText(fixture?.fixture.referee) ?? toNullableText(fixtureNode?.referee);
  const kickoffDisplay = formatKickoffWithDate(fixture?.fixture.date);

  const shouldShowWinProbability =
    Boolean(predictionsPercent.home) ||
    Boolean(predictionsPercent.draw) ||
    Boolean(predictionsPercent.away);

  const winProbabilitySection: MatchPreMatchSection = {
    id: 'winProbability',
    order: 1,
    isAvailable: shouldShowWinProbability,
    payload: shouldShowWinProbability
      ? {
        homeTeamName,
        awayTeamName,
        home: winPercent.home,
        draw: winPercent.draw,
        away: winPercent.away,
      }
      : null,
  };

  const hasVenueWeatherData =
    Boolean(venueName) ||
    Boolean(venueCity) ||
    typeof venueCapacity === 'number' ||
    Boolean(venueSurface) ||
    hasWeatherData(weather);

  const venueWeatherSection: MatchPreMatchSection = {
    id: 'venueWeather',
    order: 2,
    isAvailable: hasVenueWeatherData,
    payload: hasVenueWeatherData
      ? {
        venueName,
        venueCity,
        capacity: venueCapacity,
        surface: venueSurface,
        weather,
      }
      : null,
  };

  const hasCompetitionMetaData =
    Boolean(fixture?.league.name) ||
    Boolean(roundValue) ||
    Boolean(kickoffDisplay) ||
    Boolean(refereeValue) ||
    Boolean(competitionType);

  const competitionMetaSection: MatchPreMatchSection = {
    id: 'competitionMeta',
    order: 3,
    isAvailable: hasCompetitionMetaData,
    payload: hasCompetitionMetaData
      ? {
        competitionName: toNullableText(fixture?.league.name),
        competitionType,
        competitionRound: roundValue,
        kickoffDateIso: toNullableText(fixture?.fixture.date),
        kickoffDisplay,
        referee: refereeValue,
      }
      : null,
  };

  const homeRecentRows =
    homeTeamId && typeof leagueId === 'number'
      ? toRecentResultRows({
        matches: homeRecentMatches,
        teamId: homeTeamId,
        leagueId,
      })
      : [];
  const awayRecentRows =
    awayTeamId && typeof leagueId === 'number'
      ? toRecentResultRows({
        matches: awayRecentMatches,
        teamId: awayTeamId,
        leagueId,
      })
      : [];
  const hasRecentResultsData = homeRecentRows.length > 0 || awayRecentRows.length > 0;

  const recentResultsSection: MatchPreMatchSection = {
    id: 'recentResults',
    order: 4,
    isAvailable: hasRecentResultsData,
    payload: hasRecentResultsData
      ? {
        home: {
          teamId: homeTeamId,
          teamName: homeTeamName,
          teamLogo: fixture?.teams.home.logo ?? null,
          matches: homeRecentRows,
        },
        away: {
          teamId: awayTeamId,
          teamName: awayTeamName,
          teamLogo: fixture?.teams.away.logo ?? null,
          matches: awayRecentRows,
        },
      }
      : null,
  };

  const standingsRows = (standings?.league?.standings ?? []).flat();
  const homeStandingRow =
    standingsRows.find(row => String(row.team.id) === homeTeamId) ?? null;
  const awayStandingRow =
    standingsRows.find(row => String(row.team.id) === awayTeamId) ?? null;
  const hasStandingsData = homeStandingRow !== null && awayStandingRow !== null;

  const standingsSection: MatchPreMatchSection = {
    id: 'standings',
    order: 5,
    isAvailable: hasStandingsData,
    payload: hasStandingsData
      ? {
        competitionName: toNullableText(standings?.league?.name) ?? toNullableText(fixture?.league.name),
        home: {
          teamId: homeTeamId,
          teamName: homeStandingRow?.team.name ?? null,
          teamLogo: homeStandingRow?.team.logo ?? null,
          rank: homeStandingRow?.rank ?? null,
          played: homeStandingRow?.all.played ?? null,
          win: homeStandingRow?.all.win ?? null,
          draw: homeStandingRow?.all.draw ?? null,
          lose: homeStandingRow?.all.lose ?? null,
          goalDiff: homeStandingRow?.goalsDiff ?? null,
          points: homeStandingRow?.points ?? null,
        },
        away: {
          teamId: awayTeamId,
          teamName: awayStandingRow?.team.name ?? null,
          teamLogo: awayStandingRow?.team.logo ?? null,
          rank: awayStandingRow?.rank ?? null,
          played: awayStandingRow?.all.played ?? null,
          win: awayStandingRow?.all.win ?? null,
          draw: awayStandingRow?.all.draw ?? null,
          lose: awayStandingRow?.all.lose ?? null,
          goalDiff: awayStandingRow?.goalsDiff ?? null,
          points: awayStandingRow?.points ?? null,
        },
      }
      : null,
  };

  const homeTopScorer = toLeaderPlayer(homeLeaders?.scorers?.[0]);
  const homeTopAssister = toLeaderPlayer(homeLeaders?.assisters?.[0]);
  const awayTopScorer = toLeaderPlayer(awayLeaders?.scorers?.[0]);
  const awayTopAssister = toLeaderPlayer(awayLeaders?.assisters?.[0]);
  const hasLeadersData =
    (homeTopScorer !== null || homeTopAssister !== null) &&
    (awayTopScorer !== null || awayTopAssister !== null);

  const leadersSection: MatchPreMatchSection = {
    id: 'leadersComparison',
    order: 6,
    isAvailable: hasLeadersData,
    payload: hasLeadersData
      ? {
        home: {
          teamId: homeTeamId,
          teamName: homeTeamName,
          teamLogo: fixture?.teams.home.logo ?? null,
          topScorer: homeTopScorer,
          topAssister: homeTopAssister,
        },
        away: {
          teamId: awayTeamId,
          teamName: awayTeamName,
          teamLogo: fixture?.teams.away.logo ?? null,
          topScorer: awayTopScorer,
          topAssister: awayTopAssister,
        },
      }
      : null,
  };

  const sectionsOrdered = [
    winProbabilitySection,
    venueWeatherSection,
    competitionMetaSection,
    recentResultsSection,
    standingsSection,
    leadersSection,
  ];

  return {
    sectionsOrdered,
    hasAnySection: sectionsOrdered.some(section => section.isAvailable),
    isLoading,
  };
}

function buildPostMatchSections({
  isLoading,
  fixture,
  fixtureRecord,
  leagueId,
  homeTeamId,
  awayTeamId,
  homeTeamMatches,
  awayTeamMatches,
  standings,
}: {
  isLoading: boolean;
  fixture: ApiFootballFixtureDto | null;
  fixtureRecord: RawRecord | null;
  leagueId: number | undefined;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeamMatches: TeamContextMatch[];
  awayTeamMatches: TeamContextMatch[];
  standings: {
    league?: {
      name?: string;
      standings?: Array<Array<{
        rank: number;
        team: {
          id: number;
          name: string;
          logo: string;
        };
        points: number;
        goalsDiff: number;
        all: {
          played: number;
          win: number;
          draw: number;
          lose: number;
        };
      }>>;
    };
  } | null | undefined;
}): MatchPostMatchTabViewModel {
  const homeTeamName = fixture?.teams.home.name ?? '';
  const awayTeamName = fixture?.teams.away.name ?? '';

  const fixtureNode = toRawRecord(fixtureRecord?.fixture);
  const venueNode = toRawRecord(fixtureNode?.venue);
  const leagueNode = toRawRecord(fixtureRecord?.league);

  const venueName = toNullableText(fixture?.fixture.venue.name) ?? toNullableText(venueNode?.name);
  const venueCity = toNullableText(fixture?.fixture.venue.city) ?? toNullableText(venueNode?.city);
  const venueCapacity = toNumber(fixture?.fixture.venue.capacity) ?? toNumber(venueNode?.capacity);
  const venueSurface = toNullableText(fixture?.fixture.venue.surface) ?? toNullableText(venueNode?.surface);
  const weather = pickWeather(fixture, fixtureRecord);

  const roundValue = toNullableText(fixture?.league.round) ?? toNullableText(leagueNode?.round);
  const competitionType = toNullableText(fixture?.league.type) ?? toNullableText(leagueNode?.type);
  const refereeValue = toNullableText(fixture?.fixture.referee) ?? toNullableText(fixtureNode?.referee);
  const kickoffDisplay = formatKickoffWithDate(fixture?.fixture.date);

  const hasVenueWeatherData =
    Boolean(venueName) ||
    Boolean(venueCity) ||
    typeof venueCapacity === 'number' ||
    Boolean(venueSurface) ||
    hasWeatherData(weather);

  const venueWeatherSection: MatchPostMatchSection = {
    id: 'venueWeather',
    order: 4,
    isAvailable: hasVenueWeatherData,
    payload: hasVenueWeatherData
      ? {
        venueName,
        venueCity,
        capacity: venueCapacity,
        surface: venueSurface,
        weather,
      }
      : null,
  };

  const hasCompetitionMetaData =
    Boolean(fixture?.league.name) ||
    Boolean(roundValue) ||
    Boolean(kickoffDisplay) ||
    Boolean(refereeValue) ||
    Boolean(competitionType);

  const competitionMetaSection: MatchPostMatchSection = {
    id: 'competitionMeta',
    order: 5,
    isAvailable: hasCompetitionMetaData,
    payload: hasCompetitionMetaData
      ? {
        competitionName: toNullableText(fixture?.league.name),
        competitionType,
        competitionRound: roundValue,
        kickoffDateIso: toNullableText(fixture?.fixture.date),
        kickoffDisplay,
        referee: refereeValue,
      }
      : null,
  };

  const standingsRows = (standings?.league?.standings ?? []).flat();
  const homeStandingRow =
    standingsRows.find(row => String(row.team.id) === homeTeamId) ?? null;
  const awayStandingRow =
    standingsRows.find(row => String(row.team.id) === awayTeamId) ?? null;
  const hasStandingsData = homeStandingRow !== null && awayStandingRow !== null;

  const standingsSection: MatchPostMatchSection = {
    id: 'standings',
    order: 6,
    isAvailable: hasStandingsData,
    payload: hasStandingsData
      ? {
        competitionName: toNullableText(standings?.league?.name) ?? toNullableText(fixture?.league.name),
        home: {
          teamId: homeTeamId,
          teamName: homeStandingRow?.team.name ?? null,
          teamLogo: homeStandingRow?.team.logo ?? null,
          rank: homeStandingRow?.rank ?? null,
          played: homeStandingRow?.all.played ?? null,
          win: homeStandingRow?.all.win ?? null,
          draw: homeStandingRow?.all.draw ?? null,
          lose: homeStandingRow?.all.lose ?? null,
          goalDiff: homeStandingRow?.goalsDiff ?? null,
          points: homeStandingRow?.points ?? null,
        },
        away: {
          teamId: awayTeamId,
          teamName: awayStandingRow?.team.name ?? null,
          teamLogo: awayStandingRow?.team.logo ?? null,
          rank: awayStandingRow?.rank ?? null,
          played: awayStandingRow?.all.played ?? null,
          win: awayStandingRow?.all.win ?? null,
          draw: awayStandingRow?.all.draw ?? null,
          lose: awayStandingRow?.all.lose ?? null,
          goalDiff: awayStandingRow?.goalsDiff ?? null,
          points: awayStandingRow?.points ?? null,
        },
      }
      : null,
  };

  const homeRecentRows =
    homeTeamId && typeof leagueId === 'number'
      ? toRecentResultRows({
        matches: homeTeamMatches,
        teamId: homeTeamId,
        leagueId,
      })
      : [];
  const awayRecentRows =
    awayTeamId && typeof leagueId === 'number'
      ? toRecentResultRows({
        matches: awayTeamMatches,
        teamId: awayTeamId,
        leagueId,
      })
      : [];
  const hasRecentResultsData = homeRecentRows.length > 0 || awayRecentRows.length > 0;

  const recentResultsSection: MatchPostMatchSection = {
    id: 'recentResults',
    order: 7,
    isAvailable: hasRecentResultsData,
    payload: hasRecentResultsData
      ? {
        home: {
          teamId: homeTeamId,
          teamName: homeTeamName,
          teamLogo: fixture?.teams.home.logo ?? null,
          matches: homeRecentRows,
        },
        away: {
          teamId: awayTeamId,
          teamName: awayTeamName,
          teamLogo: fixture?.teams.away.logo ?? null,
          matches: awayRecentRows,
        },
      }
      : null,
  };

  const homeUpcomingRows =
    typeof leagueId === 'number'
      ? toUpcomingRows({
        matches: homeTeamMatches,
        leagueId,
      })
      : [];
  const awayUpcomingRows =
    typeof leagueId === 'number'
      ? toUpcomingRows({
        matches: awayTeamMatches,
        leagueId,
      })
      : [];
  const hasUpcomingData = homeUpcomingRows.length > 0 || awayUpcomingRows.length > 0;

  const upcomingMatchesSection: MatchPostMatchSection = {
    id: 'upcomingMatches',
    order: 8,
    isAvailable: hasUpcomingData,
    payload: hasUpcomingData
      ? {
        home: {
          teamId: homeTeamId,
          teamName: homeTeamName,
          teamLogo: fixture?.teams.home.logo ?? null,
          matches: homeUpcomingRows,
        },
        away: {
          teamId: awayTeamId,
          teamName: awayTeamName,
          teamLogo: fixture?.teams.away.logo ?? null,
          matches: awayUpcomingRows,
        },
      }
      : null,
  };

  const sectionsOrdered: MatchPostMatchSection[] = [
    venueWeatherSection,
    competitionMetaSection,
    standingsSection,
    recentResultsSection,
    upcomingMatchesSection,
  ];

  return {
    sectionsOrdered,
    hasAnySection: sectionsOrdered.some(section => section.isAvailable),
    isLoading,
  };
}

function toTabDefinitions(
  lifecycleState: MatchLifecycleState,
  shouldShowPreMatchPrimaryTab: boolean,
  hasTimeline: boolean,
  hasLineups: boolean,
  hasStandings: boolean,
  hasStatistics: boolean,
  t: (key: string) => string,
): MatchDetailTabDefinition[] {
  const tabs: MatchDetailTabDefinition[] = [];

  if (lifecycleState !== 'pre_match' || shouldShowPreMatchPrimaryTab) {
    tabs.push({
      key: 'primary',
      label: lifecycleState === 'pre_match'
        ? t('matchDetails.tabs.preMatch')
        : t('matchDetails.tabs.summary'),
    });
  }

  if (lifecycleState !== 'pre_match' && hasTimeline) {
    tabs.push({
      key: 'timeline',
      label: t('matchDetails.tabs.timeline'),
    });
  }

  if (hasLineups) {
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
  const canFetchHeadToHead = Boolean(safeMatchId) && Boolean(homeTeamId) && Boolean(awayTeamId);

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
    enabled: canFetchHeadToHead,
    queryFn: ({ signal }) =>
      fetchFixtureHeadToHead({
        fixtureId: safeMatchId ?? '',
        last: 20,
        timezone,
        signal,
      }),
    ...featureQueryOptions.matches.headToHead,
    refetchOnMount: 'always',
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

  const shouldFetchTeamContext =
    (lifecycleState === 'pre_match' || lifecycleState === 'finished') &&
    Boolean(safeMatchId) &&
    typeof leagueId === 'number' &&
    typeof season === 'number';

  const shouldFetchPreMatchExtras =
    lifecycleState === 'pre_match' &&
    Boolean(safeMatchId) &&
    typeof leagueId === 'number' &&
    typeof season === 'number';

  const homeTeamMatchesQuery = useQuery({
    queryKey: queryKeys.matchTeamRecentResults(safeMatchId ?? 'invalid', homeTeamId ?? 'unknown'),
    enabled: shouldFetchTeamContext && Boolean(homeTeamId),
    queryFn: ({ signal }) =>
      fetchTeamMatchesSnapshot({
        teamId: homeTeamId ?? '',
        leagueId: leagueId as number,
        season: season as number,
        timezone,
        signal,
      }),
    ...featureQueryOptions.teams.matches,
    refetchOnMount: 'always',
    retry: shouldRetryMatchDetailsRequest(featureQueryOptions.teams.matches.retry),
  });

  const awayTeamMatchesQuery = useQuery({
    queryKey: queryKeys.matchTeamRecentResults(safeMatchId ?? 'invalid', awayTeamId ?? 'unknown'),
    enabled: shouldFetchTeamContext && Boolean(awayTeamId),
    queryFn: ({ signal }) =>
      fetchTeamMatchesSnapshot({
        teamId: awayTeamId ?? '',
        leagueId: leagueId as number,
        season: season as number,
        timezone,
        signal,
      }),
    ...featureQueryOptions.teams.matches,
    refetchOnMount: 'always',
    retry: shouldRetryMatchDetailsRequest(featureQueryOptions.teams.matches.retry),
  });

  const homeLeadersQuery = useQuery({
    queryKey: queryKeys.matchTeamLeaders(safeMatchId ?? 'invalid', homeTeamId ?? 'unknown'),
    enabled: shouldFetchPreMatchExtras && Boolean(homeTeamId),
    queryFn: ({ signal }) =>
      fetchTeamLeadersByCategory({
        teamId: homeTeamId ?? '',
        leagueId: leagueId as number,
        season: season as number,
        signal,
      }),
    ...featureQueryOptions.teams.stats,
    refetchOnMount: 'always',
    retry: shouldRetryMatchDetailsRequest(featureQueryOptions.teams.stats.retry),
  });

  const awayLeadersQuery = useQuery({
    queryKey: queryKeys.matchTeamLeaders(safeMatchId ?? 'invalid', awayTeamId ?? 'unknown'),
    enabled: shouldFetchPreMatchExtras && Boolean(awayTeamId),
    queryFn: ({ signal }) =>
      fetchTeamLeadersByCategory({
        teamId: awayTeamId ?? '',
        leagueId: leagueId as number,
        season: season as number,
        signal,
      }),
    ...featureQueryOptions.teams.stats,
    refetchOnMount: 'always',
    retry: shouldRetryMatchDetailsRequest(featureQueryOptions.teams.stats.retry),
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

  const hasLineupsData = useMemo(
    () =>
      resolvedLineups.data.some(rawEntry => {
        const entry = toRawRecord(rawEntry);
        if (!entry) {
          return false;
        }

        const startXI = toArray(entry.startXI);
        const substitutes = toArray(entry.substitutes);
        const coach = toRawRecord(entry.coach);
        const coachName = toText(coach?.name);

        return startXI.length > 0 || substitutes.length > 0 || coachName.length > 0;
      }),
    [resolvedLineups.data],
  );
  const hasTimelineData = resolvedEvents.data.length > 0;

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

  const winPercent = useMemo(() => ({
    home: predictionsPercent.home ?? '0%',
    draw: predictionsPercent.draw ?? '0%',
    away: predictionsPercent.away ?? '0%',
  }), [predictionsPercent.away, predictionsPercent.draw, predictionsPercent.home]);

  const homeTeamMatches = useMemo(
    () => toTeamMatchesSnapshot(homeTeamMatchesQuery.data),
    [homeTeamMatchesQuery.data],
  );
  const awayTeamMatches = useMemo(
    () => toTeamMatchesSnapshot(awayTeamMatchesQuery.data),
    [awayTeamMatchesQuery.data],
  );

  const preMatchIsLoading =
    shouldFetchPreMatchExtras && (
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
      awayTeamMatches.all,
      awayTeamId,
      fixture,
      fixtureRecord,
      homeLeadersQuery.data,
      homeTeamMatches.all,
      homeTeamId,
      leagueId,
      preMatchIsLoading,
      predictionsPercent,
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
      postMatchIsLoading,
      standingsQuery.data,
    ],
  );

  const tabs = useMemo(
    () =>
      toTabDefinitions(
        lifecycleState,
        fixtureQuery.isLoading || preMatchTab.hasAnySection || preMatchTab.isLoading,
        hasTimelineData,
        hasLineupsData,
        hasStandings,
        hasStatistics,
        t,
      ),
    [
      hasLineupsData,
      hasStandings,
      hasStatistics,
      hasTimelineData,
      lifecycleState,
      fixtureQuery.isLoading,
      preMatchTab.hasAnySection,
      preMatchTab.isLoading,
      t,
    ],
  );

  useEffect(() => {
    setActiveTab('primary');
  }, [safeMatchId]);

  useEffect(() => {
    setActiveTab(currentTab => {
      if (tabs.some((tab: MatchDetailTabDefinition) => tab.key === currentTab)) {
        return currentTab;
      }

      return tabs[0]?.key ?? 'primary';
    });
  }, [tabs]);

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
    homeTeamMatchesQuery.refetch().catch(() => undefined);
    awayTeamMatchesQuery.refetch().catch(() => undefined);
    homeLeadersQuery.refetch().catch(() => undefined);
    awayLeadersQuery.refetch().catch(() => undefined);
  }, [
    absencesQuery,
    awayPlayersStatsQuery,
    awayTeamMatchesQuery,
    eventsQuery,
    fixtureQuery,
    headToHeadQuery,
    homeLeadersQuery,
    homePlayersStatsQuery,
    homeTeamMatchesQuery,
    lineupsQuery,
    awayLeadersQuery,
    predictionsQuery,
    standingsQuery,
    statisticsFirstHalfQuery,
    statisticsSecondHalfQuery,
    statisticsQuery,
  ]);

  const onRefreshLineups = useCallback(() => {
    lineupsQuery.refetch().catch(() => undefined);
  }, [lineupsQuery]);

  const isInitialLoading = fixtureQuery.isLoading;
  const isInitialError = fixtureQuery.isError || !safeMatchId;

  const queryLineupsRaw = toArray(lineupsQuery.data);
  const queryHeadToHeadRaw = toArray(headToHeadQuery.data);
  const autoRefetchedFinishedLineupsRef = useRef<string | null>(null);
  const autoRefetchedPrematchHeadToHeadRef = useRef<string | null>(null);

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

  useEffect(() => {
    if (!safeMatchId) {
      autoRefetchedPrematchHeadToHeadRef.current = null;
      return;
    }

    const guardKey = `${safeMatchId}:pre_match:h2h`;
    if (lifecycleState !== 'pre_match') {
      if (autoRefetchedPrematchHeadToHeadRef.current === guardKey) {
        autoRefetchedPrematchHeadToHeadRef.current = null;
      }
      return;
    }

    if (!canFetchHeadToHead) {
      return;
    }

    if (queryHeadToHeadRaw.length > 0 || headToHeadQuery.isFetching) {
      return;
    }

    if (autoRefetchedPrematchHeadToHeadRef.current === guardKey) {
      return;
    }

    autoRefetchedPrematchHeadToHeadRef.current = guardKey;
    headToHeadQuery.refetch().catch(() => undefined);
  }, [
    canFetchHeadToHead,
    headToHeadQuery,
    lifecycleState,
    queryHeadToHeadRaw.length,
    safeMatchId,
  ]);

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
    preMatchTab,
    postMatchTab,
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
