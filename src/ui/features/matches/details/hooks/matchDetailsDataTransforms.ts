import { ApiError } from '@data/api/http/client';
import {
  classifyFixtureStatus,
} from '@data/mappers/fixturesMapper';
import type { CompetitionsApiStandingDto } from '@domain/contracts/competitions.types';
import type { ApiFootballFixtureDto } from '@ui/features/matches/types/matches.types';
import type {
  MatchDetailsDatasetErrorReason,
} from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabTypes';
import type {
  MatchLifecycleState,
  MatchPostMatchUpcomingMatch,
  MatchPreMatchLeaderPlayer,
  MatchPreMatchRecentResult,
  MatchPreMatchWeather,
} from '@ui/features/matches/types/matches.types';
import type {
  TeamMatchesData,
  TeamTopPlayer,
} from '@ui/features/teams/types/teams.types';

type TranslationFn = (key: string, options?: Record<string, unknown>) => string;

export type RawRecord = Record<string, unknown>;
export type MatchDetailsDatasetSource = 'query' | 'fixture_fallback' | 'none';
export type TeamContextMatch = TeamMatchesData['all'][number];
export type MatchStandingsData = CompetitionsApiStandingDto | null | undefined;

export type DatasetResolution = {
  data: unknown[];
  source: MatchDetailsDatasetSource;
  isError: boolean;
  errorReason: MatchDetailsDatasetErrorReason;
};

const PRE_MATCH_LINEUPS_VISIBILITY_WINDOW_MS = 20 * 60_000;

export const EMPTY_TEAM_MATCHES: TeamMatchesData = {
  all: [],
  upcoming: [],
  live: [],
  past: [],
};

export function toRawRecord(value: unknown): RawRecord | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  return value as RawRecord;
}

export function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toText(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export function toNullableText(value: unknown): string | null {
  const normalized = toText(value);
  return normalized.length > 0 ? normalized : null;
}

export function toNumber(value: unknown): number | null {
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

export function toId(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  return null;
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

export function toRecentResultRows({
  matches,
  teamId,
  leagueId,
}: {
  matches: TeamContextMatch[];
  teamId: string;
  leagueId: number;
}): MatchPreMatchRecentResult[] {
  const sameCompetitionFinished = matches.filter(match => {
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
        homeTeamId: match.homeTeamId ?? null,
        homeTeamName: match.homeTeamName,
        homeTeamLogo: match.homeTeamLogo,
        awayTeamId: match.awayTeamId ?? null,
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

export function toUpcomingRows({
  matches,
  leagueId,
  locale,
}: {
  matches: TeamContextMatch[];
  leagueId: number;
  locale: string;
}): MatchPostMatchUpcomingMatch[] {
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
      kickoffDisplay: formatKickoffWithDate(match.date, locale),
      homeTeamId: match.homeTeamId ?? null,
      homeTeamName: match.homeTeamName,
      homeTeamLogo: match.homeTeamLogo,
      awayTeamId: match.awayTeamId ?? null,
      awayTeamName: match.awayTeamName,
      awayTeamLogo: match.awayTeamLogo,
      homeGoals: match.homeGoals,
      awayGoals: match.awayGoals,
    }));
}

export function toTeamMatchesSnapshot(value: unknown): TeamMatchesData {
  const rawValue = toRawRecord(value);
  if (!rawValue) {
    return EMPTY_TEAM_MATCHES;
  }

  return {
    all: toArray(rawValue.all) as TeamContextMatch[],
    upcoming: toArray(rawValue.upcoming) as TeamContextMatch[],
    live: toArray(rawValue.live) as TeamContextMatch[],
    past: toArray(rawValue.past) as TeamContextMatch[],
  };
}

export function toLeaderPlayer(
  player: TeamTopPlayer | null | undefined,
): MatchPreMatchLeaderPlayer | null {
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

export function pickWeather(
  fixture: ApiFootballFixtureDto | null,
  fixtureRecord: RawRecord | null,
): MatchPreMatchWeather | null {
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

export function hasWeatherData(weather: MatchPreMatchWeather | null): boolean {
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

export function formatKickoffWithDate(dateIso: string | null | undefined, locale: string): string | null {
  if (!dateIso) {
    return null;
  }

  const parsed = new Date(dateIso);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleString(locale, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function shouldRetryMatchDetailsRequest(maxRetries: number | boolean | undefined) {
  const retryLimit =
    typeof maxRetries === 'number'
      ? maxRetries
      : maxRetries === false
        ? 0
        : 2;

  return (failureCount: number, error: unknown): boolean => {
    if (error instanceof ApiError && error.status === 404) {
      return false;
    }

    return failureCount < retryLimit;
  };
}

export function resolveDatasetWithFallback({
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

export function filterPlayersStatsByTeam(rows: unknown[], teamId: string | null): unknown[] {
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

export function toLifecycleState(fixture: ApiFootballFixtureDto | null): MatchLifecycleState {
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

export function formatKickoff(dateIso: string | null | undefined, locale: string): string {
  if (!dateIso) {
    return '';
  }

  const parsed = new Date(dateIso);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return parsed.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatCountdown(dateIso: string | null | undefined, t: TranslationFn): string {
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

export function isWithinPreMatchLineupsVisibilityWindow(
  dateIso: string | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (!dateIso) {
    return false;
  }

  const kickoffDate = new Date(dateIso);
  const kickoffTimestampMs = kickoffDate.getTime();
  if (Number.isNaN(kickoffTimestampMs)) {
    return false;
  }

  const msUntilKickoff = kickoffTimestampMs - nowMs;
  return msUntilKickoff >= 0 && msUntilKickoff <= PRE_MATCH_LINEUPS_VISIBILITY_WINDOW_MS;
}

export function extractFixtureSeason(fixture: ApiFootballFixtureDto | null): number | null {
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

export function pickTeamIdsFromFixture(fixture: ApiFootballFixtureDto | null): {
  homeTeamId: string | null;
  awayTeamId: string | null;
} {
  if (!fixture) {
    return {
      homeTeamId: null,
      awayTeamId: null,
    };
  }

  return {
    homeTeamId: Number.isFinite(fixture.teams.home.id) ? String(fixture.teams.home.id) : null,
    awayTeamId: Number.isFinite(fixture.teams.away.id) ? String(fixture.teams.away.id) : null,
  };
}
