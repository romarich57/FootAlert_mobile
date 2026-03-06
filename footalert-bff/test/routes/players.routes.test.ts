import assert from 'node:assert/strict';
import test from 'node:test';

import { buildApp, installFetchMock, jsonResponse } from '../helpers/appTestHarness.ts';
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

test('players and teams endpoints reject out-of-range volumetric params', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);

  const playerMatches = await app.inject({
    method: 'GET',
    url: '/v1/players/278/matches?teamId=40&season=2025&last=100',
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

test('GET /v1/players/:id/matches accepts last=99 for the aggregate path', async t => {
  const calls = installFetchMock(async call => {
    const url = String(call.input);

    if (url.includes('/fixtures?team=40&season=2025&last=99')) {
      return jsonResponse({ response: [] });
    }

    return jsonResponse({ response: [] });
  });

  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/players/278/matches?teamId=40&season=2025&last=99',
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { response: [] });
  assert.equal(
    String(calls[0].input),
    'https://api-football.test/fixtures?team=40&season=2025&last=99',
  );
});

test('GET /v1/players/:id/overview returns the aggregated profile payload', async t => {
  const calls = installFetchMock(async call => {
    const url = String(call.input);

    if (url.includes('/players?id=278&season=2025')) {
      return jsonResponse({
        response: [
          {
            player: {
              id: 278,
              name: 'Kylian Mbappe',
              age: 26,
              nationality: 'France',
              photo: 'https://photo.test/mbappe.png',
            },
            statistics: [
              {
                team: { id: 40, name: 'Team A', logo: 'https://logo.test/team-a.png' },
                league: { id: 39, name: 'Premier League', logo: 'https://logo.test/pl.png', season: 2025 },
                games: { appearences: 28, lineups: 27, minutes: 2400, position: 'Attacker', rating: '7.84' },
                goals: { total: 19, assists: 8 },
                shots: { total: 88, on: 41 },
                passes: { total: 730, key: 39, accuracy: 84 },
                dribbles: { attempts: 66, success: 35, past: 8 },
                tackles: { total: 9, interceptions: 3, blocks: 1 },
                duels: { total: 120, won: 64 },
                fouls: { drawn: 25, committed: 9 },
                cards: { yellow: 2, red: 0 },
                penalty: { scored: 3, won: 4, missed: 0, commited: 0 },
              },
            ],
          },
        ],
      });
    }

    if (url.includes('/trophies?player=278')) {
      return jsonResponse({
        response: [
          {
            league: 'Premier League',
            country: 'England',
            season: '2024/2025',
            place: 'Winner',
          },
        ],
      });
    }

    if (url.includes('/players/seasons?player=278')) {
      return jsonResponse({
        response: [2025],
      });
    }

    return jsonResponse({ response: [] });
  });

  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/players/278/overview?season=2025',
  });

  assert.equal(response.statusCode, 200);
  const payload = response.json();
  assert.equal(payload.response.profile.name, 'Kylian Mbappe');
  assert.equal(payload.response.profileCompetitionStats.leagueId, '39');
  assert.equal(payload.response.seasonStatsDataset.overall.goals, 19);
  assert.equal(payload.response.trophiesByClub.length, 1);
  assert.equal(payload.response.trophiesByClub[0].total, 1);
  assert.equal(calls.length, 3);
});

test('GET /v1/players/:id/stats-catalog returns cached aggregated competition options', async t => {
  const calls = installFetchMock(async call => {
    const url = String(call.input);

    if (url.includes('/players/seasons?player=278')) {
      return jsonResponse({
        response: [2025, 2024],
      });
    }

    if (url.includes('/players?id=278&season=2025')) {
      return jsonResponse({
        response: [
          {
            statistics: [
              {
                league: { id: 39, name: 'Premier League', logo: 'pl.png', season: 2025 },
                games: { appearences: 28, minutes: 2400 },
                goals: { total: 19, assists: 8 },
              },
            ],
          },
        ],
      });
    }

    if (url.includes('/players?id=278&season=2024')) {
      return jsonResponse({
        response: [
          {
            statistics: [
              {
                league: { id: 2, name: 'UEFA Champions League', logo: 'ucl.png', season: 2024 },
                games: { appearences: 12, minutes: 980 },
                goals: { total: 7, assists: 2 },
              },
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
    url: '/v1/players/278/stats-catalog',
  });
  const secondResponse = await app.inject({
    method: 'GET',
    url: '/v1/players/278/stats-catalog',
  });

  assert.equal(firstResponse.statusCode, 200);
  assert.equal(secondResponse.statusCode, 200);
  const payload = firstResponse.json();
  assert.equal(payload.response.competitions.length, 2);
  assert.deepEqual(payload.response.defaultSelection, {
    leagueId: '39',
    season: 2025,
  });
  assert.deepEqual(payload.response.availableSeasons, [2025, 2024]);
  assert.equal(calls.length, 3);
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

test('GET /v1/players/:id/matches reuses the canonical cache key across query order variants', async t => {
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

  const firstResponse = await app.inject({
    method: 'GET',
    url: '/v1/players/278/matches?teamId=40&season=2025&last=2',
  });
  const secondResponse = await app.inject({
    method: 'GET',
    url: '/v1/players/278/matches?last=2&season=2025&teamId=40',
  });

  assert.equal(firstResponse.statusCode, 200);
  assert.equal(secondResponse.statusCode, 200);
  assert.equal(calls.length, 2);
});

test('GET /v1/players/:id/seasons proxies upstream endpoint', async t => {
  const calls = installFetchMock(async () =>
    jsonResponse({
      response: [2024, 2025],
    }),
  );
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/players/278/seasons',
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { response: [2024, 2025] });
  assert.equal(String(calls[0].input), 'https://api-football.test/players/seasons?player=278');
});

test('GET /v1/players/:id/trophies proxies upstream endpoint', async t => {
  const calls = installFetchMock(async () =>
    jsonResponse({
      response: [{ league: 'League Cup' }],
    }),
  );
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/players/278/trophies',
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { response: [{ league: 'League Cup' }] });
  assert.equal(String(calls[0].input), 'https://api-football.test/trophies?player=278');
});

test('GET /v1/players/team/:teamId/fixtures proxies team fixtures with query params', async t => {
  const calls = installFetchMock(async () =>
    jsonResponse({
      response: [{ fixture: { id: 1 } }],
    }),
  );
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/players/team/40/fixtures?season=2025&last=3',
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { response: [{ fixture: { id: 1 } }] });
  assert.equal(String(calls[0].input), 'https://api-football.test/fixtures?team=40&season=2025&last=3');
});

test('GET /v1/players/fixtures/:fixtureId/team/:teamId/stats proxies upstream endpoint', async t => {
  const calls = installFetchMock(async () =>
    jsonResponse({
      response: [{ players: [] }],
    }),
  );
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/players/fixtures/9001/team/40/stats',
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { response: [{ players: [] }] });
  assert.equal(
    String(calls[0].input),
    'https://api-football.test/fixtures/players?fixture=9001&team=40',
  );
});
