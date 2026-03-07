import { createHash, randomUUID } from 'node:crypto';
import { Redis as IORedis } from 'ioredis';

import { UpstreamBffError } from './errors.js';

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

type CacheBackend = 'memory' | 'redis';

type CacheConfig = {
  maxEntries: number;
  cleanupIntervalMs: number;
  staleGraceMs: number;
  ttlJitterPct: number;
  lockTtlMs: number;
  coalesceWaitMs: number;
  backend: CacheBackend;
  strictMode: boolean;
  redisUrl: string | null;
  redisPrefix: string;
};

const DEFAULT_CACHE_MAX_ENTRIES = 1_000;
const DEFAULT_CACHE_CLEANUP_INTERVAL_MS = 60_000;
const DEFAULT_CACHE_STALE_GRACE_MS = 60_000;
const DEFAULT_CACHE_TTL_JITTER_PCT = 15;
const DEFAULT_CACHE_LOCK_TTL_MS = 3_000;
const DEFAULT_CACHE_COALESCE_WAIT_MS = 750;
const DEFAULT_MAX_CACHE_KEY_LENGTH = 120;
const DEFAULT_CACHE_BACKEND: CacheBackend = 'memory';
const DEFAULT_REDIS_PREFIX = 'footalert:bff:';
const DEFAULT_CACHE_STRICT_MODE = false;
const REDIS_READY_TIMEOUT_MS = 3_000;
const REDIS_CACHE_PAYLOAD_VERSION = 'v1';
const LOCK_RECHECK_INTERVAL_MS = 50;
const LOCK_RELEASE_LUA = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
`;

type ParsedCacheValue<T> = {
  value: T;
  fresh: boolean;
};

type WithCacheOptions<T> = {
  shouldCache?: (value: T) => boolean;
  onEvent?: (event: 'hit' | 'miss' | 'stale') => void;
};

function toPositiveInt(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return Math.floor(value);
}

function toNonNegativeInt(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return fallback;
  }

  return Math.floor(value);
}

function normalizeBackend(rawValue: string | undefined): CacheBackend {
  return rawValue === 'redis' ? 'redis' : 'memory';
}

function normalizeRedisPrefix(rawValue: string | undefined): string {
  const normalized = rawValue?.trim();
  if (!normalized) {
    return DEFAULT_REDIS_PREFIX;
  }

  return normalized;
}

function hashCacheKey(rawKey: string): string {
  if (rawKey.length <= DEFAULT_MAX_CACHE_KEY_LENGTH) {
    return rawKey;
  }

  return `sha256:${createHash('sha256').update(rawKey).digest('hex')}`;
}

function stableSerializeCacheValue(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(item => stableSerializeCacheValue(item)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey))
      .map(([key, nestedValue]) => `${key}:${stableSerializeCacheValue(nestedValue)}`)
      .join(',')}}`;
  }

  if (value === null) {
    return 'null';
  }

  return String(value);
}

export function buildCanonicalCacheKey(
  routeName: string,
  params: Record<string, unknown>,
): string {
  const serializedParams = Object.entries(params)
    .filter(([, value]) => typeof value !== 'undefined')
    .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey))
    .map(([key, value]) => `${key}=${stableSerializeCacheValue(value)}`)
    .join('&');

  return serializedParams.length > 0 ? `${routeName}:${serializedParams}` : routeName;
}

function applyTtlJitter(ttlMs: number): number {
  const baseTtlMs = Math.max(1, Math.floor(ttlMs));
  if (cacheTtlJitterPct <= 0) {
    return baseTtlMs;
  }

  const spread = Math.floor((baseTtlMs * cacheTtlJitterPct) / 100);
  if (spread <= 0) {
    return baseTtlMs;
  }

  const delta = Math.floor(Math.random() * ((spread * 2) + 1)) - spread;
  return Math.max(1, baseTtlMs + delta);
}

