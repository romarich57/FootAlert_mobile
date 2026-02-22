import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';

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
