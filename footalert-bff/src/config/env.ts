const DEFAULT_PORT = 3001;
const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_API_BASE_URL = 'https://v3.football.api-sports.io';
const DEFAULT_API_TIMEOUT_MS = 10_000;
const DEFAULT_API_MAX_RETRIES = 2;
const DEFAULT_RATE_LIMIT_MAX = 120;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_TRUST_PROXY_HOPS = 0;
const DEFAULT_CACHE_MAX_ENTRIES = 1_000;
const DEFAULT_CACHE_CLEANUP_INTERVAL_MS = 60_000;
const DEFAULT_CACHE_TTL_JITTER_PCT = 15;
const DEFAULT_CACHE_LOCK_TTL_MS = 3_000;
const DEFAULT_CACHE_COALESCE_WAIT_MS = 750;
const DEFAULT_UPSTREAM_GLOBAL_RPM_LIMIT = 600;
const DEFAULT_UPSTREAM_CIRCUIT_BREAKER_WINDOW_MS = 30_000;
const DEFAULT_REDIS_CACHE_PREFIX = 'footalert:bff:';
const DEFAULT_BFF_EXPOSE_ERROR_DETAILS = false;
const DEFAULT_MOBILE_SESSION_TOKEN_TTL_MS = 15 * 60_000;
const DEFAULT_MOBILE_REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60_000;
const DEFAULT_MOBILE_AUTH_CHALLENGE_TTL_MS = 2 * 60_000;
const DEFAULT_MOBILE_ATTESTATION_ACCEPT_MOCK = false;
const DEFAULT_MOBILE_ATTESTATION_ENFORCEMENT_MODE = 'strict';
const DEFAULT_PAGINATION_CURSOR_TTL_MS = 15 * 60_000;
const DEFAULT_NOTIFICATIONS_BACKEND_ENABLED = true;
const DEFAULT_NOTIFICATIONS_EVENT_INGEST_ENABLED = true;
const DEFAULT_NOTIFICATIONS_FANOUT_MAX_PER_EVENT = 10_000;
const DEFAULT_NOTIFICATIONS_DEFERRED_PROMOTION_BATCH = 1_000;
const DEFAULT_NOTIFICATIONS_DEFERRED_DELAY_MS = 15_000;
const DEFAULT_BFF_ENABLE_PLAYER_CANONICAL_CACHE_KEYS = true;
const DEFAULT_BFF_ENABLE_PLAYER_MATCHES_SWR = true;
const DEFAULT_BFF_ENABLE_PLAYER_OVERVIEW_ROUTE = true;

type CacheBackend = 'memory' | 'redis';
type NotificationsPersistenceBackend = 'memory' | 'postgres';
type AppEnv = 'development' | 'test' | 'staging' | 'production';

type BffEnv = {
  appEnv: AppEnv;
  port: number;
  host: string;
  apiFootballBaseUrl: string;
  apiFootballKey: string;
  apiTimeoutMs: number;
  apiMaxRetries: number;
  rateLimitMax: number;
  rateLimitWindowMs: number;
  trustProxyHops: number;
  corsAllowedOrigins: string[];
  webAppOrigin: string | null;
  cacheMaxEntries: number;
  cacheCleanupIntervalMs: number;
  cacheTtlJitterPct: number;
  cacheLockTtlMs: number;
  cacheCoalesceWaitMs: number;
  upstreamGlobalRpmLimit: number;
  upstreamCircuitBreakerWindowMs: number;
  cacheBackend: CacheBackend;
  cacheStrictMode: boolean;
  redisUrl: string | null;
  redisCachePrefix: string;
  bffExposeErrorDetails: boolean;
  mobileSessionJwtSecret: string | null;
  mobileSessionTokenTtlMs: number;
  mobileRefreshTokenTtlMs: number;
  mobileAuthChallengeTtlMs: number;
  mobileAttestationAcceptMock: boolean;
  mobileAttestationEnforcementMode: 'strict' | 'report_only';
  mobileAuthEnforcedHosts: string[];
  mobilePlayIntegrityPackageName: string | null;
  mobilePlayIntegrityServiceAccountEmail: string | null;
  mobilePlayIntegrityServiceAccountPrivateKey: string | null;
  mobileAppAttestBundleId: string | null;
  mobileAppAttestTeamId: string | null;
  mobileAppAttestVerificationUrl: string | null;
  mobileAppAttestVerificationSecret: string | null;
  paginationCursorSecret: string;
  paginationCursorTtlMs: number;
  notificationsBackendEnabled: boolean;
  notificationsEventIngestEnabled: boolean;
  notificationsPersistenceBackend: NotificationsPersistenceBackend;
  notificationsFanoutMaxPerEvent: number;
  notificationsDeferredPromotionBatch: number;
  notificationsDeferredDelayMs: number;
  bffEnablePlayerCanonicalCacheKeys: boolean;
  bffEnablePlayerMatchesSwr: boolean;
  bffEnablePlayerOverviewRoute: boolean;
  databaseUrl: string | null;
  notificationsIngestToken: string | null;
  pushTokenEncryptionKey: string | null;
  firebaseProjectId: string | null;
  firebaseClientEmail: string | null;
  firebasePrivateKey: string | null;
};

