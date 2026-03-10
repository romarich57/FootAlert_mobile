import assert from 'node:assert/strict';
import test from 'node:test';

import { buildApp, installFetchMock, jsonResponse } from '../helpers/appTestHarness.ts';

function buildFixture({
  fixtureId,
  short = 'FT',
  long = 'Match Finished',
  season = 2025,
  elapsed = 90,
}: {
  fixtureId: string;
  short?: string;
  long?: string;
  season?: number;
  elapsed?: number | null;
}) {
  return {
    fixture: {
      id: Number(fixtureId),
      date: '2026-02-21T20:00:00+00:00',
      timestamp: 1_771_706_400,
      status: { short, long, elapsed },
    },
    league: { id: 61, season },
    teams: { home: { id: 10, name: 'Alpha', logo: 'alpha.png' }, away: { id: 20, name: 'Beta', logo: 'beta.png' } },
    goals: { home: 2, away: 1 },
  };
}

test('GET /v1/matches proxies upstream and applies short cache header', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [{ fixture: { id: 1001 } }] }));
  const app = await buildApp(t);
  const response = await app.inject({ method: 'GET', url: '/v1/matches?date=2026-02-21&timezone=Europe/Paris' });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { response: [{ fixture: { id: 1001 } }] });
  assert.equal(response.headers['cache-control'], 'public, max-age=30, stale-while-revalidate=30');
  assert.match(String(response.headers.vary ?? ''), /accept-encoding/i);
  assert.equal(String(calls[0].input), 'https://api-football.test/fixtures?date=2026-02-21&timezone=Europe%2FParis');
});

test('critical match routes are registered and do not return 404', async t => {
  const fixtureId = '909';
  installFetchMock(async call => {
    const url = new URL(String(call.input));
    if (url.pathname.endsWith('/fixtures') && url.searchParams.get('id') === fixtureId) {
      return jsonResponse({ response: [buildFixture({ fixtureId, short: 'NS', long: 'Not Started', elapsed: null })] });
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
    `/v1/matches/${fixtureId}/players/901/stats`,
    `/v1/matches/${fixtureId}/full?timezone=Europe/Paris`,
  ];
  for (const url of urls) {
    const response = await app.inject({ method: 'GET', url });
    assert.notEqual(response.statusCode, 404, `${url} should be registered`);
  }
});

test('match routes reject invalid query combinations', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);
  const responses = await Promise.all([
    app.inject({ method: 'GET', url: '/v1/matches?date=2026-02-21' }),
    app.inject({ method: 'GET', url: '/v1/matches/101/events?timezone=Europe/Paris' }),
    app.inject({ method: 'GET', url: '/v1/matches/101/statistics?period=invalid' }),
    app.inject({ method: 'GET', url: '/v1/matches/101/full' }),
  ]);
  responses.forEach(response => {
    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error, 'VALIDATION_ERROR');
  });
  assert.equal(calls.length, 0);
});

test('GET /v1/matches/:id/statistics routes all and half-period payloads correctly', async t => {
  const calls = installFetchMock(async call => {
    const url = new URL(String(call.input));
    if (url.pathname.endsWith('/fixtures') && url.searchParams.get('id') === '101') return jsonResponse({ response: [buildFixture({ fixtureId: '101', season: 2025 })] });
    if (url.pathname.endsWith('/fixtures/statistics') && url.searchParams.get('half') === 'true') {
      return jsonResponse({
        response: [
          { team: { id: 1 }, statistics: [{ type: 'Shots on Goal (1st Half)', value: 3 }, { type: 'Shots on Goal (2nd Half)', value: 4 }] },
          { team: { id: 2 }, statistics: [{ type: 'Shots on Goal (1st Half)', value: 1 }, { type: 'Shots on Goal (2nd Half)', value: 2 }] },
        ],
      });
    }
    if (url.pathname.endsWith('/fixtures/statistics')) return jsonResponse({ response: [{ team: { id: 1 }, statistics: [{ type: 'Shots on Goal', value: 5 }] }] });
    return jsonResponse({ response: [] });
  });
  const app = await buildApp(t);
  const all = await app.inject({ method: 'GET', url: '/v1/matches/101/statistics' });
  const first = await app.inject({ method: 'GET', url: '/v1/matches/101/statistics?period=first' });
  const firstAgain = await app.inject({ method: 'GET', url: '/v1/matches/101/statistics?period=first' });
  const second = await app.inject({ method: 'GET', url: '/v1/matches/101/statistics?period=second' });
  assert.equal(all.statusCode, 200);
  assert.equal(String(calls[0].input), 'https://api-football.test/fixtures/statistics?fixture=101');
  assert.deepEqual(first.json(), { response: [{ team: { id: 1 }, statistics: [{ type: 'Shots on Goal', value: 3 }] }, { team: { id: 2 }, statistics: [{ type: 'Shots on Goal', value: 1 }] }] });
  assert.equal(firstAgain.statusCode, 200);
  assert.deepEqual(second.json(), { response: [{ team: { id: 1 }, statistics: [{ type: 'Shots on Goal', value: 4 }] }, { team: { id: 2 }, statistics: [{ type: 'Shots on Goal', value: 2 }] }] });
  assert.equal(calls.filter(call => new URL(String(call.input)).pathname.endsWith('/fixtures/statistics')).length, 3);
});

