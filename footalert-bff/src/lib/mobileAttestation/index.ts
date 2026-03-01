import type {
  MobileAttestationType,
  MobilePlatform,
  VerifyMobileAttestationInput,
  VerifyMobileAttestationResult,
} from './types.js';

type VerifyMobileAttestationOptions = {
  acceptMock: boolean;
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

  // Provider-side verification should be wired here (Play Integrity / App Attest).
  return {
    ok: false,
    code: 'MOBILE_ATTESTATION_INVALID',
    message: 'Attestation provider verification is not configured.',
  };
}

export type { MobileIntegrityLevel, MobilePlatform } from './types.js';

