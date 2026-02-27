import type { RawRecord } from './matchDetailsTabTypes';

export function toRecord(value: unknown): RawRecord | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  return value as RawRecord;
}

export function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function toText(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function toId(value: unknown): string {
  const numericValue = toNumber(value);
  if (numericValue !== null) {
    return String(Math.trunc(numericValue));
  }

  return toText(value, '');
}
