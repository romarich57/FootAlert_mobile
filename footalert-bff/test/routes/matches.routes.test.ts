import assert from 'node:assert/strict';
import test from 'node:test';

import { buildApp, installFetchMock, jsonResponse } from '../helpers/appTestHarness.ts';
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
  assert.match(String(response.headers.vary ?? ''), /accept-encoding/i);
});

test('critical match-details routes are registered and do not return 404', async t => {
  const fixtureId = '909';
  const teamId = '901';

  installFetchMock(async call => {
    const url = new URL(String(call.input));

    if (url.pathname.endsWith('/fixtures') && url.searchParams.get('id') === fixtureId) {
      return jsonResponse({
        response: [
          {
            league: { id: 39, season: 2025 },
            teams: { home: { id: 10 }, away: { id: 20 } },
          },
        ],
      });
    }

    return jsonResponse({ response: [] });
  });

  const app = await buildApp(t);

  const urls = [
    `/v1/matches/${fixtureId}?timezone=Europe/Paris`,
    `/v1/matches/${fixtureId}/events`,
    `/v1/matches/${fixtureId}/statistics`,
    `/v1/matches/${fixtureId}/lineups`,
    `/v1/matches/${fixtureId}/head-to-head?timezone=Europe/Paris&last=5`,
    `/v1/matches/${fixtureId}/predictions`,
    `/v1/matches/${fixtureId}/absences?timezone=Europe/Paris`,
    `/v1/matches/${fixtureId}/players/${teamId}/stats`,
  ] as const;

  for (const url of urls) {
    const response = await app.inject({
      method: 'GET',
      url,
    });

    assert.notEqual(response.statusCode, 404, `${url} should be registered`);
  }
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

test('GET /v1/matches/:id/events proxies to API-Football and applies short cache header', async t => {
  const calls = installFetchMock(async () =>
    jsonResponse({
      response: [{ type: 'Goal' }],
    }),
  );

  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/matches/101/events',
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    response: [{ type: 'Goal' }],
  });
  assert.equal(response.headers['cache-control'], 'public, max-age=30, stale-while-revalidate=30');
  assert.equal(
    String(calls[0].input),
    'https://api-football.test/fixtures/events?fixture=101',
  );
});

test('GET /v1/matches/:id/events rejects unsupported query params', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/matches/101/events?timezone=Europe/Paris',
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, 'VALIDATION_ERROR');
  assert.equal(calls.length, 0);
});

test('GET /v1/matches/:id/statistics rejects unsupported period values', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/matches/101/statistics?period=invalid',
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, 'VALIDATION_ERROR');
  assert.equal(calls.length, 0);
});

test('GET /v1/matches/:id/statistics defaults to global upstream endpoint', async t => {
  const calls = installFetchMock(async () =>
    jsonResponse({
      response: [{ team: { id: 1 }, statistics: [{ type: 'Shots on Goal', value: 5 }] }],
    }),
  );
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/matches/101/statistics',
  });

  assert.equal(response.statusCode, 200);
  assert.equal(
    String(calls[0].input),
    'https://api-football.test/fixtures/statistics?fixture=101',
  );
});

