import { describe, expect, it } from 'vitest';

import { mapFixtureToScoreCard, mapFixturesToScoreCards } from './mapper';

describe('mapFixtureToScoreCard', () => {
  it('maps a valid API fixture payload to MatchScoreCard', () => {
    const input = {
      fixture: {
        id: 123,
        date: '2026-03-04T20:00:00+00:00',
        status: {
          short: 'FT',
        },
      },
      league: { name: 'Ligue 1' },
      teams: {
        home: { name: 'PSG' },
        away: { name: 'OM' },
      },
      goals: {
        home: 2,
        away: 1,
      },
    };

    expect(mapFixtureToScoreCard(input)).toEqual({
      fixtureId: '123',
      kickoffAt: '2026-03-04T20:00:00+00:00',
      statusShort: 'FT',
      leagueName: 'Ligue 1',
      homeTeamName: 'PSG',
      awayTeamName: 'OM',
      homeGoals: 2,
      awayGoals: 1,
    });
  });

  it('keeps null goals without crashing', () => {
    const input = {
      fixture: { id: '88', date: '2026-03-04T20:00:00+00:00', status: { short: 'NS' } },
      league: { name: 'Premier League' },
      teams: {
        home: { name: 'Arsenal' },
        away: { name: 'Liverpool' },
      },
      goals: { home: null, away: null },
    };

    const result = mapFixtureToScoreCard(input);
    expect(result?.homeGoals).toBeNull();
    expect(result?.awayGoals).toBeNull();
  });

  it('returns null when required fields are missing', () => {
    expect(mapFixtureToScoreCard({ foo: 'bar' })).toBeNull();
    expect(mapFixtureToScoreCard(null)).toBeNull();
  });
});

describe('mapFixturesToScoreCards', () => {
  it('filters invalid fixtures from arrays', () => {
    const result = mapFixturesToScoreCards([
      {
        fixture: { id: 1, date: '2026-03-04T20:00:00+00:00', status: { short: 'FT' } },
        league: { name: 'Liga' },
        teams: { home: { name: 'A' }, away: { name: 'B' } },
        goals: { home: 1, away: 0 },
      },
      { invalid: true },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].fixtureId).toBe('1');
  });
});
