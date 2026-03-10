import type { FastifyInstance } from 'fastify';

import { env } from '../../config/env.js';
import { parseOrThrow } from '../../lib/validation.js';

import { buildCompetitionFullResponse } from './fullService.js';
import { competitionIdParamsSchema, optionalSeasonQuerySchema } from './schemas.js';

const CACHE_CONTROL_SHORT = [
  'public',
  `max-age=${Math.max(1, Math.floor(env.cacheTtl.competitions / 1_000))}`,
  `stale-while-revalidate=${Math.max(1, Math.floor(env.cacheTtl.competitions / 1_000))}`,
].join(', ');

export function registerCompetitionFullRoute(app: FastifyInstance): void {
  app.get(
    '/v1/competitions/:id/full',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const params = parseOrThrow(competitionIdParamsSchema, request.params);
      const query = parseOrThrow(optionalSeasonQuerySchema, request.query);

      reply.header('Cache-Control', CACHE_CONTROL_SHORT);
      return buildCompetitionFullResponse(params.id, query.season);
    },
  );
}
