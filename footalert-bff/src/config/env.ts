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
const DEFAULT_REDIS_CACHE_PREFIX = 'footalert:bff:';
const DEFAULT_BFF_EXPOSE_ERROR_DETAILS = false;
const DEFAULT_MOBILE_SESSION_TOKEN_TTL_MS = 10 * 60_000;
const DEFAULT_MOBILE_AUTH_CHALLENGE_TTL_MS = 2 * 60_000;
const DEFAULT_MOBILE_ATTESTATION_ACCEPT_MOCK = false;
const DEFAULT_PAGINATION_CURSOR_TTL_MS = 15 * 60_000;

type CacheBackend = 'memory' | 'redis';
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
  cacheBackend: CacheBackend;
  cacheStrictMode: boolean;
  redisUrl: string | null;
  redisCachePrefix: string;
  bffExposeErrorDetails: boolean;
  mobileSessionJwtSecret: string | null;
  mobileSessionTokenTtlMs: number;
  mobileAuthChallengeTtlMs: number;
  mobileAttestationAcceptMock: boolean;
  paginationCursorSecret: string;
  paginationCursorTtlMs: number;
};

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

const resolvedAppEnv = readAppEnv(process.env.APP_ENV || process.env.NODE_ENV);
const defaultCacheBackend = defaultCacheBackendForEnv(resolvedAppEnv);
const defaultCacheStrictMode = resolvedAppEnv === 'production' || resolvedAppEnv === 'staging';

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
  mobileAuthChallengeTtlMs: readPositiveInt(
    process.env.MOBILE_AUTH_CHALLENGE_TTL_MS,
    DEFAULT_MOBILE_AUTH_CHALLENGE_TTL_MS,
  ),
  mobileAttestationAcceptMock: readBoolean(
    process.env.MOBILE_ATTESTATION_ACCEPT_MOCK,
    DEFAULT_MOBILE_ATTESTATION_ACCEPT_MOCK,
  ),
  paginationCursorSecret: '',
  paginationCursorTtlMs: readPositiveInt(
    process.env.PAGINATION_CURSOR_TTL_MS,
    DEFAULT_PAGINATION_CURSOR_TTL_MS,
  ),
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

if ((env.appEnv === 'staging' || env.appEnv === 'production') && env.mobileAttestationAcceptMock) {
  throw new Error(
    'MOBILE_ATTESTATION_ACCEPT_MOCK must be false in staging/production.',
  );
}

if (env.cacheStrictMode && env.cacheBackend !== 'redis') {
  throw new Error('CACHE_STRICT_MODE=true requires CACHE_BACKEND=redis.');
}

if (env.cacheBackend === 'redis' && !env.redisUrl) {
  throw new Error('CACHE_BACKEND=redis requires REDIS_URL.');
}

env.paginationCursorSecret =
  readOptionalValue(process.env.PAGINATION_CURSOR_SECRET) ?? env.mobileSessionJwtSecret;
