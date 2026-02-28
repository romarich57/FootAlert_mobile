import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPlayerStatsPath,
  buildTransferKey,
  isDateInSeason,
  mapTransferTeamPayload,
  normalizeTransferDate,
  toFiniteNumber,
  toSortedTransfers,
  toText,
  toTransferTimestamp,
} from '../../src/routes/competitions/transfersMapper.ts';

test('transfersMapper utilities normalize primitive values', () => {
  assert.equal(toFiniteNumber(12), 12);
  assert.equal(toFiniteNumber(Number.NaN), null);
  assert.equal(toFiniteNumber('12'), null);

  assert.equal(toText('  Paris   FC  '), 'Paris FC');
  assert.equal(toText('   ', 'fallback'), 'fallback');
  assert.equal(toText(10, 'fallback'), 'fallback');
});

test('transfersMapper date helpers handle explicit, parseable and invalid dates', () => {
  assert.equal(normalizeTransferDate('2025-08-15T10:00:00Z'), '2025-08-15');
  assert.equal(normalizeTransferDate('August 16, 2025 12:00:00 UTC'), '2025-08-16');
  assert.equal(normalizeTransferDate('not-a-date'), null);

  assert.equal(isDateInSeason('2025-07-01', 2025), true);
  assert.equal(isDateInSeason('2026-06-30T23:59:59Z', 2025), true);
  assert.equal(isDateInSeason('2026-07-01', 2025), false);
  assert.equal(isDateInSeason('invalid', 2025), false);
  assert.equal(isDateInSeason(null, 2025), false);

  assert.equal(toTransferTimestamp('2025-08-15'), new Date('2025-08-15').getTime());
  assert.equal(toTransferTimestamp('invalid-date'), Number.MIN_SAFE_INTEGER);
  assert.equal(toTransferTimestamp(null), Number.MIN_SAFE_INTEGER);
});

test('transfersMapper maps payloads and builds deterministic transfer keys', () => {
  assert.deepEqual(mapTransferTeamPayload({ id: 44, name: '  Olympique   Lyonnais ', logo: 'logo.png' }), {
    id: 44,
    name: 'Olympique Lyonnais',
    logo: 'logo.png',
  });
  assert.deepEqual(mapTransferTeamPayload({ id: 'bad', name: 7 }), {
    id: 0,
    name: '',
    logo: '',
  });

  const key = buildTransferKey({
    playerId: 9,
    playerName: '  Kylian   Mbappé ',
    transferType: 'Loan',
    teamInId: 0,
    teamInName: ' São   Paulo ',
    teamOutId: 0,
    teamOutName: ' Olympique   Lyonnais ',
    teamInInLeague: true,
    teamOutInLeague: false,
  });
  assert.equal(
    key,
    '9|kylian mbappe|loan|name:olympique lyonnais|name:sao paulo|1|0',
  );

  assert.equal(
    buildPlayerStatsPath('topscorers', '39', 2025),
    '/players/topscorers?league=39&season=2025',
  );
});

test('toSortedTransfers orders by newest transfer date first', () => {
  const transfers = new Map([
    [
      'older',
      {
        player: { id: 1, name: 'Older' },
        update: '2026-01-01',
        transfers: [{ date: '2025-08-01', type: 'Transfer', teams: { in: { id: 1, name: 'A', logo: '' }, out: { id: 2, name: 'B', logo: '' } } }],
        context: { teamInInLeague: true, teamOutInLeague: true },
      },
    ],
    [
      'newer',
      {
        player: { id: 2, name: 'Newer' },
        update: '2026-01-02',
        transfers: [{ date: '2025-09-01', type: 'Loan', teams: { in: { id: 3, name: 'C', logo: '' }, out: { id: 4, name: 'D', logo: '' } } }],
        context: { teamInInLeague: true, teamOutInLeague: false },
      },
    ],
    [
      'missing-date',
      {
        player: { id: 3, name: 'No Date' },
        update: '2026-01-03',
        transfers: [{ date: null as unknown as string, type: 'Transfer', teams: { in: { id: 5, name: 'E', logo: '' }, out: { id: 6, name: 'F', logo: '' } } }],
        context: { teamInInLeague: false, teamOutInLeague: true },
      },
    ],
  ]);

  const sorted = toSortedTransfers(transfers);
  assert.deepEqual(
    sorted.map(entry => entry.player.id),
    [2, 1, 3],
  );
});
