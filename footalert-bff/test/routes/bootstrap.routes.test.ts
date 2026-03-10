import assert from 'node:assert/strict';
import test from 'node:test';

import { buildApp, installFetchMock, jsonResponse } from '../helpers/appTestHarness.ts';

test('GET /v1/bootstrap validates required query parameters', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/bootstrap?timezone=Europe/Paris&season=2025',
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, 'VALIDATION_ERROR');
  assert.equal(calls.length, 0);
});

test('GET /v1/bootstrap returns bootstrap payload and reuses read-store snapshot', async t => {
  const calls = installFetchMock(async call => {
    const url = new URL(String(call.input));

    if (url.pathname.endsWith('/fixtures') && url.searchParams.get('date') === '2026-03-10') {
      return jsonResponse({
        response: [
          {
            fixture: { id: 9101, date: '2026-03-10T20:00:00+00:00' },
            teams: {
              home: { id: 529, name: 'Barcelona' },
              away: { id: 40, name: 'Opponent FC' },
            },
          },
        ],
      });
    }

    if (url.pathname.endsWith('/leagues') && !url.searchParams.has('team')) {
      return jsonResponse({
        response: [
          {
            league: { id: 39, name: 'Premier League' },
            country: { name: 'England' },
          },
        ],
      });
    }

    if (url.pathname.endsWith('/teams') && url.searchParams.get('id') === '529') {
      return jsonResponse({
        response: [
          {
            team: {
              id: 529,
              name: 'Barcelona',
              logo: 'barca.png',
            },
          },
        ],
      });
    }

    if (
      url.pathname.endsWith('/fixtures')
      && url.searchParams.get('team') === '529'
      && url.searchParams.get('next') === '1'
    ) {
      return jsonResponse({
        response: [
          {
            fixture: { id: 9201, date: '2026-03-12T20:00:00+00:00' },
            teams: {
              home: { id: 529, name: 'Barcelona', logo: 'barca.png' },
              away: { id: 61, name: 'Next Opponent', logo: 'next.png' },
            },
          },
        ],
      });
    }

    if (
      url.pathname.endsWith('/players')
      && url.searchParams.get('id') === '278'
      && url.searchParams.get('season') === '2025'
    ) {
      return jsonResponse({
        response: [
          {
            player: { id: 278, name: 'Kylian Mbappe', photo: 'mbappe.png' },
            statistics: [
              {
                games: { position: 'Attacker' },
                team: { name: 'Team A', logo: 'team-a.png' },
                league: { name: 'Premier League' },
                goals: { total: 19, assists: 8 },
              },
            ],
          },
        ],
      });
    }

    if (url.pathname.endsWith('/standings')) {
      return jsonResponse({
        response: [
          {
            league: {
              standings: [
                [
                  {
                    team: {
                      id: 529,
                      name: 'Barcelona',
                      logo: 'barca.png',
                    },
                  },
                ],
              ],
            },
          },
        ],
      });
    }

    if (url.pathname.endsWith('/players/topscorers')) {
      return jsonResponse({
        response: [
          {
            player: {
              id: 278,
              name: 'Kylian Mbappe',
            },
            statistics: [
              {
                team: { name: 'Team A', logo: 'team-a.png' },
                league: { name: 'Premier League' },
                games: { position: 'Attacker' },
              },
            ],
          },
        ],
      });
    }

    return jsonResponse({ response: [] });
  });
  const app = await buildApp(t);
  const url =
    '/v1/bootstrap?date=2026-03-10&timezone=Europe%2FParis&season=2025&followedTeamIds=529&followedPlayerIds=278&discoveryLimit=4';

  const firstResponse = await app.inject({
    method: 'GET',
    url,
  });
  assert.equal(firstResponse.statusCode, 200);
  assert.equal(firstResponse.headers['cache-control'], 'public, max-age=30, stale-while-revalidate=30');

  const payload = firstResponse.json();
  assert.equal(payload.date, '2026-03-10');
  assert.equal(payload.timezone, 'Europe/Paris');
  assert.equal(payload.season, 2025);
  assert.equal(Array.isArray(payload.matchesToday), true);
  assert.equal(payload.matchesToday.length, 1);
  assert.equal(Array.isArray(payload.topCompetitions), true);
  assert.equal(payload.topCompetitions.length > 0, true);
  assert.equal(Array.isArray(payload.competitionsCatalog), true);
  assert.equal(payload.competitionsCatalog.length > 0, true);
  assert.equal(payload.followedTeamCards[0].teamId, '529');
  assert.equal(payload.followedPlayerCards[0].playerId, '278');
  assert.equal(Array.isArray(payload.discovery.teams.items), true);
  assert.equal(Array.isArray(payload.discovery.players.items), true);
  assert.equal(Array.isArray(payload.warmEntityRefs), true);
  assert.equal(payload.warmEntityRefs.length > 0, true);

  const upstreamCallsAfterFirstRequest = calls.length;
  const secondResponse = await app.inject({
    method: 'GET',
    url,
  });
  assert.equal(secondResponse.statusCode, 200);
  assert.deepEqual(secondResponse.json(), payload);
  assert.equal(calls.length, upstreamCallsAfterFirstRequest);
});
