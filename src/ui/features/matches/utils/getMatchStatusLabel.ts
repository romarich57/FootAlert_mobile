import { classifyFixtureStatus } from '@data/mappers/fixturesMapper';

type TranslationFn = (key: string, options?: Record<string, unknown>) => string;

type MatchStatusLabelInput = {
  short: string | null | undefined;
  long: string | null | undefined;
  elapsed: number | null | undefined;
};

const SHORT_STATUS_TRANSLATION_KEYS: Partial<Record<string, string>> = {
  FT: 'matches:status.finishedShort',
  AET: 'matches:status.afterExtraTime',
  PEN: 'matches:status.afterPenalties',
  PST: 'matches:status.postponed',
  CANC: 'matches:status.cancelled',
  ABD: 'matches:status.abandoned',
  SUSP: 'matches:status.suspended',
  INT: 'matches:status.interrupted',
  AWD: 'matches:status.awarded',
  WO: 'matches:status.walkover',
};

const LONG_STATUS_TRANSLATION_HINTS: readonly [string, string][] = [
  ['postponed', 'matches:status.postponed'],
  ['cancelled', 'matches:status.cancelled'],
  ['abandoned', 'matches:status.abandoned'],
  ['suspended', 'matches:status.suspended'],
  ['interrupted', 'matches:status.interrupted'],
  ['awarded', 'matches:status.awarded'],
  ['walkover', 'matches:status.walkover'],
  ['after extra time', 'matches:status.afterExtraTime'],
  ['after penalties', 'matches:status.afterPenalties'],
  ['penalties', 'matches:status.afterPenalties'],
];

function resolveLongStatusTranslationKey(value: string): string | null {
  const normalizedValue = value.trim().toLowerCase();
  if (!normalizedValue) {
    return null;
  }

  const match = LONG_STATUS_TRANSLATION_HINTS.find(([hint]) => normalizedValue.includes(hint));
  return match?.[1] ?? null;
}

export function getMatchStatusLabel(
  input: MatchStatusLabelInput,
  t: TranslationFn,
): string {
  const shortStatus = input.short?.trim().toUpperCase() ?? '';
  const longStatus = input.long?.trim() ?? '';
  const elapsed = typeof input.elapsed === 'number' ? input.elapsed : null;

  const normalizedStatus = classifyFixtureStatus(
    shortStatus,
    longStatus,
    elapsed,
  );

  if (normalizedStatus === 'live' && elapsed && elapsed > 0) {
    return `${elapsed}'`;
  }

  if (normalizedStatus === 'upcoming') {
    return t('matches:status.upcoming');
  }

  if (shortStatus) {
    const shortTranslationKey = SHORT_STATUS_TRANSLATION_KEYS[shortStatus];
    if (shortTranslationKey) {
      return t(shortTranslationKey);
    }
  }

  const longTranslationKey = resolveLongStatusTranslationKey(longStatus);
  if (longTranslationKey) {
    return t(longTranslationKey);
  }

  if (normalizedStatus === 'finished') {
    return t('matches:status.finishedShort');
  }

  if (shortStatus) {
    return shortStatus;
  }

  if (longStatus) {
    return longStatus;
  }

  return t('matches:status.upcoming');
}
