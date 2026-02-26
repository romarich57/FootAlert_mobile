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
const DEFAULT_BFF_EXPOSE_ERROR_DETAILS = false;
const DEFAULT_MOBILE_REQUEST_SIGNATURE_MAX_SKEW_MS = 5 * 60_000;

type BffEnv = {
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
  bffExposeErrorDetails: boolean;
  mobileRequestSigningKey: string | null;
  mobileRequestSignatureMaxSkewMs: number;
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

function readOptionalSigningKey(rawValue: string | undefined): string | null {
  const signingKey = rawValue?.trim();
  return signingKey ? signingKey : null;
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
  const runtimeEnv = process.env.APP_ENV?.trim().toLowerCase() || process.env.NODE_ENV?.trim().toLowerCase();
  if (runtimeEnv === 'production' || runtimeEnv === 'staging') {
    return true;
  }

  return trustProxyHops > 0;
}

export const env: BffEnv = {
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
  bffExposeErrorDetails: readBoolean(
    process.env.BFF_EXPOSE_ERROR_DETAILS,
    DEFAULT_BFF_EXPOSE_ERROR_DETAILS,
  ),
  mobileRequestSigningKey: readOptionalSigningKey(process.env.MOBILE_REQUEST_SIGNING_KEY),
  mobileRequestSignatureMaxSkewMs: readPositiveInt(
    process.env.MOBILE_REQUEST_SIGNATURE_MAX_SKEW_MS,
    DEFAULT_MOBILE_REQUEST_SIGNATURE_MAX_SKEW_MS,
  ),
};

env.corsAllowedOrigins = buildCorsAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS, env.webAppOrigin);

env.trustProxyHops = Math.max(env.trustProxyHops, 0);

if (isProxyLikeEnvironment(env.trustProxyHops) && env.corsAllowedOrigins.length === 0) {
  throw new Error(
    'Missing CORS_ALLOWED_ORIGINS in proxy/staging/production mode.',
  );
}
