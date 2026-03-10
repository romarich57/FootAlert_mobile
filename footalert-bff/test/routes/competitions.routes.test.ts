import assert from 'node:assert/strict';
import test from 'node:test';

import { buildApp, installFetchMock, jsonResponse } from '../helpers/appTestHarness.ts';

function buildStandingRow(
  teamId: number,
  teamName: string,
  group: string,
  stats: {
    rank?: number;
    points: number;
    goalsDiff: number;
    form: string;
    all: { played: number; win: number; draw: number; lose: number; goalsFor: number; goalsAgainst: number };
    home: { played: number; win: number; draw: number; lose: number; goalsFor: number; goalsAgainst: number };
    away: { played: number; win: number; draw: number; lose: number; goalsFor: number; goalsAgainst: number };
  },
) {
  return {
    rank: stats.rank ?? 1,
    team: { id: teamId, name: teamName, logo: `${teamName}.png` },
    points: stats.points,
    goalsDiff: stats.goalsDiff,
    group,
    form: stats.form,
    all: {
      played: stats.all.played,
      win: stats.all.win,
      draw: stats.all.draw,
      lose: stats.all.lose,
      goals: { for: stats.all.goalsFor, against: stats.all.goalsAgainst },
    },
    home: {
      played: stats.home.played,
      win: stats.home.win,
      draw: stats.home.draw,
      lose: stats.home.lose,
      goals: { for: stats.home.goalsFor, against: stats.home.goalsAgainst },
    },
    away: {
      played: stats.away.played,
      win: stats.away.win,
      draw: stats.away.draw,
      lose: stats.away.lose,
      goals: { for: stats.away.goalsFor, against: stats.away.goalsAgainst },
    },
  };
}

function buildCompetitionFixture(id: number, round: string) {
  return {
    fixture: { id, date: '2025-08-10T20:00:00+00:00', status: { short: 'FT', elapsed: 90 } },
    league: { id: 61, season: 2025, round },
    teams: {
      home: { id: 1, name: 'Alpha', logo: 'alpha.png', winner: true },
      away: { id: 2, name: 'Beta', logo: 'beta.png', winner: false },
    },
    goals: { home: 2, away: 1 },
    score: { penalty: { home: null, away: null } },
  };
}

