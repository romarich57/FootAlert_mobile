import assert from 'node:assert/strict';
import test from 'node:test';

import { buildApp, installFetchMock, jsonResponse } from '../helpers/appTestHarness.ts';

type MatchStatusInput = {
  short: string;
  long?: string;
  elapsed?: number | null;
};

function buildFixture(
  id: number,
  round: string,
  date: string,
  status: MatchStatusInput,
) {
  return {
    fixture: {
      id,
      date,
      timestamp: Math.floor(new Date(date).getTime() / 1000),
      status: {
        short: status.short,
        long: status.long ?? status.short,
        elapsed: status.elapsed ?? null,
      },
    },
    league: {
      id: 39,
      season: 2025,
      round,
    },
    teams: {
      home: { id: id * 10 + 1, name: `Home ${id}`, logo: 'home.png', winner: null },
      away: { id: id * 10 + 2, name: `Away ${id}`, logo: 'away.png', winner: null },
    },
    goals: {
      home: null,
      away: null,
    },
    score: {
      halftime: { home: null, away: null },
      fulltime: { home: null, away: null },
      extratime: { home: null, away: null },
      penalty: { home: null, away: null },
    },
  };
}

test('GET /v1/competitions/:id/matches anchors smart pagination on the first mixed round and exposes previousCursor', async t => {
  installFetchMock(async () =>
    jsonResponse({
      response: [
        buildFixture(1, 'Regular Season - 1', '2025-08-01T19:00:00.000Z', {
          short: 'FT',
          long: 'Match Finished',
          elapsed: 90,
        }),
        buildFixture(2, 'Regular Season - 1', '2025-08-02T19:00:00.000Z', {
          short: 'FT',
          long: 'Match Finished',
          elapsed: 90,
        }),
        buildFixture(3, 'Regular Season - 1', '2025-08-08T19:00:00.000Z', {
          short: 'FT',
          long: 'Match Finished',
          elapsed: 90,
        }),
        buildFixture(4, 'Regular Season - 1', '2025-08-03T19:00:00.000Z', {
          short: 'FT',
          long: 'Match Finished',
          elapsed: 90,
        }),
        buildFixture(5, 'Regular Season - 1', '2025-08-04T19:00:00.000Z', {
          short: 'FT',
          long: 'Match Finished',
          elapsed: 90,
        }),
        buildFixture(6, 'Regular Season - 1', '2025-08-05T19:00:00.000Z', {
          short: 'FT',
          long: 'Match Finished',
          elapsed: 90,
        }),
        buildFixture(7, 'Regular Season - 1', '2025-08-06T19:00:00.000Z', {
          short: 'FT',
          long: 'Match Finished',
          elapsed: 90,
        }),
        buildFixture(8, 'Regular Season - 1', '2025-08-07T19:00:00.000Z', {
          short: 'FT',
          long: 'Match Finished',
          elapsed: 90,
        }),
        buildFixture(9, 'Regular Season - 1', '2025-08-08T19:00:00.000Z', {
          short: 'FT',
          long: 'Match Finished',
          elapsed: 90,
        }),
        buildFixture(10, 'Regular Season - 1', '2025-08-09T19:00:00.000Z', {
          short: 'FT',
          long: 'Match Finished',
          elapsed: 90,
        }),
        buildFixture(11, 'Regular Season - 2', '2025-08-10T19:00:00.000Z', {
          short: 'FT',
          long: 'Match Finished',
          elapsed: 90,
        }),
        buildFixture(12, 'Regular Season - 2', '2025-08-11T19:00:00.000Z', {
          short: 'FT',
          long: 'Match Finished',
          elapsed: 90,
        }),
        buildFixture(13, 'Regular Season - 2', '2025-08-12T19:00:00.000Z', {
          short: 'FT',
          long: 'Match Finished',
          elapsed: 90,
        }),
        buildFixture(14, 'Regular Season - 2', '2025-08-13T19:00:00.000Z', {
          short: 'FT',
          long: 'Match Finished',
          elapsed: 90,
        }),
        buildFixture(16, 'Regular Season - 3', '2025-08-15T19:00:00.000Z', {
          short: 'NS',
          long: 'Not Started',
        }),
        buildFixture(17, 'Regular Season - 3', '2025-08-16T19:00:00.000Z', {
          short: 'NS',
          long: 'Not Started',
        }),
        buildFixture(18, 'Regular Season - 3', '2025-08-17T19:00:00.000Z', {
          short: 'NS',
          long: 'Not Started',
        }),
        buildFixture(19, 'Regular Season - 3', '2025-08-18T19:00:00.000Z', {
          short: 'NS',
          long: 'Not Started',
        }),
        buildFixture(20, 'Regular Season - 3', '2025-08-19T19:00:00.000Z', {
          short: 'NS',
          long: 'Not Started',
        }),
        buildFixture(15, 'Regular Season - 2', '2025-09-01T19:00:00.000Z', {
          short: 'PST',
          long: 'Match Postponed',
        }),
      ],
    }),
  );

  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/competitions/39/matches?season=2025&limit=10',
  });

  assert.equal(response.statusCode, 200);
  const payload = response.json();

  assert.deepEqual(
    payload.response.map((fixture: { fixture: { id: number } }) => fixture.fixture.id),
    [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  );
  assert.equal(payload.pageInfo.hasPrevious, true);
  assert.equal(typeof payload.pageInfo.previousCursor, 'string');
  assert.equal(payload.pageInfo.hasMore, false);

  const previousResponse = await app.inject({
    method: 'GET',
    url: `/v1/competitions/39/matches?season=2025&limit=10&cursor=${encodeURIComponent(payload.pageInfo.previousCursor)}`,
  });

  assert.equal(previousResponse.statusCode, 200);
  const previousPayload = previousResponse.json();
  assert.deepEqual(
    previousPayload.response.map((fixture: { fixture: { id: number } }) => fixture.fixture.id),
    [1, 2, 4, 5, 6, 7, 8, 3, 9, 10],
  );
  assert.equal(previousPayload.pageInfo.hasPrevious, false);
  assert.equal(previousPayload.pageInfo.previousCursor, null);
});

