import assert from 'node:assert/strict';
import test from 'node:test';

import { buildApp, installFetchMock, jsonResponse } from '../helpers/appTestHarness.ts';

test('GET /v1/search/global requires timezone query', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/search/global?q=barcelona',
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, 'VALIDATION_ERROR');
  assert.equal(calls.length, 0);
});

test('GET /v1/search/global returns normalized payload and deduplicates matches', async t => {
  const calls = installFetchMock(async call => {
    const url = new URL(String(call.input));

    if (url.pathname === '/teams') {
      return jsonResponse({
        response: [
          { team: { id: 529, name: 'Barcelona', logo: 'barca.png', country: 'Spain' } },
          { team: { id: 530, name: 'Sevilla', logo: 'sevilla.png', country: 'Spain' } },
        ],
      });
    }

    if (url.pathname === '/players/profiles') {
      return jsonResponse({
        response: [
          {
            player: { id: 10, name: 'Lionel Messi', photo: 'messi.png' },
            statistics: [
              {
                team: { name: 'Inter Miami', logo: 'miami.png' },
                league: { name: 'MLS' },
                games: { position: 'Attacker' },
              },
            ],
          },
        ],
      });
    }

    if (url.pathname === '/leagues') {
      return jsonResponse({
        response: [
          {
            league: { id: 140, name: 'La Liga', logo: 'laliga.png', type: 'League' },
            country: { name: 'Spain' },
          },
        ],
      });
    }

    if (url.pathname === '/fixtures') {
      const teamId = url.searchParams.get('team');
      if (teamId === '529') {
        return jsonResponse({
          response: [
            {
              fixture: { id: 900, date: '2026-03-03T20:00:00+00:00', status: { short: 'NS', long: 'Not Started' } },
              league: { id: 140, name: 'La Liga', country: 'Spain', logo: 'laliga.png' },
              teams: {
                home: { id: 529, name: 'Barcelona', logo: 'barca.png' },
                away: { id: 541, name: 'Valencia', logo: 'valencia.png' },
              },
              goals: { home: null, away: null },
            },
            {
              fixture: { id: 901, date: '2026-03-04T20:00:00+00:00', status: { short: 'NS', long: 'Not Started' } },
              league: { id: 140, name: 'La Liga', country: 'Spain', logo: 'laliga.png' },
              teams: {
                home: { id: 530, name: 'Sevilla', logo: 'sevilla.png' },
                away: { id: 529, name: 'Barcelona', logo: 'barca.png' },
              },
              goals: { home: null, away: null },
            },
          ],
        });
      }

      return jsonResponse({
        response: [
          {
            fixture: { id: 900, date: '2026-03-03T20:00:00+00:00', status: { short: 'NS', long: 'Not Started' } },
            league: { id: 140, name: 'La Liga', country: 'Spain', logo: 'laliga.png' },
            teams: {
              home: { id: 529, name: 'Barcelona', logo: 'barca.png' },
              away: { id: 541, name: 'Valencia', logo: 'valencia.png' },
            },
            goals: { home: null, away: null },
          },
        ],
      });
    }

    return jsonResponse({ response: [] });
  });
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/search/global?q=barcelona&timezone=Europe/Paris&season=2025&limit=3',
  });

  assert.equal(response.statusCode, 200);

  const payload = response.json();
  assert.equal(payload.teams.length, 2);
  assert.equal(payload.players.length, 1);
  assert.equal(payload.competitions.length, 1);
  assert.equal(payload.matches.length, 2);
  assert.deepEqual(
    payload.matches.map((match: { fixtureId: string }) => match.fixtureId),
    ['900', '901'],
  );

  const fixtureCalls = calls.filter(call => new URL(String(call.input)).pathname === '/fixtures');
  assert.equal(fixtureCalls.length, 2);

  fixtureCalls.forEach(call => {
    const searchParams = new URL(String(call.input)).searchParams;
    assert.equal(searchParams.get('timezone'), 'Europe/Paris');
    assert.equal(searchParams.get('season'), '2025');
    assert.equal(searchParams.get('next'), '3');
  });
});

test('GET /v1/search/global keeps working when one upstream search fails', async t => {
  const app = await buildApp(t);

  installFetchMock(async call => {
    const url = new URL(String(call.input));

    if (url.pathname === '/players/profiles') {
      return new Response('upstream down', { status: 500 });
    }

    if (url.pathname === '/teams') {
      return jsonResponse({
        response: [{ team: { id: 529, name: 'Barcelona', logo: 'barca.png', country: 'Spain' } }],
      });
    }

    return jsonResponse({ response: [] });
  });

  const response = await app.inject({
    method: 'GET',
    url: '/v1/search/global?q=barcelona&timezone=Europe/Paris',
  });

  assert.equal(response.statusCode, 200);
  const payload = response.json();
  assert.equal(payload.teams.length, 1);
  assert.equal(payload.players.length, 0);
});
