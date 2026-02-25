import {
  mapFixtureToTeamMatch,
  mapFixturesToTeamMatches,
  mapPlayersToTopPlayers,
  mapPlayersToTopPlayersByCategory,
  mapStandingsToTeamData,
  mapTeamStatisticsToStats,
  mapTeamDetails,
  mapTeamLeaguesToCompetitionOptions,
  mapTransfersToTeamTransfers,
  mapTrophiesToTeamTrophies,
  resolveDefaultTeamSelection,
} from '@data/mappers/teamsMapper';

describe('teamsMapper', () => {
  it('maps team details with nulls when fields are missing', () => {
    const mapped = mapTeamDetails(null, '529');

    expect(mapped.id).toBe('529');
    expect(mapped.name).toBeNull();
    expect(mapped.venueName).toBeNull();
  });

  it('resolves default selection with league current season priority', () => {
    const options = mapTeamLeaguesToCompetitionOptions([
      {
        league: { id: 2, name: 'Champions League', type: 'Cup' },
        seasons: [{ year: 2025, current: true }],
      },
      {
        league: { id: 140, name: 'LaLiga', type: 'League' },
        seasons: [
          { year: 2024, current: false },
          { year: 2025, current: true },
        ],
      },
      {
        league: { id: 39, name: 'Premier League', type: 'League' },
        seasons: [{ year: 2025, current: false }],
      },
    ]);

    const selection = resolveDefaultTeamSelection(options);

    expect(selection.leagueId).toBe('140');
    expect(selection.season).toBe(2025);
  });

  it('falls back to the most recent league season when no current season exists', () => {
    const options = mapTeamLeaguesToCompetitionOptions([
      {
        league: { id: 200, name: 'Cup', type: 'Cup' },
        seasons: [{ year: 2026, current: false }],
      },
      {
        league: { id: 39, name: 'Premier League', type: 'League' },
        seasons: [{ year: 2024, current: false }],
      },
      {
        league: { id: 140, name: 'LaLiga', type: 'League' },
        seasons: [{ year: 2025, current: false }],
      },
    ]);

    const selection = resolveDefaultTeamSelection(options);

    expect(selection.leagueId).toBe('140');
    expect(selection.season).toBe(2025);
  });

  it('falls back to the most recent season overall when no league is available', () => {
    const options = mapTeamLeaguesToCompetitionOptions([
      {
        league: { id: 2, name: 'Champions League', type: 'Cup' },
        seasons: [{ year: 2024, current: false }],
      },
      {
        league: { id: 9, name: 'FA Cup', type: 'Cup' },
        seasons: [{ year: 2026, current: false }],
      },
    ]);

    const selection = resolveDefaultTeamSelection(options);

    expect(selection.leagueId).toBe('9');
    expect(selection.season).toBe(2026);
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

  it('keeps trophy competitions in API order while sorting placements inside each competition', () => {
    const mapped = mapTrophiesToTeamTrophies([
      { league: 'Premier League', country: 'England', place: 'Runner-up', season: '2024/25' },
      { league: 'Premier League', country: 'England', place: 'Winner', season: '2003/04' },
      { league: 'Premier League', country: 'England', place: 'Champion', season: '1937/38' },
      { league: 'FA Cup', country: 'England', place: 'Winner', season: '2020' },
      { league: 'Community Shield', country: 'England', place: 'Runner-up', season: '2017/18' },
      { league: 'FA Cup', country: 'England', place: 'Runner-up', season: '2019/20' },
    ]);

    expect(mapped.groups.map(group => group.competition)).toEqual([
      'Premier League',
      'FA Cup',
      'Community Shield',
    ]);

    expect(mapped.groups[0]?.placements.map(placement => placement.place)).toEqual([
      'champion',
      'runnerUp',
    ]);
  });

  it('merges winner/champion and runner-up/vice-champion with descending season order', () => {
    const mapped = mapTrophiesToTeamTrophies([
      { league: 'Test Cup', country: 'Europe', place: 'Champion', season: '1999/00' },
      { league: 'Test Cup', country: 'Europe', place: 'Winner', season: '2003/04' },
      { league: 'Test Cup', country: 'Europe', place: 'Winner', season: '2025' },
      { league: 'Test Cup', country: 'Europe', place: 'Vice-champion', season: '2024/25' },
      { league: 'Test Cup', country: 'Europe', place: 'Runner-up', season: '2001/02' },
    ]);

    expect(mapped.totalWins).toBe(3);
    expect(mapped.groups).toHaveLength(1);
    expect(mapped.groups[0]?.placements).toEqual([
      {
        place: 'champion',
        count: 3,
        seasons: ['2025', '2003/04', '1999/00'],
      },
      {
        place: 'runnerUp',
        count: 2,
        seasons: ['2024/25', '2001/02'],
      },
    ]);
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

  it('deduplicates one-day-apart duplicates and keeps the most recent date', () => {
    const data = [
      {
        player: { id: 2032, name: 'J. Strand Larsen' },
        transfers: [
          {
            date: '2026-01-31',
            type: 'Transfer',
            teams: {
              in: { id: 52, name: 'Crystal Palace' },
              out: { id: 39, name: 'Wolves' },
            },
          },
          {
            date: '2026-02-01',
            type: 'Transfer',
            teams: {
              in: { id: 52, name: 'Crystal Palace' },
              out: { id: 39, name: 'Wolves' },
            },
          },
        ],
      },
    ];

    const mapped = mapTransfersToTeamTransfers(data, '39', 2025);

    expect(mapped.arrivals).toHaveLength(0);
    expect(mapped.departures).toHaveLength(1);
    expect(mapped.departures[0]?.date).toBe('2026-02-01');
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

  it('maps venue points, per-match metrics and competition comparisons', () => {
    const standings = mapStandingsToTeamData(
      {
        league: {
          standings: [
            [
              {
                rank: 1,
                team: { id: 1, name: 'Team A', logo: 'a.png' },
                points: 60,
                all: { played: 24, goals: { for: 58, against: 20 } },
                home: { played: 12, win: 10, draw: 1, lose: 1, goals: { for: 30, against: 7 } },
                away: { played: 12, win: 9, draw: 2, lose: 1, goals: { for: 28, against: 13 } },
              },
              {
                rank: 2,
                team: { id: 2, name: 'Target', logo: 'b.png' },
                points: 54,
                all: { played: 24, goals: { for: 52, against: 19 } },
                home: { played: 11, win: 10, draw: 1, lose: 0, goals: { for: 30, against: 4 } },
                away: { played: 12, win: 7, draw: 2, lose: 3, goals: { for: 22, against: 15 } },
              },
              {
                rank: 3,
                team: { id: 3, name: 'Team C', logo: 'c.png' },
                points: 47,
                all: { played: 24, goals: { for: 45, against: 24 } },
                home: { played: 12, win: 8, draw: 3, lose: 1, goals: { for: 24, against: 8 } },
                away: { played: 12, win: 5, draw: 5, lose: 2, goals: { for: 21, against: 16 } },
              },
            ],
          ],
        },
      },
      '2',
    );

    const mapped = mapTeamStatisticsToStats(
      {
        fixtures: {
          played: { total: 24, home: 12, away: 12 },
          wins: { total: 17, home: 10, away: 7 },
          draws: { total: 3, home: 1, away: 2 },
          loses: { total: 4, home: 1, away: 3 },
          clean_sheet: { total: 10 },
          failed_to_score: { total: 4 },
        },
        goals: {
          for: {
            total: { total: 52, home: 30, away: 22 },
            average: { total: '2.2' },
          },
          against: {
            total: { total: 19, home: 4, away: 15 },
            average: { total: '0.8' },
          },
        },
      },
      standings,
      [],
      {
        ratings: [],
        scorers: [],
        assisters: [],
      },
      {
        metrics: {
          possession: {
            value: 61.2,
            rank: 2,
            totalTeams: 18,
            leaders: [
              { teamId: 1, teamName: 'Team A', teamLogo: 'a.png', value: 63.1 },
              { teamId: 2, teamName: 'Target', teamLogo: 'b.png', value: 61.2 },
            ],
          },
        },
      },
    );

    expect(mapped.pointsByVenue.home?.points).toBe(31);
    expect(mapped.pointsByVenue.home?.goalDiff).toBe(26);
    expect(mapped.pointsByVenue.away?.points).toBe(23);
    expect(mapped.goalsForPerMatch).toBe(2.2);
    expect(mapped.goalsAgainstPerMatch).toBe(0.8);
    expect(mapped.cleanSheets).toBe(10);
    expect(mapped.failedToScore).toBe(4);

    const possessionComparison = mapped.comparisonMetrics.find(metric => metric.key === 'possession');
    expect(possessionComparison?.rank).toBe(2);
    expect(possessionComparison?.totalTeams).toBe(18);

    const goalsConcededComparison = mapped.comparisonMetrics.find(
      metric => metric.key === 'goalsConcededPerMatch',
    );
    expect(goalsConcededComparison).toBeTruthy();
  });

  it('sorts player leaders by rating, goals and assists', () => {
    const categories = mapPlayersToTopPlayersByCategory(
      [
        {
          player: { id: 1, name: 'Player A', photo: 'a.png' },
          statistics: [
            {
              league: { id: 39, season: 2025 },
              team: { id: 529 },
              games: { rating: '7.90' },
              goals: { total: 8, assists: 2 },
            },
          ],
        },
        {
          player: { id: 2, name: 'Player B', photo: 'b.png' },
          statistics: [
            {
              league: { id: 39, season: 2025 },
              team: { id: 529 },
              games: { rating: '7.10' },
              goals: { total: 11, assists: 6 },
            },
          ],
        },
        {
          player: { id: 3, name: 'Player C', photo: 'c.png' },
          statistics: [
            {
              league: { id: 39, season: 2025 },
              team: { id: 529 },
              games: { rating: '7.75' },
              goals: { total: 5, assists: 7 },
            },
          ],
        },
      ],
      3,
      { teamId: '529', leagueId: '39', season: 2025 },
    );

    expect(categories.ratings[0]?.name).toBe('Player A');
    expect(categories.scorers[0]?.name).toBe('Player B');
    expect(categories.assisters[0]?.name).toBe('Player C');
  });

  it('masks comparison metrics when source data is absent', () => {
    const mapped = mapTeamStatisticsToStats(
      null,
      { groups: [] },
      [],
      {
        ratings: [],
        scorers: [],
        assisters: [],
      },
      null,
    );

    expect(mapped.comparisonMetrics).toHaveLength(0);
    expect(mapped.goalBreakdown).toHaveLength(0);
  });
});