test('GET /v1/competitions/:id/matches supports anchor=start for cursor pagination', async t => {
  installFetchMock(async () =>
    jsonResponse({
      response: [
        buildFixture(1, 'Regular Season - 1', '2025-08-01T19:00:00.000Z', {
          short: 'FT',
          long: 'Match Finished',
          elapsed: 90,
        }),
        buildFixture(2, 'Regular Season - 1', '2025-08-02T19:00:00.000Z', {
          short: 'FT',
          long: 'Match Finished',
          elapsed: 90,
        }),
        buildFixture(3, 'Regular Season - 1', '2025-08-03T19:00:00.000Z', {
          short: 'FT',
          long: 'Match Finished',
          elapsed: 90,
        }),
        buildFixture(4, 'Regular Season - 1', '2025-08-04T19:00:00.000Z', {
          short: 'FT',
          long: 'Match Finished',
          elapsed: 90,
        }),
        buildFixture(5, 'Regular Season - 1', '2025-08-05T19:00:00.000Z', {
          short: 'FT',
          long: 'Match Finished',
          elapsed: 90,
        }),
        buildFixture(6, 'Regular Season - 1', '2025-08-06T19:00:00.000Z', {
          short: 'FT',
          long: 'Match Finished',
          elapsed: 90,
        }),
        buildFixture(7, 'Regular Season - 1', '2025-08-07T19:00:00.000Z', {
          short: 'FT',
          long: 'Match Finished',
          elapsed: 90,
        }),
        buildFixture(8, 'Regular Season - 1', '2025-08-08T19:00:00.000Z', {
          short: 'FT',
          long: 'Match Finished',
          elapsed: 90,
        }),
        buildFixture(9, 'Regular Season - 1', '2025-08-09T19:00:00.000Z', {
          short: 'FT',
          long: 'Match Finished',
          elapsed: 90,
        }),
        buildFixture(10, 'Regular Season - 1', '2025-08-10T19:00:00.000Z', {
          short: 'FT',
          long: 'Match Finished',
          elapsed: 90,
        }),
        buildFixture(11, 'Regular Season - 2', '2025-08-11T19:00:00.000Z', {
          short: 'NS',
          long: 'Not Started',
        }),
        buildFixture(12, 'Regular Season - 2', '2025-08-12T19:00:00.000Z', {
          short: 'NS',
          long: 'Not Started',
        }),
      ],
    }),
  );

  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/competitions/39/matches?season=2025&limit=10&anchor=start',
  });

  assert.equal(response.statusCode, 200);
  const payload = response.json();
  assert.deepEqual(
    payload.response.map((fixture: { fixture: { id: number } }) => fixture.fixture.id),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  );
  assert.equal(payload.pageInfo.hasPrevious, false);
  assert.equal(payload.pageInfo.previousCursor, null);
});

