import assert from 'node:assert/strict';
import test from 'node:test';

process.env.API_FOOTBALL_KEY ??= 'test-server-key';
process.env.MOBILE_SESSION_JWT_SECRET ??= 'test-mobile-session-secret';
process.env.MOBILE_ATTESTATION_ACCEPT_MOCK ??= 'true';
process.env.NOTIFICATIONS_BACKEND_ENABLED ??= 'true';
process.env.NOTIFICATIONS_EVENT_INGEST_ENABLED ??= 'true';
process.env.NOTIFICATIONS_PERSISTENCE_BACKEND ??= 'memory';
process.env.NOTIFICATIONS_INGEST_TOKEN ??= 'test-notifications-ingest-token';
process.env.PUSH_TOKEN_ENCRYPTION_KEY ??= 'test-notifications-encryption-key';

const { filterInjuriesForMatch } = await import('../../src/routes/matches/absences.ts');

function playerName(entry: unknown): unknown {
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  const record = entry as Record<string, unknown>;
  const player = record.player;
  if (!player || typeof player !== 'object') {
    return null;
  }
  return (player as Record<string, unknown>).name ?? null;
}

test('filterInjuriesForMatch returns empty when no injuries are provided', () => {
  assert.deepEqual(filterInjuriesForMatch([], 202, Date.parse('2026-02-21T20:00:00Z')), []);
});

test('filterInjuriesForMatch prefers exact fixture id and sorts by date then player name', () => {
  const response = filterInjuriesForMatch(
    [
      null,
      { fixture: { id: 202, date: '2026-02-21T20:00:00Z' }, player: { name: 123 } },
      { fixture: { id: 202, date: '2026-02-21T20:00:00Z' }, player: { name: 'Charlie' } },
      { fixture: { id: 202, date: '2026-02-21T20:00:00Z' }, player: 'invalid-player-shape' },
      { fixture: { id: 202, date: '2026-02-20T20:00:00Z' }, player: { name: 'Bravo' } },
      { fixture: { id: 202 }, player: { name: 'Alpha' } },
      { fixture: { id: 201, date: '2026-02-21T20:00:00Z' }, player: { name: 'Ignored' } },
    ],
    202,
    Date.parse('2026-02-21T20:00:00Z'),
  );

  assert.equal(response.length, 5);
  assert.deepEqual(response.map(playerName), [123, null, 'Charlie', 'Bravo', 'Alpha']);
});

test('filterInjuriesForMatch falls back to nearby dates when exact fixture entries are missing', () => {
  const matchDateMs = Date.parse('2026-02-21T20:00:00Z');
  const response = filterInjuriesForMatch(
    [
      { fixture: { id: 999, timestamp: Math.floor(matchDateMs / 1_000) }, player: { name: 'Same day' } },
      { fixture: { id: 998, date: '2026-02-22T20:00:00Z' }, player: { name: 'One day after' } },
      { fixture: { id: 997, date: '2026-02-24T20:00:00Z' }, player: { name: 'Too far' } },
      { fixture: { id: 996 }, player: { name: 'No date metadata' } },
      { fixture: null, player: { name: 'Invalid fixture payload' } },
      'invalid-entry-shape',
    ],
    202,
    matchDateMs,
  );

  assert.equal(response.length, 2);
  assert.deepEqual(response.map(playerName), ['One day after', 'Same day']);
});

test('filterInjuriesForMatch returns empty when match date is unknown and no exact fixture exists', () => {
  const response = filterInjuriesForMatch(
    [{ fixture: { id: 999, date: '2026-02-21T20:00:00Z' }, player: { name: 'Ignored' } }],
    202,
    null,
  );
  assert.deepEqual(response, []);
});

test('filterInjuriesForMatch keeps dated injuries ahead of entries without date metadata', () => {
  const fixtureId = 202;
  const payloadA = filterInjuriesForMatch(
    [
      { fixture: { id: fixtureId, date: '2026-02-21T20:00:00Z' }, player: { name: 'Dated' } },
      { fixture: { id: fixtureId }, player: { name: 'NoDate' } },
    ],
    fixtureId,
    Date.parse('2026-02-21T20:00:00Z'),
  );

  const payloadB = filterInjuriesForMatch(
    [
      { fixture: { id: fixtureId }, player: { name: 'NoDate' } },
      { fixture: { id: fixtureId, date: '2026-02-21T20:00:00Z' }, player: { name: 'Dated' } },
    ],
    fixtureId,
    Date.parse('2026-02-21T20:00:00Z'),
  );

  assert.deepEqual(payloadA.map(playerName), ['Dated', 'NoDate']);
  assert.deepEqual(payloadB.map(playerName), ['Dated', 'NoDate']);
});
