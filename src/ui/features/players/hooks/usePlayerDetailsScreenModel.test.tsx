import { selectProfileCompetitionStats } from '@ui/features/players/hooks/usePlayerDetailsScreenModel';
import type { PlayerSeasonStatsDataset } from '@ui/features/players/types/players.types';

const emptyStats = {
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
};

describe('selectProfileCompetitionStats', () => {
  it('selects the most played competition from the latest season', () => {
    const dataset: PlayerSeasonStatsDataset = {
      overall: emptyStats,
      byCompetition: [
        {
          leagueId: '39',
          leagueName: 'Premier League',
          leagueLogo: 'pl.png',
          season: 2024,
          stats: { ...emptyStats, matches: 30, goals: 12, assists: 8, rating: '7.42' },
        },
        {
          leagueId: '2',
          leagueName: 'UEFA Champions League',
          leagueLogo: 'ucl.png',
          season: 2025,
          stats: { ...emptyStats, matches: 10, goals: 4, assists: 3, rating: '7.30' },
        },
        {
          leagueId: '140',
          leagueName: 'LaLiga',
          leagueLogo: 'laliga.png',
          season: 2025,
          stats: { ...emptyStats, matches: 24, goals: 9, assists: 5, rating: '7.65' },
        },
      ],
    };

    const selected = selectProfileCompetitionStats(dataset);

    expect(selected?.leagueId).toBe('140');
    expect(selected?.season).toBe(2025);
    expect(selected?.matches).toBe(24);
    expect(selected?.goals).toBe(9);
    expect(selected?.assists).toBe(5);
    expect(selected?.rating).toBe('7.65');
  });

  it('returns null when there is no competition data', () => {
    const selected = selectProfileCompetitionStats({
      overall: emptyStats,
      byCompetition: [],
    });

    expect(selected).toBeNull();
  });
});
