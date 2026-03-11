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

type UpstreamPriorityClass = 'user_critical' | 'interactive_secondary' | 'background';
type UpstreamQuotaState = 'healthy' | 'warning' | 'critical' | 'exhausted';
type QuotaRejectionReason = 'priority_shed' | 'global_limit';
type CircuitState = {
  openUntilMs: number;
  consecutiveFailures: number;
  consecutiveRateLimits: number;
};
type FamilyTrafficState = {
  priority: UpstreamPriorityClass;
  requests: number;
  sheds: number;
};
type UpstreamQuotaConsumeResult = {
  allowed: boolean;
  limitPerMinute: number;
  budgetLimit: number;
  usedThisMinute: number;
  priority: UpstreamPriorityClass;
  state: UpstreamQuotaState;
  rejectionReason: QuotaRejectionReason | null;
};

export type UpstreamGuardSnapshot = {
  quota: {
    limitPerMinute: number;
    usedThisMinute: number;
    remainingThisMinute: number;
    utilizationPct: number;
    state: UpstreamQuotaState;
    thresholds: {
      warningPct: number;
      backgroundShedPct: number;
      secondaryShedPct: number;
      criticalPct: number;
    };
  };
  circuitBreaker: {
    openFamilies: Array<{
      family: string;
      openUntilMs: number;
      consecutiveFailures: number;
      consecutiveRateLimits: number;
    }>;
    windowMs: number;
  };
  routeFamilies: Array<{
    family: string;
    priority: UpstreamPriorityClass;
    requests: number;
    sheds: number;
  }>;
  redis: {
    configured: boolean;
    ready: boolean;
  };
};

let quotaRedisClient: IORedis | null = null;
let quotaRedisReady = false;
let localQuotaMinute = -1;
let localQuotaUsed = 0;
let observedQuotaMinute = -1;
let observedQuotaUsed = 0;
const circuitStateByFamily = new Map<string, CircuitState>();
const familyTrafficByName = new Map<string, FamilyTrafficState>();

// --- Circuit breaker distribué via Redis ---

const CIRCUIT_REDIS_KEY_PREFIX = 'circuit:';
const CIRCUIT_REDIS_TTL_MS = 120_000; // 2min — auto-expire si aucune mise à jour

function buildCircuitRedisKey(family: string): string {
  return `${env.redisCachePrefix}${CIRCUIT_REDIS_KEY_PREFIX}${family}`;
}

/**
 * Synchronise l'état du circuit breaker depuis Redis vers le cache local.
 * Appelé avant chaque vérification du circuit.
 * Non-bloquant : en cas d'erreur Redis, on utilise le cache local.
 */
async function syncCircuitStateFromRedis(family: string): Promise<void> {
  if (!quotaRedisClient || !quotaRedisReady) return;

  try {
    const raw = await quotaRedisClient.get(buildCircuitRedisKey(family));
    if (!raw) return;

    const remote = JSON.parse(raw) as CircuitState;
    const local = circuitStateByFamily.get(family);

    // Le remote gagne si son openUntilMs est plus récent
    if (!local || remote.openUntilMs > local.openUntilMs) {
      circuitStateByFamily.set(family, {
        openUntilMs: remote.openUntilMs,
        consecutiveFailures: remote.consecutiveFailures,
        consecutiveRateLimits: remote.consecutiveRateLimits,
      });
    }
  } catch {
    // Redis indisponible — continuer avec le cache local
  }
}

/**
 * Publie l'état du circuit breaker vers Redis après un changement.
 * Fire-and-forget — ne bloque pas le chemin critique.
 */
function publishCircuitStateToRedis(family: string, state: CircuitState): void {
  if (!quotaRedisClient || !quotaRedisReady) return;

  const key = buildCircuitRedisKey(family);
  const ttlSeconds = Math.ceil(CIRCUIT_REDIS_TTL_MS / 1_000);
  const payload = JSON.stringify(state);

  quotaRedisClient.set(key, payload, 'EX', ttlSeconds).catch(() => {
    // Redis indisponible — l'état local reste la source de vérité pour cette instance
  });
}

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

function buildParsedPath(pathWithQuery: string): URL {
  return new URL(pathWithQuery, env.apiFootballBaseUrl);
}

