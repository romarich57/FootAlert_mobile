import Config from 'react-native-config';
import {
  LIVE_REFRESH_INTERVAL_MS,
  MAX_REFRESH_BACKOFF_MS,
  SLOW_REFRESH_INTERVAL_MS,
  TOP_COMPETITION_IDS,
} from '@/shared/constants';

const DEFAULT_MOBILE_API_BASE_URL = 'http://localhost:3001/v1';
const DEFAULT_MATCHES_QUERY_STALE_TIME_MS = 60_000;
const DEFAULT_MATCHES_BATTERY_SAVER_REFRESH_INTERVAL_MS = 120_000;
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
const DEFAULT_MOBILE_ENABLE_BFF_PLAYER_AGGREGATES = false;
const DEFAULT_MOBILE_AUTH_ATTESTATION_MODE = 'provider';
const DEFAULT_MOBILE_ATTESTATION_STRATEGY = 'strict';
const DEFAULT_MOBILE_SESSION_TOKEN_TTL_MS = 600_000;
const DEFAULT_ASSET_CDN_REWRITE_ENABLED = false;

function readRuntimeNodeEnv(): string | undefined {
  const runtimeProcess = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process;
  return runtimeProcess?.env?.NODE_ENV;
}

const IS_DEV_RUNTIME =
  typeof __DEV__ === 'boolean' ? __DEV__ : readRuntimeNodeEnv() !== 'production';

export type AppEnv = {
  mobileApiBaseUrl: string;
  mobileApiHost: string;
  privacyPolicyUrl?: string;
  supportUrl?: string;
  followUsUrl?: string;
  appStoreUrl?: string;
  playStoreUrl?: string;
  mobileAuthAttestationMode: 'mock' | 'provider';
  mobileAttestationStrategy: 'strict' | 'best-effort' | 'disabled';
  mobileSessionTokenTtlMs: number;
  mobilePinningEnabled: boolean;
  mobilePinningHost: string;
  mobilePinningSpkiPrimary?: string;
  mobilePinningSpkiBackup?: string;
  mobilePinningKillSwitchAllow: boolean;
  assetCdnRewriteEnabled: boolean;
  assetCdnBaseUrl?: string;
  matchesQueryStaleTimeMs: number;
  matchesLiveRefreshIntervalMs: number;
  matchesSlowRefreshIntervalMs: number;
  matchesMaxRefreshBackoffMs: number;
  matchesBatterySaverRefreshIntervalMs: number;
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
  mobileEnableBffPlayerAggregates: boolean;
};

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function parseNamedUrlOrThrow(value: string, envVarName: string): URL {
  try {
    return new URL(value);
  } catch {
    throw new Error(`Invalid ${envVarName} value "${value}". Expected an absolute URL.`);
  }
}

function parseUrlOrThrow(value: string): URL {
  return parseNamedUrlOrThrow(value, 'MOBILE_API_BASE_URL');
}

function isLocalDevHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '10.0.2.2'
  );
}

export function resolveMobileApiBaseUrl(
  configuredBaseUrl: string | undefined,
  isDevRuntime: boolean = IS_DEV_RUNTIME,
): string {
  const fallbackUrl = isDevRuntime ? DEFAULT_MOBILE_API_BASE_URL : '';
  const selectedUrl = normalizeUrl(configuredBaseUrl?.trim() || fallbackUrl);
  if (!selectedUrl) {
    throw new Error(
      'Missing MOBILE_API_BASE_URL. Set it in your env file for non-dev builds.',
    );
  }

  const parsedUrl = parseUrlOrThrow(selectedUrl);
  const isHttps = parsedUrl.protocol === 'https:';
  const isHttp = parsedUrl.protocol === 'http:';
  if (!isHttps && !isHttp) {
    throw new Error(
      `Unsupported MOBILE_API_BASE_URL protocol "${parsedUrl.protocol}". Use https:// (or http://localhost only in dev).`,
    );
  }

  if (!isDevRuntime && !isHttps) {
    throw new Error(
      'MOBILE_API_BASE_URL must use HTTPS for non-dev builds.',
    );
  }

  if (isDevRuntime && isHttp && !isLocalDevHost(parsedUrl.hostname)) {
    throw new Error(
      'MOBILE_API_BASE_URL can use HTTP only for localhost/127.0.0.1/10.0.2.2 in dev.',
    );
  }

  return selectedUrl;
}

