import test from 'node:test';
import assert from 'node:assert/strict';

import {
  chunkForMulticast,
  isInvalidTokenCode,
  isTransientErrorCode,
  sortRecipientsForFanout,
  splitImmediateAndDeferred,
} from '../../src/lib/notifications/workerPolicies.js';

test('chunkForMulticast splits arrays with deterministic chunk size', () => {
  const payload = ['a', 'b', 'c', 'd', 'e'];
  const chunks = chunkForMulticast(payload, 2);

  assert.deepEqual(chunks, [
    ['a', 'b'],
    ['c', 'd'],
    ['e'],
  ]);
});

test('chunkForMulticast returns empty array for empty input', () => {
  const chunks = chunkForMulticast<string>([], 500);
  assert.deepEqual(chunks, []);
});

test('isInvalidTokenCode detects permanent invalid token errors', () => {
  assert.equal(isInvalidTokenCode('messaging/registration-token-not-registered'), true);
  assert.equal(isInvalidTokenCode('messaging/invalid-registration-token'), true);
  assert.equal(isInvalidTokenCode('messaging/unavailable'), false);
  assert.equal(isInvalidTokenCode(null), false);
});

test('isTransientErrorCode detects retryable FCM errors', () => {
  assert.equal(isTransientErrorCode('messaging/unavailable'), true);
  assert.equal(isTransientErrorCode('messaging/internal-error'), true);
  assert.equal(isTransientErrorCode('messaging/timeout'), true);
  assert.equal(isTransientErrorCode('messaging/invalid-registration-token'), false);
  assert.equal(isTransientErrorCode(null), false);
});

test('sortRecipientsForFanout sorts by lastSeenAt desc then deviceId asc', () => {
  const sorted = sortRecipientsForFanout([
    { id: '2', deviceId: 'device-b', lastSeenAt: '2026-03-02T12:00:00.000Z' },
    { id: '1', deviceId: 'device-a', lastSeenAt: '2026-03-02T12:00:00.000Z' },
    { id: '3', deviceId: 'device-c', lastSeenAt: '2026-03-02T11:59:00.000Z' },
  ]);

  assert.deepEqual(sorted.map(entry => entry.id), ['1', '2', '3']);
});

test('splitImmediateAndDeferred enforces configured immediate cap', () => {
  const split = splitImmediateAndDeferred(['a', 'b', 'c', 'd'], 2);
  assert.deepEqual(split.immediate, ['a', 'b']);
  assert.deepEqual(split.deferred, ['c', 'd']);
});
