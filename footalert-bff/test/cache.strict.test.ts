import assert from 'node:assert/strict';
import test from 'node:test';

import { buildApp, withManagedEnv } from './helpers/appTestHarness.ts';
import {
  assertCacheReadyOrThrow,
  configureCache,
  resetCacheForTests,
} from '../src/lib/cache.ts';

test('env rejects redis backend without REDIS_URL in staging mode', async () => {
  await assert.rejects(
    withManagedEnv(
      {
        APP_ENV: 'staging',
        CACHE_BACKEND: 'redis',
        REDIS_URL: '',
      },
      async () => import(`../src/config/env.ts?case=${Math.random().toString(36).slice(2)}`),
    ),
    /CACHE_BACKEND=redis requires REDIS_URL/,
  );
});

test('assertCacheReadyOrThrow fails when redis strict mode is enabled and redis is unreachable', async () => {
  resetCacheForTests();
  configureCache({
    backend: 'redis',
    strictMode: true,
    redisUrl: 'redis://127.0.0.1:1/0',
    redisPrefix: 'footalert:test:',
  });

  await assert.rejects(
    assertCacheReadyOrThrow(),
    /Redis strict mode validation failed/,
  );

  resetCacheForTests();
});

test('GET /health returns 503 when cache is degraded in strict redis mode', async t => {
  const app = await buildApp(t);
  const { configureCache, resetCacheForTests } = await import('../src/lib/cache.ts');

  t.after(() => {
    resetCacheForTests();
  });

  configureCache({
    backend: 'redis',
    strictMode: true,
    redisUrl: 'redis://127.0.0.1:1/0',
    redisPrefix: 'footalert:test:',
  });

  const response = await app.inject({
    method: 'GET',
    url: '/health',
  });

  assert.equal(response.statusCode, 503);
  const payload = response.json();
  assert.equal(payload.status, 'degraded');
  assert.equal(payload.cache.backend, 'redis');
  assert.equal(payload.cache.strictMode, true);
  assert.equal(payload.cache.degraded, true);
});
