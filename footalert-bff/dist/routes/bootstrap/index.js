import { env } from '../../config/env.js';
import { BOOTSTRAP_POLICY } from '../../lib/readStore/policies.js';
import { readThroughSnapshot } from '../../lib/readStore/readThrough.js';
import { getReadStore } from '../../lib/readStore/runtime.js';
import { parseOrThrow } from '../../lib/validation.js';
import { BOOTSTRAP_DEFAULT_DISCOVERY_LIMIT, bootstrapQuerySchema, } from './schemas.js';
import { buildBootstrapPayload, buildBootstrapScopeKey } from './service.js';
export async function registerBootstrapRoutes(app) {
    app.get('/v1/bootstrap', async (request, reply) => {
        const query = parseOrThrow(bootstrapQuerySchema, request.query);
        const followedTeamIds = query.followedTeamIds ?? [];
        const followedPlayerIds = query.followedPlayerIds ?? [];
        const discoveryLimit = query.discoveryLimit ?? BOOTSTRAP_DEFAULT_DISCOVERY_LIMIT;
        const scopeKey = buildBootstrapScopeKey({
            date: query.date,
            timezone: query.timezone,
            season: query.season,
            discoveryLimit,
            followedTeamIds,
            followedPlayerIds,
        });
        const readStore = await getReadStore({
            databaseUrl: env.databaseUrl,
        });
        const snapshot = await readThroughSnapshot({
            cacheKey: `bootstrap:${scopeKey}`,
            staleAfterMs: BOOTSTRAP_POLICY.freshMs,
            expiresAfterMs: BOOTSTRAP_POLICY.staleMs,
            logger: request.log,
            getSnapshot: () => readStore.getBootstrapSnapshot({
                scopeKey,
            }),
            upsertSnapshot: input => readStore.upsertBootstrapSnapshot({
                scopeKey,
                payload: input.payload,
                generatedAt: input.generatedAt,
                staleAt: input.staleAt,
                expiresAt: input.expiresAt,
                metadata: {
                    source: 'route.bootstrap',
                },
            }),
            fetchFresh: () => buildBootstrapPayload({
                date: query.date,
                timezone: query.timezone,
                season: query.season,
                followedTeamIds,
                followedPlayerIds,
                discoveryLimit,
                logger: request.log,
            }),
            queue: {
                store: readStore,
                target: {
                    entityKind: 'bootstrap',
                    entityId: 'bootstrap',
                    scopeKey,
                },
            },
        });
        reply.header('Cache-Control', 'public, max-age=30, stale-while-revalidate=30');
        return snapshot.payload;
    });
}