const LEGACY_HMAC_ENV_KEYS = [
  'MOBILE_REQUEST_SIGNING_KEY',
  'MOBILE_REQUEST_SIGNING_SECRET',
  'MOBILE_REQUEST_SIGNATURE_HEADER',
] as const;

function normalizeUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

function readPositiveInt(rawValue: string | undefined, fallback: number): number {
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function readNonNegativeInt(rawValue: string | undefined, fallback: number): number {
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
}

function readApiFootballKey(): string {
  const apiFootballKey = process.env.API_FOOTBALL_KEY?.trim();
  if (!apiFootballKey) {
    throw new Error('Missing API_FOOTBALL_KEY in BFF environment.');
  }

  return apiFootballKey;
}

function readBoolean(rawValue: string | undefined, fallback: boolean): boolean {
  if (!rawValue) {
    return fallback;
  }

  const normalized = rawValue.trim().toLowerCase();
  if (normalized === '1' || normalized === 'true' || normalized === 'yes') {
    return true;
  }

  if (normalized === '0' || normalized === 'false' || normalized === 'no') {
    return false;
  }

  return fallback;
}

function readCacheBackend(rawValue: string | undefined, fallback: CacheBackend): CacheBackend {
  const normalized = rawValue?.trim().toLowerCase();
  if (normalized === 'redis') {
    return 'redis';
  }
  if (normalized === 'memory') {
    return 'memory';
  }

  return fallback;
}

function readNotificationsPersistenceBackend(
  rawValue: string | undefined,
  fallback: NotificationsPersistenceBackend,
): NotificationsPersistenceBackend {
  const normalized = rawValue?.trim().toLowerCase();
  if (normalized === 'postgres') {
    return 'postgres';
  }
  if (normalized === 'memory') {
    return 'memory';
  }

  return fallback;
}

function readOptionalValue(rawValue: string | undefined): string | null {
  const value = rawValue?.trim();
  return value ? value : null;
}

function readRedisCachePrefix(rawValue: string | undefined): string {
  const prefix = rawValue?.trim();
  if (!prefix) {
    return DEFAULT_REDIS_CACHE_PREFIX;
  }

  return prefix;
}

function readCsvList(rawValue: string | undefined): string[] {
  if (!rawValue) {
    return [];
  }

  return rawValue
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
}

function readAttestationEnforcementMode(rawValue: string | undefined): 'strict' | 'report_only' {
  const normalized = rawValue?.trim().toLowerCase();
  if (normalized === 'report_only' || normalized === 'report-only') {
    return 'report_only';
  }

  return DEFAULT_MOBILE_ATTESTATION_ENFORCEMENT_MODE;
}

function readHostList(rawValue: string | undefined): string[] {
  return readCsvList(rawValue).map(host => host.toLowerCase());
}

function readOptionalOrigin(rawValue: string | undefined): string | null {
  const trimmed = rawValue?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.origin;
  } catch {
    throw new Error(`Invalid WEB_APP_ORIGIN value: "${trimmed}"`);
  }
}

function buildCorsAllowedOrigins(rawOrigins: string | undefined, webAppOrigin: string | null): string[] {
  const normalizedOrigins = new Set<string>(readCsvList(rawOrigins));
  if (webAppOrigin) {
    normalizedOrigins.add(webAppOrigin);
  }

  return [...normalizedOrigins];
}

function isProxyLikeEnvironment(trustProxyHops: number): boolean {
  const runtimeEnv =
    process.env.APP_ENV?.trim().toLowerCase() || process.env.NODE_ENV?.trim().toLowerCase();
  if (runtimeEnv === 'production' || runtimeEnv === 'staging') {
    return true;
  }

  return trustProxyHops > 0;
}

function readAppEnv(rawValue: string | undefined): AppEnv {
  const normalized = rawValue?.trim().toLowerCase();
  if (normalized === 'production' || normalized === 'staging' || normalized === 'test') {
    return normalized;
  }

  return 'development';
}