export class MemoryCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private maxEntries: number;
  private cleanupIntervalMs: number;
  private staleGraceMs: number;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.maxEntries = toPositiveInt(
      config.maxEntries ?? DEFAULT_CACHE_MAX_ENTRIES,
      DEFAULT_CACHE_MAX_ENTRIES,
    );
    this.cleanupIntervalMs = toPositiveInt(
      config.cleanupIntervalMs ?? DEFAULT_CACHE_CLEANUP_INTERVAL_MS,
      DEFAULT_CACHE_CLEANUP_INTERVAL_MS,
    );
    this.staleGraceMs = toPositiveInt(
      config.staleGraceMs ?? DEFAULT_CACHE_STALE_GRACE_MS,
      DEFAULT_CACHE_STALE_GRACE_MS,
    );
    this.startCleanupLoop();
  }

  configure(config: Partial<CacheConfig>): void {
    if (typeof config.maxEntries === 'number') {
      this.maxEntries = toPositiveInt(config.maxEntries, DEFAULT_CACHE_MAX_ENTRIES);
      this.evictIfNeeded();
    }

    if (typeof config.cleanupIntervalMs === 'number') {
      this.cleanupIntervalMs = toPositiveInt(
        config.cleanupIntervalMs,
        DEFAULT_CACHE_CLEANUP_INTERVAL_MS,
      );
      this.startCleanupLoop();
    }

    if (typeof config.staleGraceMs === 'number') {
      this.staleGraceMs = toPositiveInt(config.staleGraceMs, DEFAULT_CACHE_STALE_GRACE_MS);
    }
  }

  get<T>(key: string): T | null {
    return this.getFresh<T>(key);
  }

  getFresh<T>(key: string): T | null {
    const cacheKey = hashCacheKey(key);
    const entry = this.store.get(cacheKey);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (this.isBeyondStale(entry, now)) {
      this.store.delete(cacheKey);
      return null;
    }
    if (now > entry.expiresAt) {
      return null;
    }

    // Keep most recently used entries at the end of the map.
    this.store.delete(cacheKey);
    this.store.set(cacheKey, entry);
    return entry.value as T;
  }

  getStale<T>(key: string): T | null {
    const cacheKey = hashCacheKey(key);
    const entry = this.store.get(cacheKey);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (this.isBeyondStale(entry, now)) {
      this.store.delete(cacheKey);
      return null;
    }

    this.store.delete(cacheKey);
    this.store.set(cacheKey, entry);
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    const cacheKey = hashCacheKey(key);
    this.store.delete(cacheKey);
    this.store.set(cacheKey, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
    this.evictIfNeeded();
  }

  sweepExpiredEntries(now = Date.now()): void {
    for (const [key, entry] of this.store.entries()) {
      if (this.isBeyondStale(entry, now)) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }

  resetForTests(): void {
    this.clear();
    this.configure({
      maxEntries: DEFAULT_CACHE_MAX_ENTRIES,
      cleanupIntervalMs: DEFAULT_CACHE_CLEANUP_INTERVAL_MS,
      staleGraceMs: DEFAULT_CACHE_STALE_GRACE_MS,
    });
    this.startCleanupLoop();
  }

  private evictIfNeeded(): void {
    while (this.store.size > this.maxEntries) {
      const firstKey = this.store.keys().next().value;
      if (!firstKey) {
        return;
      }

      this.store.delete(firstKey);
    }
  }

  private startCleanupLoop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    this.cleanupTimer = setInterval(() => {
      this.sweepExpiredEntries();
    }, this.cleanupIntervalMs);
    this.cleanupTimer.unref?.();
  }

  private isBeyondStale(entry: CacheEntry<unknown>, now: number): boolean {
    return now > entry.expiresAt + this.staleGraceMs;
  }
}

const memoryCache = new MemoryCache();
const inFlight = new Map<string, Promise<unknown>>();

let cacheBackend: CacheBackend = DEFAULT_CACHE_BACKEND;
let cacheStrictMode = DEFAULT_CACHE_STRICT_MODE;
let redisUrl: string | null = null;
let redisPrefix = DEFAULT_REDIS_PREFIX;
let redisClient: IORedis | null = null;
let redisReady = false;
let hasLoggedRedisFallback = false;
let lastRedisError: unknown = null;
let cacheStaleGraceMs = DEFAULT_CACHE_STALE_GRACE_MS;
let cacheTtlJitterPct = DEFAULT_CACHE_TTL_JITTER_PCT;
let cacheLockTtlMs = DEFAULT_CACHE_LOCK_TTL_MS;
let cacheCoalesceWaitMs = DEFAULT_CACHE_COALESCE_WAIT_MS;

