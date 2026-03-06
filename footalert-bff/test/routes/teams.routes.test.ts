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

test('GET /v1/teams/:id/overview returns the aggregated team overview payload', async t => {
  const calls = installFetchMock(async call => {
    const url = new URL(String(call.input));
    const pathname = url.pathname;

    if (pathname.endsWith('/fixtures') && url.searchParams.get('next') === '1') {
      return jsonResponse({
        response: [
          {
            fixture: {
              id: 8003,
              date: '2025-09-01T19:00:00.000Z',
              venue: { name: 'Camp Nou' },
              status: { short: 'NS', long: 'Not Started', elapsed: null },
            },
            league: { id: 140, name: 'La Liga', logo: 'laliga.png', round: 'Round 4' },
            teams: {
              home: { id: 529, name: 'Barcelona', logo: 'barca.png' },
              away: { id: 541, name: 'Valencia', logo: 'valencia.png' },
            },
            goals: { home: null, away: null },
          },
        ],
      });
    }

    if (pathname.endsWith('/fixtures') && url.searchParams.get('league') === '140') {
      return jsonResponse({
        response: [
          {
            fixture: {
              id: 8001,
              date: '2025-08-18T19:00:00.000Z',
              venue: { name: 'Camp Nou' },
              status: { short: 'FT', long: 'Match Finished', elapsed: 90 },
            },
            league: { id: 140, name: 'La Liga', logo: 'laliga.png', round: 'Round 1' },
            teams: {
              home: { id: 529, name: 'Barcelona', logo: 'barca.png' },
              away: { id: 530, name: 'Atletico', logo: 'atletico.png' },
            },
            goals: { home: 2, away: 1 },
          },
          {
            fixture: {
              id: 8002,
              date: '2025-08-25T19:00:00.000Z',
              venue: { name: 'Camp Nou' },
              status: { short: 'NS', long: 'Not Started', elapsed: null },
            },
            league: { id: 140, name: 'La Liga', logo: 'laliga.png', round: 'Round 2' },
            teams: {
              home: { id: 531, name: 'Sevilla', logo: 'sevilla.png' },
              away: { id: 529, name: 'Barcelona', logo: 'barca.png' },
            },
            goals: { home: null, away: null },
          },
        ],
      });
    }

    if (pathname.endsWith('/standings')) {
      const season = Number(url.searchParams.get('season'));
      const rankBySeason = new Map([
        [2025, 2],
        [2024, 1],
        [2023, 2],
        [2022, 3],
        [2021, 4],
      ]);
      const targetRank = rankBySeason.get(season) ?? 2;

      return jsonResponse({
        response: [
          {
            league: {
              id: 140,
              name: 'La Liga',
              logo: 'laliga.png',
              standings: [
                [
                  {
                    rank: 1,
                    team: { id: 500, name: 'Real Madrid', logo: 'rm.png' },
                    points: 70,
                    goalsDiff: 30,
                    group: 'La Liga',
                    form: 'WWWWW',
                    all: { played: 25, win: 22, draw: 4, lose: 1, goals: { for: 65, against: 20 } },
                    home: { played: 13, win: 11, draw: 2, lose: 0, goals: { for: 35, against: 9 } },
                    away: { played: 12, win: 11, draw: 2, lose: 1, goals: { for: 30, against: 11 } },
                    update: '2025-03-01',
                  },
                  {
                    rank: targetRank,
                    team: { id: 529, name: 'Barcelona', logo: 'barca.png' },
                    points: 60,
                    goalsDiff: 20,
                    group: 'La Liga',
                    form: 'WWDLW',
                    all: { played: 25, win: 19, draw: 3, lose: 3, goals: { for: 58, against: 38 } },
                    home: { played: 13, win: 10, draw: 2, lose: 1, goals: { for: 30, against: 12 } },
                    away: { played: 12, win: 9, draw: 1, lose: 2, goals: { for: 28, against: 26 } },
                    update: '2025-03-01',
                  },
                  {
                    rank: 3,
                    team: { id: 540, name: 'Villarreal', logo: 'villareal.png' },
                    points: 54,
                    goalsDiff: 11,
                    group: 'La Liga',
                    form: 'WDLWW',
                    all: { played: 25, win: 16, draw: 6, lose: 3, goals: { for: 47, against: 36 } },
                    home: { played: 13, win: 9, draw: 2, lose: 2, goals: { for: 25, against: 18 } },
                    away: { played: 12, win: 7, draw: 4, lose: 1, goals: { for: 22, against: 18 } },
                    update: '2025-03-01',
                  },
                  {
                    rank: 4,
                    team: { id: 541, name: 'Valencia', logo: 'valencia.png' },
                    points: 50,
                    goalsDiff: 5,
                    group: 'La Liga',
                    form: 'WDWLW',
                    all: { played: 25, win: 15, draw: 5, lose: 5, goals: { for: 43, against: 38 } },
                    home: { played: 13, win: 8, draw: 2, lose: 3, goals: { for: 23, against: 18 } },
                    away: { played: 12, win: 7, draw: 3, lose: 2, goals: { for: 20, against: 20 } },
                    update: '2025-03-01',
                  },
                ],
              ],
            },
          },
        ],
      });
    }

    if (pathname.endsWith('/teams/statistics')) {
      return jsonResponse({
        response: {
          league: { id: 140, name: 'La Liga' },
          fixtures: {
            played: { total: 25 },
            wins: { total: 19 },
            draws: { total: 3 },
            loses: { total: 3 },
          },
          goals: {
            for: { total: { total: 58 } },
            against: { total: { total: 38 } },
          },
        },
      });
    }

    if (pathname.endsWith('/players')) {
      return jsonResponse({
        response: [
          {
            player: { id: 1, name: 'Marc', photo: 'gk.png' },
            statistics: [
              {
                team: { id: 529, logo: 'barca.png' },
                league: { id: 140, season: 2025 },
                games: { position: 'Goalkeeper', rating: '7.1', minutes: 2100, appearences: 25 },
                goals: { total: 0, assists: 0 },
              },
            ],
          },
          {
            player: { id: 2, name: 'Jules', photo: 'def.png' },
            statistics: [
              {
                team: { id: 529, logo: 'barca.png' },
                league: { id: 140, season: 2025 },
                games: { position: 'Defender', rating: '7.0', minutes: 2000, appearences: 24 },
                goals: { total: 2, assists: 1 },
              },
            ],
          },
          {
            player: { id: 3, name: 'Pedri', photo: 'mid.png' },
            statistics: [
              {
                team: { id: 529, logo: 'barca.png' },
                league: { id: 140, season: 2025 },
                games: { position: 'Midfielder', rating: '7.5', minutes: 1950, appearences: 23 },
                goals: { total: 4, assists: 6 },
              },
            ],
          },
          {
            player: { id: 4, name: 'Lamine', photo: 'att1.png' },
            statistics: [
              {
                team: { id: 529, logo: 'barca.png' },
                league: { id: 140, season: 2025 },
                games: { position: 'Attacker', rating: '8.2', minutes: 1980, appearences: 24 },
                goals: { total: 18, assists: 7 },
              },
            ],
          },
          {
            player: { id: 5, name: 'Lewy', photo: 'att2.png' },
            statistics: [
              {
                team: { id: 529, logo: 'barca.png' },
                league: { id: 140, season: 2025 },
                games: { position: 'Forward', rating: '7.9', minutes: 1800, appearences: 22 },
                goals: { total: 14, assists: 4 },
              },
            ],
          },
        ],
        paging: { current: 1, total: 1 },
      });
    }

    if (pathname.endsWith('/coachs')) {
      return jsonResponse({
        response: [
          {
            id: 900,
            name: 'Coach Name',
            photo: 'coach.png',
            age: 55,
            career: [{ team: { id: 529 }, end: null }],
          },
        ],
      });
    }

    if (pathname.endsWith('/trophies')) {
      return jsonResponse({
        response: [
          { league: 'La Liga', place: 'Winner', season: '2024' },
          { league: 'Copa del Rey', place: 'Runner Up', season: '2023' },
          { league: 'Super Cup', place: 'Champion', season: '2025' },
        ],
      });
    }

    return jsonResponse({ response: [] });
  });

  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/teams/529/overview?leagueId=140&season=2025&timezone=Europe/Paris&historySeasons=2024,2023,2022,2021,2020',
  });

  assert.equal(response.statusCode, 200);
  const payload = response.json();
  assert.equal(payload.nextMatch.fixtureId, '8003');
  assert.equal(payload.seasonStats.rank, 2);
  assert.equal(payload.miniStanding.rows.length, 3);
  assert.equal(payload.miniStanding.rows.some(row => row.isTargetTeam), true);
  assert.deepEqual(
    payload.standingHistory,
    [
      { season: 2025, rank: 2 },
      { season: 2024, rank: 1 },
      { season: 2023, rank: 2 },
      { season: 2022, rank: 3 },
      { season: 2021, rank: 4 },
    ],
  );
  assert.equal(payload.coachPerformance.coach.name, 'Coach Name');
  assert.equal(payload.playerLeaders.scorers[0].playerId, '4');
  assert.equal(payload.trophiesCount, 3);
  assert.equal(payload.trophyWinsCount, 2);
  assert.equal(
    calls.some(call => String(call.input).includes('season=2020')),
    false,
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
