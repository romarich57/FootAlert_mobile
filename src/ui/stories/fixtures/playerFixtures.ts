import type { PlayerSeasonStats } from '@ui/features/players/types/players.types';
import {
  buildPlayerStatsRows,
  type PlayerStatsRows,
  type StatMode,
  type StatRowConfig,
} from '@ui/features/players/components/stats/playerStatsRows';

export const samplePlayerSeasonStats: PlayerSeasonStats = {
  matches: 24,
  starts: 22,
  minutes: 1986,
  goals: 17,
  assists: 8,
  rating: '7.45',
  shots: 72,
  shotsOnTarget: 35,
  penaltyGoals: 3,
  passes: 825,
  passesAccuracy: 86,
  keyPasses: 41,
  dribblesAttempts: 88,
  dribblesSuccess: 54,
  tackles: 18,
  interceptions: 11,
  blocks: 2,
  duelsTotal: 181,
  duelsWon: 102,
  foulsCommitted: 19,
  foulsDrawn: 30,
  yellowCards: 3,
  redCards: 0,
  dribblesBeaten: 7,
  saves: null,
  goalsConceded: null,
  penaltiesWon: 2,
  penaltiesMissed: 1,
  penaltiesCommitted: 0,
};

export const sampleGoalkeeperSeasonStats: PlayerSeasonStats = {
  ...samplePlayerSeasonStats,
  goals: 0,
  assists: 0,
  shots: 0,
  shotsOnTarget: 0,
  saves: 54,
  goalsConceded: 21,
};

export const samplePlayerLeagueName = 'Ligue 1';

export const sampleSectionRows: StatRowConfig[] = [
  { label: 'Goals', value: 17, max: 25, color: '#22C55E' },
  { label: 'Assists', value: 8, max: 25, color: '#3B82F6' },
  { label: 'Shots', value: 72, max: 90, color: '#F59E0B' },
];

export const sampleSparseSectionRows: StatRowConfig[] = [
  { label: 'Goals', value: 3, max: 10, color: '#22C55E' },
  { label: 'Assists', value: null, max: 10, color: '#3B82F6' },
  { label: 'Shots', value: 11, max: 20, color: '#F59E0B' },
];

export function buildSamplePlayerStatsRows(
  t: (key: string) => string,
  mode: StatMode,
  stats: PlayerSeasonStats = samplePlayerSeasonStats,
): PlayerStatsRows {
  return buildPlayerStatsRows(stats, mode, t);
}