export function resolveExternalUrl(
  configuredUrl: string | undefined,
  envVarName: string,
  options: {
    isDevRuntime?: boolean;
    requiredOutsideDev?: boolean;
  } = {},
): string | undefined {
  const { isDevRuntime = IS_DEV_RUNTIME, requiredOutsideDev = false } = options;
  const selectedUrl = normalizeUrl(configuredUrl?.trim() || '');
  if (!selectedUrl) {
    if (requiredOutsideDev && !isDevRuntime) {
      throw new Error(`Missing ${envVarName}. Set it in your env file for non-dev builds.`);
    }
    return undefined;
  }

  const parsedUrl = parseNamedUrlOrThrow(selectedUrl, envVarName);
  if (parsedUrl.protocol !== 'https:') {
    throw new Error(`${envVarName} must use HTTPS.`);
  }

  return selectedUrl;
}

function readMobileApiBaseUrl(): string {
  return resolveMobileApiBaseUrl(Config.MOBILE_API_BASE_URL, IS_DEV_RUNTIME);
}

function readPrivacyPolicyUrl(): string | undefined {
  return resolveExternalUrl(Config.MOBILE_PRIVACY_POLICY_URL, 'MOBILE_PRIVACY_POLICY_URL', {
    isDevRuntime: IS_DEV_RUNTIME,
    requiredOutsideDev: true,
  });
}

function readSupportUrl(): string | undefined {
  return resolveExternalUrl(Config.MOBILE_SUPPORT_URL, 'MOBILE_SUPPORT_URL', {
    isDevRuntime: IS_DEV_RUNTIME,
    requiredOutsideDev: true,
  });
}

function readFollowUsUrl(): string | undefined {
  return resolveExternalUrl(Config.MOBILE_FOLLOW_US_URL, 'MOBILE_FOLLOW_US_URL', {
    isDevRuntime: IS_DEV_RUNTIME,
    requiredOutsideDev: true,
  });
}

function readAppStoreUrl(): string | undefined {
  return resolveExternalUrl(Config.MOBILE_APP_STORE_URL, 'MOBILE_APP_STORE_URL', {
    isDevRuntime: IS_DEV_RUNTIME,
    requiredOutsideDev: false,
  });
}

function readPlayStoreUrl(): string | undefined {
  return resolveExternalUrl(Config.MOBILE_PLAY_STORE_URL, 'MOBILE_PLAY_STORE_URL', {
    isDevRuntime: IS_DEV_RUNTIME,
    requiredOutsideDev: false,
  });
}