test('GET /v1/competitions/:id/matches anchors smart pagination on the last round when the season is fully finished', async t => {
  installFetchMock(async () =>
    jsonResponse({
      response: [
        buildFixture(1, 'Regular Season - 1', '2025-08-01T19:00:00.000Z', {
          short: 'FT',
          long: 'Match Finished',
          elapsed: 90,
        }),
        buildFixture(2, 'Regular Season - 1', '2025-08-02T19:00:00.000Z', {
          short: 'FT',
          long: 'Match Finished',
          elapsed: 90,
        }),
        buildFixture(3, 'Regular Season - 2', '2025-08-08T19:00:00.000Z', {
          short: 'AET',
          long: 'Match Finished',
          elapsed: 120,
        }),
        buildFixture(4, 'Regular Season - 2', '2025-08-09T19:00:00.000Z', {
          short: 'PEN',
          long: 'Match Finished',
          elapsed: 120,
        }),
        buildFixture(5, 'Regular Season - 3', '2025-08-15T19:00:00.000Z', {
          short: 'FT',
          long: 'Match Finished',
          elapsed: 90,
        }),
        buildFixture(6, 'Regular Season - 3', '2025-08-16T19:00:00.000Z', {
          short: 'FT',
          long: 'Match Finished',
          elapsed: 90,
        }),
        buildFixture(7, 'Regular Season - 1', '2025-08-03T19:00:00.000Z', {
          short: 'FT',
          long: 'Match Finished',
          elapsed: 90,
        }),
        buildFixture(8, 'Regular Season - 1', '2025-08-04T19:00:00.000Z', {
          short: 'FT',
          long: 'Match Finished',
          elapsed: 90,
        }),
        buildFixture(9, 'Regular Season - 1', '2025-08-05T19:00:00.000Z', {
          short: 'FT',
          long: 'Match Finished',
          elapsed: 90,
        }),
        buildFixture(10, 'Regular Season - 2', '2025-08-10T19:00:00.000Z', {
          short: 'PEN',
          long: 'Match Finished',
          elapsed: 120,
        }),
        buildFixture(11, 'Regular Season - 2', '2025-08-11T19:00:00.000Z', {
          short: 'FT',
          long: 'Match Finished',
          elapsed: 90,
        }),
        buildFixture(12, 'Regular Season - 2', '2025-08-12T19:00:00.000Z', {
          short: 'FT',
          long: 'Match Finished',
          elapsed: 90,
        }),
        buildFixture(13, 'Regular Season - 3', '2025-08-17T19:00:00.000Z', {
          short: 'FT',
          long: 'Match Finished',
          elapsed: 90,
        }),
        buildFixture(14, 'Regular Season - 3', '2025-08-18T19:00:00.000Z', {
          short: 'FT',
          long: 'Match Finished',
          elapsed: 90,
        }),
        buildFixture(15, 'Regular Season - 3', '2025-08-19T19:00:00.000Z', {
          short: 'FT',
          long: 'Match Finished',
          elapsed: 90,
        }),
      ],
    }),
  );

  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/competitions/39/matches?season=2025&limit=10',
  });

  assert.equal(response.statusCode, 200);
  const payload = response.json();
  assert.deepEqual(
    payload.response.map((fixture: { fixture: { id: number } }) => fixture.fixture.id),
    [5, 6, 13, 14, 15],
  );
  assert.equal(payload.pageInfo.hasPrevious, true);
  assert.equal(payload.pageInfo.hasMore, false);
  assert.equal(payload.pageInfo.nextCursor, null);
});
