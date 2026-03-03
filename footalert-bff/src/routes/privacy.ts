import { createHash, randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { env } from '../config/env.js';
import { verifyMobileAttestation } from '../lib/mobileAttestation/index.js';
import { verifySensitiveMobileAuth } from '../lib/mobileSessionAuth.js';
import { getMobileSessionRefreshStore } from '../lib/mobileSessionRefreshRuntime.js';
import {
  consumeMobileSessionChallenge,
} from '../lib/mobileSessionChallengeStore.js';
import { getNotificationsStore } from '../lib/notifications/runtime.js';
import { parseOrThrow } from '../lib/validation.js';

const eraseBodySchema = z
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

type PrivacyAuditStore = {
  recordErase: (input: {
    requestId: string;
    subject: string;
    platform: 'android' | 'ios';
    erasedAtMs: number;
  }) => Promise<void>;
  close: () => Promise<void>;
};

function hashSubject(subject: string): string {
  return createHash('sha256').update(subject).digest('hex');
}

function isAtLeastDeviceIntegrity(integrity: 'strong' | 'device' | 'basic' | 'unknown'): boolean {
  return integrity === 'strong' || integrity === 'device';
}

function createMemoryPrivacyAuditStore(): PrivacyAuditStore {
  return {
    async recordErase() {
      return undefined;
    },
    async close() {
      return undefined;
    },
  };
}

async function createPostgresPrivacyAuditStore(databaseUrl: string): Promise<PrivacyAuditStore> {
  const pgModule = await import('pg');
  const PoolClass = (pgModule as { Pool?: new (config: { connectionString: string }) => {
    query: <T = unknown>(text: string, params?: unknown[]) => Promise<{ rows: T[] }>;
    end: () => Promise<void>;
  } }).Pool;
  if (!PoolClass) {
    throw new Error('Failed to load pg.Pool for privacy audit store.');
  }

  const pool = new PoolClass({
    connectionString: databaseUrl,
  });

  return {
    async recordErase(input) {
      await pool.query(
        `
          INSERT INTO mobile_privacy_erasure_audit (
            request_id,
            subject_hash,
            platform,
            erased_at
          ) VALUES (
            $1,
            $2,
            $3,
            to_timestamp($4 / 1000.0)
          )
        `,
        [
          input.requestId,
          hashSubject(input.subject),
          input.platform,
          input.erasedAtMs,
        ],
      );
    },
    async close() {
      await pool.end();
    },
  };
}

async function createPrivacyAuditStore(): Promise<PrivacyAuditStore> {
  if (env.notificationsPersistenceBackend === 'postgres' && env.databaseUrl) {
    return createPostgresPrivacyAuditStore(env.databaseUrl);
  }

  return createMemoryPrivacyAuditStore();
}

export async function registerPrivacyRoutes(app: FastifyInstance): Promise<void> {
  const notificationsStore = await getNotificationsStore({
    backend: env.notificationsPersistenceBackend,
    databaseUrl: env.databaseUrl,
  });
  const refreshStore = await getMobileSessionRefreshStore({
    backend: env.notificationsPersistenceBackend,
    databaseUrl: env.databaseUrl,
  });
  const auditStore = await createPrivacyAuditStore();

  app.addHook('onClose', async () => {
    await auditStore.close();
  });

  app.post('/v1/mobile/privacy/erase', async (request, reply) => {
    const authResult = verifySensitiveMobileAuth(request, {
      requiredScope: 'privacy:erase',
      jwtSecret: env.mobileSessionJwtSecret,
      minIntegrity: 'device',
    });
    if (!authResult.ok) {
      reply.code(authResult.failure.statusCode).send({
        error: authResult.failure.code,
        message: authResult.failure.message,
      });
      return;
    }

    parseOrThrow(z.object({}).strict(), request.query);
    const payload = parseOrThrow(eraseBodySchema, request.body);

    const challenge = consumeMobileSessionChallenge(payload.challengeId);
    if (!challenge) {
      reply.code(401).send({
        error: 'MOBILE_ATTESTATION_INVALID',
        message: 'Unknown or expired mobile challenge.',
      });
      return;
    }

    if (
      challenge.platform !== payload.platform
      || challenge.deviceIdHash !== payload.deviceIdHash
      || authResult.context.subject !== payload.deviceIdHash
    ) {
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
        enforcementMode: env.mobileAttestationEnforcementMode,
      },
    );
    if (!attestationResult.ok) {
      reply.code(401).send({
        error: attestationResult.code,
        message: attestationResult.message,
      });
      return;
    }

    if (!isAtLeastDeviceIntegrity(attestationResult.integrity)) {
      reply.code(403).send({
        error: 'DEVICE_INTEGRITY_FAILED',
        message: 'Device integrity is insufficient for privacy erase operation.',
      });
      return;
    }

    await Promise.all([
      notificationsStore.deleteByAuthSubject({
        authSubject: authResult.context.subject,
      }),
      refreshStore.purgeBySubject({
        subject: authResult.context.subject,
      }),
    ]);

    const requestId = randomUUID();
    const erasedAtMs = Date.now();

    await auditStore.recordErase({
      requestId,
      subject: authResult.context.subject,
      platform: authResult.context.platform,
      erasedAtMs,
    });

    reply.code(200).send({
      status: 'erased',
      requestId,
      erasedAtMs,
    });
  });
}
