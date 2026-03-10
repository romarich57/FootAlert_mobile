import { createSign } from 'node:crypto';
import { env } from '../../config/env.js';
function encodeBase64Url(value) {
    return Buffer.from(value, 'utf8')
        .toString('base64')
        .replaceAll('+', '-')
        .replaceAll('/', '_')
        .replaceAll('=', '');
}
function decodeBase64Url(value) {
    const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
    const padLength = (4 - (normalized.length % 4)) % 4;
    const padded = normalized.padEnd(normalized.length + padLength, '=');
    try {
        return Buffer.from(padded, 'base64').toString('utf8');
    }
    catch {
        return null;
    }
}
function signServiceAccountAssertion(assertion, privateKey) {
    try {
        const signer = createSign('RSA-SHA256');
        signer.update(assertion);
        signer.end();
        return signer
            .sign(privateKey, 'base64')
            .replaceAll('+', '-')
            .replaceAll('/', '_')
            .replaceAll('=', '');
    }
    catch {
        return null;
    }
}
async function getPlayIntegrityAccessToken() {
    if (!env.mobilePlayIntegrityServiceAccountEmail || !env.mobilePlayIntegrityServiceAccountPrivateKey) {
        return null;
    }
    const nowSec = Math.floor(Date.now() / 1_000);
    const assertionHeader = encodeBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const assertionClaims = encodeBase64Url(JSON.stringify({
        iss: env.mobilePlayIntegrityServiceAccountEmail,
        scope: 'https://www.googleapis.com/auth/playintegrity',
        aud: 'https://oauth2.googleapis.com/token',
        iat: nowSec,
        exp: nowSec + 3600,
    }));
    const unsignedAssertion = `${assertionHeader}.${assertionClaims}`;
    const privateKey = env.mobilePlayIntegrityServiceAccountPrivateKey.replaceAll('\\n', '\n');
    const signature = signServiceAccountAssertion(unsignedAssertion, privateKey);
    if (!signature) {
        return null;
    }
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: `${unsignedAssertion}.${signature}`,
        }),
    });
    if (!tokenResponse.ok) {
        return null;
    }
    const parsed = (await tokenResponse.json());
    if (!parsed.access_token || typeof parsed.access_token !== 'string') {
        return null;
    }
    return parsed.access_token;
}
async function decodeIntegrityToken(integrityToken, accessToken) {
    if (!env.mobilePlayIntegrityPackageName) {
        return null;
    }
    const response = await fetch(`https://playintegrity.googleapis.com/v1/${encodeURIComponent(env.mobilePlayIntegrityPackageName)}:decodeIntegrityToken`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            integrity_token: integrityToken,
        }),
    });
    if (!response.ok) {
        return null;
    }
    return (await response.json());
}
function parseNonce(nonce) {
    const decoded = decodeBase64Url(nonce);
    if (!decoded) {
        return null;
    }
    try {
        const parsed = JSON.parse(decoded);
        if (typeof parsed.challengeId === 'string'
            && typeof parsed.challenge === 'string'
            && typeof parsed.deviceIdHash === 'string') {
            return {
                challengeId: parsed.challengeId,
                challenge: parsed.challenge,
                deviceIdHash: parsed.deviceIdHash,
            };
        }
    }
    catch {
        return null;
    }
    return null;
}
function resolveIntegrityFromVerdict(verdicts) {
    if (!Array.isArray(verdicts)) {
        return 'unknown';
    }
    if (verdicts.includes('MEETS_STRONG_INTEGRITY')) {
        return 'strong';
    }
    if (verdicts.includes('MEETS_DEVICE_INTEGRITY')) {
        return 'device';
    }
    if (verdicts.includes('MEETS_BASIC_INTEGRITY')) {
        return 'basic';
    }
    return 'unknown';
}
function isNonceCompatible(input, nonce) {
    if (!nonce || typeof nonce !== 'string') {
        return false;
    }
    const parsed = parseNonce(nonce);
    if (!parsed) {
        return false;
    }
    return (parsed.challengeId === input.challengeId
        && parsed.challenge === input.challenge
        && parsed.deviceIdHash === input.deviceIdHash);
}
export async function verifyPlayIntegrityToken(input) {
    if (!env.mobilePlayIntegrityPackageName) {
        return {
            ok: false,
            code: 'MOBILE_ATTESTATION_INVALID',
            message: 'Play Integrity package name is not configured.',
        };
    }
    const accessToken = await getPlayIntegrityAccessToken();
    if (!accessToken) {
        return {
            ok: false,
            code: 'MOBILE_ATTESTATION_INVALID',
            message: 'Play Integrity OAuth token could not be acquired.',
        };
    }
    const decoded = await decodeIntegrityToken(input.token, accessToken);
    if (!decoded?.tokenPayloadExternal) {
        return {
            ok: false,
            code: 'MOBILE_ATTESTATION_INVALID',
            message: 'Play Integrity token decoding failed.',
        };
    }
    const payload = decoded.tokenPayloadExternal;
    const requestPackageName = payload.requestDetails?.requestPackageName;
    const appPackageName = payload.appIntegrity?.packageName;
    if ((requestPackageName && requestPackageName !== env.mobilePlayIntegrityPackageName)
        || (appPackageName && appPackageName !== env.mobilePlayIntegrityPackageName)) {
        return {
            ok: false,
            code: 'MOBILE_ATTESTATION_INVALID',
            message: 'Play Integrity package mismatch.',
        };
    }
    if (!isNonceCompatible(input, payload.requestDetails?.nonce)) {
        return {
            ok: false,
            code: 'MOBILE_ATTESTATION_INVALID',
            message: 'Play Integrity nonce mismatch.',
        };
    }
    if (payload.appIntegrity?.appRecognitionVerdict !== 'PLAY_RECOGNIZED') {
        return {
            ok: false,
            code: 'MOBILE_ATTESTATION_INVALID',
            message: 'Play Integrity app recognition failed.',
        };
    }
    return {
        ok: true,
        integrity: resolveIntegrityFromVerdict(payload.deviceIntegrity?.deviceRecognitionVerdict),
    };
}
