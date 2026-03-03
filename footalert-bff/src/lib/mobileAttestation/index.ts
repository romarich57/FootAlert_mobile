import type {
  MobileAttestationType,
  MobileIntegrityLevel,
  MobilePlatform,
  VerifyMobileAttestationInput,
  VerifyMobileAttestationResult,
} from './types.js';
import { verifyAppAttestToken } from './appAttestVerifier.js';
import { verifyPlayIntegrityToken } from './playIntegrityVerifier.js';

type VerifyMobileAttestationOptions = {
  acceptMock: boolean;
  enforcementMode: 'strict' | 'report_only';
};

function isTypeCompatibleWithPlatform(type: MobileAttestationType, platform: MobilePlatform): boolean {
  if (platform === 'android') {
    return type === 'play_integrity';
  }

  return type === 'app_attest';
}

function verifyMockAttestation(input: VerifyMobileAttestationInput): VerifyMobileAttestationResult {
  const parts = input.token.split('.');
  if (parts.length !== 6 || parts[0] !== 'mock') {
    return {
      ok: false,
      code: 'MOBILE_ATTESTATION_INVALID',
      message: 'Malformed attestation token.',
    };
  }

  const [, type, integrity, challengeId, deviceIdHash, challenge] = parts;
  if (type !== input.type) {
    return {
      ok: false,
      code: 'MOBILE_ATTESTATION_INVALID',
      message: 'Attestation type mismatch.',
    };
  }

  if (!isTypeCompatibleWithPlatform(input.type, input.platform)) {
    return {
      ok: false,
      code: 'MOBILE_ATTESTATION_INVALID',
      message: 'Attestation type is incompatible with platform.',
    };
  }

  if (challengeId !== input.challengeId || challenge !== input.challenge || deviceIdHash !== input.deviceIdHash) {
    return {
      ok: false,
      code: 'MOBILE_ATTESTATION_INVALID',
      message: 'Attestation claims mismatch.',
    };
  }

  if (integrity !== 'strong' && integrity !== 'device' && integrity !== 'basic' && integrity !== 'unknown') {
    return {
      ok: false,
      code: 'MOBILE_ATTESTATION_INVALID',
      message: 'Attestation integrity level is invalid.',
    };
  }

  return {
    ok: true,
    integrity,
  };
}

export async function verifyMobileAttestation(
  input: VerifyMobileAttestationInput,
  options: VerifyMobileAttestationOptions,
): Promise<VerifyMobileAttestationResult> {
  if (!input.token.trim()) {
    return {
      ok: false,
      code: 'MOBILE_ATTESTATION_REQUIRED',
      message: 'Missing mobile attestation token.',
    };
  }

  if (input.token.startsWith('mock.')) {
    if (!options.acceptMock) {
      return {
        ok: false,
        code: 'MOBILE_ATTESTATION_INVALID',
        message: 'Mock attestation is disabled.',
      };
    }

    return verifyMockAttestation(input);
  }

  if (!isTypeCompatibleWithPlatform(input.type, input.platform)) {
    return {
      ok: false,
      code: 'MOBILE_ATTESTATION_INVALID',
      message: 'Attestation type is incompatible with platform.',
    };
  }

  let providerResult: VerifyMobileAttestationResult;
  if (input.type === 'play_integrity') {
    providerResult = await verifyPlayIntegrityToken(input);
  } else {
    providerResult = await verifyAppAttestToken(input);
  }

  if (providerResult.ok) {
    return providerResult;
  }

  if (options.enforcementMode === 'report_only') {
    return {
      ok: true,
      integrity: fallbackIntegrityFromPlatform(input.platform),
    };
  }

  return providerResult;
}

export type { MobileIntegrityLevel, MobilePlatform } from './types.js';

function fallbackIntegrityFromPlatform(platform: MobilePlatform): MobileIntegrityLevel {
  if (platform === 'ios') {
    return 'device';
  }

  return 'basic';
}
