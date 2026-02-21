const UNKNOWN_VALUE = '?';

export function toDisplayValue(
  value: string | number | null | undefined,
  fallback: string = UNKNOWN_VALUE,
): string {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : fallback;
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : fallback;
  }

  return fallback;
}

export function toDisplayNumber(
  value: number | null | undefined,
  fallback: string = UNKNOWN_VALUE,
): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : fallback;
}

export function toDisplayDate(
  value: string | null | undefined,
  locale: Intl.LocalesArgument = undefined,
): string {
  if (!value) {
    return UNKNOWN_VALUE;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return UNKNOWN_VALUE;
  }

  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(parsed);
}

export function toDisplayDateTime(
  value: string | null | undefined,
  locale: Intl.LocalesArgument = undefined,
): string {
  if (!value) {
    return UNKNOWN_VALUE;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return UNKNOWN_VALUE;
  }

  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

export function toDisplayHour(
  value: string | null | undefined,
  locale: Intl.LocalesArgument = undefined,
): string {
  if (!value) {
    return UNKNOWN_VALUE;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return UNKNOWN_VALUE;
  }

  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

export function toDisplaySeasonLabel(season: number | null | undefined): string {
  if (typeof season !== 'number' || !Number.isFinite(season)) {
    return `${UNKNOWN_VALUE}/${UNKNOWN_VALUE}`;
  }

  return `${season}/${season + 1}`;
}

export function toDisplayScore(homeGoals: number | null, awayGoals: number | null): string {
  if (homeGoals === null || awayGoals === null) {
    return UNKNOWN_VALUE;
  }

  return `${homeGoals}-${awayGoals}`;
}

export function toPercent(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return UNKNOWN_VALUE;
  }

  return `${Math.max(0, Math.min(100, value))}%`;
}

export function coalesceText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export { UNKNOWN_VALUE };
