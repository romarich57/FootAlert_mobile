import assert from 'node:assert/strict';
import test from 'node:test';
import type { FastifyInstance } from 'fastify';

type FetchCall = {
  input: string | URL | Request;
  init?: RequestInit;
};

const BASE_ENV: Record<string, string> = {
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
  BFF_EXPOSE_ERROR_DETAILS: 'false',
  NODE_ENV: 'test',
};

const MANAGED_ENV_KEYS = Object.keys(BASE_ENV);

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

async function buildApp(
  t: test.TestContext,
  overrides: Record<string, string | undefined> = {},
): Promise<FastifyInstance> {
  const previousValues = applyEnv(overrides);
  const { buildServer } = await import(`../src/server.ts?case=${Math.random().toString(36).slice(2)}`);
  const app = await buildServer();

  t.after(async () => {
    await app.close();
    restoreEnv(previousValues);
  });

  return app;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

test('GET /v1/matches returns 200 and proxies to API-Football', async t => {
  const calls = installFetchMock(async () =>
    jsonResponse({
      response: [{ fixture: { id: 1001 } }],
    }),
  );

  const app = await buildApp(t);

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

  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/matches?date=2026-02-21',
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, 'VALIDATION_ERROR');
  assert.equal(response.json().details, undefined);
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

test('trustProxy is disabled by default and bounded when configured', async t => {
  const originalValues: Record<string, string | undefined> = {};
  MANAGED_ENV_KEYS.forEach(key => {
    originalValues[key] = process.env[key];
  });

  const previousDefault = applyEnv({
    TRUST_PROXY_HOPS: '0',
  });
  const envDefault = await import(
    `../src/config/env.ts?case=${Math.random().toString(36).slice(2)}`
  );
  assert.equal(envDefault.env.trustProxyHops, 0);
  restoreEnv(previousDefault);

  const previousProxy = applyEnv({
    TRUST_PROXY_HOPS: '1',
    CORS_ALLOWED_ORIGINS: 'https://app.footalert.test',
  });
  const envProxy = await import(
    `../src/config/env.ts?case=${Math.random().toString(36).slice(2)}`
  );
  assert.equal(envProxy.env.trustProxyHops, 1);
  restoreEnv(previousProxy);

  t.after(() => {
    restoreEnv(originalValues);
  });
});

test('GET /v1/competitions/search rejects unsupported params with 400', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));

  const app = await buildApp(t);

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

  const app = await buildApp(t);

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

  const app = await buildApp(t);

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

  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/teams/standings?leagueId=39',
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, 'VALIDATION_ERROR');
  assert.equal(calls.length, 0);
});

test('GET /v1/follows/trends/teams rejects more than 10 leagues', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/follows/trends/teams?leagueIds=1,2,3,4,5,6,7,8,9,10,11&season=2025',
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, 'VALIDATION_ERROR');
  assert.equal(calls.length, 0);
});

test('GET /v1/follows/trends/teams aggregates league calls with bounded concurrency', async t => {
  let activeRequests = 0;
  let maxConcurrentRequests = 0;
  const calls = installFetchMock(async call => {
    activeRequests += 1;
    maxConcurrentRequests = Math.max(maxConcurrentRequests, activeRequests);
    await sleep(10);
    activeRequests -= 1;

    const url = new URL(String(call.input));
    const leagueId = url.searchParams.get('league');
    return jsonResponse({ response: [{ league: { id: leagueId } }] });
  });

  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/follows/trends/teams?leagueIds=39,61,78,140,2,3&season=2025',
  });

  assert.equal(response.statusCode, 200);
  const payload = response.json();
  assert.equal(Array.isArray(payload.response), true);
  assert.equal(payload.response.length, 6);
  assert.equal(calls.length, 6);
  assert.equal(maxConcurrentRequests <= 3, true);
});

