import { createHash } from 'node:crypto';

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

type CacheConfig = {
  maxEntries: number;
  cleanupIntervalMs: number;
};

const DEFAULT_CACHE_MAX_ENTRIES = 1_000;
const DEFAULT_CACHE_CLEANUP_INTERVAL_MS = 60_000;
const DEFAULT_MAX_CACHE_KEY_LENGTH = 120;

function toPositiveInt(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return Math.floor(value);
}

function hashCacheKey(rawKey: string): string {
  if (rawKey.length <= DEFAULT_MAX_CACHE_KEY_LENGTH) {
    return rawKey;
  }

  return `sha256:${createHash('sha256').update(rawKey).digest('hex')}`;
}

export class MemoryCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly inFlight = new Map<string, Promise<unknown>>();
  private maxEntries: number;
  private cleanupIntervalMs: number;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.maxEntries = toPositiveInt(config.maxEntries ?? DEFAULT_CACHE_MAX_ENTRIES, DEFAULT_CACHE_MAX_ENTRIES);
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

  getInFlight<T>(key: string): Promise<T> | null {
    const pending = this.inFlight.get(hashCacheKey(key));
    return pending ? (pending as Promise<T>) : null;
  }

  setInFlight<T>(key: string, promise: Promise<T>): void {
    this.inFlight.set(hashCacheKey(key), promise);
  }

  clearInFlight(key: string): void {
    this.inFlight.delete(hashCacheKey(key));
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
    this.inFlight.clear();
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

export const cache = new MemoryCache();

export function configureCache(config: Partial<CacheConfig>): void {
  cache.configure(config);
}

export async function withCache<T>(
  key: string,
  ttlMs: number,
  producer: () => Promise<T>,
): Promise<T> {
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  const existingPromise = cache.getInFlight<T>(key);
  if (existingPromise) {
    return existingPromise;
  }

  const pendingPromise = producer()
    .then(value => {
      cache.set(key, value, ttlMs);
      return value;
    })
    .finally(() => {
      cache.clearInFlight(key);
    });

  cache.setInFlight(key, pendingPromise);
  return pendingPromise;
}

export function resetCacheForTests(): void {
  cache.resetForTests();
}
