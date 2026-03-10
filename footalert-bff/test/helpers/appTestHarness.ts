import type test from 'node:test';
import type { FastifyInstance } from 'fastify';

import {
  createMobileSessionToken,
  type MobileSessionScope,
} from '../../src/lib/mobileSessionToken.ts';

export type FetchCall = {
  input: string | URL | Request;
  init?: RequestInit;
};

const BASE_ENV: Record<string, string> = {
  APP_ENV: 'test',
  NODE_ROLE: 'api',
  API_FOOTBALL_KEY: 'test-server-key',
  API_FOOTBALL_BASE_URL: 'https://api-football.test',
  API_TIMEOUT_MS: '500',
  API_MAX_RETRIES: '1',
  RATE_LIMIT_MAX: '120',
  RATE_LIMIT_WINDOW_MS: '60000',
  TRUST_PROXY_HOPS: '0',
  CORS_ALLOWED_ORIGINS: 'https://app.footalert.test',
  CACHE_MAX_ENTRIES: '1000',
  CACHE_CLEANUP_INTERVAL_MS: '60000',
  CACHE_TTL_JITTER_PCT: '15',
  CACHE_LOCK_TTL_MS: '3000',
  CACHE_COALESCE_WAIT_MS: '750',
  CACHE_TTL_TEAMS_MS: '60000',
  CACHE_TTL_PLAYERS_MS: '60000',
  CACHE_TTL_COMPETITIONS_MS: '60000',
  CACHE_TTL_MATCHES_MS: '45000',
  UPSTREAM_GLOBAL_RPM_LIMIT: '600',
  UPSTREAM_CIRCUIT_BREAKER_WINDOW_MS: '30000',
  CACHE_BACKEND: 'memory',
  CACHE_STRICT_MODE: 'false',
  REDIS_URL: '',
  REDIS_CACHE_PREFIX: 'footalert:bff:',
  BFF_EXPOSE_ERROR_DETAILS: 'false',
  MOBILE_SESSION_JWT_SECRET: 'test-mobile-session-secret',
  MOBILE_SESSION_TOKEN_TTL_MS: '900000',
  MOBILE_REFRESH_TOKEN_TTL_MS: '2592000000',
  MOBILE_AUTH_CHALLENGE_TTL_MS: '120000',
  MOBILE_ATTESTATION_ACCEPT_MOCK: 'true',
  MOBILE_ATTESTATION_ENFORCEMENT_MODE: 'strict',
  MOBILE_AUTH_ENFORCED_HOSTS: 'api-mobile.footalert.com',
  MOBILE_PLAY_INTEGRITY_PACKAGE_NAME: 'com.footalert.app',
  MOBILE_PLAY_INTEGRITY_SERVICE_ACCOUNT_EMAIL: '',
  MOBILE_PLAY_INTEGRITY_SERVICE_ACCOUNT_PRIVATE_KEY: '',
  MOBILE_APP_ATTEST_BUNDLE_ID: 'com.footalert.app',
  MOBILE_APP_ATTEST_TEAM_ID: '',
  MOBILE_APP_ATTEST_VERIFICATION_URL: '',
  MOBILE_APP_ATTEST_VERIFICATION_SECRET: '',
  PAGINATION_CURSOR_SECRET: 'test-pagination-cursor-secret',
  PAGINATION_CURSOR_TTL_MS: '900000',
  NOTIFICATIONS_BACKEND_ENABLED: 'true',
  NOTIFICATIONS_EVENT_INGEST_ENABLED: 'true',
  NOTIFICATIONS_PERSISTENCE_BACKEND: 'memory',
  NOTIFICATIONS_FANOUT_MAX_PER_EVENT: '10000',
  NOTIFICATIONS_DEFERRED_PROMOTION_BATCH: '1000',
  NOTIFICATIONS_DEFERRED_DELAY_MS: '15000',
  DATABASE_URL: '',
  NOTIFICATIONS_INGEST_TOKEN: 'test-notifications-ingest-token',
  PUSH_TOKEN_ENCRYPTION_KEY: 'test-notifications-encryption-key',
  FIREBASE_PROJECT_ID: '',
  FIREBASE_CLIENT_EMAIL: '',
  FIREBASE_PRIVATE_KEY: '',
  OPS_METRICS_TOKEN: '',
  NODE_ENV: 'test',
};

const MANAGED_ENV_KEYS = Object.keys(BASE_ENV);

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  });
}

