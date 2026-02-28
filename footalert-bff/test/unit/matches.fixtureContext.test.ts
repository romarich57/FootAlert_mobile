import assert from 'node:assert/strict';
import test from 'node:test';

process.env.API_FOOTBALL_KEY ??= 'test-server-key';

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