function logRedisFallback(error?: unknown): void {
  if (typeof error !== 'undefined') {
    lastRedisError = error;
  }
  if (hasLoggedRedisFallback) {
    return;
  }

  hasLoggedRedisFallback = true;
  if (error) {
    console.warn('[bff][cache] Redis unavailable, falling back to in-memory cache.', error);
    return;
  }

  console.warn('[bff][cache] Redis unavailable, falling back to in-memory cache.');
}

function buildRedisCacheKey(rawKey: string): string {
  return `${redisPrefix}${hashCacheKey(rawKey)}`;
}

function buildRedisLockKey(rawKey: string): string {
  return `${redisPrefix}lock:${hashCacheKey(rawKey)}`;
}

function teardownRedisClient(): void {
  if (redisClient) {
    redisClient.removeAllListeners();
    redisClient.disconnect();
  }

  redisClient = null;
  redisReady = false;
}

function ensureRedisClient(): void {
  if (cacheBackend !== 'redis' || !redisUrl || redisClient) {
    if (cacheBackend === 'redis' && !redisUrl) {
      logRedisFallback();
    }
    return;
  }

  try {
    const client = new IORedis(redisUrl, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });

    client.on('ready', () => {
      redisReady = true;
      lastRedisError = null;
      hasLoggedRedisFallback = false;
    });
    client.on('error', (error: unknown) => {
      redisReady = false;
      logRedisFallback(error);
    });
    client.on('end', () => {
      redisReady = false;
    });

    redisClient = client;
  } catch (error) {
    redisReady = false;
    logRedisFallback(error);
    redisClient = null;
  }
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function ensureRedisReadyWithTimeout(timeoutMs = REDIS_READY_TIMEOUT_MS): Promise<void> {
  ensureRedisClient();
  if (!redisClient) {
    throw new Error('Redis client initialization failed.');
  }

  if (redisReady) {
    return;
  }

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await redisClient.ping();
      redisReady = true;
      lastRedisError = null;
      return;
    } catch (error) {
      lastRedisError = error;
      await wait(100);
    }
  }

  throw new Error('Redis did not become ready before timeout.');
}

function parseRedisCachePayload<T>(payload: string): { value: T; expiresAt: number | null } | null {
  try {
    const parsed = JSON.parse(payload) as unknown;
    if (
      parsed
      && typeof parsed === 'object'
      && !Array.isArray(parsed)
      && 'version' in parsed
      && 'expiresAt' in parsed
      && 'value' in parsed
      && (parsed as { version: unknown }).version === REDIS_CACHE_PAYLOAD_VERSION
      && typeof (parsed as { expiresAt: unknown }).expiresAt === 'number'
    ) {
      return {
        value: (parsed as { value: T }).value,
        expiresAt: (parsed as { expiresAt: number }).expiresAt,
      };
    }

    return {
      value: parsed as T,
      expiresAt: null,
    };
  } catch {
    return null;
  }
}

async function getFromRedis<T>(key: string): Promise<ParsedCacheValue<T> | null> {
  if (!redisClient || !redisReady) {
    return null;
  }

  try {
    const payload = await redisClient.get(buildRedisCacheKey(key));
    if (!payload) {
      return null;
    }

    const parsedPayload = parseRedisCachePayload<T>(payload);
    if (!parsedPayload) {
      return null;
    }

    return {
      value: parsedPayload.value,
      fresh: parsedPayload.expiresAt === null || Date.now() <= parsedPayload.expiresAt,
    };
  } catch (error) {
    redisReady = false;
    logRedisFallback(error);
    return null;
  }
}

