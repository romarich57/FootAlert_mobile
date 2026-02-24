import { gzip as gzipCallback } from 'node:zlib';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import { promisify } from 'node:util';

import { env } from './config/env.js';
import { configureCache } from './lib/cache.js';
import { BffError } from './lib/errors.js';
import { registerCompetitionsRoutes } from './routes/competitions.js';
import { registerFollowsRoutes } from './routes/follows.js';
import { registerMatchesRoutes } from './routes/matches.js';
import { registerPlayersRoutes } from './routes/players.js';
import { registerTeamsRoutes } from './routes/teams.js';

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
  '/v1/competitions/:id/matches': CACHE_CONTROL_SHORT,
  '/v1/teams/:id/fixtures': CACHE_CONTROL_SHORT,
  '/v1/teams/:id/next-fixture': CACHE_CONTROL_SHORT,
  '/v1/follows/teams/:teamId/next-fixture': CACHE_CONTROL_SHORT,
  '/v1/players/:id/matches': CACHE_CONTROL_SHORT,
  '/v1/players/team/:teamId/fixtures': CACHE_CONTROL_SHORT,
  '/v1/players/fixtures/:fixtureId/team/:teamId/stats': CACHE_CONTROL_SHORT,

  '/v1/competitions/search': CACHE_CONTROL_MEDIUM,
  '/v1/follows/search/teams': CACHE_CONTROL_MEDIUM,
  '/v1/follows/search/players': CACHE_CONTROL_MEDIUM,
  '/v1/follows/trends/teams': CACHE_CONTROL_MEDIUM,
  '/v1/follows/trends/players': CACHE_CONTROL_MEDIUM,
  '/v1/follows/teams/:teamId': CACHE_CONTROL_MEDIUM,
  '/v1/follows/players/:playerId/season/:season': CACHE_CONTROL_MEDIUM,
  '/v1/teams/:id': CACHE_CONTROL_MEDIUM,
  '/v1/players/:id': CACHE_CONTROL_MEDIUM,

  '/v1/competitions': CACHE_CONTROL_LONG,
  '/v1/competitions/:id': CACHE_CONTROL_LONG,
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
    reply.header('Vary', 'Accept-Encoding');
    reply.removeHeader('Content-Length');
    return compressedPayload;
  });
}

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: true,
    trustProxy: env.trustProxyHops > 0 ? env.trustProxyHops : false,
  });

  configureCache({
    maxEntries: env.cacheMaxEntries,
    cleanupIntervalMs: env.cacheCleanupIntervalMs,
  });

  await app.register(cors, {
    origin: (origin, callback) => {
      if (!origin || env.corsAllowedOrigins.length === 0) {
        callback(null, true);
        return;
      }

      callback(null, isAllowedCorsOrigin(origin));
    },
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

  await registerCompression(app);

  app.addHook('onSend', (request, reply, payload, done) => {
    if (request.method === 'GET' && !reply.hasHeader('Cache-Control')) {
      const cacheControl = resolveCacheControl(request.routeOptions.url);
      if (cacheControl) {
        reply.header('Cache-Control', cacheControl);
      }
    }

    done(null, payload);
  });

  app.get('/health', async () => ({ status: 'ok' }));

  await registerMatchesRoutes(app);
  await registerCompetitionsRoutes(app);
  await registerTeamsRoutes(app);
  await registerPlayersRoutes(app);
  await registerFollowsRoutes(app);

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
