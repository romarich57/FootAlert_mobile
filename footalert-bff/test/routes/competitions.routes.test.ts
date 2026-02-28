import assert from 'node:assert/strict';
import test from 'node:test';

import { buildApp, installFetchMock, jsonResponse } from '../helpers/appTestHarness.ts';
test('GET /v1/competitions/:id/standings applies longer Cache-Control header', async t => {
  installFetchMock(async () =>
    jsonResponse({
      response: [{ league: { id: 39 }, standings: [] }],
    }),
  );

  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/competitions/39/standings?season=2025',
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['cache-control'], 'public, max-age=300, stale-while-revalidate=600');
});

test('GET /v1/competitions compresses large JSON payloads when client accepts gzip', async t => {
  installFetchMock(async () =>
    jsonResponse({
      response: Array.from({ length: 120 }, (_, index) => ({
        league: {
          id: index + 1,
          name: `League ${index + 1} ${'x'.repeat(48)}`,
          type: 'League',
          logo: 'https://cdn.footalert.test/logo.png',
        },
        country: {
          name: `Country ${index + 1}`,
          code: 'FR',
          flag: 'https://cdn.footalert.test/flag.png',
        },
        seasons: [],
      })),
    }),
  );

  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/competitions',
    headers: {
      'accept-encoding': 'gzip',
    },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['content-encoding'], 'gzip');
  assert.match(String(response.headers.vary ?? ''), /accept-encoding/i);
});

test('GET /v1/competitions/search rejects unsupported params with 400', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));

  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/competitions/search?q=premier&foo=bar',
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, 'VALIDATION_ERROR');
  assert.equal(calls.length, 0);
});

