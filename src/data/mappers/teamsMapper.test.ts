import {
  mapFixtureToTeamMatch,
  mapFixturesToTeamMatches,
  mapTeamDetails,
  mapTeamLeaguesToCompetitionOptions,
  mapTransfersToTeamTransfers,
  resolveDefaultTeamSelection,
} from '@data/mappers/teamsMapper';

describe('teamsMapper', () => {
  it('maps team details with nulls when fields are missing', () => {
    const mapped = mapTeamDetails(null, '529');

    expect(mapped.id).toBe('529');
    expect(mapped.name).toBeNull();
    expect(mapped.venueName).toBeNull();
  });

  it('resolves default selection from current season first', () => {
    const options = mapTeamLeaguesToCompetitionOptions([
      {
        league: { id: 140, name: 'LaLiga' },
        seasons: [
          { year: 2024, current: false },
          { year: 2025, current: true },
        ],
      },
      {
        league: { id: 39, name: 'Premier League' },
        seasons: [{ year: 2025, current: false }],
      },
    ]);

    const selection = resolveDefaultTeamSelection(options);

    expect(selection.leagueId).toBe('140');
    expect(selection.season).toBe(2025);
  });

  it('classifies fixtures into upcoming/live/past buckets', () => {
    const fixtures = [
      {
        fixture: { id: 1, date: '2026-02-20T20:00:00+00:00', status: { short: 'NS' } },
        league: { id: 140, name: 'LaLiga' },
        teams: { home: { id: 1, name: 'A' }, away: { id: 2, name: 'B' } },
        goals: { home: null, away: null },
      },
      {
        fixture: { id: 2, date: '2026-02-19T20:00:00+00:00', status: { short: 'LIVE' } },
        league: { id: 140, name: 'LaLiga' },
        teams: { home: { id: 1, name: 'A' }, away: { id: 2, name: 'B' } },
        goals: { home: 1, away: 0 },
      },
      {
        fixture: { id: 3, date: '2026-02-18T20:00:00+00:00', status: { short: 'FT' } },
        league: { id: 140, name: 'LaLiga' },
        teams: { home: { id: 1, name: 'A' }, away: { id: 2, name: 'B' } },
        goals: { home: 2, away: 1 },
      },
    ];

    const mapped = mapFixturesToTeamMatches(fixtures);

    expect(mapped.upcoming).toHaveLength(1);
    expect(mapped.live).toHaveLength(1);
    expect(mapped.past).toHaveLength(1);
    expect(mapFixtureToTeamMatch(fixtures[0]).status).toBe('upcoming');
  });

  it('maps transfers by direction and filters by season', () => {
    const data = [
      {
        player: { id: 7, name: 'Jules Kounde' },
        transfers: [
          {
            date: '2025-07-20',
            type: 'Loan',
            teams: {
              in: { id: 529, name: 'Barcelona' },
              out: { id: 40, name: 'Liverpool' },
            },
          },
          {
            date: '2023-01-11',
            type: 'Transfer',
            teams: {
              in: { id: 40, name: 'Liverpool' },
              out: { id: 529, name: 'Barcelona' },
            },
          },
        ],
      },
    ];

    const mapped = mapTransfersToTeamTransfers(data, '529', 2025);

    expect(mapped.arrivals).toHaveLength(1);
    expect(mapped.departures).toHaveLength(0);
    expect(mapped.arrivals[0].direction).toBe('arrival');
  });
});