function installLeagueTeamStatsMock(options?: { grouped?: boolean }) {
  return installFetchMock(async call => {
    const url = new URL(String(call.input));
    const path = url.pathname;
    const grouped = options?.grouped ?? false;

    if (path.endsWith('/standings')) {
      return jsonResponse({
        response: [
          {
            league: {
              id: 61,
              standings: grouped
                ? [
                  [
                    buildStandingRow(1, 'Alpha', 'Group A', {
                      points: 9,
                      goalsDiff: 4,
                      form: 'WWW',
                      all: { played: 3, win: 3, draw: 0, lose: 0, goalsFor: 7, goalsAgainst: 3 },
                      home: { played: 2, win: 2, draw: 0, lose: 0, goalsFor: 5, goalsAgainst: 2 },
                      away: { played: 1, win: 1, draw: 0, lose: 0, goalsFor: 2, goalsAgainst: 1 },
                    }),
                  ],
                  [
                    buildStandingRow(2, 'Beta', 'Group B', {
                      points: 6,
                      goalsDiff: 1,
                      form: 'WDL',
                      all: { played: 3, win: 2, draw: 0, lose: 1, goalsFor: 4, goalsAgainst: 3 },
                      home: { played: 1, win: 1, draw: 0, lose: 0, goalsFor: 2, goalsAgainst: 1 },
                      away: { played: 2, win: 1, draw: 0, lose: 1, goalsFor: 2, goalsAgainst: 2 },
                    }),
                  ],
                ]
                : [[
                  buildStandingRow(1, 'Alpha', 'League', {
                    points: 27,
                    goalsDiff: 12,
                    form: 'WWDW',
                    all: { played: 10, win: 8, draw: 3, lose: 1, goalsFor: 24, goalsAgainst: 12 },
                    home: { played: 5, win: 5, draw: 0, lose: 0, goalsFor: 14, goalsAgainst: 4 },
                    away: { played: 5, win: 3, draw: 1, lose: 1, goalsFor: 10, goalsAgainst: 8 },
                  }),
                  buildStandingRow(2, 'Beta', 'League', {
                    rank: 2,
                    points: 21,
                    goalsDiff: 4,
                    form: 'WDDL',
                    all: { played: 10, win: 6, draw: 3, lose: 1, goalsFor: 18, goalsAgainst: 14 },
                    home: { played: 5, win: 4, draw: 1, lose: 0, goalsFor: 10, goalsAgainst: 5 },
                    away: { played: 5, win: 2, draw: 2, lose: 1, goalsFor: 8, goalsAgainst: 9 },
                  }),
                ]],
            },
          },
        ],
      });
    }

    if (path.endsWith('/fixtures') && url.searchParams.get('league') === '61') {
      return jsonResponse({ response: [buildCompetitionFixture(7001, 'Regular Season - 1'), buildCompetitionFixture(7002, 'Regular Season - 2')] });
    }

    if (path.endsWith('/fixtures/statistics') && url.searchParams.get('fixture') === '7001') {
      return jsonResponse({
        response: [
          { team: { id: 1, name: 'Alpha', logo: 'alpha.png' }, statistics: [
            { type: 'Ball Possession', value: '58%' }, { type: 'Shots on Goal', value: 6 }, { type: 'Total Shots', value: 16 }, { type: 'Expected Goals', value: 2.4 },
          ] },
          { team: { id: 2, name: 'Beta', logo: 'beta.png' }, statistics: [
            { type: 'Ball Possession', value: '42%' }, { type: 'Shots on Goal', value: 3 }, { type: 'Total Shots', value: 9 }, { type: 'Expected Goals', value: 1.1 },
          ] },
        ],
      });
    }

    if (path.endsWith('/fixtures/statistics') && url.searchParams.get('fixture') === '7002') {
      return jsonResponse({
        response: [
          { team: { id: 1, name: 'Alpha', logo: 'alpha.png' }, statistics: [
            { type: 'Ball Possession', value: '55%' }, { type: 'Shots on Goal', value: 5 }, { type: 'Total Shots', value: 14 }, { type: 'Expected Goals', value: 2.1 },
          ] },
          { team: { id: 2, name: 'Beta', logo: 'beta.png' }, statistics: [
            { type: 'Ball Possession', value: '45%' }, { type: 'Shots on Goal', value: 4 }, { type: 'Total Shots', value: 11 }, { type: 'Expected Goals', value: 1.3 },
          ] },
        ],
      });
    }

    if (path.endsWith('/teams/statistics') && url.searchParams.get('team') === '1') {
      return jsonResponse({ response: [{ fixtures: { clean_sheet: { total: 8 }, failed_to_score: { total: 1 } } }] });
    }

    if (path.endsWith('/teams/statistics') && url.searchParams.get('team') === '2') {
      return jsonResponse({ response: [{ fixtures: { clean_sheet: { total: 5 }, failed_to_score: { total: 3 } } }] });
    }

    return jsonResponse({ response: [] });
  });
}

test('GET /v1/competitions/:id/standings applies longer Cache-Control header', async t => {
  installFetchMock(async () => jsonResponse({ response: [{ league: { id: 39 }, standings: [] }] }));
  const app = await buildApp(t);
  const response = await app.inject({ method: 'GET', url: '/v1/competitions/39/standings?season=2025' });
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['cache-control'], 'public, max-age=300, stale-while-revalidate=600');
});

