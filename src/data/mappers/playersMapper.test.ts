import {
  groupPlayerTrophiesByClub,
  mapPlayerDetailsToPositions,
  mapPlayerDetailsToSeasonStats,
  mapPlayerDetailsToSeasonStatsDataset,
  mapPlayerMatchPerformance,
  mapPlayerTrophies,
} from '@data/mappers/playersMapper';
import type { PlayerApiDetailsDto } from '@domain/contracts/players.types';

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

  it('builds competition stats and filters competitions without appearances', () => {
    const dto = buildDetails([
      {
        league: { id: 39, name: 'Premier League', logo: 'pl.png', season: 2025 },
        games: { appearences: 10, lineups: 8, minutes: 900, rating: '7.0' },
        goals: { total: 5, assists: 2 },
        shots: { total: 25, on: 12 },
      },
      {
        league: { id: 2, name: 'UEFA Champions League', logo: 'ucl.png', season: 2025 },
        games: { appearences: 6, lineups: 5, minutes: 480, rating: '7.6' },
        goals: { total: 4, assists: 1 },
        shots: { total: 16, on: 9 },
      },
      {
        league: { id: 1, name: 'Domestic Cup', logo: 'cup.png', season: 2025 },
        games: { appearences: 0, lineups: 0, minutes: 0, rating: null },
        goals: { total: 0, assists: 0 },
        shots: { total: 0, on: 0 },
      },
    ]);

    const mapped = mapPlayerDetailsToSeasonStatsDataset(dto, 2025);

    expect(mapped.overall.matches).toBe(16);
    expect(mapped.overall.goals).toBe(9);
    expect(mapped.byCompetition).toHaveLength(2);
    expect(mapped.byCompetition.map(item => item.leagueId)).toEqual(['39', '2']);
    expect(mapped.byCompetition[0].stats.matches).toBe(10);
    expect(mapped.byCompetition[1].stats.matches).toBe(6);
  });

  it('keeps fallback behavior when requested season is missing in competition mapping', () => {
    const dto = buildDetails([
      {
        league: { id: 39, name: 'Premier League', logo: 'pl.png', season: 2024 },
        games: { appearences: 12, lineups: 10, minutes: 1000, rating: '7.8' },
        goals: { total: 7, assists: 2 },
      },
    ]);

    const mapped = mapPlayerDetailsToSeasonStatsDataset(dto, 2025);

    expect(mapped.overall.matches).toBe(12);
    expect(mapped.byCompetition).toHaveLength(1);
    expect(mapped.byCompetition[0].season).toBe(2024);
    expect(mapped.byCompetition[0].stats.goals).toBe(7);
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

  it('maps player positions with primary and secondary slots', () => {
    const dto = buildDetails([
      {
        league: { season: 2025 },
        games: { appearences: 20, minutes: 1600, position: 'Left Winger' },
      },
      {
        league: { season: 2025 },
        games: { appearences: 12, minutes: 900, position: 'Attacker' },
      },
      {
        league: { season: 2025 },
        games: { appearences: 8, minutes: 530, position: 'Left Midfielder' },
      },
    ]);

    const positions = mapPlayerDetailsToPositions(dto, 2025);

    expect(positions.primary?.id).toBe('lw');
    expect(positions.primary?.shortLabel).toBe('AG');
    expect(positions.others.map(item => item.id)).toEqual(['att', 'lm']);
    expect(positions.all).toHaveLength(3);
  });

  it('keeps only winning trophies and groups them by club via career mapping', () => {
    const trophies = mapPlayerTrophies([
      { league: 'LaLiga', season: '2023/24', place: 'Winner', country: 'Spain' },
      { league: 'UEFA Champions League', season: '2023/24', place: 'Champion', country: 'Europe' },
      { league: 'Copa del Rey', season: '2022/23', place: 'Runner-up', country: 'Spain' },
      { league: 'Carioca', season: '2017', place: 'Winner', country: 'Brazil' },
    ]);

    expect(trophies).toHaveLength(3);

    const grouped = groupPlayerTrophiesByClub(trophies, [
      {
        season: '2023',
        team: { id: '541', name: 'Real Madrid', logo: 'rm.png' },
        matches: 32,
        goals: 10,
        assists: 8,
        rating: '7.8',
      },
      {
        season: '2017',
        team: { id: '127', name: 'Flamengo', logo: 'fla.png' },
        matches: 24,
        goals: 5,
        assists: 4,
        rating: '7.1',
      },
    ]);

    expect(grouped).toHaveLength(2);
    expect(grouped[0].clubName).toBe('Real Madrid');
    expect(grouped[0].competitions.map(item => item.competition)).toEqual([
      'LaLiga',
      'UEFA Champions League',
    ]);
    expect(grouped[1].clubName).toBe('Flamengo');
    expect(grouped[1].competitions[0].seasons).toEqual(['2017']);
  });

  it('groups trophies under unknown club when career mapping is not possible', () => {
    const trophies = mapPlayerTrophies([
      { league: 'UEFA Super Cup', season: '2021/22', place: 'Winner', country: 'Europe' },
    ]);

    const grouped = groupPlayerTrophiesByClub(trophies, []);

    expect(grouped).toHaveLength(1);
    expect(grouped[0].clubId).toBeNull();
    expect(grouped[0].clubName).toBeNull();
    expect(grouped[0].competitions[0].competition).toBe('UEFA Super Cup');
  });

  it('falls back to nearest/primary club when trophy season does not exactly match career year', () => {
    const trophies = mapPlayerTrophies([
      { league: 'Ligue 1', season: '2020/21', place: 'Winner', country: 'France' },
    ]);

    const grouped = groupPlayerTrophiesByClub(trophies, [
      {
        season: '2019',
        team: { id: '85', name: 'Paris SG', logo: 'psg.png' },
        matches: 33,
        goals: 27,
        assists: 7,
        rating: '7.9',
      },
      {
        season: '2022',
        team: { id: '85', name: 'Paris SG', logo: 'psg.png' },
        matches: 34,
        goals: 28,
        assists: 9,
        rating: '8.0',
      },
    ]);

    expect(grouped).toHaveLength(1);
    expect(grouped[0].clubName).toBe('Paris SG');
    expect(grouped[0].clubId).toBe('85');
  });
});
