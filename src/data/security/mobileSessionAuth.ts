import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';
import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';

import { appEnv } from '@data/config/env';
import { httpPost } from '@data/api/http/client';
import { getAppVersion } from '@data/config/appMeta';
import {
  assertSensitiveDeviceIntegrity,
  type DeviceIntegrityLevel,
} from '@data/security/deviceIntegrity';
import {
  createProviderAttestationProvider,
  getMobileAttestationProviderStatus,
  MobileAttestationProviderUnavailableError,
  type MobileAttestationProvider,
} from '@data/security/mobileAttestationProvider';
import { getOrCreatePushDeviceId } from '@data/storage/pushTokenStorage';
import {
  getSecureString,
  removeSecureString,
  setSecureString,
} from '@data/storage/secureStorage';
import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';

type MobileSessionScope = 'notifications:write' | 'telemetry:write';

type MobileSessionTokenSnapshot = {
  accessToken: string;
  expiresAtMs: number;
  integrity: DeviceIntegrityLevel;
  obtainedAtMs: number;
};

type MobileSessionChallengeResponse = {
  challengeId: string;
  challenge: string;
  expiresAtMs: number;
};

type MobileSessionAttestResponse = {
  accessToken: string;
  expiresAtMs: number;
  integrity: DeviceIntegrityLevel;
};

export type MobileAttestationStartupHealth = {
  ready: boolean;
  mode: 'mock' | 'provider';
  strategy: 'strict' | 'best-effort' | 'disabled';
  providerName: string | null;
  supportsPlayIntegrity: boolean;
  supportsAppAttest: boolean;
};

const MOBILE_SESSION_SECURE_KEY = 'mobile_session_auth_v1';
const TOKEN_SAFETY_WINDOW_MS = 30_000;

let inFlightTokenRefresh: Promise<MobileSessionTokenSnapshot> | null = null;
let providerAttestationProvider: MobileAttestationProvider | null = null;

function resolvePlatform(): 'android' | 'ios' {
  return Platform.OS === 'ios' ? 'ios' : 'android';
}

function resolveAttestationType(platform: 'android' | 'ios'): 'play_integrity' | 'app_attest' {
  return platform === 'android' ? 'play_integrity' : 'app_attest';
}

function hashDeviceId(value: string): string {
  return bytesToHex(sha256(utf8ToBytes(value)));
}

function resolveSessionEndpoint(path: '/mobile/session/challenge' | '/mobile/session/attest'): string {
  return `${appEnv.mobileApiBaseUrl}${path}`;
}

function isTokenUsable(snapshot: MobileSessionTokenSnapshot | null): boolean {
  if (!snapshot) {
    return false;
  }

  return snapshot.expiresAtMs - TOKEN_SAFETY_WINDOW_MS > Date.now();
}