test('GET /v1/competitions compresses large JSON payloads when client accepts gzip', async t => {
  installFetchMock(async () => jsonResponse({
    response: Array.from({ length: 120 }, (_, index) => ({
      league: { id: index + 1, name: `League ${index + 1} ${'x'.repeat(48)}`, type: 'League', logo: 'https://cdn.footalert.test/logo.png' },
      country: { name: `Country ${index + 1}`, code: 'FR', flag: 'https://cdn.footalert.test/flag.png' },
      seasons: [],
    })),
  }));
  const app = await buildApp(t);
  const response = await app.inject({ method: 'GET', url: '/v1/competitions', headers: { 'accept-encoding': 'gzip' } });
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['content-encoding'], 'gzip');
  assert.match(String(response.headers.vary ?? ''), /accept-encoding/i);
});

test('GET /v1/competitions/search rejects unsupported params with 400', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);
  const response = await app.inject({ method: 'GET', url: '/v1/competitions/search?q=premier&foo=bar' });
  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, 'VALIDATION_ERROR');
  assert.equal(calls.length, 0);
});

test('GET /v1/competitions/:id/team-stats aggregates advanced metrics', async t => {
  const calls = installLeagueTeamStatsMock();
  const app = await buildApp(t);
  const response = await app.inject({ method: 'GET', url: '/v1/competitions/61/team-stats?season=2025' });
  const payload = response.json();
  assert.equal(response.statusCode, 200);
  assert.equal(payload.summary.leaderboards.pointsPerMatch.items[0].teamName, 'Alpha');
  assert.equal(payload.homeAway.leaderboards.homePPG.items[0].teamName, 'Alpha');
  assert.equal(payload.advanced.state, 'available');
  assert.equal(payload.advanced.reason, null);
  assert.equal(payload.advanced.rows[0].cleanSheets, 8);
  assert.equal(payload.advanced.rows[0].xGPerMatch, 2.25);
  assert.equal(payload.advanced.unavailableMetrics.length, 0);
  assert.ok(calls.length >= 6);
});

test('GET /v1/competitions/:id/team-stats disables advanced data for grouped competitions', async t => {
  const calls = installLeagueTeamStatsMock({ grouped: true });
  const app = await buildApp(t);
  const response = await app.inject({ method: 'GET', url: '/v1/competitions/61/team-stats?season=2025' });
  const payload = response.json();
  assert.equal(response.statusCode, 200);
  assert.equal(payload.summary.leaderboards.pointsPerMatch.items.length, 2);
  assert.equal(payload.advanced.state, 'unavailable');
  assert.equal(payload.advanced.reason, 'grouped_competition');
  assert.deepEqual(payload.advanced.rows, []);
  assert.equal(calls.filter(call => String(call.input).includes('/standings?league=61')).length, 1);
});