test('GET /v1/competitions/:id/transfers filters, deduplicates and enriches transfer context', async t => {
  const calls = installFetchMock(async call => {
    const url = new URL(String(call.input));
    const pathname = url.pathname;

    if (pathname.endsWith('/teams')) {
      return jsonResponse({
        response: [
          { team: { id: 1 } },
          { team: { id: 2 } },
        ],
      });
    }

    if (pathname.endsWith('/transfers') && url.searchParams.get('team') === '1') {
      return jsonResponse({
        response: [
          {
            player: { id: 10, name: 'Player A' },
            update: '2026-01-01',
            transfers: [
              {
                date: '2025-08-10',
                type: 'Loan',
                teams: {
                  in: { id: 1, name: 'League Team 1', logo: 'in1.png' },
                  out: { id: 90, name: 'External Team', logo: 'out1.png' },
                },
              },
              {
                date: '2025-02-10',
                type: 'Transfer',
                teams: {
                  in: { id: 1, name: 'League Team 1', logo: 'in1.png' },
                  out: { id: 91, name: 'External Team 2', logo: 'out2.png' },
                },
              },
            ],
          },
        ],
      });
    }

    if (pathname.endsWith('/transfers') && url.searchParams.get('team') === '2') {
      return jsonResponse({
        response: [
          // Duplicate of Player A transfer shifted by one day, keep the most recent date.
          {
            player: { id: 10, name: 'Player A' },
            update: '2026-01-01',
            transfers: [
              {
                date: '2025-08-11',
                type: 'Loan',
                teams: {
                  in: { id: 1, name: 'League Team 1', logo: 'in1.png' },
                  out: { id: 90, name: 'External Team', logo: 'out1.png' },
                },
              },
            ],
          },
          {
            player: { id: 30, name: 'Player B' },
            update: '2026-01-01',
            transfers: [
              {
                date: '2025-09-12',
                type: 'Transfer',
                teams: {
                  in: { id: 2, name: 'League Team 2', logo: 'in2.png' },
                  out: { id: 1, name: 'League Team 1', logo: 'out2.png' },
                },
              },
              {
                date: '2026-07-02',
                type: 'Transfer',
                teams: {
                  in: { id: 2, name: 'League Team 2', logo: 'in2.png' },
                  out: { id: 1, name: 'League Team 1', logo: 'out2.png' },
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
    url: '/v1/competitions/39/transfers?season=2025',
  });

  assert.equal(response.statusCode, 200);
  const payload = response.json();
  assert.equal(Array.isArray(payload.response), true);
  assert.equal(payload.response.length, 2);
  assert.equal(calls.length, 3);

  const first = payload.response[0];
  const second = payload.response[1];

  assert.equal(first.player.id, 30);
  assert.equal(first.context.teamInInLeague, true);
  assert.equal(first.context.teamOutInLeague, true);
  assert.equal(first.transfers[0].date, '2025-09-12');

  assert.equal(second.player.id, 10);
  assert.equal(second.context.teamInInLeague, true);
  assert.equal(second.context.teamOutInLeague, false);
  assert.equal(second.transfers[0].date, '2025-08-11');
});

test('GET /v1/competitions/:id/transfers keeps partial data when one team transfer call fails', async t => {
  const calls = installFetchMock(async call => {
    const url = new URL(String(call.input));
    const pathname = url.pathname;

    if (pathname.endsWith('/teams')) {
      return jsonResponse({
        response: [
          { team: { id: 1 } },
          { team: { id: 2 } },
        ],
      });
    }

    if (pathname.endsWith('/transfers') && url.searchParams.get('team') === '1') {
      return jsonResponse({
        response: [
          {
            player: { id: 99, name: 'Player Stable' },
            update: '2026-01-01',
            transfers: [
              {
                date: '2025-10-12',
                type: 'Transfer',
                teams: {
                  in: { id: 1, name: 'League Team 1', logo: 'in1.png' },
                  out: { id: 50, name: 'External Team', logo: 'out1.png' },
                },
              },
            ],
          },
        ],
      });
    }

    if (pathname.endsWith('/transfers') && url.searchParams.get('team') === '2') {
      throw new TypeError('upstream timeout');
    }

    return jsonResponse({ response: [] });
  });

  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/competitions/61/transfers?season=2025',
  });

  assert.equal(response.statusCode, 200);
  const payload = response.json();
  assert.equal(Array.isArray(payload.response), true);
  assert.equal(payload.response.length, 1);
  assert.equal(payload.response[0].player.id, 99);
  assert.equal(calls.length >= 3, true);
});

test('GET /v1/competitions/:id/transfers skips malformed transfers and keeps newest duplicate', async t => {
  const calls = installFetchMock(async call => {
    const url = new URL(String(call.input));
    const pathname = url.pathname;

    if (pathname.endsWith('/teams')) {
      return jsonResponse({
        response: [
          { team: { id: 1 } },
          { team: { id: 'invalid-id' } },
          { team: { id: 2 } },
        ],
      });
    }

    if (pathname.endsWith('/transfers') && url.searchParams.get('team') === '1') {
      return jsonResponse({
        response: [
          {
            player: { id: 50, name: 'Player Filtered' },
            update: '2026-01-01',
            transfers: [
              // Missing type -> skipped.
              {
                date: '2025-07-15',
                type: '',
                teams: {
                  in: { id: 1, name: 'League Team 1', logo: 'in.png' },
                  out: { id: 99, name: 'External Team', logo: 'out.png' },
                },
              },
              // Invalid team payload -> skipped.
              {
                date: '2025-07-16',
                type: 'Loan',
                teams: {
                  in: { id: 0, name: '', logo: '' },
                  out: { id: 99, name: 'External Team', logo: 'out.png' },
                },
              },
              // Both teams outside league -> skipped.
              {
                date: '2025-07-17',
                type: 'Transfer',
                teams: {
                  in: { id: 99, name: 'External A', logo: 'a.png' },
                  out: { id: 98, name: 'External B', logo: 'b.png' },
                },
              },
              // Newer transfer (kept).
              {
                date: '2025-08-20',
                type: 'Transfer',
                teams: {
                  in: { id: 1, name: 'League Team 1', logo: 'in.png' },
                  out: { id: 99, name: 'External Team', logo: 'out.png' },
                },
              },
              // Same key but older -> skipped by dedupe guard.
              {
                date: '2025-08-10',
                type: 'Transfer',
                teams: {
                  in: { id: 1, name: 'League Team 1', logo: 'in.png' },
                  out: { id: 99, name: 'External Team', logo: 'out.png' },
                },
              },
            ],
          },
        ],
      });
    }

    if (pathname.endsWith('/transfers') && url.searchParams.get('team') === '2') {
      return jsonResponse({ response: [] });
    }

    return jsonResponse({ response: [] });
  });

  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/competitions/39/transfers?season=2025',
  });

  assert.equal(response.statusCode, 200);
  const payload = response.json();
  assert.equal(Array.isArray(payload.response), true);
  assert.equal(payload.response.length, 1);
  assert.equal(payload.response[0].player.id, 50);
  assert.equal(payload.response[0].transfers[0].date, '2025-08-20');

  const transferCalls = calls
    .map(call => String(call.input))
    .filter(url => url.includes('/transfers?team='));
  assert.equal(transferCalls.some(url => url.includes('/transfers?team=invalid-id')), false);
});

test('GET /v1/competitions proxies /leagues upstream', async t => {
  const calls = installFetchMock(async () =>
    jsonResponse({
      response: [{ league: { id: 39, name: 'Premier League' } }],
    }),
  );
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/competitions',
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    response: [{ league: { id: 39, name: 'Premier League' } }],
  });
  assert.equal(String(calls[0].input), 'https://api-football.test/leagues');
});

test('GET /v1/competitions/:id proxies filtered league', async t => {
  const calls = installFetchMock(async () =>
    jsonResponse({
      response: [{ league: { id: 39 } }],
    }),
  );
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/competitions/39',
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { response: [{ league: { id: 39 } }] });
  assert.equal(String(calls[0].input), 'https://api-football.test/leagues?id=39');
});

test('GET /v1/competitions/:id/matches proxies league fixtures by season', async t => {
  const calls = installFetchMock(async () =>
    jsonResponse({
      response: [{ fixture: { id: 1 } }],
    }),
  );
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/competitions/39/matches?season=2025',
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { response: [{ fixture: { id: 1 } }] });
  assert.equal(String(calls[0].input), 'https://api-football.test/fixtures?league=39&season=2025');
});

test('GET /v1/competitions/:id/player-stats validates stat type and proxies upstream', async t => {
  const calls = installFetchMock(async () =>
    jsonResponse({
      response: [{ player: { id: 99 } }],
    }),
  );
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/competitions/39/player-stats?season=2025&type=topscorers',
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { response: [{ player: { id: 99 } }] });
  assert.equal(
    String(calls[0].input),
    'https://api-football.test/players/topscorers?league=39&season=2025',
  );
});
