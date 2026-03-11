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

const {
  toDateMilliseconds,
  toEpochMilliseconds,
  toNumericId,
} = await import('../../src/routes/matches/fixtureContext.ts');

test('fixtureContext helpers normalize numeric and date values', () => {
  assert.equal(toNumericId(10), 10);
  assert.equal(toNumericId('10'), null);

  assert.equal(toEpochMilliseconds(1_705_000_000_000), 1_705_000_000_000);
  assert.equal(toEpochMilliseconds(1_705_000_000), 1_705_000_000_000);
  assert.equal(toEpochMilliseconds(12345), null);
  assert.equal(toEpochMilliseconds('1705000000'), null);

  assert.equal(toDateMilliseconds('2026-02-21T20:00:00Z'), Date.parse('2026-02-21T20:00:00Z'));
  assert.equal(toDateMilliseconds('invalid-date'), null);
  assert.equal(toDateMilliseconds(123), null);
});