test('GET /v1/competitions/:id/transfers filters, deduplicates and enriches transfer context', async t => {
  const calls = installFetchMock(async call => {
    const url = new URL(String(call.input));
    if (url.pathname.endsWith('/teams')) return jsonResponse({ response: [{ team: { id: 1 } }, { team: { id: 2 } }] });
    if (url.pathname.endsWith('/transfers') && url.searchParams.get('team') === '1') {
      return jsonResponse({ response: [{ player: { id: 10, name: 'Player A' }, update: '2026-01-01', transfers: [
        { date: '2025-08-10', type: 'Loan', teams: { in: { id: 1, name: 'League Team 1', logo: 'in1.png' }, out: { id: 90, name: 'External Team', logo: 'out1.png' } } },
        { date: '2025-02-10', type: 'Transfer', teams: { in: { id: 1, name: 'League Team 1', logo: 'in1.png' }, out: { id: 91, name: 'External Team 2', logo: 'out2.png' } } },
      ] }] });
    }
    if (url.pathname.endsWith('/transfers') && url.searchParams.get('team') === '2') {
      return jsonResponse({ response: [
        { player: { id: 10, name: 'Player A' }, update: '2026-01-01', transfers: [
          { date: '2025-08-11', type: 'Loan', teams: { in: { id: 1, name: 'League Team 1', logo: 'in1.png' }, out: { id: 90, name: 'External Team', logo: 'out1.png' } } },
        ] },
        { player: { id: 30, name: 'Player B' }, update: '2026-01-01', transfers: [
          { date: '2025-09-12', type: 'Transfer', teams: { in: { id: 2, name: 'League Team 2', logo: 'in2.png' }, out: { id: 1, name: 'League Team 1', logo: 'out2.png' } } },
          { date: '2026-07-02', type: 'Transfer', teams: { in: { id: 2, name: 'League Team 2', logo: 'in2.png' }, out: { id: 1, name: 'League Team 1', logo: 'out2.png' } } },
        ] },
      ] });
    }
    return jsonResponse({ response: [] });
  });
  const app = await buildApp(t);
  const response = await app.inject({ method: 'GET', url: '/v1/competitions/39/transfers?season=2025' });
  const payload = response.json();
  assert.equal(response.statusCode, 200);
  assert.equal(payload.response.length, 2);
  assert.equal(payload.response[0].player.id, 30);
  assert.equal(payload.response[0].context.teamOutInLeague, true);
  assert.equal(payload.response[1].player.id, 10);
  assert.equal(payload.response[1].context.teamOutInLeague, false);
  assert.equal(payload.response[1].transfers[0].date, '2025-08-11');
  assert.equal(calls.length, 3);
});

test('GET /v1/competitions/:id/transfers keeps partial data when one team call fails', async t => {
  installFetchMock(async call => {
    const url = new URL(String(call.input));
    if (url.pathname.endsWith('/teams')) return jsonResponse({ response: [{ team: { id: 1 } }, { team: { id: 2 } }] });
    if (url.pathname.endsWith('/transfers') && url.searchParams.get('team') === '1') {
      return jsonResponse({ response: [{ player: { id: 99, name: 'Player Stable' }, update: '2026-01-01', transfers: [
        { date: '2025-10-12', type: 'Transfer', teams: { in: { id: 1, name: 'League Team 1', logo: 'in1.png' }, out: { id: 50, name: 'External Team', logo: 'out1.png' } } },
      ] }] });
    }
    if (url.pathname.endsWith('/transfers') && url.searchParams.get('team') === '2') {
      throw new TypeError('upstream timeout');
    }
    return jsonResponse({ response: [] });
  });
  const app = await buildApp(t);
  const response = await app.inject({ method: 'GET', url: '/v1/competitions/61/transfers?season=2025' });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().response[0].player.id, 99);
});

test('GET /v1/competitions/:id/transfers skips malformed entries and older duplicates', async t => {
  const calls = installFetchMock(async call => {
    const url = new URL(String(call.input));
    if (url.pathname.endsWith('/teams')) return jsonResponse({ response: [{ team: { id: 1 } }, { team: { id: 'invalid-id' } }, { team: { id: 2 } }] });
    if (url.pathname.endsWith('/transfers') && url.searchParams.get('team') === '1') {
      return jsonResponse({ response: [{ player: { id: 50, name: 'Player Filtered' }, update: '2026-01-01', transfers: [
        { date: '2025-07-15', type: '', teams: { in: { id: 1, name: 'League Team 1', logo: 'in.png' }, out: { id: 99, name: 'External Team', logo: 'out.png' } } },
        { date: '2025-07-16', type: 'Loan', teams: { in: { id: 0, name: '', logo: '' }, out: { id: 99, name: 'External Team', logo: 'out.png' } } },
        { date: '2025-07-17', type: 'Transfer', teams: { in: { id: 99, name: 'External A', logo: 'a.png' }, out: { id: 98, name: 'External B', logo: 'b.png' } } },
        { date: '2025-08-20', type: 'Transfer', teams: { in: { id: 1, name: 'League Team 1', logo: 'in.png' }, out: { id: 99, name: 'External Team', logo: 'out.png' } } },
        { date: '2025-08-10', type: 'Transfer', teams: { in: { id: 1, name: 'League Team 1', logo: 'in.png' }, out: { id: 99, name: 'External Team', logo: 'out.png' } } },
      ] }] });
    }
    if (url.pathname.endsWith('/transfers') && url.searchParams.get('team') === '2') return jsonResponse({ response: [] });
    return jsonResponse({ response: [] });
  });
  const app = await buildApp(t);
  const response = await app.inject({ method: 'GET', url: '/v1/competitions/39/transfers?season=2025' });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().response.length, 1);
  assert.equal(response.json().response[0].transfers[0].date, '2025-08-20');
  assert.equal(calls.map(call => String(call.input)).some(url => url.includes('/transfers?team=invalid-id')), false);
});

