import assert from 'node:assert/strict';
import test from 'node:test';

import { buildApp, installFetchMock, jsonResponse, sleep } from '../helpers/appTestHarness.ts';
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

test('GET /v1/follows/search/teams proxies search query', async t => {
  const calls = installFetchMock(async () =>
    jsonResponse({
      response: [{ team: { id: 40 } }],
    }),
  );
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/follows/search/teams?q=chelsea',
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { response: [{ team: { id: 40 } }] });
  assert.equal(String(calls[0].input), 'https://api-football.test/teams?search=chelsea');
});

test('GET /v1/follows/search/players maps profile payload shape', async t => {
  const calls = installFetchMock(async () =>
    jsonResponse({
      response: [{ player: { id: 7, name: 'Player X', position: 'Attacker' } }],
    }),
  );
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/follows/search/players?q=player&season=2025',
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    response: [
      {
        player: {
          id: 7,
          name: 'Player X',
        },
        statistics: [
          {
            games: {
              position: 'Attacker',
            },
          },
        ],
      },
    ],
  });
  assert.equal(String(calls[0].input), 'https://api-football.test/players/profiles?search=player');
});

test('GET /v1/follows/teams/:teamId and next-fixture proxy upstream', async t => {
  const calls = installFetchMock(async call => {
    const url = new URL(String(call.input));
    if (url.pathname.endsWith('/teams')) {
      return jsonResponse({ response: [{ team: { id: 40 } }] });
    }

    return jsonResponse({ response: [{ fixture: { id: 99 } }] });
  });
  const app = await buildApp(t);

  const details = await app.inject({
    method: 'GET',
    url: '/v1/follows/teams/40',
  });
  const nextFixture = await app.inject({
    method: 'GET',
    url: '/v1/follows/teams/40/next-fixture?timezone=Europe/Paris',
  });

  assert.equal(details.statusCode, 200);
  assert.equal(nextFixture.statusCode, 200);
  assert.deepEqual(details.json(), { response: [{ team: { id: 40 } }] });
  assert.deepEqual(nextFixture.json(), { response: [{ fixture: { id: 99 } }] });
  assert.equal(String(calls[0].input), 'https://api-football.test/teams?id=40');
  assert.equal(
    String(calls[1].input),
    'https://api-football.test/fixtures?team=40&next=1&timezone=Europe%2FParis',
  );
});

test('GET /v1/follows/players/:playerId/season/:season proxies player details', async t => {
  const calls = installFetchMock(async () =>
    jsonResponse({
      response: [{ player: { id: 278 } }],
    }),
  );
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/follows/players/278/season/2025',
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { response: [{ player: { id: 278 } }] });
  assert.equal(String(calls[0].input), 'https://api-football.test/players?id=278&season=2025');
});

test('GET /v1/follows/trends/players aggregates scorer calls with bounded concurrency', async t => {
  let activeRequests = 0;
  let maxConcurrentRequests = 0;
  const calls = installFetchMock(async call => {
    activeRequests += 1;
    maxConcurrentRequests = Math.max(maxConcurrentRequests, activeRequests);
    await sleep(10);
    activeRequests -= 1;
    const url = new URL(String(call.input));
    return jsonResponse({ response: [{ league: { id: url.searchParams.get('league') } }] });
  });
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/follows/trends/players?leagueIds=39,61,140&season=2025',
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().response.length, 3);
  assert.equal(calls.length, 3);
  assert.equal(maxConcurrentRequests <= 3, true);
});
