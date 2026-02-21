import Config from 'react-native-config';
import {
  LIVE_REFRESH_INTERVAL_MS,
  MAX_REFRESH_BACKOFF_MS,
  SLOW_REFRESH_INTERVAL_MS,
  TOP_COMPETITION_IDS,
} from '@/shared/constants';

const DEFAULT_MOBILE_API_BASE_URL = 'http://localhost:3001/v1';
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
  mobileApiBaseUrl: string;
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

function readMobileApiBaseUrl(): string {
  const configuredBaseUrl = Config.MOBILE_API_BASE_URL?.trim();
  if (!configuredBaseUrl) {
    return DEFAULT_MOBILE_API_BASE_URL;
  }

  return normalizeUrl(configuredBaseUrl);
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
  readPositiveIntConfig(Config.MATCHES_MAX_REFRESH_BACKOFF_MS, MAX_REFRESH_BACKOFF_MS),
  configuredSlowRefreshIntervalMs,
);

export const appEnv: AppEnv = {
  mobileApiBaseUrl: readMobileApiBaseUrl(),
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

export function getMobileApiEnvOrThrow(): AppEnv {
  if (!appEnv.mobileApiBaseUrl) {
    throw new Error('Missing MOBILE_API_BASE_URL. Set it in your .env file.');
  }

  return appEnv;
}
