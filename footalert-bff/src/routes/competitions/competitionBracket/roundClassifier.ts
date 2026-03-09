const UNKNOWN_ROUND_ORDER = 50_000;
const GROUP_PATTERN = /\bgroup\b/i;

function normalizeRoundName(roundName: string): string {
  return roundName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function parseRoundOfValue(normalizedRoundName: string): number | null {
  const roundOfMatch = normalizedRoundName.match(/\bround of\s+(\d{1,3})\b/);
  if (roundOfMatch) {
    return Number.parseInt(roundOfMatch[1], 10);
  }

  const lastMatch = normalizedRoundName.match(/\blast\s+(\d{1,3})\b/);
  if (lastMatch) {
    return Number.parseInt(lastMatch[1], 10);
  }

  const fractionMatch = normalizedRoundName.match(/\b1\s*\/\s*(\d{1,3})\b/);
  if (fractionMatch) {
    return Number.parseInt(fractionMatch[1], 10) * 2;
  }

  const englishFinalsMatch = normalizedRoundName.match(/\b(\d{1,3})(?:st|nd|rd|th)\s+finals?\b/);
  if (englishFinalsMatch) {
    return Number.parseInt(englishFinalsMatch[1], 10) * 2;
  }

  const frenchFinalsMatch = normalizedRoundName.match(/\b(\d{1,3})(?:e|eme|er)?\s+de\s+finale\b/);
  if (frenchFinalsMatch) {
    return Number.parseInt(frenchFinalsMatch[1], 10) * 2;
  }

  return null;
}

function parseNumberedRound(normalizedRoundName: string): number | null {
  const englishRoundMatch = normalizedRoundName.match(/\b(\d{1,2})(?:st|nd|rd|th)\s+round\b/);
  if (englishRoundMatch) {
    return Number.parseInt(englishRoundMatch[1], 10);
  }

  const frenchRoundMatch = normalizedRoundName.match(/\b(\d{1,2})(?:er|e)?\s+tour\b/);
  if (frenchRoundMatch) {
    return Number.parseInt(frenchRoundMatch[1], 10);
  }

  return null;
}

export function classifyRound(roundName: string): 'group' | 'knockout' | 'unknown' {
  const normalized = normalizeRoundName(roundName);
  if (!normalized) {
    return 'unknown';
  }

  if (GROUP_PATTERN.test(normalized)) return 'group';
  if (parseRoundOfValue(normalized) !== null) return 'knockout';
  if (parseNumberedRound(normalized) !== null) return 'knockout';
  if (normalized.includes('semi') || normalized.includes('demi')) return 'knockout';
  if (normalized.includes('quarter') || normalized.includes('quart')) return 'knockout';
  if (/^finale?s?$/.test(normalized)) return 'knockout';

  if (
    /\bfinal\b/.test(normalized) &&
    !/\bsemi\b/.test(normalized) &&
    !/\bquarter\b/.test(normalized) &&
    !/\bquart\b/.test(normalized)
  ) {
    return 'knockout';
  }

  if (/\b(qualifying|preliminary|elimination|play-?off|barrage)\b/.test(normalized)) {
    return 'knockout';
  }

  return 'unknown';
}

export function detectCompetitionKind(
  groupNames: Set<string>,
  knockoutRoundNames: Set<string>,
): 'league' | 'cup' | 'mixed' {
  const hasGroups = groupNames.size > 0;
  const hasKnockout = knockoutRoundNames.size > 0;

  if (hasGroups && hasKnockout) return 'mixed';
  if (hasKnockout && !hasGroups) return 'cup';
  return 'league';
}

export function getRoundOrder(roundName: string): number {
  const normalized = normalizeRoundName(roundName);
  if (!normalized) return UNKNOWN_ROUND_ORDER;

  const roundOfValue = parseRoundOfValue(normalized);
  if (roundOfValue !== null) {
    if (roundOfValue >= 16) {
      return 10_000 - roundOfValue;
    }
    if (roundOfValue === 8) return 9_992;
    if (roundOfValue === 4) return 9_996;
    if (roundOfValue === 2) return 10_000;
  }

  if (normalized.includes('quarter') || normalized.includes('quart')) return 9_992;
  if (normalized.includes('semi') || normalized.includes('demi')) return 9_996;
  if (/^finale?s?$/.test(normalized)) return 10_000;

  if (
    /\bfinal\b/.test(normalized) &&
    !/\bsemi\b/.test(normalized) &&
    !/\bquarter\b/.test(normalized) &&
    !/\bquart\b/.test(normalized)
  ) {
    return 10_000;
  }

  const numberedRound = parseNumberedRound(normalized);
  if (numberedRound !== null) {
    return 8_000 + numberedRound;
  }

  if (normalized.includes('preliminary')) return 7_000;
  if (normalized.includes('qualifying')) return 7_500;
  if (/\b(play-?off|barrage)\b/.test(normalized)) return 9_900;

  return UNKNOWN_ROUND_ORDER;
}
