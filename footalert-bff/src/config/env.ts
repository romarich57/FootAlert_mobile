const DEFAULT_PORT = 3001;
const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_API_BASE_URL = 'https://v3.football.api-sports.io';
const DEFAULT_API_TIMEOUT_MS = 10_000;
const DEFAULT_API_MAX_RETRIES = 2;
const DEFAULT_RATE_LIMIT_MAX = 120;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;

type BffEnv = {
  port: number;
  host: string;
  apiFootballBaseUrl: string;
  apiFootballKey: string;
  apiTimeoutMs: number;
  apiMaxRetries: number;
  rateLimitMax: number;
  rateLimitWindowMs: number;
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
};
