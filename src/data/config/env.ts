import Config from 'react-native-config';
import {
  LIVE_REFRESH_INTERVAL_MS,
  MAX_REFRESH_BACKOFF_MS,
  SLOW_REFRESH_INTERVAL_MS,
  TOP_COMPETITION_IDS,
} from '@/shared/constants';

const DEFAULT_API_BASE_URL = 'https://v3.football.api-sports.io';
const DEFAULT_MATCHES_QUERY_STALE_TIME_MS = 60_000;
const DEFAULT_FOLLOWS_SEARCH_DEBOUNCE_MS = 500;
const DEFAULT_FOLLOWS_SEARCH_MIN_CHARS = 2;
const DEFAULT_FOLLOWS_SEARCH_RESULTS_LIMIT = 20;
const DEFAULT_FOLLOWS_TEAM_NEXT_FIXTURE_TTL_MS = 3_600_000;
const DEFAULT_FOLLOWS_PLAYER_STATS_TTL_MS = 3_600_000;
const DEFAULT_FOLLOWS_TRENDS_TTL_MS = 21_600_000;
const DEFAULT_FOLLOWS_TRENDS_LEAGUE_COUNT = 7;
const DEFAULT_FOLLOWS_TRENDS_TEAMS_LIMIT = 8;
const DEFAULT_FOLLOWS_TRENDS_PLAYERS_LIMIT = 8;
const DEFAULT_FOLLOWS_MAX_FOLLOWED_TEAMS = 30;
const DEFAULT_FOLLOWS_MAX_FOLLOWED_PLAYERS = 30;

export type AppEnv = {
  apiFootballBaseUrl: string;
  apiFootballKey: string;
  matchesDemoMode: boolean;
  matchesApiErrorFallbackEnabled: boolean;
  matchesQueryStaleTimeMs: number;
  matchesLiveRefreshIntervalMs: number;
  matchesSlowRefreshIntervalMs: number;
  matchesMaxRefreshBackoffMs: number;
  followsSearchDebounceMs: number;
  followsSearchMinChars: number;
  followsSearchResultsLimit: number;
  followsTeamNextFixtureTtlMs: number;
  followsPlayerStatsTtlMs: number;
  followsTrendsTtlMs: number;
  followsTrendsLeagueCount: number;
  followsTrendsTeamsLimit: number;
  followsTrendsPlayersLimit: number;
  followsMaxFollowedTeams: number;
  followsMaxFollowedPlayers: number;
};

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function readApiFootballBaseUrl(): string {
  const configuredBaseUrl = Config.API_FOOTBALL_BASE_URL?.trim();
  if (!configuredBaseUrl) {
    return DEFAULT_API_BASE_URL;
  }

  return normalizeUrl(configuredBaseUrl);
}

function readApiFootballKey(): string {
  const configuredKey = Config.API_FOOTBALL_KEY?.trim();
  return configuredKey ?? '';
}

function readMatchesDemoMode(): boolean {
  return readBooleanConfig(Config.MATCHES_DEMO_MODE, false);
}

function readMatchesApiErrorFallbackEnabled(): boolean {
  return readBooleanConfig(Config.MATCHES_API_ERROR_FALLBACK_ENABLED, true);
}

function readBooleanConfig(rawValue: string | undefined, defaultValue: boolean): boolean {
  const configuredValue = rawValue?.trim().toLowerCase();
  if (!configuredValue) {
    return defaultValue;
  }

  return configuredValue === 'true' || configuredValue === '1';
}

function readPositiveIntConfig(rawValue: string | undefined, defaultValue: number): number {
  const configuredValue = rawValue?.trim();
  if (!configuredValue) {
    return defaultValue;
  }

  const parsedValue = Number.parseInt(configuredValue, 10);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return defaultValue;
  }

  return parsedValue;
}

function readPositiveIntInRangeConfig(
  rawValue: string | undefined,
  defaultValue: number,
  min: number,
  max: number,
): number {
  const parsedValue = readPositiveIntConfig(rawValue, defaultValue);
  return Math.min(Math.max(parsedValue, min), max);
}