function defaultCacheBackendForEnv(appEnv: AppEnv): CacheBackend {
  if (appEnv === 'production' || appEnv === 'staging') {
    return 'redis';
  }

  return 'memory';
}

function defaultNotificationsPersistenceBackendForEnv(appEnv: AppEnv): NotificationsPersistenceBackend {
  if (appEnv === 'production' || appEnv === 'staging') {
    return 'postgres';
  }

  return 'memory';
}

const resolvedAppEnv = readAppEnv(process.env.APP_ENV || process.env.NODE_ENV);
const defaultCacheBackend = defaultCacheBackendForEnv(resolvedAppEnv);
const defaultCacheStrictMode = resolvedAppEnv === 'production' || resolvedAppEnv === 'staging';
const defaultNotificationsPersistenceBackend = defaultNotificationsPersistenceBackendForEnv(resolvedAppEnv);

export const env: BffEnv = {
  appEnv: resolvedAppEnv,
  port: readPositiveInt(process.env.PORT, DEFAULT_PORT),
  host: process.env.HOST?.trim() || DEFAULT_HOST,
  apiFootballBaseUrl: normalizeUrl(
    process.env.API_FOOTBALL_BASE_URL?.trim() || DEFAULT_API_BASE_URL,
  ),
  apiFootballKey: readApiFootballKey(),
  apiTimeoutMs: readPositiveInt(process.env.API_TIMEOUT_MS, DEFAULT_API_TIMEOUT_MS),
  apiMaxRetries: readPositiveInt(process.env.API_MAX_RETRIES, DEFAULT_API_MAX_RETRIES),
  rateLimitMax: readPositiveInt(process.env.RATE_LIMIT_MAX, DEFAULT_RATE_LIMIT_MAX),
  rateLimitWindowMs: readPositiveInt(
    process.env.RATE_LIMIT_WINDOW_MS,
    DEFAULT_RATE_LIMIT_WINDOW_MS,
  ),
  trustProxyHops: readPositiveInt(process.env.TRUST_PROXY_HOPS, DEFAULT_TRUST_PROXY_HOPS),
  webAppOrigin: readOptionalOrigin(process.env.WEB_APP_ORIGIN),
  corsAllowedOrigins: [],
  cacheMaxEntries: readPositiveInt(
    process.env.CACHE_MAX_ENTRIES,
    DEFAULT_CACHE_MAX_ENTRIES,
  ),
  cacheCleanupIntervalMs: readPositiveInt(
    process.env.CACHE_CLEANUP_INTERVAL_MS,
    DEFAULT_CACHE_CLEANUP_INTERVAL_MS,
  ),
  cacheTtlJitterPct: readNonNegativeInt(
    process.env.CACHE_TTL_JITTER_PCT,
    DEFAULT_CACHE_TTL_JITTER_PCT,
  ),
  cacheLockTtlMs: readPositiveInt(
    process.env.CACHE_LOCK_TTL_MS,
    DEFAULT_CACHE_LOCK_TTL_MS,
  ),
  cacheCoalesceWaitMs: readPositiveInt(
    process.env.CACHE_COALESCE_WAIT_MS,
    DEFAULT_CACHE_COALESCE_WAIT_MS,
  ),
  upstreamGlobalRpmLimit: readNonNegativeInt(
    process.env.UPSTREAM_GLOBAL_RPM_LIMIT,
    DEFAULT_UPSTREAM_GLOBAL_RPM_LIMIT,
  ),
  upstreamCircuitBreakerWindowMs: readPositiveInt(
    process.env.UPSTREAM_CIRCUIT_BREAKER_WINDOW_MS,
    DEFAULT_UPSTREAM_CIRCUIT_BREAKER_WINDOW_MS,
  ),
  cacheBackend: readCacheBackend(process.env.CACHE_BACKEND, defaultCacheBackend),
  cacheStrictMode: readBoolean(process.env.CACHE_STRICT_MODE, defaultCacheStrictMode),
  redisUrl: readOptionalValue(process.env.REDIS_URL),
  redisCachePrefix: readRedisCachePrefix(process.env.REDIS_CACHE_PREFIX),
  bffExposeErrorDetails: readBoolean(
    process.env.BFF_EXPOSE_ERROR_DETAILS,
    DEFAULT_BFF_EXPOSE_ERROR_DETAILS,
  ),
  mobileSessionJwtSecret: readOptionalValue(process.env.MOBILE_SESSION_JWT_SECRET),
  mobileSessionTokenTtlMs: readPositiveInt(
    process.env.MOBILE_SESSION_TOKEN_TTL_MS,
    DEFAULT_MOBILE_SESSION_TOKEN_TTL_MS,
  ),
  mobileRefreshTokenTtlMs: readPositiveInt(
    process.env.MOBILE_REFRESH_TOKEN_TTL_MS,
    DEFAULT_MOBILE_REFRESH_TOKEN_TTL_MS,
  ),
  mobileAuthChallengeTtlMs: readPositiveInt(
    process.env.MOBILE_AUTH_CHALLENGE_TTL_MS,
    DEFAULT_MOBILE_AUTH_CHALLENGE_TTL_MS,
  ),
  mobileAttestationAcceptMock: readBoolean(
    process.env.MOBILE_ATTESTATION_ACCEPT_MOCK,
    DEFAULT_MOBILE_ATTESTATION_ACCEPT_MOCK,
  ),
  mobileAttestationEnforcementMode: readAttestationEnforcementMode(
    process.env.MOBILE_ATTESTATION_ENFORCEMENT_MODE,
  ),
  mobileAuthEnforcedHosts: readHostList(process.env.MOBILE_AUTH_ENFORCED_HOSTS),
  mobilePlayIntegrityPackageName: readOptionalValue(process.env.MOBILE_PLAY_INTEGRITY_PACKAGE_NAME),
  mobilePlayIntegrityServiceAccountEmail: readOptionalValue(
    process.env.MOBILE_PLAY_INTEGRITY_SERVICE_ACCOUNT_EMAIL,
  ),
  mobilePlayIntegrityServiceAccountPrivateKey: readOptionalValue(
    process.env.MOBILE_PLAY_INTEGRITY_SERVICE_ACCOUNT_PRIVATE_KEY,
  ),
  mobileAppAttestBundleId: readOptionalValue(process.env.MOBILE_APP_ATTEST_BUNDLE_ID),
  mobileAppAttestTeamId: readOptionalValue(process.env.MOBILE_APP_ATTEST_TEAM_ID),
  mobileAppAttestVerificationUrl: readOptionalValue(process.env.MOBILE_APP_ATTEST_VERIFICATION_URL),
  mobileAppAttestVerificationSecret: readOptionalValue(
    process.env.MOBILE_APP_ATTEST_VERIFICATION_SECRET,
  ),
  paginationCursorSecret: '',
  paginationCursorTtlMs: readPositiveInt(
    process.env.PAGINATION_CURSOR_TTL_MS,
    DEFAULT_PAGINATION_CURSOR_TTL_MS,
  ),
  notificationsBackendEnabled: readBoolean(
    process.env.NOTIFICATIONS_BACKEND_ENABLED,
    DEFAULT_NOTIFICATIONS_BACKEND_ENABLED,
  ),
  notificationsEventIngestEnabled: readBoolean(
    process.env.NOTIFICATIONS_EVENT_INGEST_ENABLED,
    DEFAULT_NOTIFICATIONS_EVENT_INGEST_ENABLED,
  ),
  notificationsPersistenceBackend: readNotificationsPersistenceBackend(
    process.env.NOTIFICATIONS_PERSISTENCE_BACKEND,
    defaultNotificationsPersistenceBackend,
  ),
  notificationsFanoutMaxPerEvent: readPositiveInt(
    process.env.NOTIFICATIONS_FANOUT_MAX_PER_EVENT,
    DEFAULT_NOTIFICATIONS_FANOUT_MAX_PER_EVENT,
  ),
  notificationsDeferredPromotionBatch: readPositiveInt(
    process.env.NOTIFICATIONS_DEFERRED_PROMOTION_BATCH,
    DEFAULT_NOTIFICATIONS_DEFERRED_PROMOTION_BATCH,
  ),
  notificationsDeferredDelayMs: readPositiveInt(
    process.env.NOTIFICATIONS_DEFERRED_DELAY_MS,
    DEFAULT_NOTIFICATIONS_DEFERRED_DELAY_MS,
  ),
  bffEnablePlayerCanonicalCacheKeys: readBoolean(
    process.env.BFF_ENABLE_PLAYER_CANONICAL_CACHE_KEYS,
    DEFAULT_BFF_ENABLE_PLAYER_CANONICAL_CACHE_KEYS,
  ),
  bffEnablePlayerMatchesSwr: readBoolean(
    process.env.BFF_ENABLE_PLAYER_MATCHES_SWR,
    DEFAULT_BFF_ENABLE_PLAYER_MATCHES_SWR,
  ),
  bffEnablePlayerOverviewRoute: readBoolean(
    process.env.BFF_ENABLE_PLAYER_OVERVIEW_ROUTE,
    DEFAULT_BFF_ENABLE_PLAYER_OVERVIEW_ROUTE,
  ),
  databaseUrl: readOptionalValue(process.env.DATABASE_URL),
  notificationsIngestToken: readOptionalValue(process.env.NOTIFICATIONS_INGEST_TOKEN),
  pushTokenEncryptionKey: readOptionalValue(process.env.PUSH_TOKEN_ENCRYPTION_KEY),
  firebaseProjectId: readOptionalValue(process.env.FIREBASE_PROJECT_ID),
  firebaseClientEmail: readOptionalValue(process.env.FIREBASE_CLIENT_EMAIL),
  firebasePrivateKey: readOptionalValue(process.env.FIREBASE_PRIVATE_KEY),
};

