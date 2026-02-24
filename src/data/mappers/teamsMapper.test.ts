import {
  mapFixtureToTeamMatch,
  mapFixturesToTeamMatches,
  mapPlayersToTopPlayers,
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

  it('deduplicates repeated transfers with same player/date/type/source/target', () => {
    const data = [
      {
        player: { id: 111, name: 'Marquinhos' },
        transfers: [
          {
            date: '2025-07-29',
            type: 'Return from loan',
            teams: {
              in: { id: 42, name: 'Arsenal' },
              out: { id: 160, name: 'Cruzeiro' },
            },
          },
          {
            date: '2025-07-29',
            type: 'Return from loan',
            teams: {
              in: { id: 42, name: 'Arsenal' },
              out: { id: 160, name: 'Cruzeiro' },
            },
          },
        ],
      },
      {
        player: { id: 111, name: 'Marquinhos' },
        transfers: [
          {
            date: '2025-07-29',
            type: 'Return from loan',
            teams: {
              in: { id: 42, name: 'Arsenal' },
              out: { id: 160, name: 'Cruzeiro' },
            },
          },
        ],
      },
    ];

    const mapped = mapTransfersToTeamTransfers(data, '42', 2025);

    expect(mapped.arrivals).toHaveLength(1);
    expect(mapped.departures).toHaveLength(0);
    expect(mapped.arrivals[0].playerName).toBe('Marquinhos');
    expect(mapped.arrivals[0].type).toBe('Return from loan');
  });

  it('deduplicates transfers when API uses different date formats for the same day', () => {
    const data = [
      {
        player: { id: 111, name: 'Marquinhos' },
        transfers: [
          {
            date: '2025-07-29',
            type: 'Return from loan',
            teams: {
              in: { id: 42, name: 'Arsenal' },
              out: { id: 160, name: 'Cruzeiro' },
            },
          },
          {
            date: '2025-07-29T00:00:00+00:00',
            type: 'Return   from loan',
            teams: {
              in: { id: 42, name: ' Arsenal ' },
              out: { id: 160, name: 'Cruzeiro' },
            },
          },
        ],
      },
    ];

    const mapped = mapTransfersToTeamTransfers(data, '42', 2025);

    expect(mapped.arrivals).toHaveLength(1);
    expect(mapped.departures).toHaveLength(0);
  });

  it('selects top player stats using season/league/team context instead of first statistics row', () => {
    const mapped = mapPlayersToTopPlayers(
      [
        {
          player: { id: 11, name: 'Player A', photo: 'a.png' },
          statistics: [
            {
              team: { id: 999, name: 'Old Team' },
              league: { id: 39, season: 2025 },
              games: { position: 'Midfielder', rating: '6.9', minutes: 700, appearences: 11 },
              goals: { total: 2, assists: 1 },
            },
            {
              team: { id: 1, name: 'Target Team' },
              league: { id: 39, season: 2025 },
              games: { position: 'Attacker', rating: '7.8', minutes: 1500, appearences: 20 },
              goals: { total: 9, assists: 5 },
            },
          ],
        },
      ],
      8,
      { teamId: '1', leagueId: '39', season: 2025 },
    );

    expect(mapped).toHaveLength(1);
    expect(mapped[0]?.playerId).toBe('11');
    expect(mapped[0]?.position).toBe('Attacker');
    expect(mapped[0]?.goals).toBe(9);
    expect(mapped[0]?.assists).toBe(5);
    expect(mapped[0]?.rating).toBe(7.8);
  });
});
