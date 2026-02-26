import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
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
  MOBILE_REQUEST_SIGNING_KEY: 'test-mobile-signing-key',
  MOBILE_REQUEST_SIGNATURE_MAX_SKEW_MS: '300000',
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

function normalizePrimitive(value: unknown): unknown {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  ) {
    return value;
  }

  return null;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(item => stableStringify(item)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const objectValue = value as Record<string, unknown>;
    const keys = Object.keys(objectValue).sort();
    const serializedEntries = keys.map(
      key => `${JSON.stringify(key)}:${stableStringify(objectValue[key])}`,
    );
    return `{${serializedEntries.join(',')}}`;
  }

  return JSON.stringify(normalizePrimitive(value));
}

function buildSignedMobileHeaders(options: {
  method: 'POST' | 'DELETE';
  url: string;
  body?: unknown;
  timestamp?: string;
  nonce?: string;
}): Record<string, string> {
  const timestamp = options.timestamp ?? Date.now().toString();
  const nonce = options.nonce ?? randomUUID();
  const signingPayload = [
    options.method,
    options.url,
    timestamp,
    nonce,
    stableStringify(options.body ?? null),
  ].join('\n');
  const signature = createHmac('sha256', BASE_ENV.MOBILE_REQUEST_SIGNING_KEY)
    .update(signingPayload)
    .digest('hex');

  return {
    'x-mobile-request-timestamp': timestamp,
    'x-mobile-request-nonce': nonce,
    'x-mobile-request-signature': signature,
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

async function buildApp(
  t: test.TestContext,
  overrides: Record<string, string | undefined> = {},
): Promise<FastifyInstance> {
  const previousValues = applyEnv(overrides);
  const { resetPushTokenStoreForTests } = await import('../src/routes/notifications.ts');
  const { resetMobileRequestNonceStoreForTests } = await import(
    '../src/lib/mobileRequestAuth.ts'
  );
  resetPushTokenStoreForTests();
  resetMobileRequestNonceStoreForTests();
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

test('GET /v1/matches applies short Cache-Control header', async t => {
  installFetchMock(async () =>
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
  assert.equal(response.headers['cache-control'], 'public, max-age=30, stale-while-revalidate=30');
});

test('GET /v1/competitions/:id/standings applies longer Cache-Control header', async t => {
  installFetchMock(async () =>
    jsonResponse({
      response: [{ league: { id: 39 }, standings: [] }],
    }),
  );

  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/competitions/39/standings?season=2025',
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['cache-control'], 'public, max-age=300, stale-while-revalidate=600');
});

test('GET /v1/competitions compresses large JSON payloads when client accepts gzip', async t => {
  installFetchMock(async () =>
    jsonResponse({
      response: Array.from({ length: 120 }, (_, index) => ({
        league: {
          id: index + 1,
          name: `League ${index + 1} ${'x'.repeat(48)}`,
          type: 'League',
          logo: 'https://cdn.footalert.test/logo.png',
        },
        country: {
          name: `Country ${index + 1}`,
          code: 'FR',
          flag: 'https://cdn.footalert.test/flag.png',
        },
        seasons: [],
      })),
    }),
  );

  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/competitions',
    headers: {
      'accept-encoding': 'gzip',
    },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['content-encoding'], 'gzip');
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

test('GET /v1/teams/:id/trophies retries with team name when id response is empty', async t => {
  const calls = installFetchMock(async call => {
    const url = new URL(String(call.input));
    const teamParam = url.searchParams.get('team');

    if (url.pathname.endsWith('/trophies') && teamParam === '529') {
      return jsonResponse({ response: [] });
    }

    if (url.pathname.endsWith('/teams') && url.searchParams.get('id') === '529') {
      return jsonResponse({
        response: [{ team: { id: 529, name: 'Barcelona' } }],
      });
    }

    if (url.pathname.endsWith('/trophies') && teamParam === 'Barcelona') {
      return jsonResponse({
        response: [{ league: 'La Liga', place: 'Winner', season: '2024' }],
      });
    }

    return jsonResponse({ response: [] });
  });

  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/teams/529/trophies',
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().response.length, 1);
  assert.equal(calls.length, 3);
  assert.equal(String(calls[0].input), 'https://api-football.test/trophies?team=529');
  assert.equal(String(calls[1].input), 'https://api-football.test/teams?id=529');
  assert.equal(String(calls[2].input), 'https://api-football.test/trophies?team=Barcelona');
});

test('GET /v1/teams/:id/trophies keeps id response when already non-empty', async t => {
  const calls = installFetchMock(async call => {
    const url = new URL(String(call.input));
    if (url.pathname.endsWith('/trophies')) {
      return jsonResponse({
        response: [{ league: 'Super Cup', place: 'Winner', season: '2025' }],
      });
    }

    return jsonResponse({ response: [] });
  });

  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/teams/530/trophies',
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().response.length, 1);
  assert.equal(calls.length, 1);
  assert.equal(String(calls[0].input), 'https://api-football.test/trophies?team=530');
});

test('GET /v1/teams/:id/trophies retries with search-name candidates when direct name candidates fail', async t => {
  const calls = installFetchMock(async call => {
    const url = new URL(String(call.input));
    const teamParam = url.searchParams.get('team');

    if (url.pathname.endsWith('/trophies') && teamParam === '540') {
      return jsonResponse({ response: [] });
    }

    if (url.pathname.endsWith('/teams') && url.searchParams.get('id') === '540') {
      return jsonResponse({
        response: [{ team: { id: 540, name: 'Olympique Marseille' } }],
      });
    }

    if (url.pathname.endsWith('/trophies') && teamParam === 'Olympique Marseille') {
      return jsonResponse({ response: [] });
    }

    if (url.pathname.endsWith('/trophies') && teamParam === 'Olympique Marseille FC') {
      return jsonResponse({ response: [] });
    }

    if (url.pathname.endsWith('/teams') && url.searchParams.get('search') === 'Olympique Marseille') {
      return jsonResponse({
        response: [{ team: { name: 'Olympique de Marseille' } }],
      });
    }

    if (url.pathname.endsWith('/trophies') && teamParam === 'Olympique de Marseille') {
      return jsonResponse({
        response: [{ league: 'Ligue 1', place: 'Winner', season: '2010' }],
      });
    }

    return jsonResponse({ response: [] });
  });

  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/teams/540/trophies',
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().response.length, 1);
  assert.equal(
    calls.some(call => String(call.input) === 'https://api-football.test/teams?search=Olympique%20Marseille'),
    true,
  );
  assert.equal(
    calls.some(call => String(call.input) === 'https://api-football.test/trophies?team=Olympique%20de%20Marseille'),
    true,
  );
});

test('GET /v1/teams/:id/trophies returns explicit empty response when ID and name lookups are empty', async t => {
  const calls = installFetchMock(async call => {
    const url = new URL(String(call.input));

    if (url.pathname.endsWith('/trophies') && url.searchParams.get('team') === '777') {
      return jsonResponse({ response: [] });
    }

    if (url.pathname.endsWith('/teams') && url.searchParams.get('id') === '777') {
      return jsonResponse({
        response: [{ team: { id: 777, name: '   ' } }],
      });
    }

    return jsonResponse({ response: [] });
  });

  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/teams/777/trophies',
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { response: [] });
  assert.equal(calls.length, 2);
  assert.equal(String(calls[0].input), 'https://api-football.test/trophies?team=777');
  assert.equal(String(calls[1].input), 'https://api-football.test/teams?id=777');
});

