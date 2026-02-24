import {
  mapPlayerDetailsToSeasonStats,
  mapPlayerMatchPerformance,
} from '@data/mappers/playersMapper';
import type { PlayerApiDetailsDto } from '@ui/features/players/types/players.types';

function buildDetails(
  statistics: NonNullable<PlayerApiDetailsDto['statistics']>,
): PlayerApiDetailsDto {
  return {
    player: {
      id: 9,
      name: 'Player Test',
    },
    statistics,
  };
}

describe('playersMapper season stats aggregation', () => {
  it('aggregates all rows for the selected season', () => {
    const dto = buildDetails([
      {
        league: { season: 2025 },
        games: { appearences: 10, lineups: 8, minutes: 900, rating: '7.0' },
        goals: { total: 5, assists: 2 },
        shots: { total: 30, on: 15 },
        passes: { total: 300, accuracy: 80 },
        tackles: { total: 20, interceptions: 10 },
        cards: { yellow: 2, red: 0 },
      },
      {
        league: { season: 2025 },
        games: { appearences: 5, lineups: 3, minutes: 400, rating: '7.5' },
        goals: { total: 1, assists: 1 },
        shots: { total: 10, on: 4 },
        passes: { total: 200, accuracy: 90 },
        tackles: { total: 8, interceptions: 3 },
        cards: { yellow: 1, red: 1 },
      },
      {
        league: { season: 2024 },
        games: { appearences: 20, lineups: 20, minutes: 1800, rating: '8.5' },
        goals: { total: 20, assists: 10 },
        shots: { total: 70, on: 40 },
        passes: { total: 900, accuracy: 92 },
        tackles: { total: 30, interceptions: 20 },
        cards: { yellow: 4, red: 0 },
      },
    ]);

    const mapped = mapPlayerDetailsToSeasonStats(dto, 2025);

    expect(mapped).toEqual({
      matches: 15,
      starts: 11,
      minutes: 1300,
      goals: 6,
      assists: 3,
      rating: '7.15',
      shots: 40,
      shotsOnTarget: 19,
      penaltyGoals: null,
      passes: 500,
      passesAccuracy: 84,
      keyPasses: null,
      dribblesAttempts: null,
      dribblesSuccess: null,
      tackles: 28,
      interceptions: 13,
      blocks: null,
      duelsTotal: null,
      duelsWon: null,
      foulsCommitted: null,
      foulsDrawn: null,
      yellowCards: 3,
      redCards: 1,
      dribblesBeaten: null,
      saves: null,
      goalsConceded: null,
      penaltiesWon: null,
      penaltiesMissed: null,
      penaltiesCommitted: null,
    });
  });

  it('returns null stats when no statistics are available', () => {
    const mapped = mapPlayerDetailsToSeasonStats({ player: { id: 9 } }, 2025);

    expect(mapped).toEqual({
      matches: null,
      starts: null,
      minutes: null,
      goals: null,
      assists: null,
      rating: null,
      shots: null,
      shotsOnTarget: null,
      penaltyGoals: null,
      passes: null,
      passesAccuracy: null,
      keyPasses: null,
      dribblesAttempts: null,
      dribblesSuccess: null,
      tackles: null,
      interceptions: null,
      blocks: null,
      duelsTotal: null,
      duelsWon: null,
      foulsCommitted: null,
      foulsDrawn: null,
      yellowCards: null,
      redCards: null,
      dribblesBeaten: null,
      saves: null,
      goalsConceded: null,
      penaltiesWon: null,
      penaltiesMissed: null,
      penaltiesCommitted: null,
    });
  });

  it('falls back to available statistics if requested season is missing', () => {
    const dto = buildDetails([
      {
        league: { season: 2024 },
        games: { appearences: 12, lineups: 10, minutes: 1000, rating: '7.8' },
        goals: { total: 7, assists: 2 },
        shots: { total: 25, on: 12 },
        passes: { total: 400, accuracy: 88 },
        tackles: { total: 11, interceptions: 6 },
        cards: { yellow: 3, red: 0 },
      },
    ]);

    const mapped = mapPlayerDetailsToSeasonStats(dto, 2025);

    expect(mapped.matches).toBe(12);
    expect(mapped.goals).toBe(7);
    expect(mapped.assists).toBe(2);
    expect(mapped.rating).toBe('7.80');
    expect(mapped.passesAccuracy).toBe(88);
  });

  it('selects best match statistic row when multiple statistics exist for a player', () => {
    const mapped = mapPlayerMatchPerformance(
      '9',
      {
        fixture: { id: 1001, date: '2026-02-20T20:00:00Z' },
        league: { id: 39, name: 'Premier League', logo: 'pl.png' },
        teams: {
          home: { id: 1, name: 'Team A', logo: 'a.png' },
          away: { id: 2, name: 'Team B', logo: 'b.png' },
        },
        goals: { home: 2, away: 1 },
      },
      {
        players: [
          {
            players: [
              {
                player: { id: 9, name: 'Player Test' },
                statistics: [
                  {
                    games: { minutes: 15, rating: '6.0', substitute: true },
                    goals: { total: 0, assists: 0 },
                    cards: { yellow: 0, red: 0 },
                  },
                  {
                    games: { minutes: 75, rating: '7.4', substitute: false },
                    goals: { total: 1, assists: 1 },
                    cards: { yellow: 1, red: 0 },
                  },
                ],
              },
            ],
          },
        ],
      },
    );

    expect(mapped).not.toBeNull();
    expect(mapped?.playerStats.minutes).toBe(75);
    expect(mapped?.playerStats.rating).toBe('7.4');
    expect(mapped?.playerStats.goals).toBe(1);
    expect(mapped?.playerStats.assists).toBe(1);
    expect(mapped?.playerStats.yellowCards).toBe(1);
    expect(mapped?.playerStats.isStarter).toBe(true);
  });
});
