import { timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { env } from '../config/env.js';
import { verifySensitiveMobileAuth } from '../lib/mobileSessionAuth.js';
import {
  notificationAlertTypes,
  notificationScopeKinds,
} from '../lib/notifications/contracts.js';
import {
  hashPushToken,
  encryptPushToken,
} from '../lib/notifications/crypto.js';
import {
  getNotificationsMetricsSnapshot,
  incrementNotificationMetric,
} from '../lib/notifications/metrics.js';
import {
  getNotificationsQueueClient,
  getNotificationsStore,
  resetNotificationsRuntimeForTests,
} from '../lib/notifications/runtime.js';
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

const subscriptionsUpsertBodySchema = z
  .object({
    deviceId: z.string().trim().min(1).max(256),
    scopeKind: z.enum(notificationScopeKinds),
    scopeId: z.string().trim().min(1).max(128),
    subscriptions: z
      .array(
        z
          .object({
            alertType: z.enum(notificationAlertTypes),
            enabled: z.boolean(),
          })
          .strict(),
      )
      .min(1)
      .max(notificationAlertTypes.length),
  })
  .strict();

const subscriptionsQuerySchema = z
  .object({
    deviceId: z.string().trim().min(1).max(256),
    scopeKind: z.enum(notificationScopeKinds),
    scopeId: z.string().trim().min(1).max(128),
  })
  .strict();

const notificationOpenedBodySchema = z
  .object({
    eventId: z.string().trim().min(1).max(128),
    deviceId: z.string().trim().min(1).max(256),
  })
  .strict();

const notificationEventIngestBodySchema = z
  .object({
    source: z.string().trim().min(1).max(64),
    externalEventId: z.string().trim().min(1).max(128),
    alertType: z.enum(notificationAlertTypes),
    occurredAt: z.string().trim().datetime().optional(),
    fixtureId: z.string().trim().min(1).max(64).nullable().optional(),
    competitionId: z.string().trim().min(1).max(64).nullable().optional(),
    teamIds: z.array(z.string().trim().min(1).max(64)).max(32).optional(),
    playerIds: z.array(z.string().trim().min(1).max(64)).max(64).optional(),
    title: z.string().trim().min(1).max(160),
    body: z.string().trim().min(1).max(600),
    payload: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();

function resolveAuthorizationHeader(request: FastifyRequest): string | null {
  const rawAuthorization = request.headers.authorization;
  if (Array.isArray(rawAuthorization)) {
    return rawAuthorization[0]?.trim() || null;
  }

  if (typeof rawAuthorization === 'string') {
    return rawAuthorization.trim();
  }

  return null;
}

function verifyIngestAuth(request: FastifyRequest): boolean {
  const authorization = resolveAuthorizationHeader(request);
  if (!authorization?.startsWith('Bearer ') || !env.notificationsIngestToken) {
    return false;
  }

  const provided = Buffer.from(authorization.slice('Bearer '.length).trim(), 'utf8');
  const expected = Buffer.from(env.notificationsIngestToken, 'utf8');

  if (provided.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(provided, expected);
}

function assertNotificationsBackendEnabled(): void {
  if (!env.notificationsBackendEnabled) {
    throw new Error('Notifications backend is disabled by configuration.');
  }

  if (!env.pushTokenEncryptionKey) {
    throw new Error('Missing PUSH_TOKEN_ENCRYPTION_KEY.');
  }
}

export async function resetPushTokenStoreForTests(): Promise<void> {
  await resetNotificationsRuntimeForTests();
}

export async function registerNotificationsRoutes(app: FastifyInstance): Promise<void> {
  const notificationsStore = await getNotificationsStore({
    backend: env.notificationsPersistenceBackend,
    databaseUrl: env.databaseUrl,
  });
  const notificationsQueue = await getNotificationsQueueClient({
    redisUrl: env.redisUrl,
    enabled: env.notificationsEventIngestEnabled,
  });

  app.post('/v1/notifications/tokens', {
    config: {
      rateLimit: {
        max: 30,
        timeWindow: 60_000,
      },
    },
  }, async (request, reply) => {
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

    assertNotificationsBackendEnabled();
    parseOrThrow(z.object({}).strict(), request.query);
    const payload = parseOrThrow(pushTokenBodySchema, request.body);
    const tokenHash = hashPushToken(payload.token);
    const tokenCiphertext = encryptPushToken(payload.token, env.pushTokenEncryptionKey as string);

    await notificationsStore.registerDevice({
      authSubject: authResult.context.subject,
      deviceId: payload.deviceId,
      tokenHash,
      tokenCiphertext,
      platform: payload.platform,
      provider: payload.provider,
      appVersion: payload.appVersion,
      locale: payload.locale,
      timezone: payload.timezone,
    });

    return {
      status: 'registered' as const,
      token: payload.token,
    };
  });

  app.delete('/v1/notifications/tokens/:token', {
    config: {
      rateLimit: {
        max: 60,
        timeWindow: 60_000,
      },
    },
  }, async (request, reply) => {
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

    assertNotificationsBackendEnabled();
    parseOrThrow(z.object({}).strict(), request.query);
    const { token } = parseOrThrow(tokenParamsSchema, request.params);

    await notificationsStore.revokeDeviceByTokenHash({
      tokenHash: hashPushToken(token),
    });

    reply.code(204).send();
  });

  app.post('/v1/notifications/subscriptions', {
    config: {
      rateLimit: {
        max: 120,
        timeWindow: 60_000,
      },
    },
  }, async (request, reply) => {
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

    assertNotificationsBackendEnabled();
    parseOrThrow(z.object({}).strict(), request.query);
    const payload = parseOrThrow(subscriptionsUpsertBodySchema, request.body);

    const upsertedSubscriptions = await notificationsStore.upsertSubscriptions({
      authSubject: authResult.context.subject,
      deviceId: payload.deviceId,
      scopeKind: payload.scopeKind,
      scopeId: payload.scopeId,
      subscriptions: payload.subscriptions,
    });

    return {
      status: 'ok' as const,
      subscriptions: upsertedSubscriptions,
    };
  });

  app.get('/v1/notifications/subscriptions', {
    config: {
      rateLimit: {
        max: 120,
        timeWindow: 60_000,
      },
    },
  }, async (request, reply) => {
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

    assertNotificationsBackendEnabled();
    const query = parseOrThrow(subscriptionsQuerySchema, request.query);

    const subscriptions = await notificationsStore.listSubscriptions({
      authSubject: authResult.context.subject,
      deviceId: query.deviceId,
      scopeKind: query.scopeKind,
      scopeId: query.scopeId,
    });

    return {
      subscriptions,
    };
  });

  app.post('/v1/notifications/opened', {
    config: {
      rateLimit: {
        max: 240,
        timeWindow: 60_000,
      },
    },
  }, async (request, reply) => {
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

    assertNotificationsBackendEnabled();
    parseOrThrow(z.object({}).strict(), request.query);
    const payload = parseOrThrow(notificationOpenedBodySchema, request.body);

    const openedCount = await notificationsStore.markDeliveryOpenedByEventAndDevice({
      eventId: payload.eventId,
      authSubject: authResult.context.subject,
      deviceId: payload.deviceId,
    });

    if (openedCount > 0) {
      incrementNotificationMetric('notifications_opened_total', openedCount);
    }

    return {
      status: 'ok' as const,
      openedCount,
    };
  });

  app.post('/v1/notifications/events', {
    config: {
      rateLimit: {
        max: 600,
        timeWindow: 60_000,
      },
    },
  }, async (request, reply) => {
    if (!env.notificationsEventIngestEnabled) {
      reply.code(404).send({
        error: 'NOTIFICATIONS_EVENT_INGEST_DISABLED',
        message: 'Notifications event ingestion is disabled.',
      });
      return;
    }

    if (!verifyIngestAuth(request)) {
      reply.code(401).send({
        error: 'UNAUTHORIZED_INGEST_TOKEN',
        message: 'Invalid notifications ingest token.',
      });
      return;
    }

    parseOrThrow(z.object({}).strict(), request.query);
    const payload = parseOrThrow(notificationEventIngestBodySchema, request.body);

    const normalizedEventPayload = {
      source: payload.source,
      externalEventId: payload.externalEventId,
      alertType: payload.alertType,
      occurredAt: payload.occurredAt ?? new Date().toISOString(),
      fixtureId: payload.fixtureId ?? null,
      competitionId: payload.competitionId ?? null,
      teamIds: payload.teamIds ?? [],
      playerIds: payload.playerIds ?? [],
      title: payload.title,
      body: payload.body,
      payload: payload.payload,
    };

    incrementNotificationMetric('notifications_events_received_total');

    const { event, created } = await notificationsStore.insertEventIfAbsent(normalizedEventPayload);

    if (created) {
      await notificationsQueue.enqueueDispatch({
        eventId: event.id,
        payload: normalizedEventPayload,
      });
      await notificationsStore.markEventStatus({
        eventId: event.id,
        status: 'queued',
      });
    }

    return {
      status: 'accepted' as const,
      eventId: event.id,
      deduplicated: !created,
    };
  });

  app.get('/v1/notifications/metrics', async (request, reply) => {
    const authResult = verifySensitiveMobileAuth(request, {
      requiredScope: 'api:read',
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

    return getNotificationsMetricsSnapshot();
  });
}
