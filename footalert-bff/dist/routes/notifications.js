import { z } from 'zod';
import { env } from '../config/env.js';
import { verifyMobileRequestAuth } from '../lib/mobileRequestAuth.js';
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
const pushTokenStore = new Map();
export function resetPushTokenStoreForTests() {
    pushTokenStore.clear();
}
export async function registerNotificationsRoutes(app) {
    app.post('/v1/notifications/tokens', async (request, reply) => {
        const authFailure = verifyMobileRequestAuth(request, {
            signingKey: env.mobileRequestSigningKey,
            maxSkewMs: env.mobileRequestSignatureMaxSkewMs,
        });
        if (authFailure) {
            reply.code(authFailure.statusCode).send({
                error: authFailure.code,
                message: authFailure.message,
            });
            return;
        }
        parseOrThrow(z.object({}).strict(), request.query);
        const payload = parseOrThrow(pushTokenBodySchema, request.body);
        const existingRecord = pushTokenStore.get(payload.token);
        const now = new Date().toISOString();
        const nextRecord = {
            ...payload,
            registeredAt: existingRecord?.registeredAt ?? now,
            updatedAt: now,
        };
        pushTokenStore.set(payload.token, nextRecord);
        return {
            status: 'registered',
            token: payload.token,
        };
    });
    app.delete('/v1/notifications/tokens/:token', async (request, reply) => {
        const authFailure = verifyMobileRequestAuth(request, {
            signingKey: env.mobileRequestSigningKey,
            maxSkewMs: env.mobileRequestSignatureMaxSkewMs,
        });
        if (authFailure) {
            reply.code(authFailure.statusCode).send({
                error: authFailure.code,
                message: authFailure.message,
            });
            return;
        }
        parseOrThrow(z.object({}).strict(), request.query);
        const { token } = parseOrThrow(tokenParamsSchema, request.params);
        pushTokenStore.delete(token);
        reply.code(204).send();
    });
}
