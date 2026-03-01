import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { env } from '../config/env.js';
import { incrementMobileAuthMetric } from '../lib/mobileAuthMetrics.js';
import { verifyMobileAttestation } from '../lib/mobileAttestation/index.js';
import {
  consumeMobileSessionChallenge,
  createMobileSessionChallenge,
} from '../lib/mobileSessionChallengeStore.js';
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

const sensitiveScopes = ['notifications:write', 'telemetry:write'] as const;

export async function registerMobileSessionRoutes(app: FastifyInstance): Promise<void> {
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

    const attestationResult = await verifyMobileAttestation(
      {
        platform: payload.platform,
        type: payload.attestation.type,
        token: payload.attestation.token,
        challenge: challenge.challenge,
        challengeId: challenge.challengeId,
        deviceIdHash: challenge.deviceIdHash,
      },
      {
        acceptMock: env.mobileAttestationAcceptMock,
      },
    );

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
      scope: [...sensitiveScopes],
      ttlMs: env.mobileSessionTokenTtlMs,
      secret: env.mobileSessionJwtSecret,
    });

    incrementMobileAuthMetric('mobile_auth_attest_success_total');
    return {
      accessToken: sessionToken.token,
      expiresAtMs: sessionToken.expiresAtMs,
      integrity: attestationResult.integrity,
    };
  });
}