test('GET /v1/teams/:id/transfers deduplicates one-day-apart duplicates by keeping latest date', async t => {
  const calls = installFetchMock(async call => {
    const url = new URL(String(call.input));

    if (url.pathname.endsWith('/transfers') && url.searchParams.get('team') === '39') {
      return jsonResponse({
        response: [
          {
            player: { id: 2032, name: 'J. Strand Larsen' },
            update: '2026-02-01',
            transfers: [
              {
                date: '2026-01-31',
                type: 'Transfer',
                teams: {
                  in: { id: 52, name: 'Crystal Palace', logo: 'cp.png' },
                  out: { id: 39, name: 'Wolves', logo: 'wolves.png' },
                },
              },
              {
                date: '2026-02-01',
                type: 'Transfer',
                teams: {
                  in: { id: 52, name: 'Crystal Palace', logo: 'cp.png' },
                  out: { id: 39, name: 'Wolves', logo: 'wolves.png' },
                },
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
    url: '/v1/teams/39/transfers',
  });

  assert.equal(response.statusCode, 200);
  const payload = response.json();
  assert.equal(Array.isArray(payload.response), true);
  assert.equal(payload.response.length, 1);
  assert.equal(payload.response[0].transfers[0].date, '2026-02-01');
  assert.equal(calls.length, 1);
});

test('GET /v1/teams/:id/advanced-stats aggregates fixture statistics and returns team rankings', async t => {
  const calls = installFetchMock(async call => {
    const url = new URL(String(call.input));
    const pathname = url.pathname;

    if (pathname.endsWith('/fixtures') && url.searchParams.get('league') === '39') {
      return jsonResponse({
        response: [
          { fixture: { id: 7001, status: { short: 'FT' } } },
          { fixture: { id: 7002, status: { short: 'NS' } } },
        ],
      });
    }

    if (pathname.endsWith('/standings')) {
      return jsonResponse({
        response: [
          {
            league: {
              standings: [
                [
                  { team: { id: 10, name: 'Alpha FC', logo: 'alpha.png' } },
                  { team: { id: 20, name: 'Beta FC', logo: 'beta.png' } },
                ],
              ],
            },
          },
        ],
      });
    }

    if (pathname.endsWith('/fixtures/statistics') && url.searchParams.get('fixture') === '7001') {
      return jsonResponse({
        response: [
          {
            team: { id: 10, name: 'Alpha FC', logo: 'alpha.png' },
            statistics: [
              { type: 'Ball Possession', value: '55%' },
              { type: 'Shots on Goal', value: 6 },
              { type: 'Total Shots', value: 12 },
              { type: 'Expected Goals', value: '1.9' },
            ],
          },
          {
            team: { id: 20, name: 'Beta FC', logo: 'beta.png' },
            statistics: [
              { type: 'Ball Possession', value: '45%' },
              { type: 'Shots on Goal', value: 2 },
              { type: 'Total Shots', value: 8 },
              { type: 'Expected Goals', value: '0.8' },
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
    url: '/v1/teams/10/advanced-stats?leagueId=39&season=2025',
  });

  assert.equal(response.statusCode, 200);
  const payload = response.json();
  assert.equal(payload.response.teamId, 10);
  assert.equal(payload.response.leagueId, 39);
  assert.equal(payload.response.season, 2025);
  assert.equal(payload.response.metrics.possession?.value, 55);
  assert.equal(payload.response.metrics.possession?.rank, 1);
  assert.equal(payload.response.metrics.possession?.leaders.length, 2);
  assert.equal(payload.response.metrics.shotsOnTargetPerMatch?.value, 6);
  assert.equal(payload.response.metrics.shotsPerMatch?.value, 12);
  assert.equal(payload.response.metrics.expectedGoalsPerMatch?.value, 1.9);

  assert.equal(calls.length, 3);
});

test('GET /v1/teams/:id/advanced-stats reuses league-season cache for other team ids', async t => {
  const calls = installFetchMock(async call => {
    const url = new URL(String(call.input));
    const pathname = url.pathname;

    if (pathname.endsWith('/fixtures') && url.searchParams.get('league') === '39') {
      return jsonResponse({
        response: [{ fixture: { id: 7001, status: { short: 'FT' } } }],
      });
    }

    if (pathname.endsWith('/standings')) {
      return jsonResponse({
        response: [
          {
            league: {
              standings: [
                [
                  { team: { id: 10, name: 'Alpha FC', logo: 'alpha.png' } },
                  { team: { id: 20, name: 'Beta FC', logo: 'beta.png' } },
                ],
              ],
            },
          },
        ],
      });
    }

    if (pathname.endsWith('/fixtures/statistics') && url.searchParams.get('fixture') === '7001') {
      return jsonResponse({
        response: [
          {
            team: { id: 10, name: 'Alpha FC', logo: 'alpha.png' },
            statistics: [
              { type: 'Ball Possession', value: '55%' },
              { type: 'Shots on Goal', value: 6 },
              { type: 'Total Shots', value: 12 },
              { type: 'Expected Goals', value: '1.9' },
            ],
          },
          {
            team: { id: 20, name: 'Beta FC', logo: 'beta.png' },
            statistics: [
              { type: 'Ball Possession', value: '45%' },
              { type: 'Shots on Goal', value: 2 },
              { type: 'Total Shots', value: 8 },
              { type: 'Expected Goals', value: '0.8' },
            ],
          },
        ],
      });
    }

    return jsonResponse({ response: [] });
  });

  const app = await buildApp(t);

  const firstResponse = await app.inject({
    method: 'GET',
    url: '/v1/teams/10/advanced-stats?leagueId=39&season=2024',
  });
  assert.equal(firstResponse.statusCode, 200);
  assert.equal(calls.length, 3);

  const secondResponse = await app.inject({
    method: 'GET',
    url: '/v1/teams/20/advanced-stats?leagueId=39&season=2024',
  });
  assert.equal(secondResponse.statusCode, 200);
  const secondPayload = secondResponse.json();
  assert.equal(secondPayload.response.teamId, 20);
  assert.equal(secondPayload.response.metrics.possession?.value, 45);
  assert.equal(secondPayload.response.metrics.possession?.rank, 2);
  assert.equal(calls.length, 3);
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

test('GET /v1/competitions/:id/transfers filters, deduplicates and enriches transfer context', async t => {
  const calls = installFetchMock(async call => {
    const url = new URL(String(call.input));
    const pathname = url.pathname;

    if (pathname.endsWith('/teams')) {
      return jsonResponse({
        response: [
          { team: { id: 1 } },
          { team: { id: 2 } },
        ],
      });
    }

    if (pathname.endsWith('/transfers') && url.searchParams.get('team') === '1') {
      return jsonResponse({
        response: [
          {
            player: { id: 10, name: 'Player A' },
            update: '2026-01-01',
            transfers: [
              {
                date: '2025-08-10',
                type: 'Loan',
                teams: {
                  in: { id: 1, name: 'League Team 1', logo: 'in1.png' },
                  out: { id: 90, name: 'External Team', logo: 'out1.png' },
                },
              },
              {
                date: '2025-02-10',
                type: 'Transfer',
                teams: {
                  in: { id: 1, name: 'League Team 1', logo: 'in1.png' },
                  out: { id: 91, name: 'External Team 2', logo: 'out2.png' },
                },
              },
            ],
          },
        ],
      });
    }

    if (pathname.endsWith('/transfers') && url.searchParams.get('team') === '2') {
      return jsonResponse({
        response: [
          // Duplicate of Player A transfer shifted by one day, keep the most recent date.
          {
            player: { id: 10, name: 'Player A' },
            update: '2026-01-01',
            transfers: [
              {
                date: '2025-08-11',
                type: 'Loan',
                teams: {
                  in: { id: 1, name: 'League Team 1', logo: 'in1.png' },
                  out: { id: 90, name: 'External Team', logo: 'out1.png' },
                },
              },
            ],
          },
          {
            player: { id: 30, name: 'Player B' },
            update: '2026-01-01',
            transfers: [
              {
                date: '2025-09-12',
                type: 'Transfer',
                teams: {
                  in: { id: 2, name: 'League Team 2', logo: 'in2.png' },
                  out: { id: 1, name: 'League Team 1', logo: 'out2.png' },
                },
              },
              {
                date: '2026-07-02',
                type: 'Transfer',
                teams: {
                  in: { id: 2, name: 'League Team 2', logo: 'in2.png' },
                  out: { id: 1, name: 'League Team 1', logo: 'out2.png' },
                },
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
    url: '/v1/competitions/39/transfers?season=2025',
  });

  assert.equal(response.statusCode, 200);
  const payload = response.json();
  assert.equal(Array.isArray(payload.response), true);
  assert.equal(payload.response.length, 2);
  assert.equal(calls.length, 3);

  const first = payload.response[0];
  const second = payload.response[1];

  assert.equal(first.player.id, 30);
  assert.equal(first.context.teamInInLeague, true);
  assert.equal(first.context.teamOutInLeague, true);
  assert.equal(first.transfers[0].date, '2025-09-12');

  assert.equal(second.player.id, 10);
  assert.equal(second.context.teamInInLeague, true);
  assert.equal(second.context.teamOutInLeague, false);
  assert.equal(second.transfers[0].date, '2025-08-11');
});

test('GET /v1/competitions/:id/transfers keeps partial data when one team transfer call fails', async t => {
  const calls = installFetchMock(async call => {
    const url = new URL(String(call.input));
    const pathname = url.pathname;

    if (pathname.endsWith('/teams')) {
      return jsonResponse({
        response: [
          { team: { id: 1 } },
          { team: { id: 2 } },
        ],
      });
    }

    if (pathname.endsWith('/transfers') && url.searchParams.get('team') === '1') {
      return jsonResponse({
        response: [
          {
            player: { id: 99, name: 'Player Stable' },
            update: '2026-01-01',
            transfers: [
              {
                date: '2025-10-12',
                type: 'Transfer',
                teams: {
                  in: { id: 1, name: 'League Team 1', logo: 'in1.png' },
                  out: { id: 50, name: 'External Team', logo: 'out1.png' },
                },
              },
            ],
          },
        ],
      });
    }

    if (pathname.endsWith('/transfers') && url.searchParams.get('team') === '2') {
      throw new TypeError('upstream timeout');
    }

    return jsonResponse({ response: [] });
  });

  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/competitions/61/transfers?season=2025',
  });

  assert.equal(response.statusCode, 200);
  const payload = response.json();
  assert.equal(Array.isArray(payload.response), true);
  assert.equal(payload.response.length, 1);
  assert.equal(payload.response[0].player.id, 99);
  assert.equal(calls.length >= 3, true);
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

    if (url.includes('/players?id=278&season=')) {
      const season = Number(new URL(url).searchParams.get('season'));

      if (season === 2024) {
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

      if (season === 2023) {
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
      }

      return jsonResponse({ response: [] });
    }

    return jsonResponse({ response: [] });
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

  const detailCalls = calls
    .map(call => String(call.input))
    .filter(url => url.includes('/players?id=278&season='));
  const requestedSeasons = detailCalls.map(url => Number(new URL(url).searchParams.get('season')));

  assert.equal(detailCalls.length, 20);
  assert.equal(Math.min(...requestedSeasons), 2005);
  assert.equal(requestedSeasons.includes(2024), true);
  assert.equal(requestedSeasons.includes(2005), true);
  assert.equal(calls.length, 21);
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

test('POST /v1/notifications/tokens stores a push token payload', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);
  const payload = {
    token: 'token-1',
    deviceId: 'device-abc',
    platform: 'ios',
    provider: 'apns',
    appVersion: '1.0.0',
    locale: 'fr',
    timezone: 'Europe/Paris',
  } as const;

  const response = await app.inject({
    method: 'POST',
    url: '/v1/notifications/tokens',
    headers: buildSignedMobileHeaders({
      method: 'POST',
      url: '/v1/notifications/tokens',
      body: payload,
    }),
    payload,
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    status: 'registered',
    token: 'token-1',
  });
  assert.equal(calls.length, 0);
});

test('POST /v1/notifications/tokens rejects invalid payload', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);
  const payload = {
    token: 'token-1',
    deviceId: 'device-abc',
    platform: 'ios',
    provider: 'apns',
    appVersion: '1.0.0',
    locale: 'de',
    timezone: 'Europe/Paris',
  } as const;

  const response = await app.inject({
    method: 'POST',
    url: '/v1/notifications/tokens',
    headers: buildSignedMobileHeaders({
      method: 'POST',
      url: '/v1/notifications/tokens',
      body: payload,
    }),
    payload,
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, 'VALIDATION_ERROR');
  assert.equal(calls.length, 0);
});

test('DELETE /v1/notifications/tokens/:token revokes token', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);
  const registrationPayload = {
    token: 'token-delete',
    deviceId: 'device-1',
    platform: 'android',
    provider: 'fcm',
    appVersion: '1.0.0',
    locale: 'en',
    timezone: 'America/New_York',
  } as const;

  await app.inject({
    method: 'POST',
    url: '/v1/notifications/tokens',
    headers: buildSignedMobileHeaders({
      method: 'POST',
      url: '/v1/notifications/tokens',
      body: registrationPayload,
    }),
    payload: registrationPayload,
  });

  const deleteResponse = await app.inject({
    method: 'DELETE',
    url: '/v1/notifications/tokens/token-delete',
    headers: buildSignedMobileHeaders({
      method: 'DELETE',
      url: '/v1/notifications/tokens/token-delete',
    }),
  });

  assert.equal(deleteResponse.statusCode, 204);
  assert.equal(calls.length, 0);
});

test('POST /v1/telemetry/events accepts structured mobile events', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);
  const payload = {
    name: 'navigation.route_change',
    attributes: {
      from: 'Matches',
      to: 'TeamDetails',
    },
    userContext: {
      language: 'fr',
    },
    timestamp: '2026-02-25T10:00:00.000Z',
  } as const;

  const response = await app.inject({
    method: 'POST',
    url: '/v1/telemetry/events',
    headers: buildSignedMobileHeaders({
      method: 'POST',
      url: '/v1/telemetry/events',
      body: payload,
    }),
    payload,
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    status: 'accepted',
    type: 'event',
  });
  assert.equal(calls.length, 0);
});

test('POST /v1/telemetry/events/batch accepts structured mobile event arrays', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);
  const payload = [
    {
      name: 'navigation.route_change',
      attributes: {
        from: 'Matches',
        to: 'TeamDetails',
      },
      userContext: {
        language: 'fr',
      },
      timestamp: '2026-02-25T10:00:00.000Z',
    },
    {
      name: 'navigation.route_change',
      attributes: {
        from: 'TeamDetails',
        to: 'More',
      },
      userContext: {
        language: 'fr',
      },
      timestamp: '2026-02-25T10:00:01.000Z',
    },
  ] as const;

  const response = await app.inject({
    method: 'POST',
    url: '/v1/telemetry/events/batch',
    headers: buildSignedMobileHeaders({
      method: 'POST',
      url: '/v1/telemetry/events/batch',
      body: payload,
    }),
    payload,
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    status: 'accepted',
    type: 'event_batch',
    count: 2,
  });
  assert.equal(calls.length, 0);
});

test('POST /v1/telemetry/errors rejects malformed payloads', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);
  const payload = {
    name: '',
    message: '',
  } as const;

  const response = await app.inject({
    method: 'POST',
    url: '/v1/telemetry/errors',
    headers: buildSignedMobileHeaders({
      method: 'POST',
      url: '/v1/telemetry/errors',
      body: payload,
    }),
    payload,
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, 'VALIDATION_ERROR');
  assert.equal(calls.length, 0);
});

test('POST /v1/telemetry/errors/batch rejects malformed payload arrays', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);
  const payload = [
    {
      name: '',
      message: '',
    },
  ] as const;

  const response = await app.inject({
    method: 'POST',
    url: '/v1/telemetry/errors/batch',
    headers: buildSignedMobileHeaders({
      method: 'POST',
      url: '/v1/telemetry/errors/batch',
      body: payload,
    }),
    payload,
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, 'VALIDATION_ERROR');
  assert.equal(calls.length, 0);
});

test('POST /v1/notifications/tokens rejects unsigned technical requests', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'POST',
    url: '/v1/notifications/tokens',
    payload: {
      token: 'token-1',
      deviceId: 'device-abc',
      platform: 'ios',
      provider: 'apns',
      appVersion: '1.0.0',
      locale: 'fr',
      timezone: 'Europe/Paris',
    },
  });

  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error, 'MOBILE_REQUEST_SIGNATURE_MISSING');
  assert.equal(calls.length, 0);
});

test('POST /v1/telemetry/events rejects replayed nonce', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);
  const payload = {
    name: 'navigation.route_change',
    attributes: {
      from: 'Matches',
      to: 'More',
    },
  };
  const headers = buildSignedMobileHeaders({
    method: 'POST',
    url: '/v1/telemetry/events',
    body: payload,
    timestamp: Date.now().toString(),
    nonce: 'replay-nonce-1',
  });

  const firstResponse = await app.inject({
    method: 'POST',
    url: '/v1/telemetry/events',
    headers,
    payload,
  });
  const secondResponse = await app.inject({
    method: 'POST',
    url: '/v1/telemetry/events',
    headers,
    payload,
  });

  assert.equal(firstResponse.statusCode, 200);
  assert.equal(secondResponse.statusCode, 403);
  assert.equal(secondResponse.json().error, 'MOBILE_REQUEST_REPLAY_DETECTED');
  assert.equal(calls.length, 0);
});
