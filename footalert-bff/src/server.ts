import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';

import { env } from './config/env.js';
import { BffError } from './lib/errors.js';
import { registerCompetitionsRoutes } from './routes/competitions.js';
import { registerFollowsRoutes } from './routes/follows.js';
import { registerMatchesRoutes } from './routes/matches.js';
import { registerPlayersRoutes } from './routes/players.js';
import { registerTeamsRoutes } from './routes/teams.js';

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: true,
    trustProxy: true,
  });

  await app.register(cors, {
    origin: true,
  });

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
      reply.code(error.statusCode).send({
        error: error.code,
        message: error.message,
        details: error.details,
      });
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
