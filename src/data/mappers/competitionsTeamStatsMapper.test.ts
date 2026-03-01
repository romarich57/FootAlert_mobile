import {
  buildCompetitionTeamStatsDashboardData,
  mapStandingRowsToComputedTeamStats,
  selectTopTeamsForAdvancedScope,
} from '@data/mappers/competitionsTeamStatsMapper';
import type {
  StandingGroup,
  StandingRow,
} from '@domain/contracts/competitions.types';
import type { TeamApiStatisticsDto } from '@domain/contracts/teams.types';

function createStandingRow(overrides: Partial<StandingRow> = {}): StandingRow {
  return {
    rank: 1,
    teamId: 1,
    teamName: 'Team 1',
    teamLogo: 'team-1.png',
    points: 30,
    goalsDiff: 10,
    played: 10,
    win: 6,
    draw: 2,
    lose: 2,
    goalsFor: 20,
    goalsAgainst: 10,
    group: 'League',
    form: 'WWDL',
    description: null,
    home: {
      played: 5,
      win: 4,
      draw: 1,
      lose: 0,
      goalsFor: 12,
      goalsAgainst: 3,
    },
    away: {
      played: 5,
      win: 2,
      draw: 1,
      lose: 2,
      goalsFor: 8,
      goalsAgainst: 7,
    },
    ...overrides,
  };
}

function createGroups(rows: StandingRow[]): StandingGroup[] {
  return [{ groupName: 'League', rows }];
}

