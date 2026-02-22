import assert from 'node:assert/strict';
import test from 'node:test';

import {
  configureCache,
  MemoryCache,
  resetCacheForTests,
  withCache,
} from '../src/lib/cache.ts';

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

test('withCache deduplicates concurrent requests with the same key', async () => {
  resetCacheForTests();
  let producerCalls = 0;

  const producer = async (): Promise<{ value: number }> => {
    producerCalls += 1;
    await sleep(30);
    return { value: 42 };
  };

  const [resultA, resultB, resultC] = await Promise.all([
    withCache('cache-key', 1_000, producer),
    withCache('cache-key', 1_000, producer),
    withCache('cache-key', 1_000, producer),
  ]);

  assert.equal(producerCalls, 1);
  assert.deepEqual(resultA, { value: 42 });
  assert.deepEqual(resultB, { value: 42 });
  assert.deepEqual(resultC, { value: 42 });
});

test('withCache respects TTL and re-executes producer after expiration', async () => {
  resetCacheForTests();
  let producerCalls = 0;

  const producer = async (): Promise<number> => {
    producerCalls += 1;
    return producerCalls;
  };

  const firstValue = await withCache('expiring-key', 10, producer);
  await sleep(25);
  const secondValue = await withCache('expiring-key', 10, producer);

  assert.equal(firstValue, 1);
  assert.equal(secondValue, 2);
  assert.equal(producerCalls, 2);
});

test('MemoryCache evicts least recently used entries when max size is reached', () => {
  const localCache = new MemoryCache({
    maxEntries: 2,
    cleanupIntervalMs: 60_000,
  });

  localCache.set('entry-a', { value: 1 }, 1_000);
  localCache.set('entry-b', { value: 2 }, 1_000);

  // Touch entry-a so entry-b becomes the oldest one.
  assert.deepEqual(localCache.get<{ value: number }>('entry-a'), { value: 1 });

  localCache.set('entry-c', { value: 3 }, 1_000);

  assert.equal(localCache.get('entry-b'), null);
  assert.deepEqual(localCache.get<{ value: number }>('entry-a'), { value: 1 });
  assert.deepEqual(localCache.get<{ value: number }>('entry-c'), { value: 3 });
});

test('withCache uses bounded global capacity after configureCache', async () => {
  resetCacheForTests();
  configureCache({
    maxEntries: 1,
  });

  let producerCalls = 0;
  const producer = async (): Promise<number> => {
    producerCalls += 1;
    return producerCalls;
  };

  await withCache('key-one', 1_000, producer);
  await withCache('key-two', 1_000, producer);
  const refreshedValue = await withCache('key-one', 1_000, producer);

  assert.equal(refreshedValue, 3);
  assert.equal(producerCalls, 3);
  resetCacheForTests();
});
