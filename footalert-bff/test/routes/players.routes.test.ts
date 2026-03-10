import assert from 'node:assert/strict';
import test from 'node:test';

import { buildApp, installFetchMock, jsonResponse, withManagedEnv } from '../helpers/appTestHarness.ts';

async function loadEnv(overrides: Record<string, string | undefined> = {}) {
  return withManagedEnv(overrides, async () => {
    const envModule = await import(`../../src/config/env.ts?case=${Math.random().toString(36).slice(2)}`);
    return envModule.env;
  });
}
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

test('env.cacheTtl exposes entity defaults and overrides', async () => {
  assert.deepEqual((await loadEnv()).cacheTtl, {
    teams: 60_000,
    players: 60_000,
    competitions: 60_000,
    matches: 45_000,
  });
  assert.deepEqual(
    (await loadEnv({ CACHE_TTL_TEAMS_MS: '90000', CACHE_TTL_PLAYERS_MS: '120000' })).cacheTtl,
    { teams: 90_000, players: 120_000, competitions: 60_000, matches: 45_000 },
  );
});

test('GET /v1/teams/:id/full and /v1/players/:id/full return additive aggregates', async t => {
  installFetchMock(async call => {
    const url = new URL(String(call.input));
    if (url.pathname.endsWith('/teams') && url.searchParams.get('id') === '529') return jsonResponse({ response: [{ team: { id: 529, name: 'Barcelona' } }] });
    if (url.pathname.endsWith('/leagues') && url.searchParams.get('team') === '529') return jsonResponse({ response: [{ league: { id: 39, name: 'Premier League', type: 'League' }, seasons: [{ year: 2025, current: true }, { year: 2024, current: false }] }] });
    if (url.pathname.endsWith('/fixtures') && url.searchParams.get('team') === '529' && url.searchParams.get('league') === '39') return jsonResponse({ response: [{ fixture: { id: 7001, date: '2026-02-12T20:00:00Z', status: { short: 'FT' } }, league: { id: 39, name: 'Premier League', logo: 'pl.png' }, teams: { home: { id: 529, name: 'Barcelona', logo: 'barca.png' }, away: { id: 40, name: 'Team B', logo: 'b.png' } }, goals: { home: 2, away: 1 } }] });
    if (url.pathname.endsWith('/fixtures') && url.searchParams.get('team') === '529' && url.searchParams.get('next') === '1') return jsonResponse({ response: [{ fixture: { id: 7002, date: '2026-03-12T20:00:00Z', status: { short: 'NS' } }, league: { id: 39, name: 'Premier League', logo: 'pl.png' }, teams: { home: { id: 529, name: 'Barcelona', logo: 'barca.png' }, away: { id: 41, name: 'Team C', logo: 'c.png' } }, goals: { home: null, away: null } }] });
    if (url.pathname.endsWith('/fixtures') && url.searchParams.get('league') === '39') return jsonResponse({ response: [{ fixture: { id: 7101, status: { short: 'FT' } } }] });
    if (url.pathname.endsWith('/fixtures/statistics')) return jsonResponse({ response: [{ team: { id: 529, name: 'Barcelona', logo: 'barca.png' }, statistics: [{ type: 'Ball Possession', value: '61%' }, { type: 'Shots on Goal', value: 8 }, { type: 'Total Shots', value: 14 }, { type: 'Expected Goals', value: '2.1' }] }, { team: { id: 41, name: 'Team C', logo: 'c.png' }, statistics: [{ type: 'Ball Possession', value: '39%' }, { type: 'Shots on Goal', value: 3 }, { type: 'Total Shots', value: 7 }, { type: 'Expected Goals', value: '0.8' }] }] });
    if (url.pathname.endsWith('/standings') && url.searchParams.get('league') === '39') return jsonResponse({ response: [{ league: { id: 39, name: 'Premier League', logo: 'pl.png', standings: [[{ rank: 1, points: 60, goalsDiff: 30, form: 'WWWWW', all: { played: 25, win: 19, draw: 3, lose: 3, goals: { for: 60, against: 30 } }, team: { id: 529, name: 'Barcelona', logo: 'barca.png' } }, { rank: 2, points: 55, goalsDiff: 20, form: 'WWDWW', all: { played: 25, win: 17, draw: 4, lose: 4, goals: { for: 50, against: 30 } }, team: { id: 41, name: 'Team C', logo: 'c.png' } }]] } }] });
    if (url.pathname.endsWith('/teams/statistics') && url.searchParams.get('team') === '529') return jsonResponse({ response: { league: { id: 39, name: 'Premier League' }, fixtures: { played: { total: 25 }, wins: { total: 19 }, draws: { total: 3 }, loses: { total: 3 } }, goals: { for: { total: { total: 60 } }, against: { total: { total: 30 } } } } });
    if (url.pathname.endsWith('/coachs') && url.searchParams.get('team') === '529') return jsonResponse({ response: [{ id: 9, name: 'Coach A', age: 50, career: [{ team: { id: 529 }, end: null }] }] });
    if (url.pathname.endsWith('/players') && url.searchParams.get('team') === '529') return jsonResponse({ response: [{ player: { id: 1, name: 'Top Scorer', photo: 'p.png' }, statistics: [{ team: { logo: 'barca.png' }, games: { position: 'Attacker', rating: '7.8' }, goals: { total: 20, assists: 5 } }] }] });
    if (url.pathname.endsWith('/players/squads')) return jsonResponse({ response: [{ players: [{ id: 1, name: 'Top Scorer' }] }] });
    if (url.pathname.endsWith('/transfers') && url.searchParams.get('team') === '529') return jsonResponse({ response: [{ player: { id: 1, name: 'Arrival' }, transfers: [{ date: '2025-08-01', type: 'Transfer', teams: { in: { id: 529, name: 'Barcelona', logo: 'barca.png' }, out: { id: 50, name: 'Old Club', logo: 'old.png' } } }] }] });
    if (url.pathname.endsWith('/trophies') && url.searchParams.get('team') === '529') return jsonResponse({ response: [{ league: 'La Liga', place: 'Winner', season: '2025' }] });
    if (url.pathname.endsWith('/players') && url.searchParams.get('id') === '278' && url.searchParams.get('season') === '2025') return jsonResponse({ response: [{ player: { id: 278, name: 'Kylian Mbappe', age: 26, nationality: 'France', photo: 'mbappe.png' }, statistics: [{ team: { id: 40, name: 'Team A', logo: 'team-a.png' }, league: { id: 39, name: 'Premier League', logo: 'pl.png', season: 2025 }, games: { appearences: 28, lineups: 27, minutes: 2400, position: 'Attacker', rating: '7.8' }, goals: { total: 19, assists: 8 } }] }] });
    if (url.pathname.endsWith('/players') && url.searchParams.get('id') === '278' && url.searchParams.get('season') === '2005') return jsonResponse({ response: [] });
    if (url.pathname.endsWith('/players/seasons') && url.searchParams.get('player') === '278') return jsonResponse({ response: [2025, 2005] });
    if (url.pathname.endsWith('/trophies') && url.searchParams.get('player') === '278') return jsonResponse({ response: [{ league: 'Premier League', country: 'England', season: '2025', place: 'Winner' }] });
    if (url.pathname.endsWith('/fixtures') && url.searchParams.get('team') === '40') return jsonResponse({ response: [{ fixture: { id: 9001, date: '2026-02-20T20:00:00Z' }, league: { id: 39, name: 'Premier League', logo: 'pl.png' }, teams: { home: { id: 40, name: 'Team A', logo: 'team-a.png' }, away: { id: 50, name: 'Team B', logo: 'team-b.png' } }, goals: { home: 2, away: 1 } }] });
    if (url.pathname.endsWith('/fixtures/players') && url.searchParams.get('team') === '40') return jsonResponse({ response: [{ team: { id: 40, name: 'Team A', logo: 'team-a.png' }, players: [{ player: { id: 278 }, statistics: [{ games: { minutes: 90, rating: '7.8', substitute: false }, goals: { total: 1, assists: 0 } }] }] }] });
    return jsonResponse({ response: [] });
  });

  const app = await buildApp(t);
  const teamPayload = (await app.inject({ method: 'GET', url: '/v1/teams/529/full?timezone=Europe%2FParis' })).json();
  const playerPayload = (await app.inject({ method: 'GET', url: '/v1/players/278/full?season=2025' })).json();

  assert.equal(teamPayload.response.details.response[0].team.name, 'Barcelona');
  assert.deepEqual(teamPayload.response.selection, { leagueId: '39', season: 2025 });
  assert.equal(teamPayload.response.overviewLeaders.playerLeaders.scorers[0].name, 'Top Scorer');
  assert.equal(teamPayload.response.standings.response.league.standings[0][0].team.name, 'Barcelona');
  assert.equal(teamPayload.response.matches.response[0].fixture.id, 7001);
  assert.equal(teamPayload.response.advancedStats.response.metrics.possession.rank, 1);
  assert.equal(teamPayload.response.statsPlayers.response[0].player.name, 'Top Scorer');
  assert.equal(teamPayload.response.transfers.response.length, 1);
  assert.equal(playerPayload.response.details.response[0].player.name, 'Kylian Mbappe');
  assert.equal(playerPayload.response.statsCatalog.response.defaultSelection.leagueId, '39');
  assert.equal(playerPayload.response.career.response.seasons.length, 1);
  assert.equal(playerPayload.response.matches.response.length, 1);
});
