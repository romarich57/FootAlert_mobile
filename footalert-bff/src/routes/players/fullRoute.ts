import type { FastifyInstance } from 'fastify';

import { env } from '../../config/env.js';
import { buildCanonicalCacheKey, withCacheStaleWhileRevalidate } from '../../lib/cache.js';
import { parseOrThrow } from '../../lib/validation.js';

import { fetchPlayerFullPayload } from './fullService.js';
import { playerDetailsQuerySchema, playerIdParamsSchema } from './schemas.js';

export async function registerPlayerFullRoute(app: FastifyInstance): Promise<void> {
  app.get('/v1/players/:id/full', async request => {
    const params = parseOrThrow(playerIdParamsSchema, request.params);
    const query = parseOrThrow(playerDetailsQuerySchema, request.query);

    return withCacheStaleWhileRevalidate(
      buildCanonicalCacheKey('players:full', {
        playerId: params.id,
        season: query.season,
      }),
      env.cacheTtl.players,
      () =>
        fetchPlayerFullPayload({
          playerId: params.id,
          season: query.season,
        }),
    );
  });
}
