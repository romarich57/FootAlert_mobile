// Helpers de tri et formatage pour l'onglet matchs d'une compétition

export type RoundKind = 'group' | 'matchday' | 'knockout' | 'other';

export function displayValue(value: string | number | null | undefined): string | number {
  return value !== null && value !== undefined && value !== '' ? value : '';
}

export function formatMatchTime(dateString: string, locale: string): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function formatMatchDate(dateString: string, locale: string): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '';
  }
}

function normalizeRoundToken(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function parseRoundOfValue(normalizedRound: string): number | null {
  const roundOfMatch = normalizedRound.match(/\bround of\s+(\d{1,3})\b/);
  if (roundOfMatch) return Number.parseInt(roundOfMatch[1], 10);

  const lastMatch = normalizedRound.match(/\blast\s+(\d{1,3})\b/);
  if (lastMatch) return Number.parseInt(lastMatch[1], 10);

  const fractionMatch = normalizedRound.match(/\b1\s*\/\s*(\d{1,3})\b/);
  if (fractionMatch) return Number.parseInt(fractionMatch[1], 10) * 2;

  const ordinalFinalsMatch = normalizedRound.match(/\b(\d{1,3})(?:st|nd|rd|th)\s+finals?\b/);
  if (ordinalFinalsMatch) return Number.parseInt(ordinalFinalsMatch[1], 10) * 2;

  const frenchFinalsMatch = normalizedRound.match(/\b(\d{1,3})(?:e|eme|er)?\s+de\s+finale\b/);
  if (frenchFinalsMatch) return Number.parseInt(frenchFinalsMatch[1], 10) * 2;

  return null;
}

export function getRoundSortMeta(roundRaw: string): { kind: RoundKind; order: number } {
  const normalized = normalizeRoundToken(roundRaw);
  const roundOfValue = parseRoundOfValue(normalized);

  if (normalized.includes('group')) {
    const matchdayInGroup = normalized.match(/\b(\d{1,2})\b/);
    return {
      kind: 'group',
      order: matchdayInGroup ? Number.parseInt(matchdayInGroup[1], 10) : 0,
    };
  }

  const matchdayPattern =
    /\b(regular season|matchday|journee|jornada|gameweek|week)\b/.test(normalized);
  if (matchdayPattern) {
    const matchday = normalized.match(/\b(\d{1,2})\b/);
    return {
      kind: 'matchday',
      order: matchday ? Number.parseInt(matchday[1], 10) : 0,
    };
  }

  if (roundOfValue !== null) {
    if (roundOfValue >= 16) return { kind: 'knockout', order: 2000 - roundOfValue };
    if (roundOfValue === 8) return { kind: 'knockout', order: 1992 };
    if (roundOfValue === 4) return { kind: 'knockout', order: 1996 };
    if (roundOfValue === 2) return { kind: 'knockout', order: 2000 };
  }

  if (normalized.includes('quarter') || normalized.includes('quart')) {
    return { kind: 'knockout', order: 1992 };
  }
  if (normalized.includes('semi') || normalized.includes('demi')) {
    return { kind: 'knockout', order: 1996 };
  }
  if (/^finale?s?$/.test(normalized)) {
    return { kind: 'knockout', order: 2000 };
  }

  const knockoutRoundNumber = normalized.match(/\b(\d{1,2})(?:st|nd|rd|th)\s+round\b/);
  if (knockoutRoundNumber) {
    return { kind: 'knockout', order: 1500 + Number.parseInt(knockoutRoundNumber[1], 10) };
  }

  if (normalized.includes('qualifying') || normalized.includes('preliminary') || normalized.includes('barrage')) {
    return { kind: 'knockout', order: 1400 };
  }

  const fallbackNumber = normalized.match(/\b(\d{1,3})\b/);
  if (fallbackNumber) {
    return { kind: 'other', order: 2500 + Number.parseInt(fallbackNumber[1], 10) };
  }

  return { kind: 'other', order: 9999 };
}
