import type { AppEnv, CacheBackend, NotificationsPersistenceBackend } from './types.js';

export const DEFAULT_PORT = 3001;
export const DEFAULT_HOST = '0.0.0.0';
export const DEFAULT_API_BASE_URL = 'https://v3.football.api-sports.io';
export const DEFAULT_API_TIMEOUT_MS = 10_000;
export const DEFAULT_API_MAX_RETRIES = 2;
export const DEFAULT_RATE_LIMIT_MAX = 120;
export const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
export const DEFAULT_TRUST_PROXY_HOPS = 0;
export const DEFAULT_CACHE_MAX_ENTRIES = 1_000;
export const DEFAULT_CACHE_CLEANUP_INTERVAL_MS = 60_000;
export const DEFAULT_CACHE_TTL_JITTER_PCT = 15;
export const DEFAULT_CACHE_LOCK_TTL_MS = 3_000;
export const DEFAULT_CACHE_COALESCE_WAIT_MS = 750;
export const DEFAULT_UPSTREAM_GLOBAL_RPM_LIMIT = 600;
export const DEFAULT_UPSTREAM_CIRCUIT_BREAKER_WINDOW_MS = 30_000;
export const DEFAULT_REDIS_CACHE_PREFIX = 'footalert:bff:';
export const DEFAULT_BFF_EXPOSE_ERROR_DETAILS = false;
export const DEFAULT_MOBILE_SESSION_TOKEN_TTL_MS = 15 * 60_000;
export const DEFAULT_MOBILE_REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60_000;
export const DEFAULT_MOBILE_AUTH_CHALLENGE_TTL_MS = 2 * 60_000;
export const DEFAULT_MOBILE_ATTESTATION_ACCEPT_MOCK = false;
export const DEFAULT_MOBILE_ATTESTATION_ENFORCEMENT_MODE = 'strict';
export const DEFAULT_PAGINATION_CURSOR_TTL_MS = 15 * 60_000;
export const DEFAULT_NOTIFICATIONS_BACKEND_ENABLED = true;
export const DEFAULT_NOTIFICATIONS_EVENT_INGEST_ENABLED = true;
export const DEFAULT_NOTIFICATIONS_FANOUT_MAX_PER_EVENT = 10_000;
export const DEFAULT_NOTIFICATIONS_DEFERRED_PROMOTION_BATCH = 1_000;
export const DEFAULT_NOTIFICATIONS_DEFERRED_DELAY_MS = 15_000;
export const DEFAULT_BFF_ENABLE_PLAYER_CANONICAL_CACHE_KEYS = true;
export const DEFAULT_BFF_ENABLE_PLAYER_MATCHES_SWR = true;
export const DEFAULT_BFF_ENABLE_PLAYER_OVERVIEW_ROUTE = true;

export const LEGACY_HMAC_ENV_KEYS = [
  'MOBILE_REQUEST_SIGNING_KEY',
  'MOBILE_REQUEST_SIGNING_SECRET',
  'MOBILE_REQUEST_SIGNATURE_HEADER',
] as const;

export function defaultCacheBackendForEnv(appEnv: AppEnv): CacheBackend {
  if (appEnv === 'production' || appEnv === 'staging') {
    return 'redis';
  }

  return 'memory';
}

export function defaultNotificationsPersistenceBackendForEnv(
  appEnv: AppEnv,
): NotificationsPersistenceBackend {
  if (appEnv === 'production' || appEnv === 'staging') {
    return 'postgres';
  }

  return 'memory';
}