test('players and teams endpoints reject out-of-range volumetric params', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);

  const playerMatches = await app.inject({
    method: 'GET',
    url: '/v1/players/278/matches?teamId=40&season=2025&last=21',
  });
  const teamFixtures = await app.inject({
    method: 'GET',
    url: '/v1/teams/40/fixtures?season=2025&next=11',
  });
  const teamPlayers = await app.inject({
    method: 'GET',
    url: '/v1/teams/40/players?leagueId=39&season=2025&page=11',
  });

  assert.equal(playerMatches.statusCode, 400);
  assert.equal(teamFixtures.statusCode, 400);
  assert.equal(teamPlayers.statusCode, 400);
  assert.equal(calls.length, 0);
});

test('GET /v1/players/:id/career returns aggregated seasons and teams', async t => {
  const calls = installFetchMock(async call => {
    const url = String(call.input);

    if (url.includes('/players/seasons?player=278')) {
      return jsonResponse({ response: [2024, 2023] });
    }

    if (url.includes('/players?id=278&season=2024')) {
      return jsonResponse({
        response: [
          {
            statistics: [
              {
                team: { id: 33, name: 'Team A', logo: 'https://logo-a' },
                league: { season: 2024 },
                games: { appearences: 20, rating: '7.2' },
                goals: { total: 9, assists: 3 },
              },
            ],
          },
        ],
      });
    }

    return jsonResponse({
      response: [
        {
          statistics: [
            {
              team: { id: 33, name: 'Team A', logo: 'https://logo-a' },
              league: { season: 2023 },
              games: { appearences: 18, rating: '7.0' },
              goals: { total: 7, assists: 4 },
            },
          ],
        },
      ],
    });
  });

  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/players/278/career',
  });

  assert.equal(response.statusCode, 200);
  const payload = response.json();
  assert.equal(Array.isArray(payload.response.seasons), true);
  assert.equal(payload.response.seasons.length, 2);
  assert.deepEqual(payload.response.seasons[0].team, {
    id: '33',
    name: 'Team A',
    logo: 'https://logo-a',
  });
  assert.equal(payload.response.teams.length, 1);
  assert.equal(payload.response.teams[0].matches, 38);
  assert.equal(calls.length, 3);
});

test('GET /v1/players/:id/matches returns aggregated player match performances', async t => {
  const calls = installFetchMock(async call => {
    const url = String(call.input);

    if (url.includes('/fixtures?team=40&season=2025&last=2')) {
      return jsonResponse({
        response: [
          {
            fixture: { id: 9001, date: '2026-02-20T20:00:00Z' },
            league: { id: 39, name: 'Premier League', logo: 'https://league-logo' },
            teams: {
              home: { id: 40, name: 'Team A', logo: 'https://team-a' },
              away: { id: 50, name: 'Team B', logo: 'https://team-b' },
            },
            goals: { home: 2, away: 1 },
          },
          {
            fixture: { id: 9002, date: '2026-02-14T20:00:00Z' },
            league: { id: 39, name: 'Premier League', logo: 'https://league-logo' },
            teams: {
              home: { id: 51, name: 'Team C', logo: 'https://team-c' },
              away: { id: 40, name: 'Team A', logo: 'https://team-a' },
            },
            goals: { home: 0, away: 0 },
          },
        ],
      });
    }

    if (url.includes('/fixtures/players?fixture=9001&team=40')) {
      return jsonResponse({
        response: [
          {
            players: [
              {
                players: [
                  {
                    player: { id: 278 },
                    statistics: [
                      {
                        games: { minutes: 90, rating: '7.8', substitute: false },
                        goals: { total: 1, assists: 0 },
                        cards: { yellow: 1, red: 0 },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });
    }

    return jsonResponse({ response: [] });
  });

  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/players/278/matches?teamId=40&season=2025&last=2',
  });

  assert.equal(response.statusCode, 200);
  const payload = response.json();
  assert.equal(Array.isArray(payload.response), true);
  assert.equal(payload.response.length, 2);
  assert.equal(payload.response[0].fixtureId, '9001');
  assert.equal(payload.response[0].playerStats.minutes, 90);
  assert.equal(payload.response[1].fixtureId, '9002');
  assert.equal(payload.response[1].playerStats.minutes, null);
  assert.equal(calls.length, 3);
});
