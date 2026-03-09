import { toDisplayNumber } from '@ui/features/teams/utils/teamDisplay';
import type { TeamComparisonMetric, TeamStatsData, TeamStatsRecord } from '@ui/features/teams/types/teams.types';

export type TeamStatsVisibility = {
  pointsCardVisible: boolean;
  goalsCardVisible: boolean;
  playersCardVisible: boolean;
};

export function hasValue(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function formatDecimal(value: number | null | undefined, digits = 1): string {
  if (!hasValue(value)) {
    return '';
  }

  return value.toFixed(digits);
}

export function formatComparisonValue(metric: TeamComparisonMetric): string {
  if (metric.key === 'possession') {
    return `${formatDecimal(metric.value, 1)}%`;
  }

  if (
    metric.key === 'pointsPerMatch' ||
    metric.key === 'goalsScoredPerMatch' ||
    metric.key === 'goalsConcededPerMatch' ||
    metric.key === 'shotsOnTargetPerMatch' ||
    metric.key === 'shotsPerMatch' ||
    metric.key === 'expectedGoalsPerMatch'
  ) {
    return formatDecimal(metric.value, 1);
  }

  return toDisplayNumber(metric.value);
}

export function hasVenueStats(stats: TeamStatsRecord | null): boolean {
  if (!stats) {
    return false;
  }

  return (
    stats.played !== null ||
    stats.wins !== null ||
    stats.draws !== null ||
    stats.losses !== null ||
    stats.goalsFor !== null ||
    stats.goalsAgainst !== null ||
    stats.goalDiff !== null ||
    stats.points !== null
  );
}

export function teamComparisonLabel(
  t: (key: string) => string,
  key: TeamComparisonMetric['key'],
): string {
  return t(`teamDetails.stats.comparisons.metrics.${key}`);
}

export function resolveTeamStatsVisibility(data: TeamStatsData | undefined): TeamStatsVisibility {
  return {
    pointsCardVisible:
      hasValue(data?.points) ||
      hasValue(data?.rank) ||
      hasVenueStats(data?.pointsByVenue?.home ?? null) ||
      hasVenueStats(data?.pointsByVenue?.away ?? null),
    goalsCardVisible:
      hasValue(data?.goalsFor) ||
      hasValue(data?.goalsAgainst) ||
      hasValue(data?.goalsForPerMatch) ||
      hasValue(data?.goalsAgainstPerMatch) ||
      hasValue(data?.cleanSheets) ||
      hasValue(data?.failedToScore) ||
      (data?.goalBreakdown?.length ?? 0) > 0,
    playersCardVisible:
      (data?.topPlayers?.length ?? 0) > 0 ||
      (data?.topPlayersByCategory?.ratings.length ?? 0) > 0 ||
      (data?.topPlayersByCategory?.scorers.length ?? 0) > 0 ||
      (data?.topPlayersByCategory?.assisters.length ?? 0) > 0,
  };
}
