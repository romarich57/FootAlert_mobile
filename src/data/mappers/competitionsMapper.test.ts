import {
  mapPlayerStatsDtoToPlayerStats,
  mapTransfersDtoToCompetitionTransfers,
} from '@data/mappers/competitionsMapper';
import type { CompetitionsApiTransferDto } from '@ui/features/competitions/types/competitions.types';

describe('competitionsMapper transfers', () => {
  it('maps, deduplicates and sorts transfers with direction flags', () => {
    const payload: CompetitionsApiTransferDto[] = [
      {
        player: { id: 10, name: 'Player A' },
        update: '2026-01-01',
        context: {
          teamInInLeague: true,
          teamOutInLeague: false,
        },
        transfers: [
          {
            date: '2025-08-10',
            type: 'Loan',
            teams: {
              in: { id: 1, name: 'Team In', logo: 'in.png' },
              out: { id: 50, name: 'Team Out', logo: 'out.png' },
            },
          },
        ],
      },
      {
        player: { id: 20, name: 'Player B' },
        update: '2026-01-01',
        context: {
          teamInInLeague: true,
          teamOutInLeague: true,
        },
        transfers: [
          {
            date: '2025-09-10',
            type: 'Transfer',
            teams: {
              in: { id: 2, name: 'Team In 2', logo: 'in2.png' },
              out: { id: 3, name: 'Team Out 2', logo: 'out2.png' },
            },
          },
        ],
      },
      // Duplicate transfer that should be removed by mapper key.
      {
        player: { id: 10, name: 'Player A' },
        update: '2026-01-01',
        context: {
          teamInInLeague: true,
          teamOutInLeague: false,
        },
        transfers: [
          {
            date: '2025-08-10',
            type: 'Loan',
            teams: {
              in: { id: 1, name: 'Team In', logo: 'in.png' },
              out: { id: 50, name: 'Team Out', logo: 'out.png' },
            },
          },
        ],
      },
    ];

    const mapped = mapTransfersDtoToCompetitionTransfers(payload, 2025);

    expect(mapped).toHaveLength(2);
    expect(mapped[0]?.playerId).toBe(20);
    expect(mapped[0]?.direction).toBe('internal');
    expect(mapped[0]?.isArrival).toBe(true);
    expect(mapped[0]?.isDeparture).toBe(true);

    expect(mapped[1]?.playerId).toBe(10);
    expect(mapped[1]?.direction).toBe('arrival');
    expect(mapped[1]?.isArrival).toBe(true);
    expect(mapped[1]?.isDeparture).toBe(false);
  });

  it('keeps only transfers in selected season boundaries', () => {
    const payload: CompetitionsApiTransferDto[] = [
      {
        player: { id: 99, name: 'Player Season' },
        update: '2026-01-01',
        context: {
          teamInInLeague: true,
          teamOutInLeague: false,
        },
        transfers: [
          {
            date: '2025-06-30',
            type: 'Transfer',
            teams: {
              in: { id: 1, name: 'In', logo: '' },
              out: { id: 2, name: 'Out', logo: '' },
            },
          },
          {
            date: '2025-07-01',
            type: 'Transfer',
            teams: {
              in: { id: 1, name: 'In', logo: '' },
              out: { id: 2, name: 'Out', logo: '' },
            },
          },
          {
            date: '2026-06-30',
            type: 'Transfer',
            teams: {
              in: { id: 3, name: 'In 2', logo: '' },
              out: { id: 4, name: 'Out 2', logo: '' },
            },
          },
          {
            date: '2026-07-01',
            type: 'Transfer',
            teams: {
              in: { id: 1, name: 'In', logo: '' },
              out: { id: 2, name: 'Out', logo: '' },
            },
          },
        ],
      },
    ];

    const mapped = mapTransfersDtoToCompetitionTransfers(payload, 2025);

    expect(mapped).toHaveLength(2);
    expect(mapped.map(item => item.date)).toEqual(['2026-06-30', '2025-07-01']);
  });

  it('deduplicates league transfers when same transfer appears with date/type formatting variants', () => {
    const payload: CompetitionsApiTransferDto[] = [
      {
        player: { id: 111, name: 'Marquinhos' },
        update: '2026-01-01',
        context: {
          teamInInLeague: true,
          teamOutInLeague: false,
        },
        transfers: [
          {
            date: '2025-07-29',
            type: 'Return from loan',
            teams: {
              in: { id: 42, name: 'Arsenal', logo: 'a.png' },
              out: { id: 160, name: 'Cruzeiro', logo: 'c.png' },
            },
          },
          {
            date: '2025-07-29T00:00:00+00:00',
            type: 'Return   from loan',
            teams: {
              in: { id: 42, name: ' Arsenal ', logo: 'a.png' },
              out: { id: 160, name: 'Cruzeiro', logo: 'c.png' },
            },
          },
        ],
      },
    ];

    const mapped = mapTransfersDtoToCompetitionTransfers(payload, 2025);

    expect(mapped).toHaveLength(1);
    expect(mapped[0]?.playerId).toBe(111);
    expect(mapped[0]?.teamIn.id).toBe(42);
    expect(mapped[0]?.teamOut.id).toBe(160);
  });

  it('deduplicates one-day-apart duplicates and keeps the most recent transfer date', () => {
    const payload: CompetitionsApiTransferDto[] = [
      {
        player: { id: 2032, name: 'J. Strand Larsen' },
        update: '2026-01-01',
        context: {
          teamInInLeague: false,
          teamOutInLeague: true,
        },
        transfers: [
          {
            date: '2026-02-01',
            type: 'Transfer',
            teams: {
              in: { id: 52, name: 'Crystal Palace', logo: 'cp.png' },
              out: { id: 39, name: 'Wolves', logo: 'wolves.png' },
            },
          },
          {
            date: '2026-01-31',
            type: 'Transfer',
            teams: {
              in: { id: 52, name: 'Crystal Palace', logo: 'cp.png' },
              out: { id: 39, name: 'Wolves', logo: 'wolves.png' },
            },
          },
        ],
      },
    ];

    const mapped = mapTransfersDtoToCompetitionTransfers(payload, 2025);

    expect(mapped).toHaveLength(1);
    expect(mapped[0]?.date).toBe('2026-02-01');
    expect(mapped[0]?.teamIn.id).toBe(52);
    expect(mapped[0]?.teamOut.id).toBe(39);
  });

  it('selects player stats from the requested season when multiple statistics rows exist', () => {
    const mapped = mapPlayerStatsDtoToPlayerStats(
      [
        {
          player: {
            id: 77,
            name: 'Player Multi',
            firstname: 'Player',
            lastname: 'Multi',
            age: 27,
            nationality: 'FR',
            height: null,
            weight: null,
            injured: false,
            photo: 'p77.png',
          },
          statistics: [
            {
              team: { id: 100, name: 'Old Team', logo: 'old.png' },
              league: { id: 39, name: 'Premier League', country: 'England', logo: '', flag: null, season: 2024 },
              games: {
                appearences: 18,
                lineups: 18,
                minutes: 1600,
                number: null,
                position: 'Midfielder',
                rating: '7.2',
                captain: false,
              },
              substitutes: null,
              shots: { total: 20, on: 8 },
              goals: { total: 4, conceded: null, assists: 6, saves: null },
              passes: { total: 900, key: 40, accuracy: 89 },
              tackles: { total: 20, blocks: 3, interceptions: 10 },
              duels: { total: 100, won: 55 },
              dribbles: { attempts: 40, success: 20, past: null },
              fouls: { drawn: 15, committed: 12 },
              cards: { yellow: 2, yellowred: 0, red: 0 },
              penalty: { won: 1, commited: null, scored: 0, missed: 0, saved: null },
            },
            {
              team: { id: 200, name: 'Current Team', logo: 'current.png' },
              league: { id: 39, name: 'Premier League', country: 'England', logo: '', flag: null, season: 2025 },
              games: {
                appearences: 26,
                lineups: 26,
                minutes: 2300,
                number: null,
                position: 'Attacker',
                rating: '7.9',
                captain: false,
              },
              substitutes: null,
              shots: { total: 42, on: 20 },
              goals: { total: 15, conceded: null, assists: 7, saves: null },
              passes: { total: 700, key: 45, accuracy: 84 },
              tackles: { total: 9, blocks: 0, interceptions: 2 },
              duels: { total: 120, won: 62 },
              dribbles: { attempts: 70, success: 34, past: null },
              fouls: { drawn: 24, committed: 17 },
              cards: { yellow: 3, yellowred: 0, red: 1 },
              penalty: { won: 2, commited: null, scored: 3, missed: 0, saved: null },
            },
          ],
        },
      ],
      2025,
    );

    expect(mapped).toHaveLength(1);
    expect(mapped[0]?.playerId).toBe(77);
    expect(mapped[0]?.teamId).toBe(200);
    expect(mapped[0]?.teamName).toBe('Current Team');
    expect(mapped[0]?.position).toBe('Attacker');
    expect(mapped[0]?.goals).toBe(15);
    expect(mapped[0]?.assists).toBe(7);
    expect(mapped[0]?.yellowCards).toBe(3);
    expect(mapped[0]?.redCards).toBe(1);
  });
});
