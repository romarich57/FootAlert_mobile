import { toDateMilliseconds, toEpochMilliseconds, toNumericId } from './fixtureContext.js';

function toInjuryFixtureId(value: unknown): number | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const fixture = record.fixture;
  if (!fixture || typeof fixture !== 'object') {
    return null;
  }

  const fixtureRecord = fixture as Record<string, unknown>;
  return toNumericId(fixtureRecord.id);
}

function toInjuryFixtureDateMs(value: unknown): number | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const fixture = record.fixture;
  if (!fixture || typeof fixture !== 'object') {
    return null;
  }

  const fixtureRecord = fixture as Record<string, unknown>;
  return toEpochMilliseconds(fixtureRecord.timestamp) ?? toDateMilliseconds(fixtureRecord.date);
}

function toInjuryPlayerName(value: unknown): string {
  if (!value || typeof value !== 'object') {
    return '';
  }

  const record = value as Record<string, unknown>;
  const player = record.player;
  if (!player || typeof player !== 'object') {
    return '';
  }

  const playerRecord = player as Record<string, unknown>;
  if (typeof playerRecord.name !== 'string') {
    return '';
  }

  return playerRecord.name.trim().toLowerCase();
}

function sortInjuriesByDate(entries: unknown[]): unknown[] {
  return [...entries].sort((left, right) => {
    const leftDate = toInjuryFixtureDateMs(left);
    const rightDate = toInjuryFixtureDateMs(right);

    if (leftDate === null && rightDate !== null) {
      return 1;
    }

    if (leftDate !== null && rightDate === null) {
      return -1;
    }

    if (leftDate !== null && rightDate !== null && leftDate !== rightDate) {
      return rightDate - leftDate;
    }

    return toInjuryPlayerName(left).localeCompare(toInjuryPlayerName(right));
  });
}

export function filterInjuriesForMatch(
  entries: unknown[],
  matchFixtureId: number,
  matchFixtureDateMs: number | null,
): unknown[] {
  if (entries.length === 0) {
    return [];
  }

  const exactFixtureEntries = entries.filter(entry => toInjuryFixtureId(entry) === matchFixtureId);
  if (exactFixtureEntries.length > 0) {
    return sortInjuriesByDate(exactFixtureEntries);
  }

  if (matchFixtureDateMs === null) {
    return [];
  }

  const oneDayMs = 24 * 60 * 60 * 1_000;
  const nearbyEntries = entries.filter(entry => {
    const injuryDateMs = toInjuryFixtureDateMs(entry);
    if (injuryDateMs === null) {
      return false;
    }

    return Math.abs(injuryDateMs - matchFixtureDateMs) <= oneDayMs;
  });

  return sortInjuriesByDate(nearbyEntries);
}
