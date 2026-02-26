import type {
  CompetitionTeamAdvancedMetricKey,
  CompetitionTeamHomeAwayMetricKey,
  CompetitionTeamStatsLeaderboard,
  CompetitionTeamStatsMetricKey,
} from '@ui/features/competitions/types/competitions.types';
import type { HorizontalBarChartItem } from '@ui/features/competitions/components/HorizontalBarChart';

export type MetricFormat = 'integer' | 'decimal' | 'percent';

type MetricMeta = {
  labelKey: string;
  format: MetricFormat;
};

export const SUMMARY_DEFAULT_METRIC: CompetitionTeamStatsMetricKey = 'pointsPerMatch';
export const HOME_AWAY_DEFAULT_METRIC: CompetitionTeamHomeAwayMetricKey = 'homePPG';
export const ADVANCED_DEFAULT_METRIC: CompetitionTeamAdvancedMetricKey = 'cleanSheets';

export const SUMMARY_METRICS: Record<CompetitionTeamStatsMetricKey, MetricMeta> = {
  pointsPerMatch: { labelKey: 'competitionDetails.teamStats.metrics.pointsPerMatch', format: 'decimal' },
  winRate: { labelKey: 'competitionDetails.teamStats.metrics.winRate', format: 'percent' },
  goalsScoredPerMatch: {
    labelKey: 'competitionDetails.teamStats.metrics.goalsScoredPerMatch',
    format: 'decimal',
  },
  goalsConcededPerMatch: {
    labelKey: 'competitionDetails.teamStats.metrics.goalsConcededPerMatch',
    format: 'decimal',
  },
  goalDiffPerMatch: {
    labelKey: 'competitionDetails.teamStats.metrics.goalDiffPerMatch',
    format: 'decimal',
  },
  formIndex: { labelKey: 'competitionDetails.teamStats.metrics.formIndex', format: 'integer' },
  formPointsPerMatch: {
    labelKey: 'competitionDetails.teamStats.metrics.formPointsPerMatch',
    format: 'decimal',
  },
};

export const HOME_AWAY_METRICS: Record<CompetitionTeamHomeAwayMetricKey, MetricMeta> = {
  homePPG: { labelKey: 'competitionDetails.teamStats.metrics.homePPG', format: 'decimal' },
  awayPPG: { labelKey: 'competitionDetails.teamStats.metrics.awayPPG', format: 'decimal' },
  homeGoalsFor: { labelKey: 'competitionDetails.teamStats.metrics.homeGoalsFor', format: 'integer' },
  awayGoalsFor: { labelKey: 'competitionDetails.teamStats.metrics.awayGoalsFor', format: 'integer' },
  homeGoalsAgainst: {
    labelKey: 'competitionDetails.teamStats.metrics.homeGoalsAgainst',
    format: 'integer',
  },
  awayGoalsAgainst: {
    labelKey: 'competitionDetails.teamStats.metrics.awayGoalsAgainst',
    format: 'integer',
  },
  deltaHomeAwayPPG: {
    labelKey: 'competitionDetails.teamStats.metrics.deltaHomeAwayPPG',
    format: 'decimal',
  },
  deltaHomeAwayGoalsFor: {
    labelKey: 'competitionDetails.teamStats.metrics.deltaHomeAwayGoalsFor',
    format: 'integer',
  },
  deltaHomeAwayGoalsAgainst: {
    labelKey: 'competitionDetails.teamStats.metrics.deltaHomeAwayGoalsAgainst',
    format: 'integer',
  },
};

export const ADVANCED_METRICS: Record<CompetitionTeamAdvancedMetricKey, MetricMeta> = {
  cleanSheets: { labelKey: 'competitionDetails.teamStats.metrics.cleanSheets', format: 'integer' },
  failedToScore: { labelKey: 'competitionDetails.teamStats.metrics.failedToScore', format: 'integer' },
  xGPerMatch: { labelKey: 'competitionDetails.teamStats.metrics.xGPerMatch', format: 'decimal' },
  possession: { labelKey: 'competitionDetails.teamStats.metrics.possession', format: 'percent' },
  shotsPerMatch: { labelKey: 'competitionDetails.teamStats.metrics.shotsPerMatch', format: 'decimal' },
  shotsOnTargetPerMatch: {
    labelKey: 'competitionDetails.teamStats.metrics.shotsOnTargetPerMatch',
    format: 'decimal',
  },
};

export function formatMetricValue(value: number, format: MetricFormat): string {
  if (format === 'integer') {
    return Number.isInteger(value) ? `${value}` : `${Math.round(value)}`;
  }

  if (format === 'percent') {
    return `${value.toFixed(1)}%`;
  }

  return value.toFixed(2);
}

export function toChartData(leaderboard: CompetitionTeamStatsLeaderboard<string>): HorizontalBarChartItem[] {
  if (leaderboard.items.length === 0) {
    return [];
  }

  const maxValue = Math.max(...leaderboard.items.map(item => Math.abs(item.value)), 1);

  return leaderboard.items.map((item, index) => ({
    id: String(item.teamId),
    label: item.teamName,
    value: item.value,
    maxValue,
    photoUrl: item.teamLogo,
    rank: index + 1,
  }));
}
