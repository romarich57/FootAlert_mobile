import type { FastifyInstance } from 'fastify';

import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { withCache } from '../../lib/cache.js';
import { parseOrThrow } from '../../lib/validation.js';

import { matchesQuerySchema } from './schemas.js';

export function registerMatchesListingRoutes(app: FastifyInstance): void {
  app.get('/v1/matches', async request => {
    const query = parseOrThrow(matchesQuerySchema, request.query);

    const cacheKey = `matches:${request.url}`;
    return withCache(cacheKey, 30_000, () =>
      apiFootballGet(
        `/fixtures?date=${encodeURIComponent(query.date)}&timezone=${encodeURIComponent(query.timezone)}`,
      ),
    );
  });
}