function readAssetCdnBaseUrl(): string | undefined {
  return resolveExternalUrl(Config.ASSET_CDN_BASE_URL, 'ASSET_CDN_BASE_URL', {
    isDevRuntime: IS_DEV_RUNTIME,
    requiredOutsideDev: false,
  });
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

function readBooleanConfig(rawValue: string | undefined, defaultValue: boolean): boolean {
  const configuredValue = rawValue?.trim().toLowerCase();
  if (!configuredValue) {
    return defaultValue;
  }

  if (configuredValue === '1' || configuredValue === 'true' || configuredValue === 'yes') {
    return true;
  }

  if (configuredValue === '0' || configuredValue === 'false' || configuredValue === 'no') {
    return false;
  }

  return defaultValue;
}

export function resolveMobileAuthAttestationMode(
  rawValue: string | undefined,
  isDevRuntime: boolean = IS_DEV_RUNTIME,
): 'mock' | 'provider' {
  const configured = rawValue?.trim().toLowerCase();
  if (configured === 'mock') {
    if (!isDevRuntime) {
      throw new Error(
        'MOBILE_AUTH_ATTESTATION_MODE=mock is not allowed outside dev runtime.',
      );
    }
    return 'mock';
  }

  if (configured === 'provider') {
    return 'provider';
  }

  if (isDevRuntime) {
    return 'mock';
  }

  return DEFAULT_MOBILE_AUTH_ATTESTATION_MODE as 'provider';
}

export function resolveMobileAttestationStrategy(
  rawValue: string | undefined,
  isDevRuntime: boolean = IS_DEV_RUNTIME,
): 'strict' | 'best-effort' | 'disabled' {
  const configured = rawValue?.trim().toLowerCase();

  if (configured === 'strict') {
    return 'strict';
  }

  if (configured === 'best-effort' || configured === 'best_effort') {
    return 'best-effort';
  }

  if (configured === 'disabled') {
    if (!isDevRuntime) {
      throw new Error(
        'MOBILE_ATTESTATION_STRATEGY=disabled is not allowed outside dev runtime.',
      );
    }
    return 'disabled';
  }

  if (isDevRuntime) {
    return 'disabled';
  }

  return DEFAULT_MOBILE_ATTESTATION_STRATEGY as 'strict';
}

function readSpkiPin(rawValue: string | undefined): string | undefined {
  const pin = rawValue?.trim();
  if (!pin) {
    return undefined;
  }

  if (!pin.startsWith('sha256/')) {
    throw new Error(`Invalid SPKI pin format "${pin}". Expected prefix "sha256/".`);
  }

  return pin;
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
const configuredMobileApiBaseUrl = readMobileApiBaseUrl();
const configuredMobileApiHost = new URL(configuredMobileApiBaseUrl).host;
const configuredPinningEnabled = readBooleanConfig(
  Config.MOBILE_PINNING_ENABLED,
  !IS_DEV_RUNTIME,
);
const configuredPinningHost = Config.MOBILE_PINNING_HOST?.trim() || configuredMobileApiHost;
const configuredSpkiPrimary = readSpkiPin(Config.MOBILE_PINNING_SPKI_PRIMARY);
const configuredSpkiBackup = readSpkiPin(Config.MOBILE_PINNING_SPKI_BACKUP);
const configuredAssetCdnRewriteEnabled = readBooleanConfig(
  Config.ASSET_CDN_REWRITE_ENABLED,
  DEFAULT_ASSET_CDN_REWRITE_ENABLED,
);
const configuredAssetCdnBaseUrl = readAssetCdnBaseUrl();

if (configuredPinningEnabled && !IS_DEV_RUNTIME && (!configuredSpkiPrimary || !configuredSpkiBackup)) {
  throw new Error(
    'MOBILE_PINNING_ENABLED=true requires MOBILE_PINNING_SPKI_PRIMARY and MOBILE_PINNING_SPKI_BACKUP outside dev.',
  );
}

if (configuredAssetCdnRewriteEnabled && !configuredAssetCdnBaseUrl) {
  throw new Error(
    'ASSET_CDN_REWRITE_ENABLED=true requires ASSET_CDN_BASE_URL.',
  );
}

export const appEnv: AppEnv = {
  mobileApiBaseUrl: configuredMobileApiBaseUrl,
  mobileApiHost: configuredMobileApiHost,
  privacyPolicyUrl: readPrivacyPolicyUrl(),
  supportUrl: readSupportUrl(),
  followUsUrl: readFollowUsUrl(),
  appStoreUrl: readAppStoreUrl(),
  playStoreUrl: readPlayStoreUrl(),
  mobileAuthAttestationMode: resolveMobileAuthAttestationMode(
    Config.MOBILE_AUTH_ATTESTATION_MODE,
    IS_DEV_RUNTIME,
  ),
  mobileAttestationStrategy: resolveMobileAttestationStrategy(
    Config.MOBILE_ATTESTATION_STRATEGY,
    IS_DEV_RUNTIME,
  ),
  mobileSessionTokenTtlMs: readPositiveIntConfig(
    Config.MOBILE_SESSION_TOKEN_TTL_MS,
    DEFAULT_MOBILE_SESSION_TOKEN_TTL_MS,
  ),
  mobilePinningEnabled: configuredPinningEnabled,
  mobilePinningHost: configuredPinningHost,
  mobilePinningSpkiPrimary: configuredSpkiPrimary,
  mobilePinningSpkiBackup: configuredSpkiBackup,
  mobilePinningKillSwitchAllow: readBooleanConfig(
    Config.MOBILE_PINNING_KILL_SWITCH_ALLOW,
    false,
  ),
  assetCdnRewriteEnabled: configuredAssetCdnRewriteEnabled,
  assetCdnBaseUrl: configuredAssetCdnBaseUrl,
  matchesQueryStaleTimeMs: readPositiveIntConfig(
    Config.MATCHES_QUERY_STALE_TIME_MS,
    DEFAULT_MATCHES_QUERY_STALE_TIME_MS,
  ),
  matchesLiveRefreshIntervalMs: configuredLiveRefreshIntervalMs,
  matchesSlowRefreshIntervalMs: configuredSlowRefreshIntervalMs,
  matchesMaxRefreshBackoffMs: configuredMaxRefreshBackoffMs,
  matchesBatterySaverRefreshIntervalMs: readPositiveIntConfig(
    Config.MATCHES_BATTERY_SAVER_REFRESH_INTERVAL_MS,
    DEFAULT_MATCHES_BATTERY_SAVER_REFRESH_INTERVAL_MS,
  ),
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
  mobileEnableBffPlayerAggregates: readBooleanConfig(
    Config.MOBILE_ENABLE_BFF_PLAYER_AGGREGATES,
    DEFAULT_MOBILE_ENABLE_BFF_PLAYER_AGGREGATES,
  ),
};

export function getMobileApiEnvOrThrow(): AppEnv {
  if (!appEnv.mobileApiBaseUrl) {
    throw new Error('Missing MOBILE_API_BASE_URL. Set it in your .env file.');
  }

  return appEnv;
}
