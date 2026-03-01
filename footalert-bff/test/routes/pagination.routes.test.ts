import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';

import { buildApp, installFetchMock, jsonResponse } from '../helpers/appTestHarness.ts';
import { computePaginationFiltersHash } from '../../src/lib/pagination/cursor.ts';

function buildFixtures(count: number): Array<{ fixture: { id: number } }> {
  return Array.from({ length: count }, (_, index) => ({
    fixture: { id: index + 1 },
  }));
}

test('GET /v1/matches paginates with cursor and preserves legacy behavior', async t => {
  const fixtures = buildFixtures(65);
  const calls = installFetchMock(async () =>
    jsonResponse({
      response: fixtures,
    }),
  );
  const app = await buildApp(t);

  const firstPageResponse = await app.inject({
    method: 'GET',
    url: '/v1/matches?date=2026-02-21&timezone=Europe/Paris&limit=20',
  });

  assert.equal(firstPageResponse.statusCode, 200);
  const firstPagePayload = firstPageResponse.json();
  assert.equal(firstPagePayload.response.length, 20);
  assert.equal(firstPagePayload.pageInfo.hasMore, true);
  assert.equal(typeof firstPagePayload.pageInfo.nextCursor, 'string');
  assert.equal(firstPagePayload.pageInfo.returnedCount, 20);

  const secondPageResponse = await app.inject({
    method: 'GET',
    url: `/v1/matches?date=2026-02-21&timezone=Europe/Paris&limit=20&cursor=${encodeURIComponent(firstPagePayload.pageInfo.nextCursor)}`,
  });
  assert.equal(secondPageResponse.statusCode, 200);
  const secondPagePayload = secondPageResponse.json();
  assert.equal(secondPagePayload.response.length, 20);
  assert.equal(secondPagePayload.response[0].fixture.id, 21);
  assert.equal(secondPagePayload.pageInfo.hasMore, true);

  const legacyResponse = await app.inject({
    method: 'GET',
    url: '/v1/matches?date=2026-02-21&timezone=Europe/Paris',
  });
  assert.equal(legacyResponse.statusCode, 200);
  assert.equal(legacyResponse.json().response.length, 65);
  assert.equal(legacyResponse.json().pageInfo, undefined);
  assert.equal(calls.length >= 1, true);
});

test('GET /v1/matches rejects invalid or filter-mismatched cursor', async t => {
  installFetchMock(async () =>
    jsonResponse({
      response: buildFixtures(30),
    }),
  );
  const app = await buildApp(t);

  const invalidCursorResponse = await app.inject({
    method: 'GET',
    url: '/v1/matches?date=2026-02-21&timezone=Europe/Paris&limit=20&cursor=bad-cursor',
  });
  assert.equal(invalidCursorResponse.statusCode, 400);
  assert.equal(invalidCursorResponse.json().error, 'PAGINATION_CURSOR_INVALID');

  const firstPageResponse = await app.inject({
    method: 'GET',
    url: '/v1/matches?date=2026-02-21&timezone=Europe/Paris&limit=10',
  });
  const firstPagePayload = firstPageResponse.json();

  const tamperedCursor = `${firstPagePayload.pageInfo.nextCursor}tampered`;
  const tamperedResponse = await app.inject({
    method: 'GET',
    url: `/v1/matches?date=2026-02-21&timezone=Europe/Paris&limit=10&cursor=${encodeURIComponent(tamperedCursor)}`,
  });
  assert.equal(tamperedResponse.statusCode, 400);
  assert.equal(tamperedResponse.json().error, 'PAGINATION_CURSOR_INVALID');

  const mismatchResponse = await app.inject({
    method: 'GET',
    url: `/v1/matches?date=2026-02-21&timezone=UTC&limit=10&cursor=${encodeURIComponent(firstPagePayload.pageInfo.nextCursor)}`,
  });
  assert.equal(mismatchResponse.statusCode, 400);
  assert.equal(mismatchResponse.json().error, 'PAGINATION_CURSOR_INVALID');
});

