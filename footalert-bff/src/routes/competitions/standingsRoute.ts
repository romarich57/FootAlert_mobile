import type { FastifyInstance } from 'fastify';

import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { withCache } from '../../lib/cache.js';
import { parseOrThrow } from '../../lib/validation.js';

import { competitionIdParamsSchema, seasonQuerySchema } from './schemas.js';

export function registerCompetitionStandingsRoute(app: FastifyInstance): void {
  app.get(
    '/v1/competitions/:id/standings',
    {
      config: {
        rateLimit: {
          max: 35,
          timeWindow: '1 minute',
        },
      },
    },
    async request => {
      const params = parseOrThrow(competitionIdParamsSchema, request.params);
      const query = parseOrThrow(seasonQuerySchema, request.query);

      const cacheKey = `competition:standings:${request.url}`;
      return withCache(cacheKey, 90_000, () =>
        apiFootballGet(
          `/standings?league=${encodeURIComponent(params.id)}&season=${encodeURIComponent(String(query.season))}`,
        ),
      );
    },
  );
}
