import { createHash } from 'node:crypto';
import { Redis as IORedis } from 'ioredis';

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

type CacheBackend = 'memory' | 'redis';

type CacheConfig = {
  maxEntries: number;
  cleanupIntervalMs: number;
  backend: CacheBackend;
  strictMode: boolean;
  redisUrl: string | null;
  redisPrefix: string;
};

const DEFAULT_CACHE_MAX_ENTRIES = 1_000;
const DEFAULT_CACHE_CLEANUP_INTERVAL_MS = 60_000;
const DEFAULT_MAX_CACHE_KEY_LENGTH = 120;
const DEFAULT_CACHE_BACKEND: CacheBackend = 'memory';
const DEFAULT_REDIS_PREFIX = 'footalert:bff:';
const DEFAULT_CACHE_STRICT_MODE = false;
const REDIS_READY_TIMEOUT_MS = 3_000;

function toPositiveInt(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) {
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

export class MemoryCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private maxEntries: number;
  private cleanupIntervalMs: number;
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
  }

  get<T>(key: string): T | null {
    const cacheKey = hashCacheKey(key);
    const entry = this.store.get(cacheKey);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(cacheKey);
      return null;
    }

    // Keep most recently used entries at the end of the map.
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
      if (now > entry.expiresAt) {
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

async function getFromRedis<T>(key: string): Promise<T | null> {
  if (!redisClient || !redisReady) {
    return null;
  }

  try {
    const payload = await redisClient.get(buildRedisCacheKey(key));
    if (!payload) {
      return null;
    }

    return JSON.parse(payload) as T;
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

  try {
    await redisClient.set(
      buildRedisCacheKey(key),
      JSON.stringify(value),
      'PX',
      Math.max(1, Math.floor(ttlMs)),
    );
  } catch (error) {
    redisReady = false;
    logRedisFallback(error);
  }
}

async function getCachedValue<T>(key: string): Promise<T | null> {
  if (cacheBackend === 'redis') {
    const redisValue = await getFromRedis<T>(key);
    if (redisValue !== null) {
      return redisValue;
    }
  }

  return memoryCache.get<T>(key);
}

async function setCachedValue<T>(key: string, value: T, ttlMs: number): Promise<void> {
  memoryCache.set(key, value, ttlMs);

  if (cacheBackend === 'redis') {
    await setToRedis(key, value, ttlMs);
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

  const shouldReconnectRedis =
    nextBackend !== cacheBackend ||
    nextRedisUrl !== redisUrl ||
    nextRedisPrefix !== redisPrefix ||
    nextStrictMode !== cacheStrictMode;

  cacheBackend = nextBackend;
  cacheStrictMode = nextStrictMode;
  redisUrl = nextRedisUrl;
  redisPrefix = nextRedisPrefix;

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
): Promise<T> {
  const cached = await getCachedValue<T>(key);
  if (cached !== null) {
    return cached;
  }

  const existingPromise = getInFlight<T>(key);
  if (existingPromise) {
    return existingPromise;
  }

  const pendingPromise = producer()
    .then(async value => {
      await setCachedValue(key, value, ttlMs);
      return value;
    })
    .finally(() => {
      clearInFlight(key);
    });

  setInFlight(key, pendingPromise);
  return pendingPromise;
}

export function resetCacheForTests(): void {
  memoryCache.resetForTests();
  inFlight.clear();
  cacheBackend = DEFAULT_CACHE_BACKEND;
  cacheStrictMode = DEFAULT_CACHE_STRICT_MODE;
  redisUrl = null;
  redisPrefix = DEFAULT_REDIS_PREFIX;
  hasLoggedRedisFallback = false;
  lastRedisError = null;
  teardownRedisClient();
}
