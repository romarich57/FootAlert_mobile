import type { FastifyInstance } from 'fastify';

import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { withCache } from '../../lib/cache.js';
import { parseOrThrow } from '../../lib/validation.js';

import { competitionIdParamsSchema, seasonQuerySchema } from './schemas.js';

export function registerCompetitionMatchesRoute(app: FastifyInstance): void {
  app.get('/v1/competitions/:id/matches', async request => {
    const params = parseOrThrow(competitionIdParamsSchema, request.params);
    const query = parseOrThrow(seasonQuerySchema, request.query);

    const cacheKey = `competition:matches:${request.url}`;
    return withCache(cacheKey, 60_000, () =>
      apiFootballGet(
        `/fixtures?league=${encodeURIComponent(params.id)}&season=${encodeURIComponent(String(query.season))}`,
      ),
    );
  });
}
