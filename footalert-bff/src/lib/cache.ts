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
  redisUrl: string | null;
  redisPrefix: string;
};

const DEFAULT_CACHE_MAX_ENTRIES = 1_000;
const DEFAULT_CACHE_CLEANUP_INTERVAL_MS = 60_000;
const DEFAULT_MAX_CACHE_KEY_LENGTH = 120;
const DEFAULT_CACHE_BACKEND: CacheBackend = 'memory';
const DEFAULT_REDIS_PREFIX = 'footalert:bff:';

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
let redisUrl: string | null = null;
let redisPrefix = DEFAULT_REDIS_PREFIX;
let redisClient: IORedis | null = null;
let redisReady = false;
let hasLoggedRedisFallback = false;

function logRedisFallback(error?: unknown): void {
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

  const shouldReconnectRedis =
    nextBackend !== cacheBackend ||
    nextRedisUrl !== redisUrl ||
    nextRedisPrefix !== redisPrefix;

  cacheBackend = nextBackend;
  redisUrl = nextRedisUrl;
  redisPrefix = nextRedisPrefix;

  if (shouldReconnectRedis) {
    teardownRedisClient();
    hasLoggedRedisFallback = false;
  }

  ensureRedisClient();
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
  redisUrl = null;
  redisPrefix = DEFAULT_REDIS_PREFIX;
  hasLoggedRedisFallback = false;
  teardownRedisClient();
}
