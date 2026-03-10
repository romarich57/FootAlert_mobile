import { randomUUID } from 'node:crypto';
import { gzip as gzipCallback } from 'node:zlib';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance, type FastifyReply } from 'fastify';
import { promisify } from 'node:util';

import { env } from './config/env.js';
import {
  assertCacheReadyOrThrow,
  configureCache,
  getCacheHealthSnapshot,
} from './lib/cache.js';
import { BffError } from './lib/errors.js';
import {
  requiresGlobalMobileReadAuth,
  shouldEnforceHostScopedMobileAuth,
} from './lib/mobileApiRouteAuth.js';
import { verifySensitiveMobileAuth } from './lib/mobileSessionAuth.js';
import { buildReadinessPayload, renderPrometheusMetrics } from './lib/runtimeStatus.js';
import { registerBootstrapRoutes } from './routes/bootstrap/index.js';
import { registerCapabilitiesRoutes } from './routes/capabilities.js';
import { registerCompetitionsRoutes } from './routes/competitions.js';
import { registerFollowsRoutes } from './routes/follows.js';
import { registerMatchesRoutes } from './routes/matches.js';
import { registerMobileSessionRoutes } from './routes/mobileSession.js';
import { registerNotificationsRoutes } from './routes/notifications.js';
import { registerPlayersRoutes } from './routes/players.js';
import { registerPrivacyRoutes } from './routes/privacy.js';
import { registerSearchRoutes } from './routes/search.js';
import { registerTeamsRoutes } from './routes/teams.js';
import { registerTelemetryRoutes } from './routes/telemetry.js';

function isAllowedCorsOrigin(origin: string): boolean {
  return env.corsAllowedOrigins.includes(origin);
}

const gzip = promisify(gzipCallback);

const CACHE_CONTROL_SHORT = 'public, max-age=30, stale-while-revalidate=30';
const CACHE_CONTROL_MEDIUM = 'public, max-age=120, stale-while-revalidate=120';
const CACHE_CONTROL_LONG = 'public, max-age=300, stale-while-revalidate=600';

const CACHE_CONTROL_BY_ROUTE: Record<string, string> = {
  '/v1/matches': CACHE_CONTROL_SHORT,
  '/v1/matches/:id': CACHE_CONTROL_SHORT,
  '/v1/matches/:id/events': CACHE_CONTROL_SHORT,
  '/v1/matches/:id/statistics': CACHE_CONTROL_SHORT,
  '/v1/matches/:id/lineups': CACHE_CONTROL_SHORT,
  '/v1/matches/:id/players/:teamId/stats': CACHE_CONTROL_SHORT,
  '/v1/competitions/:id/matches': CACHE_CONTROL_SHORT,
  '/v1/bootstrap': CACHE_CONTROL_SHORT,
  '/v1/teams/:id/fixtures': CACHE_CONTROL_SHORT,
  '/v1/teams/:id/next-fixture': CACHE_CONTROL_SHORT,
  '/v1/teams/:id/overview': CACHE_CONTROL_SHORT,
  '/v1/follows/teams/:teamId/next-fixture': CACHE_CONTROL_SHORT,
  '/v1/players/:id/matches': CACHE_CONTROL_SHORT,
  '/v1/players/team/:teamId/fixtures': CACHE_CONTROL_SHORT,
  '/v1/players/fixtures/:fixtureId/team/:teamId/stats': CACHE_CONTROL_SHORT,

  '/v1/competitions/search': CACHE_CONTROL_MEDIUM,
  '/v1/follows/search/teams': CACHE_CONTROL_MEDIUM,
  '/v1/follows/search/players': CACHE_CONTROL_MEDIUM,
  '/v1/follows/discovery/teams': CACHE_CONTROL_MEDIUM,
  '/v1/follows/discovery/players': CACHE_CONTROL_MEDIUM,
  '/v1/search/global': CACHE_CONTROL_MEDIUM,
  '/v1/follows/trends/teams': CACHE_CONTROL_MEDIUM,
  '/v1/follows/trends/players': CACHE_CONTROL_MEDIUM,
  '/v1/follows/teams/:teamId': CACHE_CONTROL_MEDIUM,
  '/v1/follows/players/:playerId/season/:season': CACHE_CONTROL_MEDIUM,
  '/v1/capabilities': CACHE_CONTROL_MEDIUM,
  '/v1/teams/:id': CACHE_CONTROL_MEDIUM,
  '/v1/players/:id': CACHE_CONTROL_MEDIUM,

  '/v1/competitions': CACHE_CONTROL_LONG,
  '/v1/competitions/:id': CACHE_CONTROL_LONG,
  '/v1/matches/:id/head-to-head': CACHE_CONTROL_LONG,
  '/v1/matches/:id/predictions': CACHE_CONTROL_LONG,
  '/v1/matches/:id/absences': CACHE_CONTROL_LONG,
  '/v1/competitions/:id/standings': CACHE_CONTROL_LONG,
  '/v1/competitions/:id/player-stats': CACHE_CONTROL_LONG,
  '/v1/competitions/:id/transfers': CACHE_CONTROL_LONG,
  '/v1/teams/:id/leagues': CACHE_CONTROL_LONG,
  '/v1/teams/:id/standings': CACHE_CONTROL_LONG,
  '/v1/teams/:id/stats': CACHE_CONTROL_LONG,
  '/v1/teams/:id/players': CACHE_CONTROL_LONG,
  '/v1/teams/:id/squad': CACHE_CONTROL_LONG,
  '/v1/teams/:id/transfers': CACHE_CONTROL_LONG,
  '/v1/teams/:id/trophies': CACHE_CONTROL_LONG,
  '/v1/players/:id/seasons': CACHE_CONTROL_LONG,
  '/v1/players/:id/trophies': CACHE_CONTROL_LONG,
  '/v1/players/:id/career': CACHE_CONTROL_LONG,
};

