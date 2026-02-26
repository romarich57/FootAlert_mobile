import { createHash } from 'node:crypto';
import { Redis as IORedis } from 'ioredis';
const DEFAULT_CACHE_MAX_ENTRIES = 1_000;
const DEFAULT_CACHE_CLEANUP_INTERVAL_MS = 60_000;
const DEFAULT_MAX_CACHE_KEY_LENGTH = 120;
const DEFAULT_CACHE_BACKEND = 'memory';
const DEFAULT_REDIS_PREFIX = 'footalert:bff:';
function toPositiveInt(value, fallback) {
    if (!Number.isFinite(value) || value <= 0) {
        return fallback;
    }
    return Math.floor(value);
}
function normalizeBackend(rawValue) {
    return rawValue === 'redis' ? 'redis' : 'memory';
}
function normalizeRedisPrefix(rawValue) {
    const normalized = rawValue?.trim();
    if (!normalized) {
        return DEFAULT_REDIS_PREFIX;
    }
    return normalized;
}
function hashCacheKey(rawKey) {
    if (rawKey.length <= DEFAULT_MAX_CACHE_KEY_LENGTH) {
        return rawKey;
    }
    return `sha256:${createHash('sha256').update(rawKey).digest('hex')}`;
}
export class MemoryCache {
    store = new Map();
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
    sweepExpiredEntries(now = Date.now()) {
        for (const [key, entry] of this.store.entries()) {
            if (now > entry.expiresAt) {
                this.store.delete(key);
            }
        }
    }
    clear() {
        this.store.clear();
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
const memoryCache = new MemoryCache();
const inFlight = new Map();
let cacheBackend = DEFAULT_CACHE_BACKEND;
let redisUrl = null;
let redisPrefix = DEFAULT_REDIS_PREFIX;
let redisClient = null;
let redisReady = false;
let hasLoggedRedisFallback = false;
function logRedisFallback(error) {
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
function buildRedisCacheKey(rawKey) {
    return `${redisPrefix}${hashCacheKey(rawKey)}`;
}
function teardownRedisClient() {
    if (redisClient) {
        redisClient.removeAllListeners();
        redisClient.disconnect();
    }
    redisClient = null;
    redisReady = false;
}
function ensureRedisClient() {
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
        client.on('error', (error) => {
            redisReady = false;
            logRedisFallback(error);
        });
        client.on('end', () => {
            redisReady = false;
        });
        redisClient = client;
    }
    catch (error) {
        redisReady = false;
        logRedisFallback(error);
        redisClient = null;
    }
}
async function getFromRedis(key) {
    if (!redisClient || !redisReady) {
        return null;
    }
    try {
        const payload = await redisClient.get(buildRedisCacheKey(key));
        if (!payload) {
            return null;
        }
        return JSON.parse(payload);
    }
    catch (error) {
        redisReady = false;
        logRedisFallback(error);
        return null;
    }
}
async function setToRedis(key, value, ttlMs) {
    if (!redisClient || !redisReady) {
        return;
    }
    try {
        await redisClient.set(buildRedisCacheKey(key), JSON.stringify(value), 'PX', Math.max(1, Math.floor(ttlMs)));
    }
    catch (error) {
        redisReady = false;
        logRedisFallback(error);
    }
}
async function getCachedValue(key) {
    if (cacheBackend === 'redis') {
        const redisValue = await getFromRedis(key);
        if (redisValue !== null) {
            return redisValue;
        }
    }
    return memoryCache.get(key);
}
async function setCachedValue(key, value, ttlMs) {
    memoryCache.set(key, value, ttlMs);
    if (cacheBackend === 'redis') {
        await setToRedis(key, value, ttlMs);
    }
}
function getInFlight(key) {
    const pending = inFlight.get(hashCacheKey(key));
    return pending ? pending : null;
}
function setInFlight(key, promise) {
    inFlight.set(hashCacheKey(key), promise);
}
function clearInFlight(key) {
    inFlight.delete(hashCacheKey(key));
}
export function configureCache(config) {
    memoryCache.configure(config);
    const nextBackend = typeof config.backend === 'string'
        ? normalizeBackend(config.backend)
        : cacheBackend;
    const nextRedisUrl = typeof config.redisUrl === 'string'
        ? config.redisUrl.trim() || null
        : config.redisUrl === null
            ? null
            : redisUrl;
    const nextRedisPrefix = typeof config.redisPrefix === 'string'
        ? normalizeRedisPrefix(config.redisPrefix)
        : redisPrefix;
    const shouldReconnectRedis = nextBackend !== cacheBackend ||
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
export async function withCache(key, ttlMs, producer) {
    const cached = await getCachedValue(key);
    if (cached !== null) {
        return cached;
    }
    const existingPromise = getInFlight(key);
    if (existingPromise) {
        return existingPromise;
    }
    const pendingPromise = producer()
        .then(async (value) => {
        await setCachedValue(key, value, ttlMs);
        return value;
    })
        .finally(() => {
        clearInFlight(key);
    });
    setInFlight(key, pendingPromise);
    return pendingPromise;
}
export function resetCacheForTests() {
    memoryCache.resetForTests();
    inFlight.clear();
    cacheBackend = DEFAULT_CACHE_BACKEND;
    redisUrl = null;
    redisPrefix = DEFAULT_REDIS_PREFIX;
    hasLoggedRedisFallback = false;
    teardownRedisClient();
}
