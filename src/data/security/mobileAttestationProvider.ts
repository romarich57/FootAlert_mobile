import { NativeModules } from 'react-native';

import type { DeviceIntegrityLevel } from '@data/security/deviceIntegrity';

export type MobileAttestationType = 'play_integrity' | 'app_attest';
export type MobileAttestationPlatform = 'android' | 'ios';

export type MobileAttestationProviderInput = {
  platform: MobileAttestationPlatform;
  type: MobileAttestationType;
  challengeId: string;
  challenge: string;
  deviceIdHash: string;
  integrity: DeviceIntegrityLevel;
};

export interface MobileAttestationProvider {
  getAttestationToken(input: MobileAttestationProviderInput): Promise<string>;
}

export class MobileAttestationProviderUnavailableError extends Error {
  constructor() {
    super(
      'Native mobile attestation provider is unavailable. Configure Play Integrity/App Attest bridge modules.',
    );
    this.name = 'MobileAttestationProviderUnavailableError';
  }
}

type NativeAttestationModule = {
  getPlayIntegrityToken?: (input: {
    challenge: string;
    challengeId: string;
    deviceIdHash: string;
    integrity: DeviceIntegrityLevel;
  }) => Promise<string>;
  getAppAttestToken?: (input: {
    challenge: string;
    challengeId: string;
    deviceIdHash: string;
    integrity: DeviceIntegrityLevel;
  }) => Promise<string>;
};

type NativeAttestationModuleResolution = {
  name: string;
  module: NativeAttestationModule;
};

export type MobileAttestationProviderStatus = {
  available: boolean;
  providerName: string | null;
  supportsPlayIntegrity: boolean;
  supportsAppAttest: boolean;
};

declare global {
  // Test hook to inject a provider without loading a native bridge.
  var __FOOTALERT_MOBILE_ATTESTATION_PROVIDER__: MobileAttestationProvider | undefined;
}

function resolveNativeAttestationModule(): NativeAttestationModuleResolution | null {
  const modules = NativeModules as Record<string, unknown>;
  const candidates = ['FootAlertAttestation', 'MobileAttestation'];
  for (const name of candidates) {
    const module = modules[name] as NativeAttestationModule | undefined;
    if (!module) {
      continue;
    }

    if (
      typeof module.getPlayIntegrityToken === 'function'
      || typeof module.getAppAttestToken === 'function'
    ) {
      return { name, module };
    }
  }

  return null;
}

export function getMobileAttestationProviderStatus(): MobileAttestationProviderStatus {
  const resolution = resolveNativeAttestationModule();
  return {
    available: Boolean(resolution),
    providerName: resolution?.name ?? null,
    supportsPlayIntegrity: Boolean(resolution?.module.getPlayIntegrityToken),
    supportsAppAttest: Boolean(resolution?.module.getAppAttestToken),
  };
}

function assertAttestationToken(token: unknown): string {
  if (typeof token !== 'string' || token.trim().length === 0) {
    throw new Error('Native attestation provider returned an empty token.');
  }

  return token;
}

class NativeMobileAttestationProvider implements MobileAttestationProvider {
  async getAttestationToken(input: MobileAttestationProviderInput): Promise<string> {
    const resolution = resolveNativeAttestationModule();
    if (!resolution) {
      throw new MobileAttestationProviderUnavailableError();
    }
    const nativeModule = resolution.module;

    if (input.type === 'play_integrity') {
      if (typeof nativeModule.getPlayIntegrityToken !== 'function') {
        throw new MobileAttestationProviderUnavailableError();
      }

      const token = await nativeModule.getPlayIntegrityToken({
        challenge: input.challenge,
        challengeId: input.challengeId,
        deviceIdHash: input.deviceIdHash,
        integrity: input.integrity,
      });
      return assertAttestationToken(token);
    }

    if (typeof nativeModule.getAppAttestToken !== 'function') {
      throw new MobileAttestationProviderUnavailableError();
    }

    const token = await nativeModule.getAppAttestToken({
      challenge: input.challenge,
      challengeId: input.challengeId,
      deviceIdHash: input.deviceIdHash,
      integrity: input.integrity,
    });
    return assertAttestationToken(token);
  }
}

export function createProviderAttestationProvider(): MobileAttestationProvider {
  if (globalThis.__FOOTALERT_MOBILE_ATTESTATION_PROVIDER__) {
    return globalThis.__FOOTALERT_MOBILE_ATTESTATION_PROVIDER__;
  }

  return new NativeMobileAttestationProvider();
}