function resolveCacheControl(routePath?: string): string | undefined {
  if (!routePath) {
    return undefined;
  }

  return CACHE_CONTROL_BY_ROUTE[routePath];
}

function appendVaryHeader(reply: FastifyReply, value: string): void {
  const currentHeader = reply.getHeader('Vary');
  const currentValues = Array.isArray(currentHeader)
    ? currentHeader.join(',')
    : String(currentHeader ?? '');

  const entries = currentValues
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);
  const hasValue = entries.some(entry => entry.toLowerCase() === value.toLowerCase());
  if (!hasValue) {
    entries.push(value);
  }

  if (entries.length > 0) {
    reply.header('Vary', entries.join(', '));
  }
}

function hasValidOpsMetricsAuthorization(authorizationHeader: string | undefined): boolean {
  if (!env.opsMetricsToken) {
    return true;
  }

  if (!authorizationHeader?.startsWith('Bearer ')) {
    return false;
  }

  const token = authorizationHeader.slice('Bearer '.length).trim();
  return token === env.opsMetricsToken;
}

async function registerCompression(app: FastifyInstance): Promise<void> {
  const compressModuleName = '@fastify/compress';

  try {
    const compressModule = await import(compressModuleName);
    const compressPlugin = (compressModule as { default?: unknown }).default;

    if (typeof compressPlugin === 'function') {
      await app.register(compressPlugin as Parameters<typeof app.register>[0], {
        threshold: 1024,
      });
      return;
    }
  } catch (error) {
    app.log.warn(
      { error, plugin: compressModuleName },
      'Compression plugin unavailable, using built-in gzip fallback.',
    );
  }

  app.addHook('onSend', async (request, reply, payload) => {
    if (request.method !== 'GET') {
      return payload;
    }

    if (reply.hasHeader('Content-Encoding')) {
      return payload;
    }

    const acceptEncoding = request.headers['accept-encoding'] ?? '';
    if (typeof acceptEncoding !== 'string' || !acceptEncoding.includes('gzip')) {
      return payload;
    }

    const contentTypeHeader = reply.getHeader('content-type');
    const contentType = Array.isArray(contentTypeHeader)
      ? contentTypeHeader.join(';')
      : String(contentTypeHeader ?? '');
    if (!contentType.includes('application/json')) {
      return payload;
    }

    const payloadBuffer = Buffer.isBuffer(payload)
      ? payload
      : Buffer.from(typeof payload === 'string' ? payload : JSON.stringify(payload));

    if (payloadBuffer.byteLength < 1024) {
      return payload;
    }

    const compressedPayload = await gzip(payloadBuffer);
    reply.header('Content-Encoding', 'gzip');
    appendVaryHeader(reply, 'Accept-Encoding');
    reply.removeHeader('Content-Length');
    return compressedPayload;
  });
}

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: 'info',
      base: {
        service: 'footalert-bff',
        appEnv: env.appEnv,
        nodeRole: env.nodeRole,
      },
    },
    trustProxy: env.trustProxyHops > 0 ? env.trustProxyHops : false,
  });

  configureCache({
    maxEntries: env.cacheMaxEntries,
    cleanupIntervalMs: env.cacheCleanupIntervalMs,
    ttlJitterPct: env.cacheTtlJitterPct,
    lockTtlMs: env.cacheLockTtlMs,
    coalesceWaitMs: env.cacheCoalesceWaitMs,
    backend: env.cacheBackend,
    strictMode: env.cacheStrictMode,
    redisUrl: env.redisUrl,
    redisPrefix: env.redisCachePrefix,
  });
  await assertCacheReadyOrThrow();

  await app.register(cors, {
    origin: (origin, callback) => {
      if (!origin || env.corsAllowedOrigins.length === 0) {
        callback(null, true);
        return;
      }

      callback(null, isAllowedCorsOrigin(origin));
    },
  });

  // Propager ou générer un x-request-id pour le tracing distribué.
  app.addHook('onRequest', (request, reply, done) => {
    const incomingId = request.headers['x-request-id'];
    const requestId =
      typeof incomingId === 'string' && incomingId.length > 0 && incomingId.length <= 128
        ? incomingId
        : randomUUID();
    reply.header('x-request-id', requestId);
    request.headers['x-request-id'] = requestId;
    done();
  });

  if (env.corsAllowedOrigins.length > 0) {
    app.addHook('onRequest', (request, reply, done) => {
      const originHeader = request.headers.origin;
      if (!originHeader || isAllowedCorsOrigin(originHeader)) {
        done();
        return;
      }

      reply.code(403).send({
        error: 'CORS_ORIGIN_FORBIDDEN',
        message: 'Request origin is not allowed.',
      });
      done();
    });
  }

  await app.register(rateLimit, {
    max: env.rateLimitMax,
    timeWindow: env.rateLimitWindowMs,
    keyGenerator: request => request.ip,
  });

  app.addHook('preHandler', async (request, reply) => {
    if (!shouldEnforceHostScopedMobileAuth(request, env.mobileAuthEnforcedHosts)) {
      return;
    }

    if (!requiresGlobalMobileReadAuth(request)) {
      return;
    }

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
  });

  await registerCompression(app);

  app.addHook('onSend', (request, reply, payload, done) => {
    if (request.method === 'GET') {
      appendVaryHeader(reply, 'Accept-Encoding');

      if (!reply.hasHeader('Cache-Control')) {
        const cacheControl = resolveCacheControl(request.routeOptions.url);
        if (cacheControl) {
          reply.header('Cache-Control', cacheControl);
        }
      }
    }

    done(null, payload);
  });

  app.addHook('onResponse', (request, reply, done) => {
    request.log.info({
      requestId: request.id,
      xRequestId: request.headers['x-request-id'],
      route: request.routeOptions.url,
      statusCode: reply.statusCode,
      cacheStatus: String(reply.getHeader('x-footalert-cache-status') ?? 'unknown'),
      nodeRole: env.nodeRole,
    }, 'request.completed');
    done();
  });

  app.get('/health', async (_request, reply) => {
    const cache = getCacheHealthSnapshot();
    const status = cache.degraded ? 'degraded' : 'ok';

    if (cache.degraded) {
      reply.code(503);
    }

    return {
      status,
      cache,
    };
  });

  app.get('/liveness', async () => {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      nodeRole: env.nodeRole,
    };
  });

  app.get('/readiness', async (_request, reply) => {
    const payload = await buildReadinessPayload();
    if (payload.status !== 'ready') {
      reply.code(503);
    }

    return payload;
  });

  app.get('/metrics', async (request, reply) => {
    if (!hasValidOpsMetricsAuthorization(request.headers.authorization)) {
      reply.code(403);
      return {
        error: 'OPS_METRICS_FORBIDDEN',
        message: 'Metrics endpoint requires an operations bearer token.',
      };
    }

    reply.header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    return renderPrometheusMetrics();
  });

  await registerCapabilitiesRoutes(app);
  await registerBootstrapRoutes(app);
  await registerMatchesRoutes(app);
  await registerCompetitionsRoutes(app);
  await registerTeamsRoutes(app);
  await registerPlayersRoutes(app);
  await registerFollowsRoutes(app);
  await registerSearchRoutes(app);
  await registerMobileSessionRoutes(app);
  await registerPrivacyRoutes(app);
  await registerNotificationsRoutes(app);
  await registerTelemetryRoutes(app);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof BffError) {
      const payload: {
        error: string;
        message: string;
        details?: unknown;
      } = {
        error: error.code,
        message: error.message,
      };
      if (env.bffExposeErrorDetails && typeof error.details !== 'undefined') {
        payload.details = error.details;
      }
      reply.code(error.statusCode).send(payload);
      return;
    }

    app.log.error(error);
    reply.code(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Unexpected BFF error.',
    });
  });

  return app;
}