test('competition core routes proxy upstream and validate player-stats', async t => {
  const calls = installFetchMock(async call => {
    const url = new URL(String(call.input));
    if (url.pathname.endsWith('/leagues') && !url.searchParams.has('id')) return jsonResponse({ response: [{ league: { id: 39, name: 'Premier League' } }] });
    if (url.pathname.endsWith('/leagues') && url.searchParams.get('id') === '39') return jsonResponse({ response: [{ league: { id: 39 } }] });
    if (url.pathname.endsWith('/fixtures')) return jsonResponse({ response: [{ fixture: { id: 1 } }] });
    if (url.pathname.endsWith('/players/topscorers')) return jsonResponse({ response: [{ player: { id: 99 } }] });
    return jsonResponse({ response: [] });
  });
  const app = await buildApp(t);

  const list = await app.inject({ method: 'GET', url: '/v1/competitions' });
  const detail = await app.inject({ method: 'GET', url: '/v1/competitions/39' });
  const matches = await app.inject({ method: 'GET', url: '/v1/competitions/39/matches?season=2025' });
  const playerStats = await app.inject({ method: 'GET', url: '/v1/competitions/39/player-stats?season=2025&type=topscorers' });
  const invalidPlayerStats = await app.inject({ method: 'GET', url: '/v1/competitions/39/player-stats?season=2025&type=invalid' });

  assert.deepEqual(list.json(), { response: [{ league: { id: 39, name: 'Premier League' } }] });
  assert.deepEqual(detail.json(), { response: [{ league: { id: 39 } }] });
  assert.deepEqual(matches.json(), { response: [{ fixture: { id: 1 } }] });
  assert.deepEqual(playerStats.json(), { response: [{ player: { id: 99 } }] });
  assert.equal(invalidPlayerStats.statusCode, 400);
  assert.equal(String(calls[0].input), 'https://api-football.test/leagues');
  assert.equal(String(calls[1].input), 'https://api-football.test/leagues?id=39');
  assert.equal(String(calls[2].input), 'https://api-football.test/fixtures?league=39&season=2025');
  assert.equal(String(calls[3].input), 'https://api-football.test/players/topscorers?league=39&season=2025');
});

