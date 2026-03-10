import { env } from '../../config/env.js';
export async function verifyAppAttestToken(input) {
    if (!env.mobileAppAttestVerificationUrl) {
        return {
            ok: false,
            code: 'MOBILE_ATTESTATION_INVALID',
            message: 'App Attest verification endpoint is not configured.',
        };
    }
    const headers = {
        'content-type': 'application/json',
    };
    if (env.mobileAppAttestVerificationSecret) {
        headers['x-attestation-secret'] = env.mobileAppAttestVerificationSecret;
    }
    const response = await fetch(env.mobileAppAttestVerificationUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            platform: input.platform,
            type: input.type,
            token: input.token,
            challengeId: input.challengeId,
            challenge: input.challenge,
            deviceIdHash: input.deviceIdHash,
            bundleId: env.mobileAppAttestBundleId,
            teamId: env.mobileAppAttestTeamId,
        }),
    });
    if (!response.ok) {
        return {
            ok: false,
            code: 'MOBILE_ATTESTATION_INVALID',
            message: 'App Attest verification request failed.',
        };
    }
    const payload = (await response.json());
    if (!payload.ok) {
        return {
            ok: false,
            code: 'MOBILE_ATTESTATION_INVALID',
            message: 'App Attest verification failed.',
        };
    }
    if (payload.challengeId !== input.challengeId
        || payload.challenge !== input.challenge
        || payload.deviceIdHash !== input.deviceIdHash) {
        return {
            ok: false,
            code: 'MOBILE_ATTESTATION_INVALID',
            message: 'App Attest claims mismatch.',
        };
    }
    const integrity = payload.integrity ?? 'device';
    if (integrity !== 'strong' && integrity !== 'device' && integrity !== 'basic' && integrity !== 'unknown') {
        return {
            ok: false,
            code: 'MOBILE_ATTESTATION_INVALID',
            message: 'App Attest integrity level is invalid.',
        };
    }
    return {
        ok: true,
        integrity,
    };
}
