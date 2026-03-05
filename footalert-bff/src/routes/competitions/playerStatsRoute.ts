import type { FastifyInstance } from 'fastify';

import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { withCache } from '../../lib/cache.js';
import { parseOrThrow } from '../../lib/validation.js';

import { competitionIdParamsSchema, playerStatsQuerySchema } from './schemas.js';
import { buildPlayerStatsPath } from './transfersMapper.js';

export function registerCompetitionPlayerStatsRoute(app: FastifyInstance): void {
  app.get(
    '/v1/competitions/:id/player-stats',
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
        },
      },
    },
    async request => {
      const params = parseOrThrow(competitionIdParamsSchema, request.params);
      const query = parseOrThrow(playerStatsQuerySchema, request.query);

      const cacheKey = `competition:playerstats:${request.url}`;
      return withCache(cacheKey, 5 * 60_000, () =>
        apiFootballGet(buildPlayerStatsPath(query.type, params.id, query.season)),
      );
    },
  );
}