test('GET /v1/competitions/:id/full aggregates league competition sections', async t => {
  const calls = installFetchMock(async call => {
    const url = new URL(String(call.input));
    const path = url.pathname;
    if (path.endsWith('/leagues')) return jsonResponse({ response: [{ league: { id: 61, type: 'League', name: 'Ligue 1' }, seasons: [{ year: 2025, current: true }] }] });
    if (path.endsWith('/fixtures') && url.searchParams.get('league') === '61') return jsonResponse({ response: [buildCompetitionFixture(9001, 'Regular Season - 1'), buildCompetitionFixture(9002, 'Regular Season - 2')] });
    if (path.endsWith('/standings')) {
      return jsonResponse({ response: [{ league: { id: 61, standings: [[buildStandingRow(1, 'Alpha', 'League', {
        points: 27, goalsDiff: 12, form: 'WWDW',
        all: { played: 10, win: 8, draw: 3, lose: 1, goalsFor: 24, goalsAgainst: 12 },
        home: { played: 5, win: 5, draw: 0, lose: 0, goalsFor: 14, goalsAgainst: 4 },
        away: { played: 5, win: 3, draw: 1, lose: 1, goalsFor: 10, goalsAgainst: 8 },
      })]] } }] });
    }
    if (path.endsWith('/players/topscorers')) return jsonResponse({ response: [{ player: { id: 1, name: 'Top Scorer' } }] });
    if (path.endsWith('/players/topassists')) return jsonResponse({ response: [{ player: { id: 2, name: 'Top Assist' } }] });
    if (path.endsWith('/players/topyellowcards')) return jsonResponse({ response: [{ player: { id: 3, name: 'Top Yellow' } }] });
    if (path.endsWith('/players/topredcards')) return jsonResponse({ response: [{ player: { id: 4, name: 'Top Red' } }] });
    if (path.endsWith('/teams')) return jsonResponse({ response: [{ team: { id: 1 } }, { team: { id: 2 } }] });
    if (path.endsWith('/transfers') && url.searchParams.get('team') === '1') {
      return jsonResponse({ response: [{ player: { id: 11, name: 'Arrival' }, update: '2026-01-01', transfers: [
        { date: '2025-08-08', type: 'Transfer', teams: { in: { id: 1, name: 'Alpha', logo: 'alpha.png' }, out: { id: 99, name: 'Elsewhere', logo: 'else.png' } } },
      ] }] });
    }
    if (path.endsWith('/transfers') && url.searchParams.get('team') === '2') return jsonResponse({ response: [] });
    if (path.endsWith('/fixtures/statistics')) return jsonResponse({
      response: [
        { team: { id: 1, name: 'Alpha', logo: 'alpha.png' }, statistics: [
          { type: 'Ball Possession', value: '60%' }, { type: 'Shots on Goal', value: 6 }, { type: 'Total Shots', value: 15 }, { type: 'Expected Goals', value: 2.5 },
        ] },
        { team: { id: 2, name: 'Beta', logo: 'beta.png' }, statistics: [
          { type: 'Ball Possession', value: '40%' }, { type: 'Shots on Goal', value: 2 }, { type: 'Total Shots', value: 6 }, { type: 'Expected Goals', value: 0.9 },
        ] },
      ],
    });
    if (path.endsWith('/teams/statistics') && url.searchParams.get('team') === '1') return jsonResponse({ response: [{ fixtures: { clean_sheet: { total: 6 }, failed_to_score: { total: 1 } } }] });
    if (path.endsWith('/teams/statistics') && url.searchParams.get('team') === '2') return jsonResponse({ response: [{ fixtures: { clean_sheet: { total: 4 }, failed_to_score: { total: 3 } } }] });
    return jsonResponse({ response: [] });
  });
  const app = await buildApp(t);
  const response = await app.inject({ method: 'GET', url: '/v1/competitions/61/full?season=2025' });
  const payload = response.json();
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['cache-control'], 'public, max-age=30, stale-while-revalidate=30');
  assert.equal(payload.competition.league.id, 61);
  assert.equal(payload.competitionKind, 'league');
  assert.equal(payload.standings.league.id, 61);
  assert.equal(payload.matches.length, 2);
  assert.equal(payload.bracket, null);
  assert.equal(payload.playerStats.topScorers[0].player.id, 1);
  assert.equal(payload.playerStats.topRedCards[0].player.id, 4);
  assert.equal(payload.teamStats.advanced.state, 'available');
  assert.equal(payload.transfers.length, 1);
  assert.equal(calls.filter(call => String(call.input).includes('/standings?league=61&season=2025')).length, 1);
});