test('GET /v1/matches/:id/statistics returns empty half payloads before season 2024', async t => {
  const calls = installFetchMock(async call => {
    const url = new URL(String(call.input));
    if (url.pathname.endsWith('/fixtures') && url.searchParams.get('id') === '202') return jsonResponse({ response: [buildFixture({ fixtureId: '202', season: 2023 })] });
    return jsonResponse({ response: [] });
  });
  const app = await buildApp(t);
  const response = await app.inject({ method: 'GET', url: '/v1/matches/202/statistics?period=second' });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { response: [] });
  assert.equal(calls.length, 1);
});

test('GET /v1/matches/:id/head-to-head fetches fixture context and proxies query', async t => {
  const calls = installFetchMock(async call => {
    const url = new URL(String(call.input));
    if (url.pathname.endsWith('/fixtures') && url.searchParams.get('id') === '101') return jsonResponse({ response: [buildFixture({ fixtureId: '101', short: 'NS', long: 'Not Started', elapsed: null })] });
    if (url.pathname.endsWith('/fixtures/headtohead')) return jsonResponse({ response: [{ fixture: { id: 999 } }] });
    return jsonResponse({ response: [] });
  });
  const app = await buildApp(t);
  const response = await app.inject({ method: 'GET', url: '/v1/matches/101/head-to-head?timezone=Europe/Paris&last=5' });
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['cache-control'], 'public, max-age=300, stale-while-revalidate=600');
  assert.deepEqual(response.json(), { response: [{ fixture: { id: 999 } }] });
  assert.equal(String(calls[0].input), 'https://api-football.test/fixtures?id=101&timezone=Europe%2FParis');
  assert.equal(String(calls[1].input), 'https://api-football.test/fixtures/headtohead?h2h=10-20&last=5');
});

test('GET /v1/matches/:id/absences returns partial fallback when one upstream injuries call fails', async t => {
  const calls = installFetchMock(async call => {
    const url = new URL(String(call.input));
    if (url.pathname.endsWith('/fixtures') && url.searchParams.get('id') === '202') return jsonResponse({ response: [buildFixture({ fixtureId: '202' })] });
    if (url.pathname.endsWith('/injuries') && url.searchParams.get('team') === '10') return new Response('upstream error', { status: 500 });
    if (url.pathname.endsWith('/injuries') && url.searchParams.get('team') === '20') {
      return jsonResponse({ response: [
        { fixture: { id: 201, date: '2026-02-17T20:00:00+00:00' }, player: { name: 'Old Injury' } },
        { fixture: { id: 202, date: '2026-02-21T20:00:00+00:00' }, player: { name: 'Zed Player' } },
        { fixture: { id: 202, date: '2026-02-21T20:00:00+00:00' }, player: { name: 'Alpha Player' } },
        { fixture: { id: 203, date: '2026-02-24T20:00:00+00:00' }, player: { name: 'Future Injury' } },
      ] });
    }
    return jsonResponse({ response: [] });
  });
  const app = await buildApp(t);
  const response = await app.inject({ method: 'GET', url: '/v1/matches/202/absences?timezone=Europe/Paris' });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    response: [
      { teamId: 10, response: [] },
      { teamId: 20, response: [
        { fixture: { id: 202, date: '2026-02-21T20:00:00+00:00' }, player: { name: 'Alpha Player' } },
        { fixture: { id: 202, date: '2026-02-21T20:00:00+00:00' }, player: { name: 'Zed Player' } },
      ] },
    ],
  });
  assert.ok(calls.some(call => String(call.input).includes('/injuries?league=61&season=2025&team=10')));
});