test('GET /v1/matches rejects expired cursor', async t => {
  installFetchMock(async () =>
    jsonResponse({
      response: buildFixtures(30),
    }),
  );
  const app = await buildApp(t);

  const filtersHash = computePaginationFiltersHash({
    date: '2026-02-21',
    timezone: 'Europe/Paris',
  });
  const expiredPayload = {
    v: 1,
    route: '/v1/matches',
    filtersHash,
    position: 10,
    issuedAt: Date.now() - (16 * 60_000),
  };
  const encodedPayload = Buffer.from(JSON.stringify(expiredPayload)).toString('base64url');
  const signature = createHmac('sha256', 'test-pagination-cursor-secret')
    .update(encodedPayload)
    .digest('base64url');
  const expiredCursor = `${encodedPayload}.${signature}`;

  const expiredResponse = await app.inject({
    method: 'GET',
    url: `/v1/matches?date=2026-02-21&timezone=Europe/Paris&limit=10&cursor=${encodeURIComponent(expiredCursor)}`,
  });

  assert.equal(expiredResponse.statusCode, 400);
  assert.equal(expiredResponse.json().error, 'PAGINATION_CURSOR_INVALID');
});

test('GET /v1/competitions/:id/matches paginates with cursor', async t => {
  installFetchMock(async () =>
    jsonResponse({
      response: buildFixtures(41),
    }),
  );
  const app = await buildApp(t);

  const firstPageResponse = await app.inject({
    method: 'GET',
    url: '/v1/competitions/39/matches?season=2025&limit=15',
  });
  assert.equal(firstPageResponse.statusCode, 200);
  const firstPagePayload = firstPageResponse.json();
  assert.equal(firstPagePayload.response.length, 15);
  assert.equal(firstPagePayload.pageInfo.hasMore, true);

  const secondPageResponse = await app.inject({
    method: 'GET',
    url: `/v1/competitions/39/matches?season=2025&limit=15&cursor=${encodeURIComponent(firstPagePayload.pageInfo.nextCursor)}`,
  });
  assert.equal(secondPageResponse.statusCode, 200);
  const secondPagePayload = secondPageResponse.json();
  assert.equal(secondPagePayload.response[0].fixture.id, 16);
});

test('GET /v1/teams/:id/players supports cursor pagination and keeps legacy page mode', async t => {
  const dataset = Array.from({ length: 52 }, (_, index) => ({
    player: { id: index + 1 },
  }));

  installFetchMock(async call => {
    const url = new URL(String(call.input));
    if (!url.pathname.endsWith('/players')) {
      return jsonResponse({ response: [] });
    }

    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = 20;
    const start = (page - 1) * pageSize;
    const slice = dataset.slice(start, start + pageSize);

    return jsonResponse({
      response: slice,
      paging: {
        current: page,
        total: Math.ceil(dataset.length / pageSize),
      },
    });
  });
  const app = await buildApp(t);

  const firstCursorResponse = await app.inject({
    method: 'GET',
    url: '/v1/teams/40/players?leagueId=39&season=2025&limit=25',
  });
  assert.equal(firstCursorResponse.statusCode, 200);
  const firstCursorPayload = firstCursorResponse.json();
  assert.equal(firstCursorPayload.response.length, 25);
  assert.equal(firstCursorPayload.pageInfo.hasMore, true);
  assert.equal(firstCursorPayload.paging.total, 3);

  const secondCursorResponse = await app.inject({
    method: 'GET',
    url: `/v1/teams/40/players?leagueId=39&season=2025&limit=25&cursor=${encodeURIComponent(firstCursorPayload.pageInfo.nextCursor)}`,
  });
  assert.equal(secondCursorResponse.statusCode, 200);
  const secondCursorPayload = secondCursorResponse.json();
  assert.equal(secondCursorPayload.response.length, 25);
  assert.equal(secondCursorPayload.response[0].player.id, 26);

  const thirdCursorResponse = await app.inject({
    method: 'GET',
    url: `/v1/teams/40/players?leagueId=39&season=2025&limit=25&cursor=${encodeURIComponent(secondCursorPayload.pageInfo.nextCursor)}`,
  });
  assert.equal(thirdCursorResponse.statusCode, 200);
  const thirdCursorPayload = thirdCursorResponse.json();
  assert.equal(thirdCursorPayload.response.length, 2);
  assert.equal(thirdCursorPayload.pageInfo.hasMore, false);
  assert.equal(thirdCursorPayload.pageInfo.nextCursor, null);

  const legacyResponse = await app.inject({
    method: 'GET',
    url: '/v1/teams/40/players?leagueId=39&season=2025&page=2',
  });
  assert.equal(legacyResponse.statusCode, 200);
  const legacyPayload = legacyResponse.json();
  assert.equal(legacyPayload.response[0].player.id, 21);
  assert.equal(legacyPayload.pageInfo, undefined);
});
