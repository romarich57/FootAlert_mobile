import { env } from '../../config/env.js';
import { ReadStoreSnapshotInvalidBffError } from '../../lib/readStore/errors.js';
import { COMPETITION_POLICY } from '../../lib/readStore/policies.js';
import { readThroughSnapshot, buildReadStoreScopeKey } from '../../lib/readStore/readThrough.js';
import { getReadStore } from '../../lib/readStore/runtime.js';
import { parseOrThrow } from '../../lib/validation.js';
import { buildCompetitionFullResponse } from './fullService.js';
import { competitionIdParamsSchema, optionalSeasonQuerySchema } from './schemas.js';
const CACHE_CONTROL_SHORT = [
    'public',
    `max-age=${Math.max(1, Math.floor(Math.min(env.cacheTtl.competitions, 30_000) / 1_000))}`,
    `stale-while-revalidate=${Math.max(1, Math.floor(Math.min(env.cacheTtl.competitions, 30_000) / 1_000))}`,
].join(', ');
function validateCompetitionFullPayload(payload) {
    if (payload.competition == null || !Number.isFinite(payload.season)) {
        throw new ReadStoreSnapshotInvalidBffError({
            entityKind: 'competition_full',
            season: payload.season,
        });
    }
}
function isValidCompetitionFullPayload(payload) {
    try {
        validateCompetitionFullPayload(payload);
        return true;
    }
    catch {
        return false;
    }
}
export function registerCompetitionFullRoute(app) {
    app.get('/v1/competitions/:id/full', {
        config: {
            rateLimit: {
                max: 10,
                timeWindow: '1 minute',
            },
        },
    }, async (request, reply) => {
        const params = parseOrThrow(competitionIdParamsSchema, request.params);
        const query = parseOrThrow(optionalSeasonQuerySchema, request.query);
        const scopeKey = buildReadStoreScopeKey({
            season: query.season ?? null,
        });
        const readStore = await getReadStore({
            databaseUrl: env.databaseUrl,
        });
        reply.header('Cache-Control', CACHE_CONTROL_SHORT);
        const result = await readThroughSnapshot({
            cacheKey: `competition_full:${params.id}:${scopeKey}`,
            staleAfterMs: COMPETITION_POLICY.freshMs,
            expiresAfterMs: COMPETITION_POLICY.staleMs,
            logger: request.log,
            getSnapshot: () => readStore.getEntitySnapshot({
                entityKind: 'competition_full',
                entityId: params.id,
                scopeKey,
            }),
            upsertSnapshot: input => readStore.upsertEntitySnapshot({
                entityKind: 'competition_full',
                entityId: params.id,
                scopeKey,
                payload: input.payload,
                generatedAt: input.generatedAt,
                staleAt: input.staleAt,
                expiresAt: input.expiresAt,
                metadata: {
                    route: '/v1/competitions/:id/full',
                },
            }),
            fetchFresh: () => buildCompetitionFullResponse(params.id, query.season),
            isSnapshotPayloadValid: isValidCompetitionFullPayload,
            validateFreshPayload: validateCompetitionFullPayload,
            queue: {
                store: readStore,
                target: {
                    entityKind: 'competition_full',
                    entityId: params.id,
                    scopeKey,
                },
            },
        });
        return result.payload;
    });
}
