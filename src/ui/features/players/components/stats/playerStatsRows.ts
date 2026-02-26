import type { PlayerSeasonStats } from '@ui/features/players/types/players.types';

export type StatMode = 'total' | 'per90';

export type StatSectionKey =
  | 'shooting'
  | 'passing'
  | 'dribbles'
  | 'defense'
  | 'discipline'
  | 'goalkeeper'
  | 'penalties';

export type StatRowConfig = {
  label: string;
  value: number | null;
  max: number;
  color: string;
};

export type PlayerStatsRows = {
  shooting: StatRowConfig[];
  passing: StatRowConfig[];
  dribbles: StatRowConfig[];
  defense: StatRowConfig[];
  discipline: StatRowConfig[];
  goalkeeper: StatRowConfig[];
  penalties: StatRowConfig[];
};

const BAR_GREEN = '#22C55E';
const BAR_ORANGE = '#F59E0B';
const BAR_RED = '#EF4444';
const BAR_BLUE = '#3B82F6';

function per90(value: number | null, minutes: number | null): number | null {
  if (value === null || minutes === null || minutes <= 0) {
    return null;
  }

  return Number(((value / minutes) * 90).toFixed(2));
}

function maxOf(...values: (number | null)[]): number {
  const numbers = values.filter((value): value is number => value !== null && value > 0);
  return numbers.length > 0 ? Math.max(...numbers) : 1;
}

function valueByMode(stats: PlayerSeasonStats, mode: StatMode) {
  return (value: number | null): number | null => {
    if (mode === 'per90') {
      return per90(value, stats.minutes);
    }

    return value;
  };
}