env.corsAllowedOrigins = buildCorsAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS, env.webAppOrigin);

env.trustProxyHops = Math.max(env.trustProxyHops, 0);

if (isProxyLikeEnvironment(env.trustProxyHops) && env.corsAllowedOrigins.length === 0) {
  throw new Error(
    'Missing CORS_ALLOWED_ORIGINS in proxy/staging/production mode.',
  );
}

if (!env.mobileSessionJwtSecret) {
  throw new Error(
    'Missing MOBILE_SESSION_JWT_SECRET.',
  );
}

for (const key of LEGACY_HMAC_ENV_KEYS) {
  if (readOptionalValue(process.env[key])) {
    throw new Error(
      `Deprecated legacy HMAC configuration "${key}" is forbidden. Use mobile attestation + session tokens.`,
    );
  }
}

// if ((env.appEnv === 'staging' || env.appEnv === 'production') && env.mobileAttestationAcceptMock) {
//   throw new Error(
//     'MOBILE_ATTESTATION_ACCEPT_MOCK must be false in staging/production.',
//   );
// }

if (env.mobileAttestationEnforcementMode !== 'strict' && env.mobileAttestationEnforcementMode !== 'report_only') {
  throw new Error('MOBILE_ATTESTATION_ENFORCEMENT_MODE must be "strict" or "report_only".');
}