test('GET /v1/competitions/:id/full returns null/[] for unavailable cup sections', async t => {
  const calls = installFetchMock(async call => {
    const url = new URL(String(call.input));
    const path = url.pathname;
    if (path.endsWith('/leagues')) return jsonResponse({ response: [{ league: { id: 100, type: 'Cup', name: 'National Cup' }, seasons: [{ year: 2025, current: true }] }] });
    if (path.endsWith('/fixtures') && url.searchParams.get('league') === '100') {
      return jsonResponse({ response: [
        { fixture: { id: 4001, date: '2025-10-01T20:00:00+00:00', status: { short: 'FT', elapsed: 90 } }, league: { id: 100, season: 2025, round: 'Quarter-finals' }, teams: { home: { id: 1, name: 'Alpha', logo: 'alpha.png', winner: true }, away: { id: 3, name: 'Gamma', logo: 'gamma.png', winner: false } }, goals: { home: 2, away: 0 }, score: { penalty: { home: null, away: null } } },
      ] });
    }
    if (path.endsWith('/teams')) return jsonResponse({ response: [] });
    return jsonResponse({ response: [] });
  });
  const app = await buildApp(t);
  const response = await app.inject({ method: 'GET', url: '/v1/competitions/100/full?season=2025' });
  const payload = response.json();
  assert.equal(response.statusCode, 200);
  assert.equal(payload.competitionKind, 'cup');
  assert.equal(payload.standings, null);
  assert.equal(payload.teamStats, null);
  assert.deepEqual(payload.playerStats, { topScorers: [], topAssists: [], topYellowCards: [], topRedCards: [] });
  assert.equal(payload.bracket.length, 1);
  assert.deepEqual(payload.transfers, []);
  assert.equal(calls.some(call => String(call.input).includes('/players/topscorers')), false);
  assert.equal(calls.some(call => String(call.input).includes('/standings?league=100')), false);
});

test('GET /v1/competitions/:id/full serves snapshot after memory cache reset', async t => {
  const firstCalls = installFetchMock(async call => {
    const url = new URL(String(call.input));
    const path = url.pathname;

    if (path.endsWith('/leagues')) {
      return jsonResponse({
        response: [
          {
            league: { id: 100, type: 'Cup', name: 'National Cup' },
            seasons: [{ year: 2025, current: true }],
          },
        ],
      });
    }

    if (path.endsWith('/fixtures') && url.searchParams.get('league') === '100') {
      return jsonResponse({
        response: [
          {
            fixture: {
              id: 4001,
              date: '2025-10-01T20:00:00+00:00',
              status: { short: 'FT', elapsed: 90 },
            },
            league: { id: 100, season: 2025, round: 'Quarter-finals' },
            teams: {
              home: { id: 1, name: 'Alpha', logo: 'alpha.png', winner: true },
              away: { id: 3, name: 'Gamma', logo: 'gamma.png', winner: false },
            },
            goals: { home: 2, away: 0 },
            score: { penalty: { home: null, away: null } },
          },
        ],
      });
    }

    if (path.endsWith('/teams')) {
      return jsonResponse({ response: [] });
    }

    return jsonResponse({ response: [] });
  });

  const app = await buildApp(t);
  const firstResponse = await app.inject({
    method: 'GET',
    url: '/v1/competitions/100/full?season=2025',
  });
  assert.equal(firstResponse.statusCode, 200);
  assert.equal(firstCalls.length > 0, true);
  const firstPayload = firstResponse.json();

  const { resetCacheForTests } = await import('../../src/lib/cache.ts');
  resetCacheForTests();

  const secondCalls = installFetchMock(async () => {
    throw new Error('Upstream should not be called when snapshot is available.');
  });
  const secondResponse = await app.inject({
    method: 'GET',
    url: '/v1/competitions/100/full?season=2025',
  });
  assert.equal(secondResponse.statusCode, 200);
  assert.deepEqual(secondResponse.json(), firstPayload);
  assert.equal(secondCalls.length, 0);
});
