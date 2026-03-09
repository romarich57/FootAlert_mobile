import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { buildCanonicalCacheKey, withCache } from '../../lib/cache.js';
import { mapWithConcurrency } from '../../lib/concurrency/mapWithConcurrency.js';
import { parseOrThrow } from '../../lib/validation.js';
import { mapPlayerCard } from './cards.js';
import { FOLLOW_CARDS_CONCURRENCY } from './constants.js';
import {
  cardsPlayerIdsQuerySchema,
  playerSeasonParamsSchema,
  type PlayerSeasonResponse,
} from './schemas.js';

export function registerFollowsPlayerRoutes(app: FastifyInstance): void {
  app.get('/v1/follows/players/:playerId/season/:season', async request => {
    const params = parseOrThrow(playerSeasonParamsSchema, request.params);
    parseOrThrow(z.object({}).strict(), request.query);

    return withCache(`follows:playerseason:${request.url}`, 60_000, () =>
      apiFootballGet(
        `/players?id=${encodeURIComponent(params.playerId)}&season=${encodeURIComponent(String(params.season))}`,
      ),
    );
  });

  app.get('/v1/follows/players/cards', async request => {
    const query = parseOrThrow(cardsPlayerIdsQuerySchema, request.query);

    return withCache(
      buildCanonicalCacheKey('follows:player-cards', {
        ids: query.ids,
        season: query.season,
      }),
      60_000,
      async () => {
        const cards = await mapWithConcurrency(query.ids, FOLLOW_CARDS_CONCURRENCY, async playerId => {
          const payload = await withCache<PlayerSeasonResponse>(
            buildCanonicalCacheKey('follows:player-season', {
              playerId,
              season: query.season,
            }),
            60_000,
            () =>
              apiFootballGet(
                `/players?id=${encodeURIComponent(playerId)}&season=${encodeURIComponent(String(query.season))}`,
              ),
          );

          return mapPlayerCard(playerId, payload);
        });

        return {
          response: cards,
        };
      },
    );
  });
}