async function setToRedis<T>(key: string, value: T, ttlMs: number): Promise<void> {
  if (!redisClient || !redisReady) {
    return;
  }

  const expiresAt = Date.now() + ttlMs;
  const redisTtlMs = Math.max(1, Math.floor(ttlMs + cacheStaleGraceMs));

  try {
    await redisClient.set(
      buildRedisCacheKey(key),
      JSON.stringify({
        version: REDIS_CACHE_PAYLOAD_VERSION,
        expiresAt,
        value,
      }),
      'PX',
      redisTtlMs,
    );
  } catch (error) {
    redisReady = false;
    logRedisFallback(error);
  }
}

async function getFreshCachedValue<T>(key: string): Promise<T | null> {
  if (cacheBackend === 'redis') {
    const redisValue = await getFromRedis<T>(key);
    if (redisValue?.fresh) {
      return redisValue.value;
    }
  }

  return memoryCache.getFresh<T>(key);
}

async function getStaleCachedValue<T>(key: string): Promise<T | null> {
  if (cacheBackend === 'redis') {
    const redisValue = await getFromRedis<T>(key);
    if (redisValue) {
      return redisValue.value;
    }
  }

  return memoryCache.getStale<T>(key);
}

async function setCachedValue<T>(key: string, value: T, ttlMs: number): Promise<void> {
  const effectiveTtlMs = applyTtlJitter(ttlMs);
  memoryCache.set(key, value, effectiveTtlMs);

  if (cacheBackend === 'redis') {
    await setToRedis(key, value, effectiveTtlMs);
  }
}

export async function primeCacheValue<T>(key: string, value: T, ttlMs: number): Promise<void> {
  await setCachedValue(key, value, ttlMs);
}

async function waitForFreshCacheFill<T>(key: string): Promise<T | null> {
  if (cacheCoalesceWaitMs <= 0) {
    return null;
  }

  const startedAt = Date.now();
  while (Date.now() - startedAt < cacheCoalesceWaitMs) {
    await wait(LOCK_RECHECK_INTERVAL_MS);
    const cachedValue = await getFreshCachedValue<T>(key);
    if (cachedValue !== null) {
      return cachedValue;
    }
  }

  return null;
}

async function acquireRedisLock(key: string): Promise<{ lockKey: string; token: string } | null> {
  if (!redisClient || !redisReady) {
    return null;
  }

  const lockKey = buildRedisLockKey(key);
  const token = randomUUID();
  try {
    const result = await redisClient.set(
      lockKey,
      token,
      'PX',
      Math.max(1, cacheLockTtlMs),
      'NX',
    );
    if (result === 'OK') {
      return {
        lockKey,
        token,
      };
    }

    return null;
  } catch (error) {
    redisReady = false;
    logRedisFallback(error);
    return null;
  }
}

async function releaseRedisLock(lock: { lockKey: string; token: string } | null): Promise<void> {
  if (!lock || !redisClient || !redisReady) {
    return;
  }

  try {
    await redisClient.eval(LOCK_RELEASE_LUA, 1, lock.lockKey, lock.token);
  } catch (error) {
    redisReady = false;
    logRedisFallback(error);
  }
}

function shouldFallbackToStale(error: unknown): boolean {
  if (!(error instanceof UpstreamBffError)) {
    return false;
  }

  if (error.code === 'UPSTREAM_QUOTA_EXCEEDED' || error.code === 'UPSTREAM_CIRCUIT_OPEN') {
    return true;
  }

  return error.statusCode === 429 || error.statusCode >= 500;
}

async function produceAndCache<T>(
  key: string,
  ttlMs: number,
  producer: () => Promise<T>,
  options?: WithCacheOptions<T>,
): Promise<T> {
  try {
    const value = await producer();
    if (options?.shouldCache?.(value) ?? true) {
      await setCachedValue(key, value, ttlMs);
    }
    return value;
  } catch (error) {
    if (shouldFallbackToStale(error)) {
      const staleValue = await getStaleCachedValue<T>(key);
      if (staleValue !== null) {
        options?.onEvent?.('stale');
        return staleValue;
      }
    }

    throw error;
  }
}

function getInFlight<T>(key: string): Promise<T> | null {
  const pending = inFlight.get(hashCacheKey(key));
  return pending ? (pending as Promise<T>) : null;
}

