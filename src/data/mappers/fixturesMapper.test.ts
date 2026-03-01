import { mapFixturesToSections } from './fixturesMapper';
import type { ApiFootballFixtureDto } from '@domain/contracts/matches.types';

type BuildFixtureParams = {
  fixtureId: number;
  leagueId: number;
  leagueName: string;
  date: string;
};

function buildFixture({
  fixtureId,
  leagueId,
  leagueName,
  date,
}: BuildFixtureParams): ApiFootballFixtureDto {
  return {
    fixture: {
      id: fixtureId,
      date,
      status: {
        short: 'NS',
        long: 'Not Started',
        elapsed: null,
      },
      venue: {
        name: 'Stadium',
      },
    },
    league: {
      id: leagueId,
      name: leagueName,
      country: 'Country',
      logo: 'https://example.com/league.png',
    },
    teams: {
      home: {
        id: 1,
        name: 'Home FC',
        logo: 'https://example.com/home.png',
      },
      away: {
        id: 2,
        name: 'Away FC',
        logo: 'https://example.com/away.png',
      },
    },
    goals: {
      home: null,
      away: null,
    },
  };
}

describe('fixturesMapper', () => {
  it('prioritizes top competitions before non-top competitions', () => {
    const sections = mapFixturesToSections([
      buildFixture({
        fixtureId: 1,
        leagueId: 200,
        leagueName: 'Zeta League',
        date: '2026-02-20T20:00:00+00:00',
      }),
      buildFixture({
        fixtureId: 2,
        leagueId: 39,
        leagueName: 'Premier League',
        date: '2026-02-20T20:00:00+00:00',
      }),
      buildFixture({
        fixtureId: 3,
        leagueId: 61,
        leagueName: 'Ligue 1',
        date: '2026-02-20T20:00:00+00:00',
      }),
    ]);

    expect(sections.map(section => section.id)).toEqual(['61', '39', '200']);
    expect(sections[0]?.isTopCompetition).toBe(true);
    expect(sections[1]?.isTopCompetition).toBe(true);
    expect(sections[2]?.isTopCompetition).toBe(false);
  });

  it('marks competition as top from fallback name when id is unknown', () => {
    const sections = mapFixturesToSections([
      buildFixture({
        fixtureId: 10,
        leagueId: 9999,
        leagueName: 'UEFA Champions League',
        date: '2026-02-21T20:00:00+00:00',
      }),
    ]);

    expect(sections[0]?.isTopCompetition).toBe(true);
  });

  it('sorts matches by start date inside each competition section', () => {
    const sections = mapFixturesToSections([
      buildFixture({
        fixtureId: 100,
        leagueId: 39,
        leagueName: 'Premier League',
        date: '2026-02-21T22:00:00+00:00',
      }),
      buildFixture({
        fixtureId: 101,
        leagueId: 39,
        leagueName: 'Premier League',
        date: '2026-02-21T18:00:00+00:00',
      }),
    ]);

    expect(sections).toHaveLength(1);
    expect(sections[0]?.matches.map(match => match.fixtureId)).toEqual(['101', '100']);
  });
});
