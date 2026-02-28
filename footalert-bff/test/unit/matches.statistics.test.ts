import assert from 'node:assert/strict';
import test from 'node:test';

import { filterFixtureStatisticsByPeriod } from '../../src/routes/matches/statistics.ts';

test('filterFixtureStatisticsByPeriod returns an empty response when no period hints exist', () => {
  const payload = {
    response: [
      {
        team: { id: 1 },
        statistics: [{ type: 'Shots on Goal', value: 5 }],
      },
    ],
  };

  const result = filterFixtureStatisticsByPeriod(payload, 'first');
  assert.deepEqual(result, {
    response: [],
  });
});

test('filterFixtureStatisticsByPeriod drops invalid entries and keeps matching first-half statistics', () => {
  const payload = {
    response: [
      null,
      {
        period: '2nd half',
        statistics: [{ type: 'Shots', value: 4 }],
      },
      {
        period: '1st half',
        statistics: [null, { type: 42, period: '1st half', value: 7 }],
      },
      {
        period: '1st half',
        statistics: [{ type: 'Shots on Goal (2nd Half)', value: 1 }],
      },
    ],
  };

  const result = filterFixtureStatisticsByPeriod(payload, 'first');
  assert.deepEqual(result, {
    response: [
      {
        period: '1st half',
        statistics: [{ type: 42, period: '1st half', value: 7 }],
      },
    ],
  });
});
