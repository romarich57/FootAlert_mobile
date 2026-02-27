import { applyLiveStandingsProjection } from '@ui/features/matches/details/utils/matchStandingsProjection';
import type { ApiFootballFixtureDto } from '@ui/features/matches/types/matches.types';

const baseFixture: ApiFootballFixtureDto = {
  fixture: {
    id: 101,
    date: '2026-02-26T20:00:00.000Z',
    status: {
      short: '1H',
      long: 'First Half',
      elapsed: 34,
    },
    venue: {
      name: 'Stadium',
      city: 'Paris',
    },
  },
  league: {
    id: 61,
    name: 'League',
    country: 'FR',
    logo: '',
    season: 2025,
  },
  teams: {
    home: {
      id: 2,
      name: 'Home',
      logo: '',
    },
    away: {
      id: 3,
      name: 'Away',
      logo: '',
    },
  },
  goals: {
    home: 1,
    away: 0,
  },
};

describe('applyLiveStandingsProjection', () => {
  it('updates points and re-ranks standings during live state', () => {
    const rows = [
      { teamId: '1', rank: 1, points: 40, goalDiff: 20, teamName: 'A' },
      { teamId: '2', rank: 2, points: 39, goalDiff: 15, teamName: 'B' },
      { teamId: '3', rank: 3, points: 39, goalDiff: 12, teamName: 'C' },
    ].map(r => ({ ...r, played: 10, update: null, all: {} as any, home: {} as any, away: {} as any }));

    const projected = applyLiveStandingsProjection({
      rows,
      lifecycleState: 'live',
      fixture: baseFixture,
      homeTeamId: '2',
      awayTeamId: '3',
    });

    expect(projected[0].teamId).toBe('2');
    expect(projected[0].points).toBe(42);
    expect(projected[0].rank).toBe(1);

    expect(projected[1].teamId).toBe('1');
    expect(projected[1].points).toBe(40);
    expect(projected[1].rank).toBe(2);

    expect(projected[2].teamId).toBe('3');
    expect(projected[2].points).toBe(39);
    expect(projected[2].rank).toBe(3);
  });

  it('returns rows unchanged when match is not live', () => {
    const rows = [
      { teamId: '1', rank: 1, points: 40, goalDiff: 20 },
      { teamId: '2', rank: 2, points: 39, goalDiff: 15 },
    ].map(r => ({ ...r, played: 10, update: null, all: {} as any, home: {} as any, away: {} as any }));

    const projected = applyLiveStandingsProjection({
      rows,
      lifecycleState: 'finished',
      fixture: baseFixture,
      homeTeamId: '2',
      awayTeamId: '3',
    });

    expect(projected).toEqual(rows);
  });
});