export function buildPlayerStatsRows(
  stats: PlayerSeasonStats,
  mode: StatMode,
  t: (key: string) => string,
): PlayerStatsRows {
  const v = valueByMode(stats, mode);

  const shooting: StatRowConfig[] = [
    {
      label: t('playerDetails.stats.labels.goals'),
      value: v(stats.goals),
      max: maxOf(v(stats.goals), v(stats.shots), v(stats.shotsOnTarget)),
      color: BAR_GREEN,
    },
    {
      label: t('playerDetails.stats.labels.penaltyGoals'),
      value: v(stats.penaltyGoals),
      max: maxOf(v(stats.goals), v(stats.penaltyGoals)),
      color: BAR_GREEN,
    },
    {
      label: t('playerDetails.stats.labels.shots'),
      value: v(stats.shots),
      max: maxOf(v(stats.shots)),
      color: BAR_BLUE,
    },
    {
      label: t('playerDetails.stats.labels.shotsOnTarget'),
      value: v(stats.shotsOnTarget),
      max: maxOf(v(stats.shots)),
      color: BAR_GREEN,
    },
  ];

  const passing: StatRowConfig[] = [
    {
      label: t('playerDetails.stats.labels.assistsDetailed'),
      value: v(stats.assists),
      max: maxOf(v(stats.assists), v(stats.keyPasses)),
      color: BAR_GREEN,
    },
    {
      label: t('playerDetails.stats.labels.keyPasses'),
      value: v(stats.keyPasses),
      max: maxOf(v(stats.keyPasses), v(stats.assists)),
      color: BAR_GREEN,
    },
    {
      label: t('playerDetails.stats.labels.totalPasses'),
      value: v(stats.passes),
      max: maxOf(v(stats.passes)),
      color: BAR_BLUE,
    },
    {
      label: t('playerDetails.stats.labels.passesAccuracy'),
      value: stats.passesAccuracy,
      max: 100,
      color: BAR_GREEN,
    },
  ];

  const dribbles: StatRowConfig[] = [
    {
      label: t('playerDetails.stats.labels.dribblesAttempts'),
      value: v(stats.dribblesAttempts),
      max: maxOf(v(stats.dribblesAttempts)),
      color: BAR_BLUE,
    },
    {
      label: t('playerDetails.stats.labels.dribblesSuccess'),
      value: v(stats.dribblesSuccess),
      max: maxOf(v(stats.dribblesAttempts)),
      color: BAR_GREEN,
    },
  ];

  const defense: StatRowConfig[] = [
    {
      label: t('playerDetails.stats.labels.tackles'),
      value: v(stats.tackles),
      max: maxOf(v(stats.tackles), v(stats.interceptions), v(stats.blocks)),
      color: BAR_GREEN,
    },
    {
      label: t('playerDetails.stats.labels.interceptions'),
      value: v(stats.interceptions),
      max: maxOf(v(stats.tackles), v(stats.interceptions)),
      color: BAR_GREEN,
    },
    {
      label: t('playerDetails.stats.labels.blocks'),
      value: v(stats.blocks),
      max: maxOf(v(stats.tackles), v(stats.blocks)),
      color: BAR_ORANGE,
    },
    {
      label: t('playerDetails.stats.labels.duelsWon'),
      value: v(stats.duelsWon),
      max: maxOf(v(stats.duelsTotal)),
      color: BAR_GREEN,
    },
    {
      label: t('playerDetails.stats.labels.duelsTotal'),
      value: v(stats.duelsTotal),
      max: maxOf(v(stats.duelsTotal)),
      color: BAR_BLUE,
    },
  ];

  const discipline: StatRowConfig[] = [
    {
      label: t('playerDetails.stats.labels.foulsCommitted'),
      value: v(stats.foulsCommitted),
      max: maxOf(v(stats.foulsCommitted), v(stats.foulsDrawn)),
      color: BAR_ORANGE,
    },
    {
      label: t('playerDetails.stats.labels.foulsDrawn'),
      value: v(stats.foulsDrawn),
      max: maxOf(v(stats.foulsCommitted), v(stats.foulsDrawn)),
      color: BAR_GREEN,
    },
    {
      label: t('playerDetails.stats.labels.dribblesBeaten'),
      value: v(stats.dribblesBeaten),
      max: maxOf(v(stats.dribblesBeaten)),
      color: BAR_RED,
    },
    {
      label: t('playerDetails.stats.labels.yellowCards'),
      value: v(stats.yellowCards),
      max: maxOf(v(stats.yellowCards), v(stats.redCards), 10),
      color: BAR_ORANGE,
    },
    {
      label: t('playerDetails.stats.labels.redCards'),
      value: v(stats.redCards),
      max: maxOf(v(stats.yellowCards), v(stats.redCards), 3),
      color: BAR_RED,
    },
  ];

  const hasGoalkeeperStats = stats.saves !== null || stats.goalsConceded !== null;

  const goalkeeper: StatRowConfig[] = hasGoalkeeperStats
    ? [
        {
          label: t('playerDetails.stats.labels.saves'),
          value: v(stats.saves),
          max: maxOf(v(stats.saves), v(stats.goalsConceded)),
          color: BAR_GREEN,
        },
        {
          label: t('playerDetails.stats.labels.goalsConceded'),
          value: v(stats.goalsConceded),
          max: maxOf(v(stats.saves), v(stats.goalsConceded)),
          color: BAR_RED,
        },
      ]
    : [];

  const penalties: StatRowConfig[] = [
    {
      label: t('playerDetails.stats.labels.penaltiesWon'),
      value: v(stats.penaltiesWon),
      max: maxOf(v(stats.penaltiesWon), v(stats.penaltiesMissed), v(stats.penaltiesCommitted)),
      color: BAR_GREEN,
    },
    {
      label: t('playerDetails.stats.labels.penaltiesMissed'),
      value: v(stats.penaltiesMissed),
      max: maxOf(v(stats.penaltiesWon), v(stats.penaltiesMissed)),
      color: BAR_RED,
    },
    {
      label: t('playerDetails.stats.labels.penaltiesCommitted'),
      value: v(stats.penaltiesCommitted),
      max: maxOf(v(stats.penaltiesCommitted)),
      color: BAR_ORANGE,
    },
  ];

  return {
    shooting,
    passing,
    dribbles,
    defense,
    discipline,
    goalkeeper,
    penalties,
  };
}

export function resolveSectionIconName(sectionKey: StatSectionKey): string {
  switch (sectionKey) {
    case 'shooting':
      return 'soccer';
    case 'passing':
      return 'swap-horizontal';
    case 'dribbles':
      return 'run-fast';
    case 'defense':
      return 'shield-outline';
    case 'discipline':
      return 'alert-circle-outline';
    case 'goalkeeper':
      return 'account-circle-outline';
    case 'penalties':
      return 'alpha-p-circle-outline';
    default:
      return 'chart-box-outline';
  }
}

export function computeShotAccuracy(stats: PlayerSeasonStats): number | null {
  if (typeof stats.shots === 'number' && typeof stats.shotsOnTarget === 'number' && stats.shots > 0) {
    return Number(((stats.shotsOnTarget / stats.shots) * 100).toFixed(1));
  }

  return null;
}

export function computeShotConversion(stats: PlayerSeasonStats): number | null {
  if (typeof stats.shots === 'number' && typeof stats.goals === 'number' && stats.shots > 0) {
    return Number(((stats.goals / stats.shots) * 100).toFixed(1));
  }

  return null;
}

export function toPercentValue(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return '-';
  }

  return `${value}%`;
}