describe('competitionsTeamStatsMapper', () => {
  it('computes quick metrics from standings formulas', () => {
    const [row] = mapStandingRowsToComputedTeamStats([createStandingRow()]);

    expect(row?.pointsPerMatch).toBe(3);
    expect(row?.winRate).toBe(60.0);
    expect(row?.goalsScoredPerMatch).toBe(2);
    expect(row?.goalsConcededPerMatch).toBe(1);
    expect(row?.goalDiffPerMatch).toBe(1);
    expect(row?.formIndex).toBe(7);
    expect(row?.formPointsPerMatch).toBe(1.75);
  });

  it('parses form with invalid characters ignored', () => {
    const [row] = mapStandingRowsToComputedTeamStats([
      createStandingRow({
        form: 'W-X?DLZ',
      }),
    ]);

    expect(row?.formIndex).toBe(4);
    expect(row?.formPointsPerMatch).toBe(1.33);
  });

  it('computes home/away metrics and deltas', () => {
    const [row] = mapStandingRowsToComputedTeamStats([createStandingRow()]);

    expect(row?.homePPG).toBe(2.6);
    expect(row?.awayPPG).toBe(1.4);
    expect(row?.homeGoalsFor).toBe(12);
    expect(row?.awayGoalsFor).toBe(8);
    expect(row?.homeGoalsAgainst).toBe(3);
    expect(row?.awayGoalsAgainst).toBe(7);
    expect(row?.deltaHomeAwayPPG).toBe(1.2);
    expect(row?.deltaHomeAwayGoalsFor).toBe(4);
    expect(row?.deltaHomeAwayGoalsAgainst).toBe(4);
  });

  it('sorts leaderboards with metric-specific orders', () => {
    const dashboard = buildCompetitionTeamStatsDashboardData(
      createGroups([
        createStandingRow({ teamId: 1, teamName: 'Alpha', played: 10, points: 24, goalsAgainst: 10 }),
        createStandingRow({ teamId: 2, teamName: 'Beta', played: 10, points: 30, goalsAgainst: 15 }),
        createStandingRow({ teamId: 3, teamName: 'Gamma', played: 10, points: 18, goalsAgainst: 5 }),
      ]),
    );

    const pointsPerMatch = dashboard.summary.leaderboards.pointsPerMatch.items;
    const goalsConcededPerMatch = dashboard.summary.leaderboards.goalsConcededPerMatch.items;

    expect(pointsPerMatch[0]?.teamName).toBe('Beta');
    expect(goalsConcededPerMatch[0]?.teamName).toBe('Gamma');
  });

  it('excludes teams with invalid division values from ranking', () => {
    const dashboard = buildCompetitionTeamStatsDashboardData(
      createGroups([
        createStandingRow({ teamId: 1, teamName: 'Zero Played', played: 0 }),
        createStandingRow({ teamId: 2, teamName: 'Valid Team', played: 8, points: 16 }),
      ]),
    );

    const pointsPerMatch = dashboard.summary.leaderboards.pointsPerMatch.items;

    expect(pointsPerMatch).toHaveLength(1);
    expect(pointsPerMatch[0]?.teamName).toBe('Valid Team');
  });

  it('builds advanced scope on top 10 teams sorted by points, goal diff, then goals for', () => {
    const rows = Array.from({ length: 12 }, (_, index) =>
      createStandingRow({
        teamId: index + 1,
        teamName: `Team ${index + 1}`,
        points: 40 - index,
        goalsDiff: 20 - index,
        goalsFor: 30 - index,
      }),
    );

    rows[1] = createStandingRow({ teamId: 2, teamName: 'Tie A', points: 32, goalsDiff: 8, goalsFor: 20 });
    rows[2] = createStandingRow({ teamId: 3, teamName: 'Tie B', points: 32, goalsDiff: 10, goalsFor: 18 });
    rows[3] = createStandingRow({ teamId: 4, teamName: 'Tie C', points: 32, goalsDiff: 10, goalsFor: 21 });

    const selected = selectTopTeamsForAdvancedScope(mapStandingRowsToComputedTeamStats(rows));

    expect(selected).toHaveLength(10);
    expect(selected[0]?.teamName).toBe('Team 1');

    const tieSegment = selected
      .filter(team => team.teamName.startsWith('Tie'))
      .map(team => team.teamName);
    expect(tieSegment).toEqual(['Tie C', 'Tie B', 'Tie A']);
  });

  it('maps advanced payload including goal minute breakdown', () => {
    const statistics: TeamApiStatisticsDto = {
      fixtures: {
        clean_sheet: { total: 9 },
        failed_to_score: { total: 3 },
      },
      goals: {
        for: {
          minute: {
            '0-15': { total: 4 },
            '31-45': { total: 7 },
            '76-90': { total: 5 },
          },
        },
      },
    };

    const dashboard = buildCompetitionTeamStatsDashboardData(createGroups([createStandingRow()]), [
      {
        teamId: 1,
        statistics,
        advanced: {
          metrics: {
            expectedGoalsPerMatch: { value: 1.91 },
            possession: { value: 58.3 },
            shotsPerMatch: { value: 14.2 },
            shotsOnTargetPerMatch: { value: 5.1 },
          },
        },
      },
    ]);

    expect(dashboard.advanced.rows[0]?.cleanSheets).toBe(9);
    expect(dashboard.advanced.rows[0]?.failedToScore).toBe(3);
    expect(dashboard.advanced.rows[0]?.xGPerMatch).toBe(1.91);
    expect(dashboard.advanced.rows[0]?.goalMinuteBreakdown.find(slot => slot.key === '31-45')?.value).toBe(7);
    expect(dashboard.advanced.leaderboards.possession.items[0]?.value).toBe(58.3);
  });

  it('handles played=0 and missing advanced metrics without crashing', () => {
    const dashboard = buildCompetitionTeamStatsDashboardData(
      createGroups([
        createStandingRow({ teamId: 1, teamName: 'No Games', played: 0 }),
        createStandingRow({ teamId: 2, teamName: 'Normal Team', played: 10 }),
      ]),
      [
        {
          teamId: 1,
          statistics: null,
          advanced: null,
        },
      ],
    );

    const noGamesRow = mapStandingRowsToComputedTeamStats([
      createStandingRow({ played: 0, points: 0, goalsFor: 0, goalsAgainst: 0, goalsDiff: 0 }),
    ])[0];

    expect(noGamesRow?.pointsPerMatch).toBeNull();
    expect(noGamesRow?.winRate).toBeNull();
    expect(dashboard.advanced.unavailableMetrics).toContain('xGPerMatch');
  });
});
