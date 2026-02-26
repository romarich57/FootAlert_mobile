import type { AvailabilityState, TabAvailability } from '@ui/shared/availability/types';

type GenericRecord = Record<string, unknown>;

function isPlainObject(value: unknown): value is GenericRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function isValuePresent(value: unknown): boolean {
  if (value === null || typeof value === 'undefined') {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (isPlainObject(value)) {
    const values = Object.values(value);
    if (values.length === 0) {
      return false;
    }

    return values.some(isValuePresent);
  }

  return true;
}

export function hasAnyPresentValue(
  record: Record<string, unknown> | null | undefined,
): boolean {
  if (!record) {
    return false;
  }

  return Object.values(record).some(isValuePresent);
}

export function resolveSnapshotState<TTabKey extends string>(
  tabs: Array<TabAvailability<TTabKey>>,
): AvailabilityState {
  if (tabs.some(tab => tab.state === 'available')) {
    return 'available';
  }

  if (tabs.some(tab => tab.state === 'unknown')) {
    return 'unknown';
  }

  return 'missing';
}

export function firstAvailableTab<TTabKey extends string>(
  tabs: Array<TabAvailability<TTabKey>>,
  activeTab: TTabKey | null | undefined,
): TTabKey | null {
  if (activeTab) {
    const active = tabs.find(tab => tab.key === activeTab);
    if (active && active.state !== 'missing') {
      return active.key;
    }
  }

  const available = tabs.find(tab => tab.state === 'available');
  if (available) {
    return available.key;
  }

  const unknown = tabs.find(tab => tab.state === 'unknown');
  return unknown ? unknown.key : null;
}
