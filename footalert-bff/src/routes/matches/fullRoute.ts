import type { FastifyInstance } from 'fastify';

import { env } from '../../config/env.js';
import { parseOrThrow } from '../../lib/validation.js';

import { buildMatchFullResponse } from './fullService.js';
import { matchByIdParamsSchema, matchByIdQuerySchema } from './schemas.js';

const CACHE_CONTROL_SHORT = [
  'public',
  `max-age=${Math.max(1, Math.floor(env.cacheTtl.matches / 1_000))}`,
  `stale-while-revalidate=${Math.max(1, Math.floor(env.cacheTtl.matches / 1_000))}`,
].join(', ');

export function registerMatchFullRoute(app: FastifyInstance): void {
  app.get(
    '/v1/matches/:id/full',
    {
      config: {
        rateLimit: {
          max: 15,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const params = parseOrThrow(matchByIdParamsSchema, request.params);
      const query = parseOrThrow(matchByIdQuerySchema, request.query);

      reply.header('Cache-Control', CACHE_CONTROL_SHORT);
      return buildMatchFullResponse(params.id, query.timezone);
    },
  );
}
