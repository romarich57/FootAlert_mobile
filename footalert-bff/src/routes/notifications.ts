import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { env } from '../config/env.js';
import { verifySensitiveMobileAuth } from '../lib/mobileSessionAuth.js';
import { parseOrThrow } from '../lib/validation.js';

const pushTokenBodySchema = z
  .object({
    token: z.string().trim().min(1).max(512),
    deviceId: z.string().trim().min(1).max(256),
    platform: z.enum(['ios', 'android']),
    provider: z.enum(['apns', 'fcm']),
    appVersion: z.string().trim().min(1).max(64),
    locale: z.enum(['fr', 'en']),
    timezone: z.string().trim().min(1).max(128),
  })
  .strict();

const tokenParamsSchema = z
  .object({
    token: z.string().trim().min(1).max(512),
  })
  .strict();

type StoredPushToken = z.infer<typeof pushTokenBodySchema> & {
  registeredAt: string;
  updatedAt: string;
};

const pushTokenStore = new Map<string, StoredPushToken>();

export function resetPushTokenStoreForTests(): void {
  pushTokenStore.clear();
}

export async function registerNotificationsRoutes(app: FastifyInstance): Promise<void> {
  app.post('/v1/notifications/tokens', async (request, reply) => {
    const authResult = verifySensitiveMobileAuth(request, {
      requiredScope: 'notifications:write',
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
    const payload = parseOrThrow(pushTokenBodySchema, request.body);

    const existingRecord = pushTokenStore.get(payload.token);
    const now = new Date().toISOString();
    const nextRecord: StoredPushToken = {
      ...payload,
      registeredAt: existingRecord?.registeredAt ?? now,
      updatedAt: now,
    };

    pushTokenStore.set(payload.token, nextRecord);

    return {
      status: 'registered' as const,
      token: payload.token,
    };
  });

  app.delete('/v1/notifications/tokens/:token', async (request, reply) => {
    const authResult = verifySensitiveMobileAuth(request, {
      requiredScope: 'notifications:write',
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
    const { token } = parseOrThrow(tokenParamsSchema, request.params);
    pushTokenStore.delete(token);

    reply.code(204).send();
  });
}
