import {
  buildEvents,
  buildStatRows,
  mergeLineupStats,
} from '@ui/features/matches/details/components/tabs/shared/matchDetailsSelectors';
import type { MatchLineupTeam } from '@ui/features/matches/types/matches.types';

describe('matchDetailsSelectors', () => {
  it('buildEvents maps API events to timeline rows', () => {
    const rows = buildEvents(
      [
        {
          time: { elapsed: 78, extra: null },
          team: { id: 1 },
          player: { name: 'Kylian Mbappe' },
          assist: { name: 'O. Dembele' },
          type: 'Goal',
          detail: 'Left footed shot',
        },
      ],
      '1',
      '2',
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      minute: "78'",
      team: 'home',
      detail: 'Left footed shot',
      isNew: true,
    });
    expect(rows[0]?.label).toContain('Goal · Kylian Mbappe');
  });

  it('buildStatRows builds stat percentages for home/away', () => {
    const rows = buildStatRows([
      {
        statistics: [
          { type: 'Shots on Goal', value: '10' },
          { type: 'Ball Possession', value: '60%' },
        ],
      },
      {
        statistics: [
          { type: 'Shots on Goal', value: '5' },
          { type: 'Ball Possession', value: '40%' },
        ],
      },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      key: 'shots_on_goal',
      homeValue: '10',
      awayValue: '5',
    });
    expect(rows[0]?.homePercent).toBeCloseTo(66.67, 1);
    expect(rows[0]?.awayPercent).toBeCloseTo(33.33, 1);
  });

  it('buildStatRows keeps only supported metrics and only rows with available values', () => {
    const rows = buildStatRows([
      {
        statistics: [
          { type: 'Unsupported metric', value: 10 },
          { type: 'Shots outside box', value: '' },
          { type: 'Corner Kicks', value: 6 },
        ],
      },
      {
        statistics: [
          { type: 'Unsupported metric', value: 12 },
          { type: 'Corner Kicks', value: 3 },
        ],
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      metricKey: 'corner_kicks',
      section: 'other',
      labelKey: 'matchDetails.stats.labels.cornerKicks',
      homeValue: '6',
      awayValue: '3',
    });
  });

  it('mergeLineupStats enriches lineup players with live stats', () => {
    const lineupTeams: MatchLineupTeam[] = [
      {
        teamId: '1',
        teamName: 'Home',
        teamLogo: null,
        formation: '4-3-3',
        coach: 'Coach A',
        startingXI: [{ id: '10', name: 'Starter', number: 10, position: 'F', grid: '1:1' }],
        substitutes: [{ id: '11', name: 'Sub', number: 14, position: 'M', grid: '0:0' }],
        reserves: [],
        absences: [],
      },
    ];

    const homePlayersStats = [
      {
        players: [
          {
            player: { id: 10 },
            statistics: [
              {
                games: { rating: '7.2' },
                goals: { total: 1, assists: 0 },
                cards: { yellow: 0, red: 0 },
                substitutes: { in: null, out: null },
              },
            ],
          },
          {
            player: { id: 11 },
            statistics: [
              {
                games: { rating: '6.9' },
                goals: { total: 0, assists: 1 },
                cards: { yellow: 1, red: 0 },
                substitutes: { in: 72, out: null },
              },
            ],
          },
        ],
      },
    ];

    const events = [
      {
        time: { elapsed: 72 },
        type: 'subst',
        player: { id: 11, name: 'Sub' },
        assist: { id: 10, name: 'Starter' },
      },
    ];

    const merged = mergeLineupStats(lineupTeams, homePlayersStats, [], events);

    expect(merged[0]?.startingXI[0]).toMatchObject({
      rating: 7.2,
      goals: 1,
      assists: 0,
      outMinute: 72,
    });
    expect(merged[0]?.substitutes[0]).toMatchObject({
      rating: 6.9,
      assists: 1,
      yellowCards: 1,
      inMinute: 72,
    });
  });
});
