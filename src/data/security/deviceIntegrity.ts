import DeviceInfo from 'react-native-device-info';
import JailMonkey from 'jail-monkey';

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

  try {
    if (JailMonkey.isJailBroken()) {
      reasons.push('jailbreak_or_root_detected');
    }
  } catch {
    reasons.push('jailbreak_check_failed');
  }

  try {
    if (JailMonkey.hookDetected()) {
      reasons.push('runtime_hook_detected');
    }
  } catch {
    reasons.push('hook_check_failed');
  }

  try {
    if (await JailMonkey.isDebuggedMode()) {
      reasons.push('debugger_detected');
    }
  } catch {
    reasons.push('debugger_check_failed');
  }

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
  const compromised = normalizedReasons.some(reason =>
    reason === 'jailbreak_or_root_detected'
    || reason === 'runtime_hook_detected'
    || reason === 'debugger_detected',
  );

  let integrity: DeviceIntegrityLevel = 'device';
  if (compromised) {
    integrity = 'unknown';
  } else if (isEmulator) {
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
  if (snapshot.compromised) {
    getMobileTelemetry().trackError(new DeviceIntegrityError(snapshot.reasons), {
      feature: 'security.device_integrity',
      details: {
        reasons: snapshot.reasons.join(','),
      },
    });
    throw new DeviceIntegrityError(snapshot.reasons);
  }

  return snapshot;
}

export function resetDeviceIntegritySnapshotForTests(): void {
  cachedSnapshot = null;
}

