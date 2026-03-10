import { z } from 'zod';
import { env } from '../config/env.js';
import { incrementMobileAuthMetric } from '../lib/mobileAuthMetrics.js';
import { getMobileSessionRefreshStore } from '../lib/mobileSessionRefreshRuntime.js';
import { verifyMobileAttestation } from '../lib/mobileAttestation/index.js';
import { consumeMobileSessionChallenge, createMobileSessionChallenge, } from '../lib/mobileSessionChallengeStore.js';
import { createMobileSessionToken } from '../lib/mobileSessionToken.js';
import { parseOrThrow } from '../lib/validation.js';
const challengeBodySchema = z
    .object({
    platform: z.enum(['android', 'ios']),
    deviceIdHash: z.string().trim().min(8).max(256),
    appVersion: z.string().trim().min(1).max(64),
    buildNumber: z.string().trim().min(1).max(64),
})
    .strict();
const attestBodySchema = z
    .object({
    challengeId: z.string().trim().min(1).max(128),
    platform: z.enum(['android', 'ios']),
    deviceIdHash: z.string().trim().min(8).max(256),
    attestation: z
        .object({
        type: z.enum(['play_integrity', 'app_attest']),
        token: z.string().trim().min(1),
    })
        .strict(),
})
    .strict();
const sessionScopes = ['api:read', 'notifications:write', 'telemetry:write', 'privacy:erase'];
const refreshBodySchema = z
    .object({
    refreshToken: z.string().trim().min(1).max(512),
})
    .strict();
const revokeBodySchema = z
    .object({
    refreshToken: z.string().trim().min(1).max(512),
})
    .strict();
function mapRefreshFailure(code) {
    if (code === 'EXPIRED') {
        return {
            error: 'MOBILE_SESSION_TOKEN_EXPIRED',
            message: 'Refresh token is expired.',
        };
    }
    if (code === 'REPLAYED') {
        return {
            error: 'MOBILE_SESSION_TOKEN_INVALID',
            message: 'Refresh token replay detected.',
        };
    }
    if (code === 'REVOKED') {
        return {
            error: 'MOBILE_SESSION_TOKEN_INVALID',
            message: 'Refresh token is revoked.',
        };
    }
    return {
        error: 'MOBILE_SESSION_TOKEN_INVALID',
        message: 'Refresh token is invalid.',
    };
}
export async function registerMobileSessionRoutes(app) {
    const refreshStore = await getMobileSessionRefreshStore({
        backend: env.notificationsPersistenceBackend,
        databaseUrl: env.databaseUrl,
    });
    app.post('/v1/mobile/session/challenge', async (request, _reply) => {
        parseOrThrow(z.object({}).strict(), request.query);
        const payload = parseOrThrow(challengeBodySchema, request.body);
        const challenge = createMobileSessionChallenge({
            platform: payload.platform,
            deviceIdHash: payload.deviceIdHash,
            appVersion: payload.appVersion,
            buildNumber: payload.buildNumber,
            ttlMs: env.mobileAuthChallengeTtlMs,
        });
        return {
            challengeId: challenge.challengeId,
            challenge: challenge.challenge,
            expiresAtMs: challenge.expiresAtMs,
        };
    });
    app.post('/v1/mobile/session/attest', async (request, reply) => {
        parseOrThrow(z.object({}).strict(), request.query);
        const payload = parseOrThrow(attestBodySchema, request.body);
        const challenge = consumeMobileSessionChallenge(payload.challengeId);
        if (!challenge) {
            incrementMobileAuthMetric('mobile_auth_attest_failure_total');
            reply.code(401).send({
                error: 'MOBILE_ATTESTATION_INVALID',
                message: 'Unknown or expired mobile challenge.',
            });
            return;
        }
        if (challenge.platform !== payload.platform || challenge.deviceIdHash !== payload.deviceIdHash) {
            incrementMobileAuthMetric('mobile_auth_attest_failure_total');
            reply.code(401).send({
                error: 'MOBILE_ATTESTATION_INVALID',
                message: 'Challenge context mismatch.',
            });
            return;
        }
        const attestationResult = await verifyMobileAttestation({
            platform: payload.platform,
            type: payload.attestation.type,
            token: payload.attestation.token,
            challenge: challenge.challenge,
            challengeId: challenge.challengeId,
            deviceIdHash: challenge.deviceIdHash,
        }, {
            acceptMock: env.mobileAttestationAcceptMock,
            enforcementMode: env.mobileAttestationEnforcementMode,
        });
        if (!attestationResult.ok) {
            incrementMobileAuthMetric('mobile_auth_attest_failure_total');
            reply.code(401).send({
                error: attestationResult.code,
                message: attestationResult.message,
            });
            return;
        }
        if (!env.mobileSessionJwtSecret) {
            incrementMobileAuthMetric('mobile_auth_attest_failure_total');
            reply.code(500).send({
                error: 'INTERNAL_SERVER_ERROR',
                message: 'Mobile session token secret is not configured.',
            });
            return;
        }
        const sessionToken = createMobileSessionToken({
            subject: challenge.deviceIdHash,
            platform: challenge.platform,
            integrity: attestationResult.integrity,
            scope: [...sessionScopes],
            ttlMs: env.mobileSessionTokenTtlMs,
            secret: env.mobileSessionJwtSecret,
        });
        const refreshSession = await refreshStore.issue({
            subject: challenge.deviceIdHash,
            platform: challenge.platform,
            integrity: attestationResult.integrity,
            scope: [...sessionScopes],
            ttlMs: env.mobileRefreshTokenTtlMs,
        });
        incrementMobileAuthMetric('mobile_auth_attest_success_total');
        return {
            accessToken: sessionToken.token,
            expiresAtMs: sessionToken.expiresAtMs,
            refreshToken: refreshSession.refreshToken,
            refreshExpiresAtMs: refreshSession.refreshExpiresAtMs,
            integrity: attestationResult.integrity,
        };
    });
    app.post('/v1/mobile/session/refresh', async (request, reply) => {
        parseOrThrow(z.object({}).strict(), request.query);
        const payload = parseOrThrow(refreshBodySchema, request.body);
        if (!env.mobileSessionJwtSecret) {
            reply.code(500).send({
                error: 'INTERNAL_SERVER_ERROR',
                message: 'Mobile session token secret is not configured.',
            });
            return;
        }
        const rotated = await refreshStore.rotate({
            refreshToken: payload.refreshToken,
            ttlMs: env.mobileRefreshTokenTtlMs,
        });
        if (!rotated.ok) {
            const failure = mapRefreshFailure(rotated.code);
            reply.code(401).send(failure);
            return;
        }
        const accessToken = createMobileSessionToken({
            subject: rotated.subject,
            platform: rotated.platform,
            integrity: rotated.integrity,
            scope: rotated.scope,
            ttlMs: env.mobileSessionTokenTtlMs,
            secret: env.mobileSessionJwtSecret,
        });
        return {
            accessToken: accessToken.token,
            expiresAtMs: accessToken.expiresAtMs,
            refreshToken: rotated.refreshToken,
            refreshExpiresAtMs: rotated.refreshExpiresAtMs,
            integrity: rotated.integrity,
        };
    });
    app.post('/v1/mobile/session/revoke', async (request, reply) => {
        parseOrThrow(z.object({}).strict(), request.query);
        const payload = parseOrThrow(revokeBodySchema, request.body);
        await refreshStore.revokeFamilyByToken({
            refreshToken: payload.refreshToken,
        });
        reply.code(204).send();
    });
}
