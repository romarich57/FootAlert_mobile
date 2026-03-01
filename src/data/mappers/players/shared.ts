import type { PlayerApiDetailsDto, PlayerApiMatchPerformanceDto } from '@domain/contracts/players.types';

export type PlayerApiStat = NonNullable<PlayerApiDetailsDto['statistics']>[number];

export type PlayerApiMatchStat = NonNullable<
  NonNullable<
    NonNullable<PlayerApiMatchPerformanceDto['players']>[number]['players']
  >[number]['statistics']
>[number];

export function normalizeString(value: string | undefined | null): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeNumber(value: number | undefined | null): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function normalizeRating(
  value: string | number | undefined | null,
  precision = 1,
): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed.toFixed(precision);
}

export function toId(value: number | string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

export function resolvePrimaryStatistic(
  statistics: PlayerApiDetailsDto['statistics'],
  season?: number,
): PlayerApiStat | null {
  if (!statistics || statistics.length === 0) {
    return null;
  }

  const seasonScoped =
    typeof season === 'number'
      ? statistics.filter(item => item.league?.season === season)
      : statistics;
  const candidates = seasonScoped.length > 0 ? seasonScoped : statistics;

  return (
    [...candidates].sort((a, b) => {
      const aMinutes = a.games?.minutes ?? 0;
      const bMinutes = b.games?.minutes ?? 0;
      if (bMinutes !== aMinutes) {
        return bMinutes - aMinutes;
      }

      const aAppearances = a.games?.appearences ?? 0;
      const bAppearances = b.games?.appearences ?? 0;
      if (bAppearances !== aAppearances) {
        return bAppearances - aAppearances;
      }

      return (b.goals?.total ?? 0) - (a.goals?.total ?? 0);
    })[0] ?? null
  );
}

export function resolveSeasonStatistics(
  statistics: PlayerApiDetailsDto['statistics'],
  season?: number,
): PlayerApiStat[] {
  if (!statistics || statistics.length === 0) {
    return [];
  }

  const seasonScoped =
    typeof season === 'number'
      ? statistics.filter(item => item.league?.season === season)
      : statistics;

  return seasonScoped.length > 0 ? seasonScoped : statistics;
}

export function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function sumOrNull(a: number | null, b: number | null): number | null {
  if (a === null && b === null) {
    return null;
  }

  return (a ?? 0) + (b ?? 0);
}