function resolveCircuitFamily(pathWithQuery: string): string {
  const parsedUrl = buildParsedPath(pathWithQuery);
  const pathname = parsedUrl.pathname;

  if (
    (pathname === '/teams' && parsedUrl.searchParams.has('search')) ||
    (pathname === '/leagues' && parsedUrl.searchParams.has('search')) ||
    (pathname === '/players/profiles' && parsedUrl.searchParams.has('search'))
  ) {
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

function resolveUpstreamPriority(pathWithQuery: string): UpstreamPriorityClass {
  const parsedUrl = buildParsedPath(pathWithQuery);
  const pathname = parsedUrl.pathname;

  if (
    (pathname === '/teams' && parsedUrl.searchParams.has('search')) ||
    (pathname === '/leagues' && parsedUrl.searchParams.has('search')) ||
    (pathname === '/players/profiles' && parsedUrl.searchParams.has('search'))
  ) {
    return 'interactive_secondary';
  }

  if (
    pathname === '/transfers' ||
    pathname === '/trophies' ||
    pathname === '/players/topscorers' ||
    pathname === '/players/topassists' ||
    pathname === '/players/topyellowcards' ||
    pathname === '/players/topredcards'
  ) {
    return 'background';
  }

  return 'user_critical';
}

function currentMinuteBucket(now = Date.now()): number {
  return Math.floor(now / UPSTREAM_QUOTA_BUCKET_WINDOW_MS);
}

function buildUpstreamQuotaBucketKey(minuteBucket: number): string {
  return `${env.redisCachePrefix}upstream:quota:${minuteBucket}`;
}

function updateObservedQuotaUsage(minuteBucket: number, usageCount: number): void {
  observedQuotaMinute = minuteBucket;
  observedQuotaUsed = Math.max(0, usageCount);
}

function resolveQuotaBudgetLimit(
  upstreamGlobalRpmLimit: number,
  priority: UpstreamPriorityClass,
): number {
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

function resolveQuotaState(usedThisMinute: number, limitPerMinute: number): UpstreamQuotaState {
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

function consumeLocalQuota(
  limit: number,
  now = Date.now(),
): { allowed: boolean; usedThisMinute: number } {
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

function getFamilyTrafficState(
  family: string,
  priority: UpstreamPriorityClass,
): FamilyTrafficState {
  const current = familyTrafficByName.get(family);
  if (current) {
    if (current.priority !== priority) {
      current.priority = priority;
    }
    return current;
  }

  const nextState: FamilyTrafficState = {
    priority,
    requests: 0,
    sheds: 0,
  };
  familyTrafficByName.set(family, nextState);
  return nextState;
}

function recordFamilyRequest(family: string, priority: UpstreamPriorityClass): void {
  const state = getFamilyTrafficState(family, priority);
  state.requests += 1;
}

function recordFamilyShed(family: string, priority: UpstreamPriorityClass): void {
  const state = getFamilyTrafficState(family, priority);
  state.sheds += 1;
}

async function consumeUpstreamQuota(
  priority: UpstreamPriorityClass,
): Promise<UpstreamQuotaConsumeResult> {
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
      const evalResult = await quotaRedisClient.eval(
        QUOTA_CONSUME_LUA,
        1,
        quotaKey,
        String(budgetLimit),
        String(UPSTREAM_QUOTA_BUCKET_EXPIRE_MS),
      );

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
    } catch {
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

function getCircuitState(family: string): CircuitState {
  const state = circuitStateByFamily.get(family);
  if (state) {
    return state;
  }

  const nextState: CircuitState = {
    openUntilMs: 0,
    consecutiveFailures: 0,
    consecutiveRateLimits: 0,
  };
  circuitStateByFamily.set(family, nextState);
  return nextState;
}

function isCircuitOpenLocal(family: string, now = Date.now()): boolean {
  return now < getCircuitState(family).openUntilMs;
}

async function isCircuitOpen(family: string, now = Date.now()): Promise<boolean> {
  await syncCircuitStateFromRedis(family);
  return isCircuitOpenLocal(family, now);
}

function recordCircuitSuccess(family: string): void {
  const state = getCircuitState(family);
  state.openUntilMs = 0;
  state.consecutiveFailures = 0;
  state.consecutiveRateLimits = 0;
  publishCircuitStateToRedis(family, state);
}

function recordCircuitFailure(family: string, statusCode: number): void {
  if (statusCode !== 429 && statusCode < 500) {
    return;
  }

  const state = getCircuitState(family);

  if (statusCode === 429) {
    state.consecutiveRateLimits += 1;
  } else {
    state.consecutiveRateLimits = 0;
  }

  state.consecutiveFailures += 1;

  if (
    state.consecutiveFailures < CIRCUIT_FAILURE_THRESHOLD &&
    state.consecutiveRateLimits < CIRCUIT_RATE_LIMIT_THRESHOLD
  ) {
    return;
  }

  const nextOpenUntil = Date.now() + resolveUpstreamCircuitBreakerWindowMs();
  state.openUntilMs = Math.max(state.openUntilMs, nextOpenUntil);
  publishCircuitStateToRedis(family, state);
  console.warn('[circuit-breaker] upstream family opened', {
    family,
    consecutiveFailures: state.consecutiveFailures,
    consecutiveRateLimits: state.consecutiveRateLimits,
    openUntilMs: state.openUntilMs,
    nodeRole: env.nodeRole,
  });
}

async function resolveObservedQuotaUsage(): Promise<number> {
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
    } catch {
      quotaRedisReady = false;
    }
  }

  return observedQuotaUsed;
}

export async function getUpstreamGuardSnapshot(): Promise<UpstreamGuardSnapshot> {
  const limitPerMinute = resolveUpstreamGlobalRpmLimit();
  const usedThisMinute = await resolveObservedQuotaUsage();
  const remainingThisMinute =
    limitPerMinute > 0 ? Math.max(0, limitPerMinute - usedThisMinute) : 0;
  const utilizationPct =
    limitPerMinute > 0 ? Math.min(100, Math.round((usedThisMinute / limitPerMinute) * 100)) : 0;
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

export async function apiFootballGet<T>(
  pathWithQuery: string,
  signal?: AbortSignal,
): Promise<T> {
  const circuitFamily = resolveCircuitFamily(pathWithQuery);
  const priority = resolveUpstreamPriority(pathWithQuery);

  if (await isCircuitOpen(circuitFamily)) {
    const state = getCircuitState(circuitFamily);
    throw new UpstreamBffError(
      429,
      'UPSTREAM_CIRCUIT_OPEN',
      'API-Football circuit breaker is open. Retry later.',
      {
        family: circuitFamily,
        priority,
        openUntilMs: state.openUntilMs,
      },
    );
  }

  let lastError: unknown = null;

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
        throw new UpstreamBffError(
          429,
          'UPSTREAM_QUOTA_SHED',
          'API-Football budget reserved for critical traffic.',
          {
            family: circuitFamily,
            priority,
            quotaState: quotaResult.state,
            usedThisMinute: quotaResult.usedThisMinute,
            limitPerMinute: quotaResult.limitPerMinute,
            shedBudgetLimit: quotaResult.budgetLimit,
          },
        );
      }

      throw new UpstreamBffError(
        429,
        'UPSTREAM_QUOTA_EXCEEDED',
        'API-Football global quota budget exceeded.',
        {
          family: circuitFamily,
          priority,
          quotaState: quotaResult.state,
          usedThisMinute: quotaResult.usedThisMinute,
          limitPerMinute: quotaResult.limitPerMinute,
        },
      );
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

        throw new UpstreamBffError(
          response.status,
          'UPSTREAM_HTTP_ERROR',
          `API-Football returned HTTP ${response.status}.`,
          responseBody,
        );
      }

      const data = await response.json();
      const rawErrors = (data as any)?.errors;
      const hasApiError =
        rawErrors &&
        ((Array.isArray(rawErrors) && rawErrors.length > 0) ||
          (typeof rawErrors === 'object' && !Array.isArray(rawErrors) && Object.keys(rawErrors).length > 0));

      if (hasApiError) {
        const errorMessage = JSON.stringify(rawErrors);
        const isRateLimit = errorMessage.toLowerCase().includes('rate limit') || errorMessage.toLowerCase().includes('requests maximum');

        recordCircuitFailure(circuitFamily, isRateLimit ? 429 : 403);

        if (attempt < env.apiMaxRetries && isRateLimit) {
          await sleep(150 * (attempt + 1));
          continue;
        }

        throw new UpstreamBffError(
          isRateLimit ? 429 : 403,
          isRateLimit ? 'UPSTREAM_API_RATE_LIMIT' : 'UPSTREAM_API_ERROR',
          isRateLimit ? 'API-Football rate limit reached' : 'API-Football business error',
          rawErrors,
        );
      }

      recordCircuitSuccess(circuitFamily);
      return data as T;
    } catch (error) {
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
