import assert from 'node:assert/strict';
import test from 'node:test';

import { buildEnv } from '../../src/config/env/index.ts';

function createEnvSource(
  overrides: Record<string, string | undefined> = {},
): NodeJS.ProcessEnv {
  return {
    APP_ENV: 'test',
    NODE_ENV: 'test',
    NODE_ROLE: 'api',
    API_FOOTBALL_KEY: 'test-server-key',
    API_FOOTBALL_BASE_URL: 'https://api-football.test',
    MOBILE_SESSION_JWT_SECRET: 'test-mobile-session-secret',
    MOBILE_ATTESTATION_ACCEPT_MOCK: 'true',
    CORS_ALLOWED_ORIGINS: 'https://app.footalert.test',
    NOTIFICATIONS_BACKEND_ENABLED: 'true',
    NOTIFICATIONS_EVENT_INGEST_ENABLED: 'true',
    NOTIFICATIONS_PERSISTENCE_BACKEND: 'memory',
    NOTIFICATIONS_INGEST_TOKEN: 'test-notifications-ingest-token',
    PUSH_TOKEN_ENCRYPTION_KEY: 'test-notifications-encryption-key',
    DATABASE_URL: '',
    REDIS_URL: '',
    ...overrides,
  };
}

test('buildEnv resolves defaults, flags and pagination fallback without mutating process.env', () => {
  const env = buildEnv(createEnvSource({
    WEB_APP_ORIGIN: 'https://web.footalert.test/path',
    BFF_ENABLE_PLAYER_MATCHES_SWR: 'false',
  }));

  assert.equal(env.appEnv, 'test');
  assert.equal(env.cacheBackend, 'memory');
  assert.equal(env.notificationsPersistenceBackend, 'memory');
  assert.equal(env.paginationCursorSecret, 'test-mobile-session-secret');
  assert.equal(env.webAppOrigin, 'https://web.footalert.test');
  assert.deepEqual(env.corsAllowedOrigins.sort(), [
    'https://app.footalert.test',
    'https://web.footalert.test',
  ]);
  assert.equal(env.bffEnablePlayerMatchesSwr, false);
  assert.deepEqual(env.cacheTtl, {
    teams: 60_000,
    players: 60_000,
    competitions: 60_000,
    matches: 45_000,
  });
});

test('buildEnv enforces required notification secrets when the backend is enabled', () => {
  assert.throws(
    () =>
      buildEnv(createEnvSource({
        PUSH_TOKEN_ENCRYPTION_KEY: '',
      })),
    /NOTIFICATIONS_BACKEND_ENABLED=true requires PUSH_TOKEN_ENCRYPTION_KEY/,
  );

  assert.throws(
    () =>
      buildEnv(createEnvSource({
        NOTIFICATIONS_INGEST_TOKEN: '',
      })),
    /NOTIFICATIONS_EVENT_INGEST_ENABLED=true requires NOTIFICATIONS_INGEST_TOKEN/,
  );
});

test('buildEnv enforces staging persistence and redis invariants', () => {
  assert.throws(
    () =>
      buildEnv(createEnvSource({
        APP_ENV: 'staging',
        CACHE_BACKEND: 'redis',
        REDIS_URL: 'redis://127.0.0.1:6379/0',
        NOTIFICATIONS_PERSISTENCE_BACKEND: 'memory',
      })),
    /Staging\/production requires NOTIFICATIONS_PERSISTENCE_BACKEND=postgres/,
  );

  assert.throws(
    () =>
      buildEnv(createEnvSource({
        APP_ENV: 'staging',
        CACHE_STRICT_MODE: 'true',
        CACHE_BACKEND: 'memory',
      })),
    /CACHE_STRICT_MODE=true requires CACHE_BACKEND=redis/,
  );
});
