export type MobilePlatform = 'android' | 'ios';

export type MobileAttestationType = 'play_integrity' | 'app_attest';

export type MobileIntegrityLevel = 'strong' | 'device' | 'basic' | 'unknown';

export type VerifyMobileAttestationInput = {
  platform: MobilePlatform;
  type: MobileAttestationType;
  token: string;
  challenge: string;
  challengeId: string;
  deviceIdHash: string;
};

export type VerifyMobileAttestationResult =
  | {
    ok: true;
    integrity: MobileIntegrityLevel;
  }
  | {
    ok: false;
    code: 'MOBILE_ATTESTATION_INVALID' | 'MOBILE_ATTESTATION_REQUIRED';
    message: string;
  };