export function installFetchMock(handler: (call: FetchCall) => Promise<Response>): FetchCall[] {
  const calls: FetchCall[] = [];

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const call: FetchCall = { input, init };
    calls.push(call);
    return handler(call);
  }) as typeof fetch;

  return calls;
}

export function buildMobileSessionAuthorizationHeader(options?: {
  subject?: string;
  platform?: 'android' | 'ios';
  integrity?: 'strong' | 'device' | 'basic' | 'unknown';
  scope?: MobileSessionScope[];
  ttlMs?: number;
}): Record<string, string> {
  const token = createMobileSessionToken({
    subject: options?.subject ?? 'device-hash-test',
    platform: options?.platform ?? 'android',
    integrity: options?.integrity ?? 'strong',
    scope: options?.scope ?? ['api:read', 'notifications:write', 'telemetry:write', 'privacy:erase'],
    ttlMs: options?.ttlMs ?? 600_000,
    secret: BASE_ENV.MOBILE_SESSION_JWT_SECRET,
  }).token;

  return {
    authorization: `Bearer ${token}`,
  };
}

function applyEnv(overrides: Record<string, string | undefined>): Record<string, string | undefined> {
  const previousValues: Record<string, string | undefined> = {};

  MANAGED_ENV_KEYS.forEach(key => {
    previousValues[key] = process.env[key];
    process.env[key] = BASE_ENV[key];
  });

  Object.entries(overrides).forEach(([key, value]) => {
    if (typeof value === 'undefined') {
      delete process.env[key];
      return;
    }

    process.env[key] = value;
  });

  return previousValues;
}

function restoreEnv(previousValues: Record<string, string | undefined>): void {
  MANAGED_ENV_KEYS.forEach(key => {
    const previous = previousValues[key];
    if (typeof previous === 'undefined') {
      delete process.env[key];
      return;
    }

    process.env[key] = previous;
  });
}

export async function buildApp(
  t: test.TestContext,
  overrides: Record<string, string | undefined> = {},
): Promise<FastifyInstance> {
  const previousValues = applyEnv(overrides);
  const { resetCacheForTests } = await import('../../src/lib/cache.ts');
  const { resetPushTokenStoreForTests } = await import('../../src/routes/notifications.ts');
  const { resetMobileSessionChallengeStoreForTests } = await import(
    '../../src/lib/mobileSessionChallengeStore.ts'
  );
  const { resetMobileAuthMetricsForTests } = await import('../../src/lib/mobileAuthMetrics.ts');
  const { resetApiFootballClientGuardsForTests } = await import('../../src/lib/apiFootballClient.ts');
  const { resetMobileSessionRefreshRuntimeForTests } = await import(
    '../../src/lib/mobileSessionRefreshRuntime.ts'
  );
  const { resetFollowsDiscoveryRuntimeForTests } = await import(
    '../../src/lib/follows/discoveryRuntime.ts'
  );
  const { resetNotificationsRuntimeForTests } = await import('../../src/lib/notifications/runtime.ts');
  const { resetNotificationsMetricsForTests } = await import('../../src/lib/notifications/metrics.ts');
  const { resetReadStoreRuntimeForTests } = await import('../../src/lib/readStore/runtime.ts');
  const { resetRuntimeStatusForTests } = await import('../../src/lib/runtimeStatus.ts');
  resetCacheForTests();
  await resetPushTokenStoreForTests();
  resetMobileSessionChallengeStoreForTests();
  resetMobileAuthMetricsForTests();
  resetApiFootballClientGuardsForTests();
  await resetMobileSessionRefreshRuntimeForTests();
  await resetFollowsDiscoveryRuntimeForTests();
  await resetNotificationsRuntimeForTests();
  resetNotificationsMetricsForTests();
  await resetReadStoreRuntimeForTests();
  await resetRuntimeStatusForTests();
  const { buildServer } = await import(`../../src/server.ts?case=${Math.random().toString(36).slice(2)}`);
  const app = await buildServer();

  t.after(async () => {
    await app.close();
    restoreEnv(previousValues);
  });

  return app;
}

export function withManagedEnv<T>(
  overrides: Record<string, string | undefined>,
  callback: () => Promise<T> | T,
): Promise<T> {
  const previous = applyEnv(overrides);
  const complete = async () => {
    try {
      return await callback();
    } finally {
      restoreEnv(previous);
    }
  };

  return complete();
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
