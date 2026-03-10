import { Redis as IORedis } from 'ioredis';
import { env } from '../config/env.js';
import { UpstreamBffError } from './errors.js';
const RETRIABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const UPSTREAM_QUOTA_BUCKET_WINDOW_MS = 60_000;
const UPSTREAM_QUOTA_BUCKET_EXPIRE_MS = 70_000;
const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_RATE_LIMIT_THRESHOLD = 2;
const QUOTA_WARNING_PCT = 70;
const QUOTA_BACKGROUND_SHED_PCT = 70;
const QUOTA_SECONDARY_SHED_PCT = 85;
const QUOTA_CRITICAL_PCT = 95;
const QUOTA_CONSUME_LUA = `
local current = tonumber(redis.call("GET", KEYS[1]) or "0")
local budget = tonumber(ARGV[1])
if current >= budget then
  return {0, current}
end
current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[2])
end
return {1, current}
`;
let quotaRedisClient = null;
let quotaRedisReady = false;
let localQuotaMinute = -1;
let localQuotaUsed = 0;
let observedQuotaMinute = -1;
let observedQuotaUsed = 0;
const circuitStateByFamily = new Map();
const familyTrafficByName = new Map();
function readNonNegativeInt(rawValue, fallback) {
    if (!rawValue) {
        return fallback;
    }
    const parsed = Number.parseInt(rawValue, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return fallback;
    }
    return parsed;
}
function readPositiveInt(rawValue, fallback) {
    if (!rawValue) {
        return fallback;
    }
    const parsed = Number.parseInt(rawValue, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }
    return parsed;
}
function resolveUpstreamGlobalRpmLimit() {
    return readNonNegativeInt(process.env.UPSTREAM_GLOBAL_RPM_LIMIT, env.upstreamGlobalRpmLimit);
}
function resolveUpstreamCircuitBreakerWindowMs() {
    return readPositiveInt(process.env.UPSTREAM_CIRCUIT_BREAKER_WINDOW_MS, env.upstreamCircuitBreakerWindowMs);
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function buildTimeoutSignal(timeoutMs, parentSignal) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    parentSignal?.addEventListener('abort', () => controller.abort(), {
        once: true,
    });
    controller.signal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
    }, { once: true });
    return controller.signal;
}
function normalizeBody(body) {
    return body.slice(0, 1_000);
}
function isAbortError(error) {
    return error instanceof Error && error.name === 'AbortError';
}
function shouldRetryStatus(status) {
    return RETRIABLE_STATUS_CODES.has(status);
}
function buildUrl(pathWithQuery) {
    return `${env.apiFootballBaseUrl}${pathWithQuery}`;
}
function buildParsedPath(pathWithQuery) {
    return new URL(pathWithQuery, env.apiFootballBaseUrl);
}
function resolveCircuitFamily(pathWithQuery) {
    const parsedUrl = buildParsedPath(pathWithQuery);
    const pathname = parsedUrl.pathname;
    if ((pathname === '/teams' && parsedUrl.searchParams.has('search')) ||
        (pathname === '/leagues' && parsedUrl.searchParams.has('search')) ||
        (pathname === '/players/profiles' && parsedUrl.searchParams.has('search'))) {
        return 'search';
    }
    if (pathname === '/standings') {
        return 'standings';
    }
    if (pathname === '/fixtures' || pathname.startsWith('/fixtures/')) {
        return 'fixtures';
    }
    if (pathname.startsWith('/players')) {
        return 'player-stats';
    }
    return 'general';
}
function resolveUpstreamPriority(pathWithQuery) {
    const parsedUrl = buildParsedPath(pathWithQuery);
    const pathname = parsedUrl.pathname;
    if ((pathname === '/teams' && parsedUrl.searchParams.has('search')) ||
        (pathname === '/leagues' && parsedUrl.searchParams.has('search')) ||
        (pathname === '/players/profiles' && parsedUrl.searchParams.has('search'))) {
        return 'interactive_secondary';
    }
    if (pathname === '/transfers' ||
        pathname === '/trophies' ||
        pathname === '/players/topscorers' ||
        pathname === '/players/topassists' ||
        pathname === '/players/topyellowcards' ||
        pathname === '/players/topredcards') {
        return 'background';
    }
    return 'user_critical';
}
function currentMinuteBucket(now = Date.now()) {
    return Math.floor(now / UPSTREAM_QUOTA_BUCKET_WINDOW_MS);
}
function buildUpstreamQuotaBucketKey(minuteBucket) {
    return `${env.redisCachePrefix}upstream:quota:${minuteBucket}`;
}
function updateObservedQuotaUsage(minuteBucket, usageCount) {
    observedQuotaMinute = minuteBucket;
    observedQuotaUsed = Math.max(0, usageCount);
}
function resolveQuotaBudgetLimit(upstreamGlobalRpmLimit, priority) {
    if (upstreamGlobalRpmLimit <= 0) {
        return upstreamGlobalRpmLimit;
    }
    if (priority === 'background') {
        return Math.max(1, Math.floor((upstreamGlobalRpmLimit * QUOTA_BACKGROUND_SHED_PCT) / 100));
    }
    if (priority === 'interactive_secondary') {
        return Math.max(1, Math.floor((upstreamGlobalRpmLimit * QUOTA_SECONDARY_SHED_PCT) / 100));
    }
    return upstreamGlobalRpmLimit;
}
function resolveQuotaState(usedThisMinute, limitPerMinute) {
    if (limitPerMinute <= 0) {
        return 'healthy';
    }
    if (usedThisMinute >= limitPerMinute) {
        return 'exhausted';
    }
    const utilizationPct = (usedThisMinute / limitPerMinute) * 100;
    if (utilizationPct >= QUOTA_CRITICAL_PCT) {
        return 'critical';
    }
    if (utilizationPct >= QUOTA_WARNING_PCT) {
        return 'warning';
    }
    return 'healthy';
}
function ensureQuotaRedisClient() {
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
    }
    catch {
        quotaRedisReady = false;
        quotaRedisClient = null;
    }
}
function consumeLocalQuota(limit, now = Date.now()) {
    const minuteBucket = currentMinuteBucket(now);
    if (minuteBucket !== localQuotaMinute) {
        localQuotaMinute = minuteBucket;
        localQuotaUsed = 0;
    }
    if (localQuotaUsed >= limit) {
        updateObservedQuotaUsage(minuteBucket, localQuotaUsed);
        return {
            allowed: false,
            usedThisMinute: localQuotaUsed,
        };
    }
    localQuotaUsed += 1;
    updateObservedQuotaUsage(minuteBucket, localQuotaUsed);
    return {
        allowed: true,
        usedThisMinute: localQuotaUsed,
    };
}
function getFamilyTrafficState(family, priority) {
    const current = familyTrafficByName.get(family);
    if (current) {
        if (current.priority !== priority) {
            current.priority = priority;
        }
        return current;
    }
    const nextState = {
        priority,
        requests: 0,
        sheds: 0,
    };
    familyTrafficByName.set(family, nextState);
    return nextState;
}
function recordFamilyRequest(family, priority) {
    const state = getFamilyTrafficState(family, priority);
    state.requests += 1;
}
function recordFamilyShed(family, priority) {
    const state = getFamilyTrafficState(family, priority);
    state.sheds += 1;
}
async function consumeUpstreamQuota(priority) {
    const upstreamGlobalRpmLimit = resolveUpstreamGlobalRpmLimit();
    if (upstreamGlobalRpmLimit <= 0) {
        return {
            allowed: true,
            limitPerMinute: upstreamGlobalRpmLimit,
            budgetLimit: upstreamGlobalRpmLimit,
            usedThisMinute: 0,
            priority,
            state: 'healthy',
            rejectionReason: null,
        };
    }
    const budgetLimit = resolveQuotaBudgetLimit(upstreamGlobalRpmLimit, priority);
    ensureQuotaRedisClient();
    if (quotaRedisClient && quotaRedisReady) {
        const minuteBucket = currentMinuteBucket();
        const quotaKey = buildUpstreamQuotaBucketKey(minuteBucket);
        try {
            const evalResult = await quotaRedisClient.eval(QUOTA_CONSUME_LUA, 1, quotaKey, String(budgetLimit), String(UPSTREAM_QUOTA_BUCKET_EXPIRE_MS));
            const [allowedRaw, usageRaw] = Array.isArray(evalResult) ? evalResult : [0, 0];
            const allowed = Number(allowedRaw) === 1;
            const usedThisMinute = Number(usageRaw) || 0;
            updateObservedQuotaUsage(minuteBucket, usedThisMinute);
            return {
                allowed,
                limitPerMinute: upstreamGlobalRpmLimit,
                budgetLimit,
                usedThisMinute,
                priority,
                state: resolveQuotaState(usedThisMinute, upstreamGlobalRpmLimit),
                rejectionReason: allowed
                    ? null
                    : budgetLimit < upstreamGlobalRpmLimit
                        ? 'priority_shed'
                        : 'global_limit',
            };
        }
        catch {
            quotaRedisReady = false;
        }
    }
    const localQuota = consumeLocalQuota(budgetLimit);
    return {
        allowed: localQuota.allowed,
        limitPerMinute: upstreamGlobalRpmLimit,
        budgetLimit,
        usedThisMinute: localQuota.usedThisMinute,
        priority,
        state: resolveQuotaState(localQuota.usedThisMinute, upstreamGlobalRpmLimit),
        rejectionReason: localQuota.allowed
            ? null
            : budgetLimit < upstreamGlobalRpmLimit
                ? 'priority_shed'
                : 'global_limit',
    };
}
function getCircuitState(family) {
    const state = circuitStateByFamily.get(family);
    if (state) {
        return state;
    }
    const nextState = {
        openUntilMs: 0,
        consecutiveFailures: 0,
        consecutiveRateLimits: 0,
    };
    circuitStateByFamily.set(family, nextState);
    return nextState;
}
function isCircuitOpen(family, now = Date.now()) {
    return now < getCircuitState(family).openUntilMs;
}
function recordCircuitSuccess(family) {
    const state = getCircuitState(family);
    state.openUntilMs = 0;
    state.consecutiveFailures = 0;
    state.consecutiveRateLimits = 0;
}
function recordCircuitFailure(family, statusCode) {
    if (statusCode !== 429 && statusCode < 500) {
        return;
    }
    const state = getCircuitState(family);
    if (statusCode === 429) {
        state.consecutiveRateLimits += 1;
    }
    else {
        state.consecutiveRateLimits = 0;
    }
    state.consecutiveFailures += 1;
    if (state.consecutiveFailures < CIRCUIT_FAILURE_THRESHOLD &&
        state.consecutiveRateLimits < CIRCUIT_RATE_LIMIT_THRESHOLD) {
        return;
    }
    const nextOpenUntil = Date.now() + resolveUpstreamCircuitBreakerWindowMs();
    state.openUntilMs = Math.max(state.openUntilMs, nextOpenUntil);
    console.warn('[circuit-breaker] upstream family opened', {
        family,
        consecutiveFailures: state.consecutiveFailures,
        consecutiveRateLimits: state.consecutiveRateLimits,
        openUntilMs: state.openUntilMs,
        nodeRole: env.nodeRole,
    });
}
async function resolveObservedQuotaUsage() {
    const minuteBucket = currentMinuteBucket();
    if (observedQuotaMinute !== minuteBucket) {
        observedQuotaMinute = minuteBucket;
        observedQuotaUsed = 0;
    }
    ensureQuotaRedisClient();
    if (quotaRedisClient && quotaRedisReady) {
        try {
            const quotaKey = buildUpstreamQuotaBucketKey(minuteBucket);
            const rawValue = await quotaRedisClient.get(quotaKey);
            const usedThisMinute = Number.parseInt(rawValue ?? '0', 10);
            const safeUsed = Number.isFinite(usedThisMinute) ? usedThisMinute : 0;
            updateObservedQuotaUsage(minuteBucket, safeUsed);
            return safeUsed;
        }
        catch {
            quotaRedisReady = false;
        }
    }
    return observedQuotaUsed;
}
export async function getUpstreamGuardSnapshot() {
    const limitPerMinute = resolveUpstreamGlobalRpmLimit();
    const usedThisMinute = await resolveObservedQuotaUsage();
    const remainingThisMinute = limitPerMinute > 0 ? Math.max(0, limitPerMinute - usedThisMinute) : 0;
    const utilizationPct = limitPerMinute > 0 ? Math.min(100, Math.round((usedThisMinute / limitPerMinute) * 100)) : 0;
    const now = Date.now();
    return {
        quota: {
            limitPerMinute,
            usedThisMinute,
            remainingThisMinute,
            utilizationPct,
            state: resolveQuotaState(usedThisMinute, limitPerMinute),
            thresholds: {
                warningPct: QUOTA_WARNING_PCT,
                backgroundShedPct: QUOTA_BACKGROUND_SHED_PCT,
                secondaryShedPct: QUOTA_SECONDARY_SHED_PCT,
                criticalPct: QUOTA_CRITICAL_PCT,
            },
        },
        circuitBreaker: {
            openFamilies: [...circuitStateByFamily.entries()]
                .filter(([, state]) => state.openUntilMs > now)
                .map(([family, state]) => ({
                family,
                openUntilMs: state.openUntilMs,
                consecutiveFailures: state.consecutiveFailures,
                consecutiveRateLimits: state.consecutiveRateLimits,
            }))
                .sort((first, second) => first.family.localeCompare(second.family)),
            windowMs: resolveUpstreamCircuitBreakerWindowMs(),
        },
        routeFamilies: [...familyTrafficByName.entries()]
            .map(([family, state]) => ({
            family,
            priority: state.priority,
            requests: state.requests,
            sheds: state.sheds,
        }))
            .sort((first, second) => first.family.localeCompare(second.family)),
        redis: {
            configured: Boolean(env.redisUrl),
            ready: quotaRedisReady,
        },
    };
}
export async function apiFootballGet(pathWithQuery, signal) {
    const circuitFamily = resolveCircuitFamily(pathWithQuery);
    const priority = resolveUpstreamPriority(pathWithQuery);
    if (isCircuitOpen(circuitFamily)) {
        const state = getCircuitState(circuitFamily);
        throw new UpstreamBffError(429, 'UPSTREAM_CIRCUIT_OPEN', 'API-Football circuit breaker is open. Retry later.', {
            family: circuitFamily,
            priority,
            openUntilMs: state.openUntilMs,
        });
    }
    let lastError = null;
    for (let attempt = 0; attempt <= env.apiMaxRetries; attempt += 1) {
        const quotaResult = await consumeUpstreamQuota(priority);
        if (!quotaResult.allowed) {
            recordFamilyShed(circuitFamily, priority);
            console.warn('[upstream-quota] request rejected', {
                family: circuitFamily,
                priority,
                state: quotaResult.state,
                rejectionReason: quotaResult.rejectionReason,
                usedThisMinute: quotaResult.usedThisMinute,
                limitPerMinute: quotaResult.limitPerMinute,
                budgetLimit: quotaResult.budgetLimit,
                nodeRole: env.nodeRole,
            });
            if (quotaResult.rejectionReason === 'priority_shed') {
                throw new UpstreamBffError(429, 'UPSTREAM_QUOTA_SHED', 'API-Football budget reserved for critical traffic.', {
                    family: circuitFamily,
                    priority,
                    quotaState: quotaResult.state,
                    usedThisMinute: quotaResult.usedThisMinute,
                    limitPerMinute: quotaResult.limitPerMinute,
                    shedBudgetLimit: quotaResult.budgetLimit,
                });
            }
            throw new UpstreamBffError(429, 'UPSTREAM_QUOTA_EXCEEDED', 'API-Football global quota budget exceeded.', {
                family: circuitFamily,
                priority,
                quotaState: quotaResult.state,
                usedThisMinute: quotaResult.usedThisMinute,
                limitPerMinute: quotaResult.limitPerMinute,
            });
        }
        const requestSignal = buildTimeoutSignal(env.apiTimeoutMs, signal);
        recordFamilyRequest(circuitFamily, priority);
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
                recordCircuitFailure(circuitFamily, response.status);
                if (attempt < env.apiMaxRetries && shouldRetryStatus(response.status)) {
                    await sleep(150 * (attempt + 1));
                    continue;
                }
                throw new UpstreamBffError(response.status, 'UPSTREAM_HTTP_ERROR', `API-Football returned HTTP ${response.status}.`, responseBody);
            }
            recordCircuitSuccess(circuitFamily);
            return (await response.json());
        }
        catch (error) {
            if (error instanceof UpstreamBffError) {
                throw error;
            }
            lastError = error;
            const canRetry = attempt < env.apiMaxRetries;
            if (canRetry && (isAbortError(error) || error instanceof TypeError)) {
                recordCircuitFailure(circuitFamily, 503);
                await sleep(150 * (attempt + 1));
                continue;
            }
            recordCircuitFailure(circuitFamily, 503);
            throw new UpstreamBffError(502, 'UPSTREAM_UNAVAILABLE', 'Unable to reach API-Football from BFF.', error instanceof Error ? error.message : String(error));
        }
    }
    throw new UpstreamBffError(502, 'UPSTREAM_UNAVAILABLE', 'Unable to reach API-Football from BFF.', lastError);
}
export function resetApiFootballClientGuardsForTests() {
    localQuotaMinute = -1;
    localQuotaUsed = 0;
    observedQuotaMinute = -1;
    observedQuotaUsed = 0;
    circuitStateByFamily.clear();
    familyTrafficByName.clear();
    quotaRedisReady = false;
    if (quotaRedisClient) {
        quotaRedisClient.removeAllListeners();
        quotaRedisClient.disconnect();
    }
    quotaRedisClient = null;
}
