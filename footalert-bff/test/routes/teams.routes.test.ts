import assert from 'node:assert/strict';
import test from 'node:test';

import { buildApp, installFetchMock, jsonResponse } from '../helpers/appTestHarness.ts';
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

test('GET /v1/teams/standings returns empty payload when upstream has no rows', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/teams/standings?leagueId=39&season=2022',
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { response: [] });
  assert.equal(calls.length, 1);
});

test('GET /v1/teams/:id/standings returns empty payload when upstream has no rows', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/teams/33/standings?leagueId=39&season=2022',
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { response: [] });
  assert.equal(calls.length, 1);
});

test('GET /v1/teams/:id/leagues proxies upstream endpoint', async t => {
  const calls = installFetchMock(async () =>
    jsonResponse({
      response: [{ league: { id: 39 } }],
    }),
  );
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/teams/40/leagues',
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { response: [{ league: { id: 39 } }] });
  assert.equal(String(calls[0].input), 'https://api-football.test/leagues?team=40');
});

test('GET /v1/teams/:id/next-fixture proxies upstream endpoint with timezone', async t => {
  const calls = installFetchMock(async () =>
    jsonResponse({
      response: [{ fixture: { id: 7001 } }],
    }),
  );
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/teams/40/next-fixture?timezone=Europe/Paris',
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { response: [{ fixture: { id: 7001 } }] });
  assert.equal(
    String(calls[0].input),
    'https://api-football.test/fixtures?team=40&next=1&timezone=Europe%2FParis',
  );
});

test('GET /v1/teams/:id/stats proxies team statistics endpoint', async t => {
  const calls = installFetchMock(async () =>
    jsonResponse({
      response: [{ team: { id: 40 } }],
    }),
  );
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/teams/40/stats?leagueId=39&season=2025',
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { response: [{ team: { id: 40 } }] });
  assert.equal(
    String(calls[0].input),
    'https://api-football.test/teams/statistics?league=39&season=2025&team=40',
  );
});

test('GET /v1/teams/:id/players proxies upstream endpoint', async t => {
  const calls = installFetchMock(async () =>
    jsonResponse({
      response: [{ player: { id: 1 } }],
    }),
  );
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/teams/40/players?leagueId=39&season=2025&page=2',
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { response: [{ player: { id: 1 } }] });
  assert.equal(
    String(calls[0].input),
    'https://api-football.test/players?team=40&league=39&season=2025&page=2',
  );
});

test('GET /v1/teams/:id/squad merges squad and coach payloads', async t => {
  const calls = installFetchMock(async call => {
    const url = new URL(String(call.input));
    if (url.pathname.endsWith('/players/squads')) {
      return jsonResponse({
        response: [{ players: [{ id: 1 }] }],
      });
    }

    return jsonResponse({
      response: [
        {
          id: 99,
          name: 'Coach 1',
          career: [{ team: { id: 40 }, end: null }],
        },
      ],
    });
  });
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/teams/40/squad',
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().response[0].players.length, 1);
  assert.equal(response.json().response[0].coach.name, 'Coach 1');
  assert.equal(calls.length, 2);
});