test('GET /v1/matches/:id/statistics filters first-half payload when period=first', async t => {
  const calls = installFetchMock(async call => {
    const url = new URL(String(call.input));

    if (url.pathname.endsWith('/fixtures') && url.searchParams.get('id') === '101') {
      return jsonResponse({
        response: [
          {
            league: { season: 2025 },
            teams: { home: { id: 1 }, away: { id: 2 } },
          },
        ],
      });
    }

    if (url.pathname.endsWith('/fixtures/statistics')) {
      return jsonResponse({
        response: [
          {
            team: { id: 1 },
            statistics: [
              { type: 'Shots on Goal (1st Half)', value: 3 },
              { type: 'Shots on Goal (2nd Half)', value: 4 },
            ],
          },
          {
            team: { id: 2 },
            statistics: [
              { type: 'Shots on Goal (1st Half)', value: 1 },
              { type: 'Shots on Goal (2nd Half)', value: 2 },
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
    url: '/v1/matches/101/statistics?period=first',
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    response: [
      {
        team: { id: 1 },
        statistics: [{ type: 'Shots on Goal', value: 3 }],
      },
      {
        team: { id: 2 },
        statistics: [{ type: 'Shots on Goal', value: 1 }],
      },
    ],
  });

  assert.equal(calls.length, 2);
  assert.equal(
    String(calls[1].input),
    'https://api-football.test/fixtures/statistics?fixture=101&half=true',
  );
});

test('GET /v1/matches/:id/statistics returns empty payload for half periods before 2024 season', async t => {
  const fixtureId = '202';
  const calls = installFetchMock(async call => {
    const url = new URL(String(call.input));

    if (url.pathname.endsWith('/fixtures') && url.searchParams.get('id') === fixtureId) {
      return jsonResponse({
        response: [
          {
            league: { season: 2023 },
            teams: { home: { id: 1 }, away: { id: 2 } },
          },
        ],
      });
    }

    return jsonResponse({ response: [] });
  });

  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: `/v1/matches/${fixtureId}/statistics?period=second`,
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { response: [] });
  assert.equal(calls.length, 1);
  assert.equal(
    String(calls[0].input),
    `https://api-football.test/fixtures?id=${fixtureId}`,
  );
});

test('GET /v1/matches/:id/statistics caches per period so first and second do not collide', async t => {
  const fixtureId = '303';
  const calls = installFetchMock(async call => {
    const url = new URL(String(call.input));

    if (url.pathname.endsWith('/fixtures') && url.searchParams.get('id') === fixtureId) {
      return jsonResponse({
        response: [
          {
            league: { season: 2025 },
            teams: { home: { id: 1 }, away: { id: 2 } },
          },
        ],
      });
    }

    if (url.pathname.endsWith('/fixtures/statistics')) {
      return jsonResponse({
        response: [
          {
            team: { id: 1 },
            statistics: [
              { type: 'Shots on Goal (1st Half)', value: 2 },
              { type: 'Shots on Goal (2nd Half)', value: 1 },
            ],
          },
          {
            team: { id: 2 },
            statistics: [
              { type: 'Shots on Goal (1st Half)', value: 1 },
              { type: 'Shots on Goal (2nd Half)', value: 2 },
            ],
          },
        ],
      });
    }

    return jsonResponse({ response: [] });
  });

  const app = await buildApp(t);

  const first = await app.inject({
    method: 'GET',
    url: `/v1/matches/${fixtureId}/statistics?period=first`,
  });
  const firstAgain = await app.inject({
    method: 'GET',
    url: `/v1/matches/${fixtureId}/statistics?period=first`,
  });
  const second = await app.inject({
    method: 'GET',
    url: `/v1/matches/${fixtureId}/statistics?period=second`,
  });

  assert.equal(first.statusCode, 200);
  assert.equal(firstAgain.statusCode, 200);
  assert.equal(second.statusCode, 200);

  const statisticsCalls = calls.filter(call =>
    new URL(String(call.input)).pathname.endsWith('/fixtures/statistics'),
  );
  assert.equal(statisticsCalls.length, 2);
  assert.equal(
    statisticsCalls.every(call => new URL(String(call.input)).searchParams.get('half') === 'true'),
    true,
  );
});

test('GET /v1/matches/:id/head-to-head fetches fixture context and proxies h2h query', async t => {
  const calls = installFetchMock(async call => {
    const url = new URL(String(call.input));

    if (url.pathname.endsWith('/fixtures') && url.searchParams.get('id') === '101') {
      return jsonResponse({
        response: [
          {
            teams: {
              home: { id: 10 },
              away: { id: 20 },
            },
          },
        ],
      });
    }

    if (url.pathname.endsWith('/fixtures/headtohead')) {
      return jsonResponse({
        response: [{ fixture: { id: 999 } }],
      });
    }

    return jsonResponse({ response: [] });
  });

  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/matches/101/head-to-head?timezone=Europe/Paris&last=5',
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['cache-control'], 'public, max-age=300, stale-while-revalidate=600');
  assert.deepEqual(response.json(), {
    response: [{ fixture: { id: 999 } }],
  });

  assert.equal(calls.length, 2);
  assert.equal(
    String(calls[0].input),
    'https://api-football.test/fixtures?id=101&timezone=Europe%2FParis',
  );
  assert.equal(
    String(calls[1].input),
    'https://api-football.test/fixtures/headtohead?h2h=10-20&last=5',
  );
});

test('GET /v1/matches/:id/absences returns partial fallback when one upstream injuries call fails', async t => {
  const calls = installFetchMock(async call => {
    const url = new URL(String(call.input));

    if (url.pathname.endsWith('/fixtures') && url.searchParams.get('id') === '202') {
      return jsonResponse({
        response: [
          {
            fixture: { id: 202, date: '2026-02-21T20:00:00+00:00' },
            league: { id: 61, season: 2025 },
            teams: {
              home: { id: 10 },
              away: { id: 20 },
            },
          },
        ],
      });
    }

    if (url.pathname.endsWith('/injuries') && url.searchParams.get('team') === '10') {
      return new Response('upstream error', { status: 500 });
    }

    if (url.pathname.endsWith('/injuries') && url.searchParams.get('team') === '20') {
      return jsonResponse({
        response: [
          {
            fixture: { id: 201, date: '2026-02-17T20:00:00+00:00' },
            player: { name: 'Old Injury' },
          },
          {
            fixture: { id: 202, date: '2026-02-21T20:00:00+00:00' },
            player: { name: 'Zed Player' },
          },
          {
            fixture: { id: 202, date: '2026-02-21T20:00:00+00:00' },
            player: { name: 'Alpha Player' },
          },
          {
            fixture: { id: 203, date: '2026-02-24T20:00:00+00:00' },
            player: { name: 'Future Injury' },
          },
        ],
      });
    }

    return jsonResponse({ response: [] });
  });

  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/matches/202/absences?timezone=Europe/Paris',
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    response: [
      { teamId: 10, response: [] },
      {
        teamId: 20,
        response: [
          {
            fixture: { id: 202, date: '2026-02-21T20:00:00+00:00' },
            player: { name: 'Alpha Player' },
          },
          {
            fixture: { id: 202, date: '2026-02-21T20:00:00+00:00' },
            player: { name: 'Zed Player' },
          },
        ],
      },
    ],
  });

  const urls = calls.map(call => String(call.input));
  assert.ok(urls.some(url => url.includes('/fixtures?id=202&timezone=Europe%2FParis')));
  assert.ok(urls.some(url => url.includes('/injuries?league=61&season=2025&team=10')));
  assert.ok(urls.some(url => url.includes('/injuries?league=61&season=2025&team=20')));
});

test('GET /v1/matches/:id proxies fixture details with timezone', async t => {
  const calls = installFetchMock(async () =>
    jsonResponse({
      response: [{ fixture: { id: 101 } }],
    }),
  );
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/matches/101?timezone=Europe/Paris',
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { response: [{ fixture: { id: 101 } }] });
  assert.equal(
    String(calls[0].input),
    'https://api-football.test/fixtures?id=101&timezone=Europe%2FParis',
  );
});

test('GET /v1/matches/:id/lineups proxies upstream payload', async t => {
  const calls = installFetchMock(async () =>
    jsonResponse({
      response: [{ team: { id: 10 } }],
    }),
  );
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/matches/101/lineups',
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { response: [{ team: { id: 10 } }] });
  assert.equal(String(calls[0].input), 'https://api-football.test/fixtures/lineups?fixture=101');
});

test('GET /v1/matches/:id/predictions proxies upstream payload', async t => {
  const calls = installFetchMock(async () =>
    jsonResponse({
      response: [{ predictions: { winner: { id: 10 } } }],
    }),
  );
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/matches/101/predictions',
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    response: [{ predictions: { winner: { id: 10 } } }],
  });
  assert.equal(String(calls[0].input), 'https://api-football.test/predictions?fixture=101');
});

test('GET /v1/matches/:id/players/:teamId/stats proxies upstream payload', async t => {
  const calls = installFetchMock(async () =>
    jsonResponse({
      response: [{ players: [] }],
    }),
  );
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/matches/101/players/10/stats',
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { response: [{ players: [] }] });
  assert.equal(
    String(calls[0].input),
    'https://api-football.test/fixtures/players?fixture=101&team=10',
  );
});