function setInFlight<T>(key: string, promise: Promise<T>): void {
  inFlight.set(hashCacheKey(key), promise);
}

function clearInFlight(key: string): void {
  inFlight.delete(hashCacheKey(key));
}

function createCacheFillPromise<T>(
  key: string,
  ttlMs: number,
  producer: () => Promise<T>,
  options?: WithCacheOptions<T>,
): Promise<T> {
  const pendingPromise = (async () => {
    if (cacheBackend !== 'redis' || !redisUrl) {
      options?.onEvent?.('miss');
      return produceAndCache(key, ttlMs, producer, options);
    }

    ensureRedisClient();
    if (!redisClient || !redisReady) {
      options?.onEvent?.('miss');
      return produceAndCache(key, ttlMs, producer, options);
    }

    const lock = await acquireRedisLock(key);
    if (lock) {
      try {
        const cachedAfterLock = await getFreshCachedValue<T>(key);
        if (cachedAfterLock !== null) {
          options?.onEvent?.('hit');
          return cachedAfterLock;
        }

        options?.onEvent?.('miss');
        return produceAndCache(key, ttlMs, producer, options);
      } finally {
        await releaseRedisLock(lock);
      }
    }

    const coalescedValue = await waitForFreshCacheFill<T>(key);
    if (coalescedValue !== null) {
      options?.onEvent?.('hit');
      return coalescedValue;
    }

    const staleValue = await getStaleCachedValue<T>(key);
    if (staleValue !== null) {
      options?.onEvent?.('stale');
      return staleValue;
    }

    options?.onEvent?.('miss');
    return produceAndCache(key, ttlMs, producer, options);
  })()
    .finally(() => {
      clearInFlight(key);
    });

  setInFlight(key, pendingPromise);
  return pendingPromise;
}

function triggerBackgroundCacheRefresh<T>(
  key: string,
  ttlMs: number,
  producer: () => Promise<T>,
  options?: WithCacheOptions<T>,
): void {
  if (getInFlight(key)) {
    return;
  }

  void createCacheFillPromise(key, ttlMs, producer, options).catch(() => undefined);
}

export function configureCache(config: Partial<CacheConfig>): void {
  memoryCache.configure(config);

  const nextBackend =
    typeof config.backend === 'string'
      ? normalizeBackend(config.backend)
      : cacheBackend;
  const nextRedisUrl =
    typeof config.redisUrl === 'string'
      ? config.redisUrl.trim() || null
      : config.redisUrl === null
        ? null
        : redisUrl;
  const nextRedisPrefix =
    typeof config.redisPrefix === 'string'
      ? normalizeRedisPrefix(config.redisPrefix)
      : redisPrefix;
  const nextStrictMode =
    typeof config.strictMode === 'boolean' ? config.strictMode : cacheStrictMode;
  const nextStaleGraceMs =
    typeof config.staleGraceMs === 'number'
      ? toPositiveInt(config.staleGraceMs, DEFAULT_CACHE_STALE_GRACE_MS)
      : cacheStaleGraceMs;
  const nextTtlJitterPct =
    typeof config.ttlJitterPct === 'number'
      ? toNonNegativeInt(config.ttlJitterPct, DEFAULT_CACHE_TTL_JITTER_PCT)
      : cacheTtlJitterPct;
  const nextLockTtlMs =
    typeof config.lockTtlMs === 'number'
      ? toPositiveInt(config.lockTtlMs, DEFAULT_CACHE_LOCK_TTL_MS)
      : cacheLockTtlMs;
  const nextCoalesceWaitMs =
    typeof config.coalesceWaitMs === 'number'
      ? toPositiveInt(config.coalesceWaitMs, DEFAULT_CACHE_COALESCE_WAIT_MS)
      : cacheCoalesceWaitMs;

  const shouldReconnectRedis =
    nextBackend !== cacheBackend ||
    nextRedisUrl !== redisUrl ||
    nextRedisPrefix !== redisPrefix ||
    nextStrictMode !== cacheStrictMode;

  cacheBackend = nextBackend;
  cacheStrictMode = nextStrictMode;
  redisUrl = nextRedisUrl;
  redisPrefix = nextRedisPrefix;
  cacheStaleGraceMs = nextStaleGraceMs;
  cacheTtlJitterPct = nextTtlJitterPct;
  cacheLockTtlMs = nextLockTtlMs;
  cacheCoalesceWaitMs = nextCoalesceWaitMs;

  if (shouldReconnectRedis) {
    teardownRedisClient();
    hasLoggedRedisFallback = false;
  }

  ensureRedisClient();
}

