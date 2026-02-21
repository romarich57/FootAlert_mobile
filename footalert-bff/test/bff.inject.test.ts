import assert from 'node:assert/strict';
import test from 'node:test';
import type { FastifyInstance } from 'fastify';

process.env.API_FOOTBALL_KEY = 'test-server-key';
process.env.API_FOOTBALL_BASE_URL = 'https://api-football.test';
process.env.API_TIMEOUT_MS = '500';
process.env.API_MAX_RETRIES = '1';

type FetchCall = {
  input: string | URL | Request;
  init?: RequestInit;
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  });
}

function installFetchMock(handler: (call: FetchCall) => Promise<Response>): FetchCall[] {
  const calls: FetchCall[] = [];

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const call: FetchCall = { input, init };
    calls.push(call);
    return handler(call);
  }) as typeof fetch;

  return calls;
}

async function buildApp(): Promise<FastifyInstance> {
  const { buildServer } = await import('../src/server.ts');
  return buildServer();
}

test('GET /v1/matches returns 200 and proxies to API-Football', async t => {
  const calls = installFetchMock(async () =>
    jsonResponse({
      response: [{ fixture: { id: 1001 } }],
    }),
  );

  const app = await buildApp();
  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: 'GET',
    url: '/v1/matches?date=2026-02-21&timezone=Europe/Paris',
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    response: [{ fixture: { id: 1001 } }],
  });

  assert.equal(calls.length, 1);
  assert.equal(
    String(calls[0].input),
    'https://api-football.test/fixtures?date=2026-02-21&timezone=Europe%2FParis',
  );
});

test('GET /v1/matches returns 400 when required query params are missing', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));

  const app = await buildApp();
  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: 'GET',
    url: '/v1/matches?date=2026-02-21',
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, 'VALIDATION_ERROR');
  assert.equal(calls.length, 0);
});

test('GET /v1/competitions/search rejects unsupported params with 400', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));

  const app = await buildApp();
  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: 'GET',
    url: '/v1/competitions/search?q=premier&foo=bar',
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, 'VALIDATION_ERROR');
  assert.equal(calls.length, 0);
});

test('GET /v1/teams/:id returns upstream 5xx as normalized BFF 5xx', async t => {
  const calls = installFetchMock(async () =>
    new Response('upstream unavailable', {
      status: 503,
    }),
  );

  const app = await buildApp();
  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: 'GET',
    url: '/v1/teams/529',
  });

  assert.equal(response.statusCode, 503);
  assert.equal(response.json().error, 'UPSTREAM_HTTP_ERROR');
  assert.equal(calls.length, 2);
});

test('GET /v1/players/:id maps network failures to 502', async t => {
  const calls = installFetchMock(async () => {
    throw new TypeError('network down');
  });

  const app = await buildApp();
  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: 'GET',
    url: '/v1/players/278?season=2025',
  });

  assert.equal(response.statusCode, 502);
  assert.equal(response.json().error, 'UPSTREAM_UNAVAILABLE');
  assert.equal(calls.length, 2);
});

test('GET /v1/teams/standings validates required params and returns 400', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));

  const app = await buildApp();
  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: 'GET',
    url: '/v1/teams/standings?leagueId=39',
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, 'VALIDATION_ERROR');
  assert.equal(calls.length, 0);
});

test('GET /v1/follows/trends/teams aggregates league calls', async t => {
  const calls = installFetchMock(async call => {
    const url = String(call.input);

    if (url.includes('league=39')) {
      return jsonResponse({ response: [{ league: { id: 39 } }] });
    }

    return jsonResponse({ response: [{ league: { id: 61 } }] });
  });

  const app = await buildApp();
  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: 'GET',
    url: '/v1/follows/trends/teams?leagueIds=39,61&season=2025',
  });

  assert.equal(response.statusCode, 200);
  const payload = response.json();
  assert.equal(Array.isArray(payload.response), true);
  assert.equal(payload.response.length, 2);
  assert.equal(calls.length, 2);
});
