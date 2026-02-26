import assert from 'node:assert/strict';
import test from 'node:test';

import { mapWithConcurrency } from '../src/lib/concurrency/mapWithConcurrency.ts';

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

test('mapWithConcurrency preserves output order', async () => {
  const items = [1, 2, 3, 4, 5];

  const output = await mapWithConcurrency(items, 2, async item => {
    await sleep((6 - item) * 5);
    return item * 10;
  });

  assert.deepEqual(output, [10, 20, 30, 40, 50]);
});

test('mapWithConcurrency respects concurrency limit', async () => {
  const items = [1, 2, 3, 4, 5, 6, 7];
  let inFlight = 0;
  let maxInFlight = 0;

  const output = await mapWithConcurrency(items, 3, async item => {
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await sleep(8);
    inFlight -= 1;
    return item;
  });

  assert.deepEqual(output, items);
  assert.ok(maxInFlight <= 3);
});

test('mapWithConcurrency propagates worker errors', async () => {
  const items = [1, 2, 3];

  await assert.rejects(
    () =>
      mapWithConcurrency(items, 2, async item => {
        if (item === 2) {
          throw new Error('boom');
        }

        return item;
      }),
    /boom/,
  );
});
