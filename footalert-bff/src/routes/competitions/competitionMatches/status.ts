const TERMINAL_SHORT_STATUSES = new Set(['FT', 'AET', 'PEN', 'CANC', 'ABD', 'AWD', 'WO']);
const NON_TERMINAL_SHORT_STATUSES = new Set([
  'TBD',
  'NS',
  'PST',
  'SUSP',
  'INT',
  'LIVE',
  '1H',
  'HT',
  '2H',
  'ET',
  'BT',
  'P',
]);
const TERMINAL_LONG_STATUS_HINTS = [
  'finished',
  'after penalties',
  'penalties',
  'fulltime',
  'full time',
  'awarded',
  'walkover',
  'abandoned',
  'cancelled',
  'canceled',
];
const NON_TERMINAL_LONG_STATUS_HINTS = [
  'not started',
  'to be defined',
  'postponed',
  'delayed',
  'interrupted',
  'suspended',
  'in play',
  '1st half',
  '2nd half',
  'half time',
  'extra time',
  'penalty shootout',
  'break',
];

export function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

export function toText(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return '';
  }

  return String(value).trim();
}

export function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some(needle => haystack.includes(needle));
}

export function isTerminalMatchStatus(
  shortStatus: string,
  longStatus: string,
  elapsed: number | null,
): boolean {
  const normalizedShortStatus = shortStatus.trim().toUpperCase();
  const normalizedLongStatus = longStatus.trim().toLowerCase();

  if (TERMINAL_SHORT_STATUSES.has(normalizedShortStatus)) {
    return true;
  }

  if (NON_TERMINAL_SHORT_STATUSES.has(normalizedShortStatus)) {
    return false;
  }

  if (normalizedLongStatus.length > 0) {
    if (includesAny(normalizedLongStatus, NON_TERMINAL_LONG_STATUS_HINTS)) {
      return false;
    }

    if (includesAny(normalizedLongStatus, TERMINAL_LONG_STATUS_HINTS)) {
      return true;
    }
  }

  if (typeof elapsed === 'number' && Number.isFinite(elapsed) && elapsed > 0) {
    return false;
  }

  return false;
}
