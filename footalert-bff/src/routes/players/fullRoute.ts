import type { FastifyInstance } from 'fastify';

import { env } from '../../config/env.js';
import { ReadStoreSnapshotInvalidBffError } from '../../lib/readStore/errors.js';
import { PLAYER_POLICY } from '../../lib/readStore/policies.js';
import { readThroughSnapshot, buildReadStoreScopeKey } from '../../lib/readStore/readThrough.js';
import { getReadStore } from '../../lib/readStore/runtime.js';
import { parseOrThrow } from '../../lib/validation.js';

import { fetchPlayerFullPayload } from './fullService.js';
import { playerDetailsQuerySchema, playerIdParamsSchema } from './schemas.js';

function validatePlayerFullPayload(payload: Awaited<ReturnType<typeof fetchPlayerFullPayload>>): void {
  const response = payload.response;

  if (
    !Array.isArray(response?.details?.response)
    || response.details.response.length === 0
    || !Array.isArray(response?.seasons?.response)
    || response.seasons.response.length === 0
    || response?.overview?.response == null
  ) {
    throw new ReadStoreSnapshotInvalidBffError({
      entityKind: 'player_full',
    });
  }
}

function isValidPlayerFullPayload(payload: Awaited<ReturnType<typeof fetchPlayerFullPayload>>): boolean {
  try {
    validatePlayerFullPayload(payload);
    return true;
  } catch {
    return false;
  }
}

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
      staleAfterMs: PLAYER_POLICY.freshMs,
      expiresAfterMs: PLAYER_POLICY.staleMs,
      logger: request.log,
      getSnapshot: () =>
        readStore.getEntitySnapshot<Awaited<ReturnType<typeof fetchPlayerFullPayload>>>({
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
      isSnapshotPayloadValid: isValidPlayerFullPayload,
      validateFreshPayload: validatePlayerFullPayload,
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
