import { getJsonValue, removeValue } from '@data/storage/asyncStorage';
import type {
  PushTokenPlatform,
  PushTokenProvider,
} from '@data/endpoints/notificationsApi';
import {
  getSecureString,
  removeSecureString,
  setSecureString,
} from '@data/storage/secureStorage';
import type { AppLanguage } from '@/shared/types/preferences.types';

const LEGACY_PUSH_REGISTRATION_STORAGE_KEY = 'push_registration_v1';
const LEGACY_PUSH_DEVICE_ID_STORAGE_KEY = 'push_device_id_v1';
const PUSH_REGISTRATION_SECURE_KEY = 'push_registration_v2';
const PUSH_DEVICE_ID_SECURE_KEY = 'push_device_id_v2';

export type PushRegistrationSnapshot = {
  token: string;
  deviceId: string;
  platform: PushTokenPlatform;
  provider: PushTokenProvider;
  locale: AppLanguage;
  timezone: string;
  appVersion: string;
  updatedAt: string;
};

function parseSnapshot(rawValue: string | null): PushRegistrationSnapshot | null {
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as PushRegistrationSnapshot;
  } catch {
    return null;
  }
}

function buildRandomDeviceId(): string {
  const runtimeGlobal = globalThis as { crypto?: { randomUUID?: () => string } };
  const runtimeCrypto = runtimeGlobal.crypto;
  if (runtimeCrypto && typeof runtimeCrypto.randomUUID === 'function') {
    return runtimeCrypto.randomUUID();
  }

  return `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function getPushRegistrationSnapshot(): Promise<PushRegistrationSnapshot | null> {
  const securedSnapshot = parseSnapshot(
    await getSecureString(PUSH_REGISTRATION_SECURE_KEY),
  );
  if (securedSnapshot) {
    return securedSnapshot;
  }

  const legacySnapshot = await getJsonValue<PushRegistrationSnapshot>(
    LEGACY_PUSH_REGISTRATION_STORAGE_KEY,
  );
  if (!legacySnapshot) {
    return null;
  }

  await setSecureString(
    PUSH_REGISTRATION_SECURE_KEY,
    JSON.stringify(legacySnapshot),
  );
  await removeValue(LEGACY_PUSH_REGISTRATION_STORAGE_KEY);
  return legacySnapshot;
}

export async function savePushRegistrationSnapshot(
  snapshot: Omit<PushRegistrationSnapshot, 'updatedAt'>,
): Promise<PushRegistrationSnapshot> {
  const nextSnapshot: PushRegistrationSnapshot = {
    ...snapshot,
    updatedAt: new Date().toISOString(),
  };
  await setSecureString(
    PUSH_REGISTRATION_SECURE_KEY,
    JSON.stringify(nextSnapshot),
  );
  await removeValue(LEGACY_PUSH_REGISTRATION_STORAGE_KEY);
  return nextSnapshot;
}

export async function clearPushRegistrationSnapshot(): Promise<void> {
  await removeSecureString(PUSH_REGISTRATION_SECURE_KEY);
  await removeValue(LEGACY_PUSH_REGISTRATION_STORAGE_KEY);
}

export async function getOrCreatePushDeviceId(): Promise<string> {
  const securedDeviceId = await getSecureString(PUSH_DEVICE_ID_SECURE_KEY);
  if (typeof securedDeviceId === 'string' && securedDeviceId.length > 0) {
    return securedDeviceId;
  }

  const legacyDeviceId = await getJsonValue<string>(LEGACY_PUSH_DEVICE_ID_STORAGE_KEY);
  if (typeof legacyDeviceId === 'string' && legacyDeviceId.length > 0) {
    await setSecureString(PUSH_DEVICE_ID_SECURE_KEY, legacyDeviceId);
    await removeValue(LEGACY_PUSH_DEVICE_ID_STORAGE_KEY);
    return legacyDeviceId;
  }

  const nextDeviceId = buildRandomDeviceId();
  await setSecureString(PUSH_DEVICE_ID_SECURE_KEY, nextDeviceId);
  await removeValue(LEGACY_PUSH_DEVICE_ID_STORAGE_KEY);
  return nextDeviceId;
}