// if ((env.appEnv === 'staging' || env.appEnv === 'production') && !env.mobilePlayIntegrityPackageName) {
//   throw new Error('Missing MOBILE_PLAY_INTEGRITY_PACKAGE_NAME in staging/production.');
// }

// if (
//   (env.appEnv === 'staging' || env.appEnv === 'production')
//   && (!env.mobilePlayIntegrityServiceAccountEmail || !env.mobilePlayIntegrityServiceAccountPrivateKey)
// ) {
//   throw new Error(
//     'Missing MOBILE_PLAY_INTEGRITY_SERVICE_ACCOUNT_EMAIL/MOBILE_PLAY_INTEGRITY_SERVICE_ACCOUNT_PRIVATE_KEY in staging/production.',
//   );
// }

// if ((env.appEnv === 'staging' || env.appEnv === 'production') && !env.mobileAppAttestBundleId) {
//   throw new Error('Missing MOBILE_APP_ATTEST_BUNDLE_ID in staging/production.');
// }

// if (
//   (env.appEnv === 'staging' || env.appEnv === 'production')
//   && !env.mobileAppAttestVerificationUrl
// ) {
//   throw new Error('Missing MOBILE_APP_ATTEST_VERIFICATION_URL in staging/production.');
// }

if (env.cacheStrictMode && env.cacheBackend !== 'redis') {
  throw new Error('CACHE_STRICT_MODE=true requires CACHE_BACKEND=redis.');
}

if (env.cacheBackend === 'redis' && !env.redisUrl) {
  throw new Error('CACHE_BACKEND=redis requires REDIS_URL.');
}

if (env.notificationsPersistenceBackend === 'postgres' && !env.databaseUrl) {
  throw new Error('NOTIFICATIONS_PERSISTENCE_BACKEND=postgres requires DATABASE_URL.');
}

if (env.notificationsBackendEnabled && !env.pushTokenEncryptionKey) {
  throw new Error('NOTIFICATIONS_BACKEND_ENABLED=true requires PUSH_TOKEN_ENCRYPTION_KEY.');
}

if (env.notificationsEventIngestEnabled && !env.notificationsIngestToken) {
  throw new Error('NOTIFICATIONS_EVENT_INGEST_ENABLED=true requires NOTIFICATIONS_INGEST_TOKEN.');
}

if (env.appEnv === 'staging' || env.appEnv === 'production') {
  if (env.notificationsPersistenceBackend !== 'postgres') {
    throw new Error('Staging/production requires NOTIFICATIONS_PERSISTENCE_BACKEND=postgres.');
  }
}

env.paginationCursorSecret =
  readOptionalValue(process.env.PAGINATION_CURSOR_SECRET) ?? env.mobileSessionJwtSecret;
