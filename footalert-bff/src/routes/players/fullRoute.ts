import type { FastifyInstance } from 'fastify';

import { env } from '../../config/env.js';
import { readThroughSnapshot, buildReadStoreScopeKey } from '../../lib/readStore/readThrough.js';
import { getReadStore } from '../../lib/readStore/runtime.js';
import { parseOrThrow } from '../../lib/validation.js';

import { fetchPlayerFullPayload } from './fullService.js';
import { playerDetailsQuerySchema, playerIdParamsSchema } from './schemas.js';

export async function registerPlayerFullRoute(app: FastifyInstance): Promise<void> {
  app.get('/v1/players/:id/full', async request => {
    const params = parseOrThrow(playerIdParamsSchema, request.params);
    const query = parseOrThrow(playerDetailsQuerySchema, request.query);
    const scopeKey = buildReadStoreScopeKey({
      season: query.season,
    });
    const readStore = await getReadStore({
      databaseUrl: env.databaseUrl,
    });

    const result = await readThroughSnapshot({
      cacheKey: `player_full:${params.id}:${scopeKey}`,
      staleAfterMs: env.cacheTtl.players,
      expiresAfterMs: env.cacheTtl.players * 3,
      logger: request.log,
      getSnapshot: () =>
        readStore.getEntitySnapshot({
          entityKind: 'player_full',
          entityId: params.id,
          scopeKey,
        }),
      upsertSnapshot: input =>
        readStore.upsertEntitySnapshot({
          entityKind: 'player_full',
          entityId: params.id,
          scopeKey,
          payload: input.payload,
          generatedAt: input.generatedAt,
          staleAt: input.staleAt,
          expiresAt: input.expiresAt,
          metadata: {
            route: '/v1/players/:id/full',
          },
        }),
      fetchFresh: () =>
        fetchPlayerFullPayload({
          playerId: params.id,
          season: query.season,
        }),
      queue: {
        store: readStore,
        target: {
          entityKind: 'player_full',
          entityId: params.id,
          scopeKey,
        },
      },
    });

    return result.payload;
  });
}