test('match detail proxy routes forward upstream payloads', async t => {
  const calls = installFetchMock(async call => {
    const url = new URL(String(call.input));
    if (url.pathname.endsWith('/fixtures') && url.searchParams.get('id') === '101') return jsonResponse({ response: [buildFixture({ fixtureId: '101' })] });
    if (url.pathname.endsWith('/fixtures/events')) return jsonResponse({ response: [{ type: 'Goal' }] });
    if (url.pathname.endsWith('/fixtures/lineups')) return jsonResponse({ response: [{ team: { id: 10 } }] });
    if (url.pathname.endsWith('/predictions')) return jsonResponse({ response: [{ predictions: { winner: { id: 10 } } }] });
    if (url.pathname.endsWith('/fixtures/players')) return jsonResponse({ response: [{ players: [] }] });
    return jsonResponse({ response: [] });
  });
  const app = await buildApp(t);
  const detail = await app.inject({ method: 'GET', url: '/v1/matches/101?timezone=Europe/Paris' });
  const events = await app.inject({ method: 'GET', url: '/v1/matches/101/events' });
  const lineups = await app.inject({ method: 'GET', url: '/v1/matches/101/lineups' });
  const predictions = await app.inject({ method: 'GET', url: '/v1/matches/101/predictions' });
  const players = await app.inject({ method: 'GET', url: '/v1/matches/101/players/10/stats' });
  assert.deepEqual(detail.json(), { response: [buildFixture({ fixtureId: '101' })] });
  assert.deepEqual(events.json(), { response: [{ type: 'Goal' }] });
  assert.deepEqual(lineups.json(), { response: [{ team: { id: 10 } }] });
  assert.deepEqual(predictions.json(), { response: [{ predictions: { winner: { id: 10 } } }] });
  assert.deepEqual(players.json(), { response: [{ players: [] }] });
  assert.equal(String(calls[0].input), 'https://api-football.test/fixtures?id=101&timezone=Europe%2FParis');
});