export async function assertCacheReadyOrThrow(): Promise<void> {
  if (!cacheStrictMode || cacheBackend !== 'redis') {
    return;
  }

  if (!redisUrl) {
    throw new Error('Redis strict mode requires REDIS_URL.');
  }

  try {
    await ensureRedisReadyWithTimeout();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Redis strict mode validation failed: ${reason}`);
  }
}

export type CacheHealthSnapshot = {
  backend: CacheBackend;
  strictMode: boolean;
  policy: {
    staleGraceMs: number;
    ttlJitterPct: number;
    lockTtlMs: number;
    coalesceWaitMs: number;
  };
  redis: {
    configured: boolean;
    ready: boolean;
    prefix: string;
    lastError: string | null;
  };
  degraded: boolean;
};

export function getCacheHealthSnapshot(): CacheHealthSnapshot {
  const redisConfigured = cacheBackend === 'redis' && Boolean(redisUrl);
  const degraded = cacheStrictMode && cacheBackend === 'redis' && !redisReady;

  return {
    backend: cacheBackend,
    strictMode: cacheStrictMode,
    policy: {
      staleGraceMs: cacheStaleGraceMs,
      ttlJitterPct: cacheTtlJitterPct,
      lockTtlMs: cacheLockTtlMs,
      coalesceWaitMs: cacheCoalesceWaitMs,
    },
    redis: {
      configured: redisConfigured,
      ready: redisReady,
      prefix: redisPrefix,
      lastError: lastRedisError ? String(lastRedisError) : null,
    },
    degraded,
  };
}

export async function withCache<T>(
  key: string,
  ttlMs: number,
  producer: () => Promise<T>,
  options?: WithCacheOptions<T>,
): Promise<T> {
  const cached = await getFreshCachedValue<T>(key);
  if (cached !== null) {
    options?.onEvent?.('hit');
    return cached;
  }

  const existingPromise = getInFlight<T>(key);
  if (existingPromise) {
    options?.onEvent?.('hit');
    return existingPromise;
  }

  return createCacheFillPromise(key, ttlMs, producer, options);
}

export async function withCacheStaleWhileRevalidate<T>(
  key: string,
  ttlMs: number,
  producer: () => Promise<T>,
  options?: WithCacheOptions<T>,
): Promise<T> {
  const cached = await getFreshCachedValue<T>(key);
  if (cached !== null) {
    options?.onEvent?.('hit');
    return cached;
  }

  const staleValue = await getStaleCachedValue<T>(key);
  if (staleValue !== null) {
    options?.onEvent?.('stale');
    triggerBackgroundCacheRefresh(key, ttlMs, producer, options);
    return staleValue;
  }

  const existingPromise = getInFlight<T>(key);
  if (existingPromise) {
    options?.onEvent?.('hit');
    return existingPromise;
  }

  return createCacheFillPromise(key, ttlMs, producer, options);
}

export function resetCacheForTests(): void {
  memoryCache.resetForTests();
  inFlight.clear();
  cacheBackend = DEFAULT_CACHE_BACKEND;
  cacheStrictMode = DEFAULT_CACHE_STRICT_MODE;
  redisUrl = null;
  redisPrefix = DEFAULT_REDIS_PREFIX;
  cacheStaleGraceMs = DEFAULT_CACHE_STALE_GRACE_MS;
  cacheTtlJitterPct = DEFAULT_CACHE_TTL_JITTER_PCT;
  cacheLockTtlMs = DEFAULT_CACHE_LOCK_TTL_MS;
  cacheCoalesceWaitMs = DEFAULT_CACHE_COALESCE_WAIT_MS;
  hasLoggedRedisFallback = false;
  lastRedisError = null;
  teardownRedisClient();
}
