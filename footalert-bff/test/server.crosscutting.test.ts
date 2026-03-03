import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildApp,
  buildMobileSessionAuthorizationHeader,
  installFetchMock,
  jsonResponse,
  withManagedEnv,
} from './helpers/appTestHarness.ts';

test('GET /health returns healthy status', async t => {
  installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/health',
  });

  assert.equal(response.statusCode, 200);
  const payload = response.json();
  assert.equal(payload.status, 'ok');
  assert.equal(payload.cache.backend, 'memory');
  assert.equal(payload.cache.strictMode, false);
  assert.equal(payload.cache.degraded, false);
});

test('GET /v1/capabilities returns match-details capabilities without upstream calls', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/capabilities',
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['cache-control'], 'public, max-age=120, stale-while-revalidate=120');
  assert.deepEqual(response.json().features.matchDetails, {
    details: true,
    events: true,
    statistics: true,
    lineups: true,
    headToHead: true,
    predictions: true,
    absences: true,
    playersStats: true,
  });
  assert.equal(
    response.json().endpoints.matchDetails.headToHead,
    '/v1/matches/:id/head-to-head',
  );
  assert.equal(calls.length, 0);
});

test('CORS rejects non-allowlisted origins with 403', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/competitions',
    headers: {
      origin: 'https://evil.example',
    },
  });

  assert.equal(response.statusCode, 403);
  assert.equal(response.json().error, 'CORS_ORIGIN_FORBIDDEN');
  assert.equal(calls.length, 0);
});

test('CORS allows configured origins and returns allow-origin header', async t => {
  installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/competitions',
    headers: {
      origin: 'https://app.footalert.test',
    },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['access-control-allow-origin'], 'https://app.footalert.test');
});

test('trustProxy is disabled by default and bounded when configured', async () => {
  const defaultHops = await withManagedEnv(
    {
      TRUST_PROXY_HOPS: '0',
    },
    async () => {
      const envDefault = await import(`../src/config/env.ts?case=${Math.random().toString(36).slice(2)}`);
      return envDefault.env.trustProxyHops;
    },
  );

  assert.equal(defaultHops, 0);

  const enabledHops = await withManagedEnv(
    {
      TRUST_PROXY_HOPS: '1',
      CORS_ALLOWED_ORIGINS: 'https://app.footalert.test',
    },
    async () => {
      const envProxy = await import(`../src/config/env.ts?case=${Math.random().toString(36).slice(2)}`);
      return envProxy.env.trustProxyHops;
    },
  );

  assert.equal(enabledHops, 1);
});

test('host-scoped mobile auth enforces bearer token on read routes', async t => {
  installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t, {
    MOBILE_AUTH_ENFORCED_HOSTS: 'api-mobile.footalert.com',
  });

  const unauthorized = await app.inject({
    method: 'GET',
    url: '/v1/competitions',
    headers: {
      host: 'api-mobile.footalert.com',
    },
  });
  assert.equal(unauthorized.statusCode, 401);
  assert.equal(unauthorized.json().error, 'MOBILE_ATTESTATION_REQUIRED');

  const authorized = await app.inject({
    method: 'GET',
    url: '/v1/competitions',
    headers: {
      host: 'api-mobile.footalert.com',
      ...buildMobileSessionAuthorizationHeader({
        scope: ['api:read'],
        integrity: 'device',
      }),
    },
  });
  assert.equal(authorized.statusCode, 200);
});