test('GET /v1/matches/:id/full follows pre-match lifecycle policy', async t => {
  const calls = installFetchMock(async call => {
    const url = new URL(String(call.input));
    if (url.pathname.endsWith('/fixtures') && url.searchParams.get('id') === '909') return jsonResponse({ response: [buildFixture({ fixtureId: '909', short: 'NS', long: 'Not Started', elapsed: null, season: 2026 })] });
    if (url.pathname.endsWith('/fixtures') && url.searchParams.get('team') === '10') return jsonResponse({ response: [buildFixture({ fixtureId: '701', season: 2026 })] });
    if (url.pathname.endsWith('/fixtures') && url.searchParams.get('team') === '20') return jsonResponse({ response: [buildFixture({ fixtureId: '702', season: 2026 })] });
    if (url.pathname.endsWith('/fixtures/lineups')) return jsonResponse({ response: [{ team: { id: 10 } }] });
    if (url.pathname.endsWith('/predictions')) return jsonResponse({ response: [{ predictions: { winner: { id: 10 } } }] });
    if (url.pathname.endsWith('/fixtures/headtohead')) return jsonResponse({ response: [{ fixture: { id: 801 } }] });
    if (url.pathname.endsWith('/fixtures/players') && url.searchParams.get('team') === '10') return jsonResponse({ response: [{ players: [{ id: 1 }] }] });
    if (url.pathname.endsWith('/fixtures/players') && url.searchParams.get('team') === '20') return jsonResponse({ response: [{ players: [{ id: 2 }] }] });
    if (url.pathname.endsWith('/players') && url.searchParams.get('team') === '10') {
      return jsonResponse({
        response: [
          {
            player: { id: 1, name: 'Alpha Scorer', photo: 'alpha.png' },
            statistics: [{ team: { id: 10, logo: 'alpha.png' }, league: { id: 61, season: 2026 }, games: { position: 'Attacker', rating: '7.8' }, goals: { total: 12, assists: 3 } }],
          },
        ],
      });
    }
    if (url.pathname.endsWith('/players') && url.searchParams.get('team') === '20') {
      return jsonResponse({
        response: [
          {
            player: { id: 2, name: 'Beta Scorer', photo: 'beta.png' },
            statistics: [{ team: { id: 20, logo: 'beta.png' }, league: { id: 61, season: 2026 }, games: { position: 'Attacker', rating: '7.4' }, goals: { total: 9, assists: 2 } }],
          },
        ],
      });
    }
    if (url.pathname.endsWith('/standings')) {
      return jsonResponse({
        response: [
          {
            league: {
              id: 61,
              season: 2026,
              standings: [[{
                rank: 1,
                team: { id: 10, name: 'Alpha', logo: 'alpha.png' },
                points: 60,
                goalsDiff: 30,
                group: 'Regular Season',
                form: 'WWWWW',
                status: 'same',
                description: null,
                all: { played: 25, win: 20, draw: 0, lose: 5, goals: { for: 60, against: 30 } },
                home: { played: 12, win: 10, draw: 1, lose: 1, goals: { for: 30, against: 10 } },
                away: { played: 13, win: 10, draw: 0, lose: 3, goals: { for: 30, against: 20 } },
                update: '2026-02-21T20:00:00+00:00',
              }]],
            },
          },
        ],
      });
    }
    if (url.pathname.endsWith('/injuries')) return jsonResponse({ response: [{ fixture: { id: 909, date: '2026-02-21T20:00:00+00:00' }, player: { name: url.searchParams.get('team') === '10' ? 'Alpha Out' : 'Beta Out' } }] });
    return jsonResponse({ response: [] });
  });
  const app = await buildApp(t);
  const response = await app.inject({ method: 'GET', url: '/v1/matches/909/full?timezone=Europe/Paris' });
  const payload = response.json();
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['cache-control'], 'public, max-age=30, stale-while-revalidate=30');
  assert.equal(payload.lifecycleState, 'pre_match');
  assert.deepEqual(payload.events, []);
  assert.deepEqual(payload.statistics, { all: [], first: [], second: [] });
  assert.equal(payload.predictions.length, 1);
  assert.equal(payload.headToHead.length, 1);
  assert.equal(payload.absences.length, 2);
  assert.equal(payload.standings.league.id, 61);
  assert.equal(payload.homeRecentResults.length, 1);
  assert.equal(payload.awayRecentResults.length, 1);
  assert.equal(payload.homeLeaders.scorers[0].name, 'Alpha Scorer');
  assert.equal(payload.awayLeaders.scorers[0].name, 'Beta Scorer');
  assert.equal(payload.playersStats.home.length, 1);
  assert.equal(payload.playersStats.away.length, 1);
  assert.equal(calls.some(call => String(call.input).includes('/fixtures/events?fixture=909')), false);
  assert.equal(calls.some(call => String(call.input).includes('/fixtures/statistics?fixture=909')), false);
});

