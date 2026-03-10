import { z } from 'zod';
import { env } from '../config/env.js';
import { verifySensitiveMobileAuth } from '../lib/mobileSessionAuth.js';
import { parseOrThrow } from '../lib/validation.js';
const telemetryScalarSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const telemetryAttributesSchema = z
    .record(z.string(), telemetryScalarSchema)
    .default({});
const telemetryEventSchema = z
    .object({
    name: z.string().trim().min(1).max(120),
    attributes: telemetryAttributesSchema.optional(),
    userContext: telemetryAttributesSchema.optional(),
    timestamp: z.string().datetime().optional(),
})
    .strict();
const telemetryErrorContextSchema = z
    .object({
    feature: z.string().trim().max(120).optional(),
    status: z.number().int().min(100).max(599).optional(),
    url: z.string().trim().max(2048).optional(),
    method: z.string().trim().max(16).optional(),
    details: telemetryAttributesSchema.optional(),
})
    .strict();
const telemetryErrorSchema = z
    .object({
    name: z.string().trim().min(1).max(240),
    message: z.string().trim().min(1).max(2_000),
    stack: z.string().max(20_000).optional(),
    context: telemetryErrorContextSchema.optional(),
    userContext: telemetryAttributesSchema.optional(),
    timestamp: z.string().datetime().optional(),
})
    .strict();
const telemetryBreadcrumbSchema = z
    .object({
    name: z.string().trim().min(1).max(120),
    attributes: telemetryAttributesSchema.optional(),
    userContext: telemetryAttributesSchema.optional(),
    timestamp: z.string().datetime().optional(),
})
    .strict();
const telemetryEventBatchSchema = z.array(telemetryEventSchema).min(1).max(100);
const telemetryErrorBatchSchema = z.array(telemetryErrorSchema).min(1).max(100);
const telemetryBreadcrumbBatchSchema = z.array(telemetryBreadcrumbSchema).min(1).max(100);
function summarizeEventPayload(payload) {
    return {
        name: payload.name,
        hasAttributes: Boolean(payload.attributes && Object.keys(payload.attributes).length > 0),
        hasUserContext: Boolean(payload.userContext && Object.keys(payload.userContext).length > 0),
        timestamp: payload.timestamp ?? null,
    };
}
function summarizeErrorPayload(payload) {
    return {
        name: payload.name,
        messageLength: payload.message.length,
        hasStack: typeof payload.stack === 'string' && payload.stack.length > 0,
        contextFeature: payload.context?.feature ?? null,
        contextStatus: payload.context?.status ?? null,
        hasUserContext: Boolean(payload.userContext && Object.keys(payload.userContext).length > 0),
        timestamp: payload.timestamp ?? null,
    };
}
function summarizeBreadcrumbPayload(payload) {
    return {
        name: payload.name,
        hasAttributes: Boolean(payload.attributes && Object.keys(payload.attributes).length > 0),
        hasUserContext: Boolean(payload.userContext && Object.keys(payload.userContext).length > 0),
        timestamp: payload.timestamp ?? null,
    };
}
function rejectUnauthorizedTelemetryRequest(request, reply) {
    const authResult = verifySensitiveMobileAuth(request, {
        requiredScope: 'telemetry:write',
        jwtSecret: env.mobileSessionJwtSecret,
        minIntegrity: 'device',
    });
    if (authResult.ok) {
        return false;
    }
    reply.code(authResult.failure.statusCode).send({
        error: authResult.failure.code,
        message: authResult.failure.message,
    });
    return true;
}
export async function registerTelemetryRoutes(app) {
    app.post('/v1/telemetry/events', async (request, reply) => {
        if (rejectUnauthorizedTelemetryRequest(request, reply)) {
            return;
        }
        parseOrThrow(z.object({}).strict(), request.query);
        const payload = parseOrThrow(telemetryEventSchema, request.body);
        app.log.info({ event: summarizeEventPayload(payload) }, 'mobile.telemetry.event');
        return {
            status: 'accepted',
            type: 'event',
        };
    });
    app.post('/v1/telemetry/events/batch', async (request, reply) => {
        if (rejectUnauthorizedTelemetryRequest(request, reply)) {
            return;
        }
        parseOrThrow(z.object({}).strict(), request.query);
        const payload = parseOrThrow(telemetryEventBatchSchema, request.body);
        app.log.info({ count: payload.length }, 'mobile.telemetry.event_batch');
        return {
            status: 'accepted',
            type: 'event_batch',
            count: payload.length,
        };
    });
    app.post('/v1/telemetry/errors', async (request, reply) => {
        if (rejectUnauthorizedTelemetryRequest(request, reply)) {
            return;
        }
        parseOrThrow(z.object({}).strict(), request.query);
        const payload = parseOrThrow(telemetryErrorSchema, request.body);
        app.log.error({ error: summarizeErrorPayload(payload) }, 'mobile.telemetry.error');
        return {
            status: 'accepted',
            type: 'error',
        };
    });
    app.post('/v1/telemetry/errors/batch', async (request, reply) => {
        if (rejectUnauthorizedTelemetryRequest(request, reply)) {
            return;
        }
        parseOrThrow(z.object({}).strict(), request.query);
        const payload = parseOrThrow(telemetryErrorBatchSchema, request.body);
        app.log.error({ count: payload.length }, 'mobile.telemetry.error_batch');
        return {
            status: 'accepted',
            type: 'error_batch',
            count: payload.length,
        };
    });
    app.post('/v1/telemetry/breadcrumbs', async (request, reply) => {
        if (rejectUnauthorizedTelemetryRequest(request, reply)) {
            return;
        }
        parseOrThrow(z.object({}).strict(), request.query);
        const payload = parseOrThrow(telemetryBreadcrumbSchema, request.body);
        app.log.info({ breadcrumb: summarizeBreadcrumbPayload(payload) }, 'mobile.telemetry.breadcrumb');
        return {
            status: 'accepted',
            type: 'breadcrumb',
        };
    });
    app.post('/v1/telemetry/breadcrumbs/batch', async (request, reply) => {
        if (rejectUnauthorizedTelemetryRequest(request, reply)) {
            return;
        }
        parseOrThrow(z.object({}).strict(), request.query);
        const payload = parseOrThrow(telemetryBreadcrumbBatchSchema, request.body);
        app.log.info({ count: payload.length }, 'mobile.telemetry.breadcrumb_batch');
        return {
            status: 'accepted',
            type: 'breadcrumb_batch',
            count: payload.length,
        };
    });
}
