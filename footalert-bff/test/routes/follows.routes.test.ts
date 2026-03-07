import assert from 'node:assert/strict';
import test from 'node:test';

import { FOLLOW_DISCOVERY_SEED_PLAYERS, FOLLOW_DISCOVERY_SEED_TEAMS } from '@footalert/app-core';

import {
  buildApp,
  buildMobileSessionAuthorizationHeader,
  installFetchMock,
  jsonResponse,
  sleep,
} from '../helpers/appTestHarness.ts';
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

test('POST /v1/follows/events is idempotent and GET /v1/follows/discovery/teams ranks dynamic items', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);

  const firstFollow = await app.inject({
    method: 'POST',
    url: '/v1/follows/events',
    headers: buildMobileSessionAuthorizationHeader({ subject: 'device-a' }),
    payload: {
      entityKind: 'team',
      entityId: '529',
      action: 'follow',
      source: 'follows_trending',
      entitySnapshot: {
        teamName: 'Barcelona',
        teamLogo: 'barca.png',
        country: 'Spain',
      },
    },
  });

  assert.equal(firstFollow.statusCode, 200);
  assert.deepEqual(firstFollow.json(), {
    status: 'accepted',
    applied: true,
    state: 'followed',
  });

  const duplicateFollow = await app.inject({
    method: 'POST',
    url: '/v1/follows/events',
    headers: buildMobileSessionAuthorizationHeader({ subject: 'device-a' }),
    payload: {
      entityKind: 'team',
      entityId: '529',
      action: 'follow',
      source: 'follows_trending',
      entitySnapshot: {
        teamName: 'Barcelona',
        teamLogo: 'barca.png',
        country: 'Spain',
      },
    },
  });

  assert.equal(duplicateFollow.statusCode, 200);
  assert.deepEqual(duplicateFollow.json(), {
    status: 'accepted',
    applied: false,
    state: 'followed',
  });

  const secondDeviceFollow = await app.inject({
    method: 'POST',
    url: '/v1/follows/events',
    headers: buildMobileSessionAuthorizationHeader({ subject: 'device-b' }),
    payload: {
      entityKind: 'team',
      entityId: '529',
      action: 'follow',
      source: 'team_details',
      entitySnapshot: {
        teamName: 'Barcelona',
        teamLogo: 'barca.png',
        country: 'Spain',
      },
    },
  });

  assert.equal(secondDeviceFollow.statusCode, 200);

  const thirdFollow = await app.inject({
    method: 'POST',
    url: '/v1/follows/events',
    headers: buildMobileSessionAuthorizationHeader({ subject: 'device-c' }),
    payload: {
      entityKind: 'team',
      entityId: '85',
      action: 'follow',
      source: 'team_details',
      entitySnapshot: {
        teamName: 'Paris Saint-Germain',
        teamLogo: 'psg.png',
        country: 'France',
      },
    },
  });

  assert.equal(thirdFollow.statusCode, 200);

  const discovery = await app.inject({
    method: 'GET',
    url: '/v1/follows/discovery/teams?limit=2',
  });

  assert.equal(discovery.statusCode, 200);
  assert.equal(calls.length, 0);

  assert.deepEqual(discovery.json(), {
    items: [
      {
        teamId: '529',
        teamName: 'Barcelona',
        teamLogo: 'barca.png',
        country: 'Spain',
        activeFollowersCount: 2,
        recentNet30d: 2,
        totalFollowAdds: 2,
      },
      {
        teamId: '85',
        teamName: 'Paris Saint-Germain',
        teamLogo: 'psg.png',
        country: 'France',
        activeFollowersCount: 1,
        recentNet30d: 1,
        totalFollowAdds: 1,
      },
    ],
    meta: {
      source: 'dynamic',
    },
  });
});

test('POST /v1/follows/events ignores unfollow when entity is not currently followed', async t => {
  installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'POST',
    url: '/v1/follows/events',
    headers: buildMobileSessionAuthorizationHeader({ subject: 'device-z' }),
    payload: {
      entityKind: 'player',
      entityId: '278',
      action: 'unfollow',
      source: 'player_details',
      entitySnapshot: {
        playerName: 'Kylian Mbappe',
        playerPhoto: 'mbappe.png',
        position: 'Attacker',
        teamName: 'Real Madrid',
        teamLogo: 'realmadrid.png',
        leagueName: 'La Liga',
      },
    },
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    status: 'accepted',
    applied: false,
    state: 'unfollowed',
  });
});

test('GET /v1/follows/discovery/teams falls back to legacy results when no dynamic ranking exists', async t => {
  const calls = installFetchMock(async call => {
    const url = new URL(String(call.input));
    if (url.pathname.endsWith('/standings')) {
      return jsonResponse({
        response: [
          {
            league: {
              name: 'Premier League',
              standings: [
                [
                  {
                    team: {
                      id: 50,
                      name: 'Manchester City',
                      logo: 'city.png',
                    },
                  },
                ],
              ],
            },
          },
        ],
      });
    }

    return jsonResponse({ response: [] });
  });
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/follows/discovery/teams?limit=1',
  });

  assert.equal(response.statusCode, 200);
  assert.ok(calls.length > 0);
  assert.deepEqual(response.json(), {
    items: [
      {
        teamId: '50',
        teamName: 'Manchester City',
        teamLogo: 'city.png',
        country: '',
        activeFollowersCount: 0,
        recentNet30d: 0,
        totalFollowAdds: 0,
      },
    ],
    meta: {
      source: 'legacy_fill',
    },
  });
});

test('GET /v1/follows/discovery/teams returns static seeds when dynamic and legacy sources are empty', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/follows/discovery/teams?limit=2',
  });

  assert.equal(response.statusCode, 200);
  assert.ok(calls.length > 0);
  assert.deepEqual(response.json(), {
    items: FOLLOW_DISCOVERY_SEED_TEAMS.slice(0, 2),
    meta: {
      source: 'static_seed',
    },
  });
});

test('GET /v1/follows/discovery/players returns hybrid results when dynamic ranking is partial and seeds complete the list', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);

  const followResponse = await app.inject({
    method: 'POST',
    url: '/v1/follows/events',
    headers: buildMobileSessionAuthorizationHeader({ subject: 'device-player-1' }),
    payload: {
      entityKind: 'player',
      entityId: '9999',
      action: 'follow',
      source: 'player_details',
      entitySnapshot: {
        playerName: 'Dynamic Player',
        playerPhoto: 'dynamic.png',
        position: 'Attacker',
        teamName: 'Dynamic FC',
        teamLogo: 'dynamic-team.png',
        leagueName: 'Dynamic League',
      },
    },
  });

  assert.equal(followResponse.statusCode, 200);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/follows/discovery/players?limit=2',
  });

  assert.equal(response.statusCode, 200);
  assert.ok(calls.length > 0);
  assert.deepEqual(response.json(), {
    items: [
      {
        playerId: '9999',
        playerName: 'Dynamic Player',
        playerPhoto: 'dynamic.png',
        position: 'Attacker',
        teamName: 'Dynamic FC',
        teamLogo: 'dynamic-team.png',
        leagueName: 'Dynamic League',
        activeFollowersCount: 1,
        recentNet30d: 1,
        totalFollowAdds: 1,
      },
      FOLLOW_DISCOVERY_SEED_PLAYERS[0],
    ],
    meta: {
      source: 'hybrid',
    },
  });
});
