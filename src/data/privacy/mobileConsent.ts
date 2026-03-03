import { NativeModules } from 'react-native';

import { getJsonValue, setJsonValue } from '@data/storage/asyncStorage';

const MOBILE_CONSENT_STORAGE_KEY = 'mobile_consent_v1';

export type MobileConsentStatus =
  | 'unknown'
  | 'required'
  | 'granted'
  | 'denied'
  | 'not_required';

export type MobileConsentSnapshot = {
  status: MobileConsentStatus;
  updatedAtMs: number;
  source: 'native' | 'fallback';
};

type MobileConsentNativeModule = {
  getConsentStatus?: () => Promise<unknown>;
  requestConsentIfRequired?: () => Promise<unknown>;
  openPrivacyOptionsForm?: () => Promise<unknown>;
};

function parseMobileConsentStatus(value: unknown): MobileConsentStatus {
  if (typeof value !== 'string') {
    return 'unknown';
  }

  const normalized = value.trim().toLowerCase();
  if (
    normalized === 'unknown'
    || normalized === 'required'
    || normalized === 'granted'
    || normalized === 'denied'
    || normalized === 'not_required'
  ) {
    return normalized;
  }

  return 'unknown';
}

function resolveNativeConsentModule(): MobileConsentNativeModule | null {
  const modules = NativeModules as Record<string, unknown>;
  const candidate = modules.MobileConsent ?? modules.GoogleUMPConsent;
  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  return candidate as MobileConsentNativeModule;
}

function buildSnapshot(
  status: MobileConsentStatus,
  source: 'native' | 'fallback',
): MobileConsentSnapshot {
  return {
    status,
    source,
    updatedAtMs: Date.now(),
  };
}

async function persistSnapshot(snapshot: MobileConsentSnapshot): Promise<void> {
  await setJsonValue(MOBILE_CONSENT_STORAGE_KEY, snapshot);
}

export async function getStoredMobileConsentSnapshot(): Promise<MobileConsentSnapshot> {
  const stored = await getJsonValue<Partial<MobileConsentSnapshot>>(MOBILE_CONSENT_STORAGE_KEY);
  if (!stored) {
    return buildSnapshot('unknown', 'fallback');
  }

  const parsedStatus = parseMobileConsentStatus(stored.status);
  const parsedUpdatedAtMs = typeof stored.updatedAtMs === 'number' ? stored.updatedAtMs : Date.now();
  const parsedSource = stored.source === 'native' ? 'native' : 'fallback';

  return {
    status: parsedStatus,
    updatedAtMs: parsedUpdatedAtMs,
    source: parsedSource,
  };
}

export async function syncMobileConsentStatus(): Promise<MobileConsentSnapshot> {
  const nativeModule = resolveNativeConsentModule();
  if (!nativeModule?.getConsentStatus) {
    return getStoredMobileConsentSnapshot();
  }

  const status = parseMobileConsentStatus(await nativeModule.getConsentStatus());
  const snapshot = buildSnapshot(status, 'native');
  await persistSnapshot(snapshot);
  return snapshot;
}

export async function requestMobileConsentIfNeeded(): Promise<MobileConsentSnapshot> {
  const nativeModule = resolveNativeConsentModule();
  if (!nativeModule?.requestConsentIfRequired) {
    return syncMobileConsentStatus();
  }

  const status = parseMobileConsentStatus(await nativeModule.requestConsentIfRequired());
  const snapshot = buildSnapshot(status, 'native');
  await persistSnapshot(snapshot);
  return snapshot;
}

export async function openMobileConsentPreferences(): Promise<MobileConsentSnapshot> {
  const nativeModule = resolveNativeConsentModule();
  if (!nativeModule?.openPrivacyOptionsForm) {
    return syncMobileConsentStatus();
  }

  const status = parseMobileConsentStatus(await nativeModule.openPrivacyOptionsForm());
  const snapshot = buildSnapshot(status, 'native');
  await persistSnapshot(snapshot);
  return snapshot;
}