async function loadSessionSnapshot(): Promise<MobileSessionTokenSnapshot | null> {
  const rawValue = await getSecureString(MOBILE_SESSION_SECURE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as MobileSessionTokenSnapshot;
    if (
      typeof parsed.accessToken !== 'string'
      || typeof parsed.expiresAtMs !== 'number'
      || typeof parsed.obtainedAtMs !== 'number'
      || (parsed.integrity !== 'strong'
        && parsed.integrity !== 'device'
        && parsed.integrity !== 'basic'
        && parsed.integrity !== 'unknown')
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

async function saveSessionSnapshot(snapshot: MobileSessionTokenSnapshot): Promise<void> {
  await setSecureString(MOBILE_SESSION_SECURE_KEY, JSON.stringify(snapshot));
}

async function requestChallenge(deviceIdHash: string): Promise<MobileSessionChallengeResponse> {
  return httpPost<MobileSessionChallengeResponse>(
    resolveSessionEndpoint('/mobile/session/challenge'),
    {
      platform: resolvePlatform(),
      deviceIdHash,
      appVersion: getAppVersion(),
      buildNumber: DeviceInfo.getBuildNumber(),
    },
  );
}

function buildMockAttestationToken(input: {
  platform: 'android' | 'ios';
  integrity: DeviceIntegrityLevel;
  challenge: MobileSessionChallengeResponse;
  deviceIdHash: string;
}): string {
  const type = resolveAttestationType(input.platform);
  return `mock.${type}.${input.integrity}.${input.challenge.challengeId}.${input.deviceIdHash}.${input.challenge.challenge}`;
}

function shouldUseMockAttestationToken(): boolean {
  return (
    appEnv.mobileAuthAttestationMode === 'mock'
    || appEnv.mobileAttestationStrategy === 'disabled'
  );
}

async function requestAttestationToken(input: {
  challenge: MobileSessionChallengeResponse;
  deviceIdHash: string;
  integrity: DeviceIntegrityLevel;
}): Promise<MobileSessionAttestResponse> {
  const platform = resolvePlatform();
  const type = resolveAttestationType(platform);

  const fallbackToken = buildMockAttestationToken({
    platform,
    integrity: input.integrity,
    challenge: input.challenge,
    deviceIdHash: input.deviceIdHash,
  });

  let token = fallbackToken;
  if (!shouldUseMockAttestationToken()) {
    try {
      token = await getProviderAttestationProvider().getAttestationToken({
        platform,
        type,
        challengeId: input.challenge.challengeId,
        challenge: input.challenge.challenge,
        deviceIdHash: input.deviceIdHash,
        integrity: input.integrity,
      });
    } catch (error) {
      if (appEnv.mobileAttestationStrategy === 'strict') {
        throw error;
      }
      getMobileTelemetry().trackError(error, {
        feature: 'security.mobile_attestation.degraded',
        details: {
          strategy: appEnv.mobileAttestationStrategy,
          mode: appEnv.mobileAuthAttestationMode,
          fallback: 'mock',
        },
      });
      getMobileTelemetry().addBreadcrumb('security.mobile_attestation.fallback_to_mock', {
        strategy: appEnv.mobileAttestationStrategy,
      });
    }
  }

  return httpPost<MobileSessionAttestResponse>(
    resolveSessionEndpoint('/mobile/session/attest'),
    {
      challengeId: input.challenge.challengeId,
      platform,
      deviceIdHash: input.deviceIdHash,
      attestation: {
        type,
        token,
      },
    },
  );
}

function getProviderAttestationProvider(): MobileAttestationProvider {
  if (!providerAttestationProvider) {
    providerAttestationProvider = createProviderAttestationProvider();
  }
  return providerAttestationProvider;
}

export function verifyMobileAttestationStartupHealth(): MobileAttestationStartupHealth {
  const mode = appEnv.mobileAuthAttestationMode;
  const strategy = appEnv.mobileAttestationStrategy;
  const status = getMobileAttestationProviderStatus();

  if (mode === 'mock' || strategy === 'disabled') {
    return {
      ready: true,
      mode,
      strategy,
      providerName: status.providerName,
      supportsPlayIntegrity: status.supportsPlayIntegrity,
      supportsAppAttest: status.supportsAppAttest,
    };
  }

  if (status.available) {
    getMobileTelemetry().addBreadcrumb('security.mobile_attestation.startup_ready', {
      strategy,
      provider: status.providerName,
    });
    return {
      ready: true,
      mode,
      strategy,
      providerName: status.providerName,
      supportsPlayIntegrity: status.supportsPlayIntegrity,
      supportsAppAttest: status.supportsAppAttest,
    };
  }

  const error = new MobileAttestationProviderUnavailableError();
  if (strategy === 'strict') {
    throw error;
  }

  getMobileTelemetry().trackError(error, {
    feature: 'security.mobile_attestation.startup_degraded',
    details: {
      strategy,
      mode,
    },
  });
  getMobileTelemetry().addBreadcrumb('security.mobile_attestation.startup_degraded', {
    strategy,
    mode,
  });

  return {
    ready: false,
    mode,
    strategy,
    providerName: null,
    supportsPlayIntegrity: false,
    supportsAppAttest: false,
  };
}

async function refreshSessionToken(): Promise<MobileSessionTokenSnapshot> {
  const integritySnapshot = await assertSensitiveDeviceIntegrity();
  const deviceId = await getOrCreatePushDeviceId();
  const deviceIdHash = hashDeviceId(deviceId);

  const challenge = await requestChallenge(deviceIdHash);
  const attested = await requestAttestationToken({
    challenge,
    deviceIdHash,
    integrity: integritySnapshot.integrity,
  });

  const nextSnapshot: MobileSessionTokenSnapshot = {
    accessToken: attested.accessToken,
    expiresAtMs: attested.expiresAtMs,
    integrity: attested.integrity,
    obtainedAtMs: Date.now(),
  };
  await saveSessionSnapshot(nextSnapshot);
  return nextSnapshot;
}

export async function getMobileSessionToken(): Promise<MobileSessionTokenSnapshot> {
  const existingSnapshot = await loadSessionSnapshot();
  if (isTokenUsable(existingSnapshot)) {
    return existingSnapshot as MobileSessionTokenSnapshot;
  }

  if (!inFlightTokenRefresh) {
    inFlightTokenRefresh = refreshSessionToken().finally(() => {
      inFlightTokenRefresh = null;
    });
  }

  return inFlightTokenRefresh;
}

export async function buildSensitiveMobileAuthHeaders(options: {
  method: string;
  url: string;
  body?: unknown;
  scope: MobileSessionScope;
}): Promise<Record<string, string>> {
  const session = await getMobileSessionToken();
  getMobileTelemetry().addBreadcrumb('security.mobile_session.token_used', {
    scope: options.scope,
    integrity: session.integrity,
    expiresAtMs: session.expiresAtMs,
  });

  return {
    Authorization: `Bearer ${session.accessToken}`,
  };
}

export async function clearMobileSessionTokenForTests(): Promise<void> {
  await removeSecureString(MOBILE_SESSION_SECURE_KEY);
}

export function resetMobileSessionAuthStateForTests(): void {
  inFlightTokenRefresh = null;
  providerAttestationProvider = null;
}