const configuredLiveRefreshIntervalMs = readPositiveIntConfig(
  Config.MATCHES_LIVE_REFRESH_INTERVAL_MS,
  LIVE_REFRESH_INTERVAL_MS,
);
const configuredSlowRefreshIntervalMs = Math.max(
  readPositiveIntConfig(Config.MATCHES_SLOW_REFRESH_INTERVAL_MS, SLOW_REFRESH_INTERVAL_MS),
  configuredLiveRefreshIntervalMs,
);
const configuredMaxRefreshBackoffMs = Math.max(
  readPositiveIntConfig(
    Config.MATCHES_MAX_REFRESH_BACKOFF_MS,
    MAX_REFRESH_BACKOFF_MS,
  ),
  configuredSlowRefreshIntervalMs,
);

export const appEnv: AppEnv = {
  apiFootballBaseUrl: readApiFootballBaseUrl(),
  apiFootballKey: readApiFootballKey(),
  matchesDemoMode: readMatchesDemoMode(),
  matchesApiErrorFallbackEnabled: readMatchesApiErrorFallbackEnabled(),
  matchesQueryStaleTimeMs: readPositiveIntConfig(
    Config.MATCHES_QUERY_STALE_TIME_MS,
    DEFAULT_MATCHES_QUERY_STALE_TIME_MS,
  ),
  matchesLiveRefreshIntervalMs: configuredLiveRefreshIntervalMs,
  matchesSlowRefreshIntervalMs: configuredSlowRefreshIntervalMs,
  matchesMaxRefreshBackoffMs: configuredMaxRefreshBackoffMs,
  followsSearchDebounceMs: readPositiveIntInRangeConfig(
    Config.FOLLOWS_SEARCH_DEBOUNCE_MS,
    DEFAULT_FOLLOWS_SEARCH_DEBOUNCE_MS,
    100,
    3_000,
  ),
  followsSearchMinChars: readPositiveIntInRangeConfig(
    Config.FOLLOWS_SEARCH_MIN_CHARS,
    DEFAULT_FOLLOWS_SEARCH_MIN_CHARS,
    1,
    5,
  ),
  followsSearchResultsLimit: readPositiveIntInRangeConfig(
    Config.FOLLOWS_SEARCH_RESULTS_LIMIT,
    DEFAULT_FOLLOWS_SEARCH_RESULTS_LIMIT,
    1,
    100,
  ),
  followsTeamNextFixtureTtlMs: readPositiveIntConfig(
    Config.FOLLOWS_TEAM_NEXT_FIXTURE_TTL_MS,
    DEFAULT_FOLLOWS_TEAM_NEXT_FIXTURE_TTL_MS,
  ),
  followsPlayerStatsTtlMs: readPositiveIntConfig(
    Config.FOLLOWS_PLAYER_STATS_TTL_MS,
    DEFAULT_FOLLOWS_PLAYER_STATS_TTL_MS,
  ),
  followsTrendsTtlMs: readPositiveIntConfig(
    Config.FOLLOWS_TRENDS_TTL_MS,
    DEFAULT_FOLLOWS_TRENDS_TTL_MS,
  ),
  followsTrendsLeagueCount: readPositiveIntInRangeConfig(
    Config.FOLLOWS_TRENDS_LEAGUE_COUNT,
    DEFAULT_FOLLOWS_TRENDS_LEAGUE_COUNT,
    1,
    TOP_COMPETITION_IDS.length,
  ),
  followsTrendsTeamsLimit: readPositiveIntInRangeConfig(
    Config.FOLLOWS_TRENDS_TEAMS_LIMIT,
    DEFAULT_FOLLOWS_TRENDS_TEAMS_LIMIT,
    1,
    40,
  ),
  followsTrendsPlayersLimit: readPositiveIntInRangeConfig(
    Config.FOLLOWS_TRENDS_PLAYERS_LIMIT,
    DEFAULT_FOLLOWS_TRENDS_PLAYERS_LIMIT,
    1,
    40,
  ),
  followsMaxFollowedTeams: readPositiveIntInRangeConfig(
    Config.FOLLOWS_MAX_FOLLOWED_TEAMS,
    DEFAULT_FOLLOWS_MAX_FOLLOWED_TEAMS,
    1,
    200,
  ),
  followsMaxFollowedPlayers: readPositiveIntInRangeConfig(
    Config.FOLLOWS_MAX_FOLLOWED_PLAYERS,
    DEFAULT_FOLLOWS_MAX_FOLLOWED_PLAYERS,
    1,
    200,
  ),
};

export function getApiFootballEnvOrThrow(): AppEnv {
  if (!appEnv.apiFootballKey) {
    throw new Error(
      'Missing API_FOOTBALL_KEY. Set it in your .env file before calling API-Football.',
    );
  }

  return appEnv;
}
