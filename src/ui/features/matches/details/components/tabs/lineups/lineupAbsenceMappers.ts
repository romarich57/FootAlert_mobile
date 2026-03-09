import type { MatchLineupAbsence } from '@ui/features/matches/types/matches.types';
import { toText } from '@ui/features/matches/details/components/tabs/shared/matchDetailsParsing';

export function normalizeAbsence(absence: MatchLineupAbsence | string): MatchLineupAbsence {
  if (typeof absence === 'string') {
    return {
      id: null,
      name: absence,
      photo: null,
      reason: null,
      status: null,
      type: null,
    };
  }

  return absence;
}

export function sanitizeAbsenceText(
  rawValue: string | null | undefined,
  t: (key: string) => string,
): string | null {
  const rawLabel = toText(rawValue, '');
  if (!rawLabel) {
    return null;
  }

  const normalizedKey = rawLabel.replace(/^matchsDetails\./i, 'matchDetails.');
  if (/^matchDetails\./.test(normalizedKey)) {
    const translated = t(normalizedKey);
    return translated !== normalizedKey ? translated : t('matchDetails.values.unavailable');
  }

  if (/^missing(\s|_)?fixture$/i.test(rawLabel)) {
    return t('matchDetails.values.unavailable');
  }

  return rawLabel;
}

export function resolveAbsenceTagLabel(
  rawValue: string | null | undefined,
  t: (key: string) => string,
): string | null {
  const normalized = toText(rawValue, '').toLowerCase().trim();
  if (!normalized) {
    return null;
  }

  if (normalized.includes('injur') || normalized.includes('bless')) {
    return t('matchDetails.lineups.absenceTags.injured');
  }

  if (normalized.includes('suspend') || normalized.includes('ban')) {
    return t('matchDetails.lineups.absenceTags.suspended');
  }

  if (normalized.includes('doubt') || normalized.includes('incertain')) {
    return t('matchDetails.lineups.absenceTags.doubtful');
  }

  if (normalized.includes('question')) {
    return t('matchDetails.lineups.absenceTags.questionable');
  }

  if (
    normalized.includes('illness') ||
    normalized.includes('sick') ||
    normalized.includes('malad') ||
    normalized.includes('virus') ||
    normalized.includes('flu')
  ) {
    return t('matchDetails.lineups.absenceTags.illness');
  }

  if (
    normalized === 'out' ||
    normalized.includes('unavailable') ||
    normalized.includes('absent') ||
    normalized.includes('indisponible')
  ) {
    return t('matchDetails.lineups.absenceTags.out');
  }

  return sanitizeAbsenceText(rawValue, t);
}
