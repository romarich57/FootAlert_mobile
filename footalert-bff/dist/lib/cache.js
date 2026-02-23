import { createHash } from 'node:crypto';
const DEFAULT_CACHE_MAX_ENTRIES = 1_000;
const DEFAULT_CACHE_CLEANUP_INTERVAL_MS = 60_000;
const DEFAULT_MAX_CACHE_KEY_LENGTH = 120;
function toPositiveInt(value, fallback) {
    if (!Number.isFinite(value) || value <= 0) {
        return fallback;
    }
    return Math.floor(value);
}
function hashCacheKey(rawKey) {
    if (rawKey.length <= DEFAULT_MAX_CACHE_KEY_LENGTH) {
        return rawKey;
    }
    return `sha256:${createHash('sha256').update(rawKey).digest('hex')}`;
}
export class MemoryCache {
    store = new Map();
    inFlight = new Map();
    maxEntries;
    cleanupIntervalMs;
    cleanupTimer = null;
    constructor(config = {}) {
        this.maxEntries = toPositiveInt(config.maxEntries ?? DEFAULT_CACHE_MAX_ENTRIES, DEFAULT_CACHE_MAX_ENTRIES);
        this.cleanupIntervalMs = toPositiveInt(config.cleanupIntervalMs ?? DEFAULT_CACHE_CLEANUP_INTERVAL_MS, DEFAULT_CACHE_CLEANUP_INTERVAL_MS);
        this.startCleanupLoop();
    }
    configure(config) {
        if (typeof config.maxEntries === 'number') {
            this.maxEntries = toPositiveInt(config.maxEntries, DEFAULT_CACHE_MAX_ENTRIES);
            this.evictIfNeeded();
        }
        if (typeof config.cleanupIntervalMs === 'number') {
            this.cleanupIntervalMs = toPositiveInt(config.cleanupIntervalMs, DEFAULT_CACHE_CLEANUP_INTERVAL_MS);
            this.startCleanupLoop();
        }
    }
    get(key) {
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
        return entry.value;
    }
    set(key, value, ttlMs) {
        const cacheKey = hashCacheKey(key);
        this.store.delete(cacheKey);
        this.store.set(cacheKey, {
            value,
            expiresAt: Date.now() + ttlMs,
        });
        this.evictIfNeeded();
    }
    getInFlight(key) {
        const pending = this.inFlight.get(hashCacheKey(key));
        return pending ? pending : null;
    }
    setInFlight(key, promise) {
        this.inFlight.set(hashCacheKey(key), promise);
    }
    clearInFlight(key) {
        this.inFlight.delete(hashCacheKey(key));
    }
    sweepExpiredEntries(now = Date.now()) {
        for (const [key, entry] of this.store.entries()) {
            if (now > entry.expiresAt) {
                this.store.delete(key);
            }
        }
    }
    clear() {
        this.store.clear();
        this.inFlight.clear();
    }
    resetForTests() {
        this.clear();
        this.configure({
            maxEntries: DEFAULT_CACHE_MAX_ENTRIES,
            cleanupIntervalMs: DEFAULT_CACHE_CLEANUP_INTERVAL_MS,
        });
        this.startCleanupLoop();
    }
    evictIfNeeded() {
        while (this.store.size > this.maxEntries) {
            const firstKey = this.store.keys().next().value;
            if (!firstKey) {
                return;
            }
            this.store.delete(firstKey);
        }
    }
    startCleanupLoop() {
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
export function configureCache(config) {
    cache.configure(config);
}
export async function withCache(key, ttlMs, producer) {
    const cached = cache.get(key);
    if (cached !== null) {
        return cached;
    }
    const existingPromise = cache.getInFlight(key);
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
export function resetCacheForTests() {
    cache.resetForTests();
}
