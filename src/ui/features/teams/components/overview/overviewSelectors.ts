import { toDisplayNumber, toDisplayValue } from '@ui/features/teams/utils/teamDisplay';
import type { TeamTopPlayer } from '@ui/features/teams/types/teams.types';

import type { TeamOverviewStyles } from './TeamOverviewTab.styles';

export type PlayerCategoryKey = 'ratings' | 'scorers' | 'assisters';

export type TeamOverviewListItemKey =
  | 'next-match'
  | 'recent-form'
  | 'season-overview'
  | 'mini-standing'
  | 'standing-history'
  | 'coach-performance'
  | 'player-leaders'
  | 'competitions'
  | 'stadium-info';

export type HistoryVisualPoint = {
  season: number;
  rank: number | null;
  isMissing: boolean;
  label: string;
  x: number;
  y: number;
  isLatest: boolean;
};

export type OverviewHistoryDisplayPoint = {
  season: number;
  rank: number | null;
  isMissing: boolean;
  label: string;
};

export function toDecimal(value: number | null | undefined, precision = 1): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '';
  }

  return value.toFixed(precision);
}

export function resolveFormBadgeStyle(
  result: 'W' | 'D' | 'L' | '',
  styles: TeamOverviewStyles,
) {
  if (result === 'W') {
    return styles.formBadgeWin;
  }

  if (result === 'D') {
    return styles.formBadgeDraw;
  }

  if (result === 'L') {
    return styles.formBadgeLoss;
  }

  return null;
}

export function shortName(value: string | null | undefined): string {
  const text = toDisplayValue(value);
  if (!text) {
    return '';
  }

  const parts = text.split(' ').filter(Boolean);
  return parts[parts.length - 1] ?? text;
}

export function categoryValue(player: TeamTopPlayer | null, category: PlayerCategoryKey): string {
  if (!player) {
    return '';
  }

  if (category === 'ratings') {
    return toDecimal(player.rating, 2);
  }

  if (category === 'scorers') {
    return toDisplayNumber(player.goals);
  }

  return toDisplayNumber(player.assists);
}

export function resolveStatValueVariant(
  key: 'rank' | 'points' | 'played' | 'goalDiff',
  value: number | null | undefined,
): 'positive' | 'negative' | 'neutral' {
  if (typeof value !== 'number') {
    return 'neutral';
  }

  if (key === 'rank') {
    if (value <= 4) {
      return 'positive';
    }
    if (value >= 12) {
      return 'negative';
    }
    return 'neutral';
  }

  if (key === 'goalDiff') {
    if (value > 0) {
      return 'positive';
    }
    if (value < 0) {
      return 'negative';
    }
  }

  if (key === 'points' && value >= 1) {
    return 'positive';
  }

  return 'neutral';
}

export function toShortInitials(value: string | null | undefined): string {
  const name = shortName(value);
  if (!name) {
    return '?';
  }

  return name.slice(0, 2).toUpperCase();
}

export function toCompactSeasonLabel(value: number): string {
  const nextYearShort = String((value + 1) % 100).padStart(2, '0');
  return `${value}/${nextYearShort}`;
}

export function resolveHistoryRankColor(
  rank: number | null,
  isCurrentSeason: boolean,
): { fill: string; border: string; text: string } {
  if (isCurrentSeason) {
    return {
      fill: '#22F08A',
      border: '#C5FFE1',
      text: '#04220F',
    };
  }

  if (typeof rank !== 'number') {
    return {
      fill: '#2F2F2F',
      border: 'rgba(255,255,255,0.35)',
      text: '#E5E7EB',
    };
  }

  if (rank <= 3) {
    return {
      fill: '#34D399',
      border: '#A7F3D0',
      text: '#052E20',
    };
  }

  if (rank <= 6) {
    return {
      fill: '#60A5FA',
      border: '#BFDBFE',
      text: '#081A35',
    };
  }

  if (rank <= 10) {
    return {
      fill: '#FBBF24',
      border: '#FDE68A',
      text: '#3A2300',
    };
  }

  return {
    fill: '#F87171',
    border: '#FECACA',
    text: '#3B0A0A',
  };
}

export function buildHistoryDisplayPoints(
  historyPoints: Array<{ season: number; rank: number | null }>,
): OverviewHistoryDisplayPoint[] {
  return historyPoints.map(point => ({
    season: point.season,
    rank: point.rank,
    isMissing: typeof point.rank !== 'number',
    label: typeof point.rank === 'number' ? toDisplayNumber(point.rank) : '-',
  }));
}

export function computeHistoryVisualPoints(
  historyPoints: OverviewHistoryDisplayPoint[],
  historyChartWidth: number,
): HistoryVisualPoint[] {
  if (historyPoints.length === 0 || historyChartWidth <= 0) {
    return [];
  }

  const chartHeight = 90;
  const pointRadius = 18;
  const horizontalPadding = pointRadius + 2;
  const verticalPadding = pointRadius + 2;
  const drawableHeight = chartHeight - verticalPadding * 2;
  const drawableWidth = Math.max(1, historyChartWidth - horizontalPadding * 2);
  const ranks = historyPoints
    .map(point => point.rank)
    .filter((rank): rank is number => typeof rank === 'number');
  const maxRank = Math.max(5, ...ranks, 1);
  const denominator = Math.max(1, maxRank - 1);

  return historyPoints.map((point, index) => {
    const safeRank = typeof point.rank === 'number' ? point.rank : maxRank;
    const normalized = (safeRank - 1) / denominator;
    const x =
      historyPoints.length <= 1
        ? historyChartWidth / 2
        : horizontalPadding + (drawableWidth * index) / (historyPoints.length - 1);
    const y = verticalPadding + normalized * drawableHeight;

    return {
      season: point.season,
      rank: point.rank,
      isMissing: point.isMissing,
      label: point.label,
      x,
      y,
      isLatest: index === historyPoints.length - 1,
    };
  });
}
