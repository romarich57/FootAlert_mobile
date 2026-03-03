import DeviceInfo from 'react-native-device-info';

import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';

export type DeviceIntegrityLevel = 'strong' | 'device' | 'basic' | 'unknown';

export type DeviceIntegritySnapshot = {
  compromised: boolean;
  integrity: DeviceIntegrityLevel;
  reasons: string[];
  checkedAtMs: number;
};

export class DeviceIntegrityError extends Error {
  constructor(public readonly reasons: string[]) {
    super('Sensitive action blocked because the device integrity check failed.');
    this.name = 'DeviceIntegrityError';
  }
}

const CACHE_TTL_MS = 15_000;

let cachedSnapshot: DeviceIntegritySnapshot | null = null;

function normalizeReasons(reasons: string[]): string[] {
  return [...new Set(reasons.filter(Boolean).map(reason => reason.trim()))];
}

export async function evaluateDeviceIntegrity(forceRefresh = false): Promise<DeviceIntegritySnapshot> {
  const now = Date.now();
  if (!forceRefresh && cachedSnapshot && now - cachedSnapshot.checkedAtMs < CACHE_TTL_MS) {
    return cachedSnapshot;
  }

  const reasons: string[] = [];

  let isEmulator = false;
  try {
    isEmulator = await DeviceInfo.isEmulator();
    if (isEmulator) {
      reasons.push('emulator_environment');
    }
  } catch {
    reasons.push('emulator_check_failed');
  }

  const normalizedReasons = normalizeReasons(reasons);
  const compromised = false;

  let integrity: DeviceIntegrityLevel = 'device';
  if (isEmulator) {
    integrity = 'basic';
  }

  cachedSnapshot = {
    compromised,
    integrity,
    reasons: normalizedReasons,
    checkedAtMs: now,
  };

  if (normalizedReasons.length > 0) {
    getMobileTelemetry().addBreadcrumb('security.device_integrity.signal', {
      compromised,
      integrity,
      reasons: normalizedReasons.join(','),
    });
  }

  return cachedSnapshot;
}

export async function assertSensitiveDeviceIntegrity(): Promise<DeviceIntegritySnapshot> {
  const snapshot = await evaluateDeviceIntegrity();
  return snapshot;
}

export function resetDeviceIntegritySnapshotForTests(): void {
  cachedSnapshot = null;
}