test('GET /v1/matches/:id/full aggregates finished-match sections', async t => {
  const calls = installFetchMock(async call => {
    const url = new URL(String(call.input));
    if (url.pathname.endsWith('/fixtures') && url.searchParams.get('id') === '909') return jsonResponse({ response: [buildFixture({ fixtureId: '909', short: 'FT', long: 'Match Finished', season: 2025 })] });
    if (url.pathname.endsWith('/fixtures') && url.searchParams.get('team') === '10') return jsonResponse({ response: [buildFixture({ fixtureId: '703', season: 2025 })] });
    if (url.pathname.endsWith('/fixtures') && url.searchParams.get('team') === '20') return jsonResponse({ response: [buildFixture({ fixtureId: '704', season: 2025 })] });
    if (url.pathname.endsWith('/fixtures/events')) return jsonResponse({ response: [{ type: 'Goal' }] });
    if (url.pathname.endsWith('/fixtures/statistics') && url.searchParams.get('half') === 'true') {
      return jsonResponse({ response: [
        { team: { id: 10 }, statistics: [{ type: 'Shots on Goal (1st Half)', value: 2 }, { type: 'Shots on Goal (2nd Half)', value: 3 }] },
        { team: { id: 20 }, statistics: [{ type: 'Shots on Goal (1st Half)', value: 1 }, { type: 'Shots on Goal (2nd Half)', value: 1 }] },
      ] });
    }
    if (url.pathname.endsWith('/fixtures/statistics')) return jsonResponse({ response: [{ team: { id: 10 }, statistics: [{ type: 'Shots on Goal', value: 5 }] }] });
    if (url.pathname.endsWith('/fixtures/lineups')) return jsonResponse({ response: [{ team: { id: 10 } }] });
    if (url.pathname.endsWith('/fixtures/headtohead')) return jsonResponse({ response: [{ fixture: { id: 700 } }] });
    if (url.pathname.endsWith('/fixtures/players')) return jsonResponse({ response: [{ players: [] }] });
    if (url.pathname.endsWith('/players') && url.searchParams.get('team') === '10') return jsonResponse({ response: [{ player: { id: 1, name: 'Alpha Scorer', photo: 'alpha.png' }, statistics: [{ team: { id: 10, logo: 'alpha.png' }, league: { id: 61, season: 2025 }, games: { position: 'Attacker', rating: '7.8' }, goals: { total: 12, assists: 3 } }] }] });
    if (url.pathname.endsWith('/players') && url.searchParams.get('team') === '20') return jsonResponse({ response: [{ player: { id: 2, name: 'Beta Scorer', photo: 'beta.png' }, statistics: [{ team: { id: 20, logo: 'beta.png' }, league: { id: 61, season: 2025 }, games: { position: 'Attacker', rating: '7.4' }, goals: { total: 9, assists: 2 } }] }] });
    if (url.pathname.endsWith('/standings')) return jsonResponse({ response: [{ league: { id: 61, season: 2025, standings: [[{ rank: 1, team: { id: 10, name: 'Alpha', logo: 'alpha.png' }, points: 60, goalsDiff: 30, group: 'Regular Season', form: 'WWWWW', status: 'same', description: null, all: { played: 25, win: 20, draw: 0, lose: 5, goals: { for: 60, against: 30 } }, home: { played: 12, win: 10, draw: 1, lose: 1, goals: { for: 30, against: 10 } }, away: { played: 13, win: 10, draw: 0, lose: 3, goals: { for: 30, against: 20 } }, update: '2026-02-21T20:00:00+00:00' }]] } }] });
    if (url.pathname.endsWith('/injuries')) return jsonResponse({ response: [] });
    return jsonResponse({ response: [] });
  });
  const app = await buildApp(t);
  const response = await app.inject({ method: 'GET', url: '/v1/matches/909/full?timezone=Europe/Paris' });
  const payload = response.json();
  assert.equal(response.statusCode, 200);
  assert.equal(payload.lifecycleState, 'finished');
  assert.equal(payload.events.length, 1);
  assert.equal(payload.statistics.all.length, 1);
  assert.deepEqual(payload.statistics.first, [{ team: { id: 10 }, statistics: [{ type: 'Shots on Goal', value: 2 }] }, { team: { id: 20 }, statistics: [{ type: 'Shots on Goal', value: 1 }] }]);
  assert.deepEqual(payload.statistics.second, [{ team: { id: 10 }, statistics: [{ type: 'Shots on Goal', value: 3 }] }, { team: { id: 20 }, statistics: [{ type: 'Shots on Goal', value: 1 }] }]);
  assert.deepEqual(payload.predictions, []);
  assert.equal(payload.headToHead.length, 1);
  assert.equal(payload.standings.league.id, 61);
  assert.equal(payload.homeRecentResults.length, 1);
  assert.equal(payload.awayRecentResults.length, 1);
  assert.equal(payload.homeLeaders.scorers[0].name, 'Alpha Scorer');
  assert.equal(calls.some(call => String(call.input).includes('/predictions?fixture=909')), false);
});
