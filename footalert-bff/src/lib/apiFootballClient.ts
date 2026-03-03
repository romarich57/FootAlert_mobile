import { env } from '../config/env.js';
import { UpstreamBffError } from './errors.js';
import { Redis as IORedis } from 'ioredis';

const RETRIABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const UPSTREAM_QUOTA_BUCKET_WINDOW_MS = 60_000;
const UPSTREAM_QUOTA_BUCKET_EXPIRE_MS = 70_000;

let quotaRedisClient: IORedis | null = null;
let quotaRedisReady = false;
let localQuotaMinute = -1;
let localQuotaUsed = 0;
let circuitOpenUntilMs = 0;

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

function resolveUpstreamGlobalRpmLimit(): number {
  return readNonNegativeInt(process.env.UPSTREAM_GLOBAL_RPM_LIMIT, env.upstreamGlobalRpmLimit);
}

function resolveUpstreamCircuitBreakerWindowMs(): number {
  return readPositiveInt(
    process.env.UPSTREAM_CIRCUIT_BREAKER_WINDOW_MS,
    env.upstreamCircuitBreakerWindowMs,
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildTimeoutSignal(timeoutMs: number, parentSignal?: AbortSignal): AbortSignal {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  parentSignal?.addEventListener('abort', () => controller.abort(), {
    once: true,
  });

  controller.signal.addEventListener(
    'abort',
    () => {
      clearTimeout(timeoutId);
    },
    { once: true },
  );

  return controller.signal;
}

function normalizeBody(body: string): string {
  return body.slice(0, 1_000);
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function shouldRetryStatus(status: number): boolean {
  return RETRIABLE_STATUS_CODES.has(status);
}

function buildUrl(pathWithQuery: string): string {
  return `${env.apiFootballBaseUrl}${pathWithQuery}`;
}

function currentMinuteBucket(now = Date.now()): number {
  return Math.floor(now / UPSTREAM_QUOTA_BUCKET_WINDOW_MS);
}

function buildUpstreamQuotaBucketKey(minuteBucket: number): string {
  return `${env.redisCachePrefix}upstream:quota:${minuteBucket}`;
}

function ensureQuotaRedisClient(): void {
  if (!env.redisUrl || quotaRedisClient) {
    return;
  }

  try {
    const client = new IORedis(env.redisUrl, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });

    client.on('ready', () => {
      quotaRedisReady = true;
    });
    client.on('error', () => {
      quotaRedisReady = false;
    });
    client.on('end', () => {
      quotaRedisReady = false;
    });

    quotaRedisClient = client;
  } catch {
    quotaRedisReady = false;
    quotaRedisClient = null;
  }
}

function consumeLocalQuota(limit: number, now = Date.now()): boolean {
  const minuteBucket = currentMinuteBucket(now);
  if (minuteBucket !== localQuotaMinute) {
    localQuotaMinute = minuteBucket;
    localQuotaUsed = 0;
  }

  localQuotaUsed += 1;
  return localQuotaUsed <= limit;
}

async function consumeUpstreamQuota(): Promise<boolean> {
  const upstreamGlobalRpmLimit = resolveUpstreamGlobalRpmLimit();
  if (upstreamGlobalRpmLimit <= 0) {
    return true;
  }

  ensureQuotaRedisClient();
  if (quotaRedisClient && quotaRedisReady) {
    const minuteBucket = currentMinuteBucket();
    const quotaKey = buildUpstreamQuotaBucketKey(minuteBucket);
    try {
      const usageCount = await quotaRedisClient.incr(quotaKey);
      if (usageCount === 1) {
        await quotaRedisClient.pexpire(quotaKey, UPSTREAM_QUOTA_BUCKET_EXPIRE_MS);
      }

      return usageCount <= upstreamGlobalRpmLimit;
    } catch {
      quotaRedisReady = false;
    }
  }

  return consumeLocalQuota(upstreamGlobalRpmLimit);
}

function isCircuitOpen(now = Date.now()): boolean {
  return now < circuitOpenUntilMs;
}

function openCircuit(statusCode: number): void {
  if (statusCode !== 429 && statusCode < 500) {
    return;
  }

  const nextOpenUntil = Date.now() + resolveUpstreamCircuitBreakerWindowMs();
  circuitOpenUntilMs = Math.max(circuitOpenUntilMs, nextOpenUntil);
}

export async function apiFootballGet<T>(
  pathWithQuery: string,
  signal?: AbortSignal,
): Promise<T> {
  if (isCircuitOpen()) {
    throw new UpstreamBffError(
      429,
      'UPSTREAM_CIRCUIT_OPEN',
      'API-Football circuit breaker is open. Retry later.',
      {
        openUntilMs: circuitOpenUntilMs,
      },
    );
  }

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= env.apiMaxRetries; attempt += 1) {
    const quotaAllowed = await consumeUpstreamQuota();
    if (!quotaAllowed) {
      const upstreamGlobalRpmLimit = resolveUpstreamGlobalRpmLimit();
      throw new UpstreamBffError(
        429,
        'UPSTREAM_QUOTA_EXCEEDED',
        'API-Football global quota budget exceeded.',
        {
          limitPerMinute: upstreamGlobalRpmLimit,
        },
      );
    }

    const requestSignal = buildTimeoutSignal(env.apiTimeoutMs, signal);

    try {
      const response = await fetch(buildUrl(pathWithQuery), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'x-apisports-key': env.apiFootballKey,
        },
        signal: requestSignal,
      });

      if (!response.ok) {
        const responseBody = normalizeBody(await response.text());
        openCircuit(response.status);
        if (attempt < env.apiMaxRetries && shouldRetryStatus(response.status)) {
          await sleep(150 * (attempt + 1));
          continue;
        }

        throw new UpstreamBffError(
          response.status,
          'UPSTREAM_HTTP_ERROR',
          `API-Football returned HTTP ${response.status}.`,
          responseBody,
        );
      }

      circuitOpenUntilMs = 0;
      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof UpstreamBffError) {
        throw error;
      }

      lastError = error;
      const canRetry = attempt < env.apiMaxRetries;

      if (canRetry && (isAbortError(error) || error instanceof TypeError)) {
        openCircuit(503);
        await sleep(150 * (attempt + 1));
        continue;
      }

      openCircuit(503);
      throw new UpstreamBffError(
        502,
        'UPSTREAM_UNAVAILABLE',
        'Unable to reach API-Football from BFF.',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  throw new UpstreamBffError(
    502,
    'UPSTREAM_UNAVAILABLE',
    'Unable to reach API-Football from BFF.',
    lastError,
  );
}

export function resetApiFootballClientGuardsForTests(): void {
  localQuotaMinute = -1;
  localQuotaUsed = 0;
  circuitOpenUntilMs = 0;
  quotaRedisReady = false;
  if (quotaRedisClient) {
    quotaRedisClient.removeAllListeners();
    quotaRedisClient.disconnect();
  }
  quotaRedisClient = null;
}
