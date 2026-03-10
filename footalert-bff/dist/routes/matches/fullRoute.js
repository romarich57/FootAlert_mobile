import { env } from '../../config/env.js';
import { buildSnapshotWindow, readThroughSnapshot, buildReadStoreScopeKey } from '../../lib/readStore/readThrough.js';
import { getReadStore } from '../../lib/readStore/runtime.js';
import { parseOrThrow } from '../../lib/validation.js';
import { buildMatchFullResponse } from './fullService.js';
import { matchByIdParamsSchema, matchByIdQuerySchema } from './schemas.js';
const CACHE_CONTROL_SHORT = [
    'public',
    `max-age=${Math.max(1, Math.floor(Math.min(env.cacheTtl.matches, 30_000) / 1_000))}`,
    `stale-while-revalidate=${Math.max(1, Math.floor(Math.min(env.cacheTtl.matches, 30_000) / 1_000))}`,
].join(', ');
const LIVE_OVERLAY_STALE_MS = 15_000;
const LIVE_OVERLAY_EXPIRES_MS = 120_000;
function toMatchLiveOverlay(payload) {
    return {
        fixture: payload.fixture,
        lifecycleState: payload.lifecycleState,
        context: payload.context,
        events: payload.events,
        statistics: payload.statistics,
        lineups: payload.lineups,
        absences: payload.absences,
        playersStats: payload.playersStats,
    };
}
function applyMatchLiveOverlay(payload, overlay) {
    if (overlay.lifecycleState !== 'live') {
        return payload;
    }
    return {
        ...payload,
        fixture: overlay.fixture ?? payload.fixture,
        lifecycleState: overlay.lifecycleState,
        context: overlay.context ?? payload.context,
        events: overlay.events ?? payload.events,
        statistics: overlay.statistics ?? payload.statistics,
        lineups: overlay.lineups ?? payload.lineups,
        absences: overlay.absences ?? payload.absences,
        playersStats: overlay.playersStats ?? payload.playersStats,
    };
}
export function registerMatchFullRoute(app) {
    app.get('/v1/matches/:id/full', {
        config: {
            rateLimit: {
                max: 15,
                timeWindow: '1 minute',
            },
        },
    }, async (request, reply) => {
        const params = parseOrThrow(matchByIdParamsSchema, request.params);
        const query = parseOrThrow(matchByIdQuerySchema, request.query);
        const scopeKey = buildReadStoreScopeKey({
            timezone: query.timezone,
        });
        const readStore = await getReadStore({
            databaseUrl: env.databaseUrl,
        });
        const persistLiveOverlay = async (payload) => {
            const isLive = payload.lifecycleState === 'live';
            const window = buildSnapshotWindow({
                staleAfterMs: isLive ? LIVE_OVERLAY_STALE_MS : 1_000,
                expiresAfterMs: isLive ? LIVE_OVERLAY_EXPIRES_MS : 1_000,
            });
            await readStore.upsertMatchLiveOverlay({
                matchId: params.id,
                payload: toMatchLiveOverlay(payload),
                generatedAt: window.generatedAt,
                staleAt: window.staleAt,
                expiresAt: window.expiresAt,
                metadata: {
                    lifecycleState: payload.lifecycleState,
                },
            });
        };
        const result = await readThroughSnapshot({
            cacheKey: `match_full:${params.id}:${scopeKey}`,
            staleAfterMs: env.cacheTtl.matches,
            expiresAfterMs: env.cacheTtl.matches * 3,
            logger: request.log,
            getSnapshot: () => readStore.getEntitySnapshot({
                entityKind: 'match_full',
                entityId: params.id,
                scopeKey,
            }),
            upsertSnapshot: input => readStore.upsertEntitySnapshot({
                entityKind: 'match_full',
                entityId: params.id,
                scopeKey,
                payload: input.payload,
                generatedAt: input.generatedAt,
                staleAt: input.staleAt,
                expiresAt: input.expiresAt,
                metadata: {
                    route: '/v1/matches/:id/full',
                },
            }),
            fetchFresh: async () => {
                const payload = await buildMatchFullResponse(params.id, query.timezone);
                await persistLiveOverlay(payload);
                return payload;
            },
            queue: {
                store: readStore,
                target: {
                    entityKind: 'match_full',
                    entityId: params.id,
                    scopeKey,
                },
            },
        });
        let responsePayload = result.payload;
        const overlaySnapshot = await readStore.getMatchLiveOverlay({
            matchId: params.id,
        });
        if (overlaySnapshot.status === 'fresh') {
            responsePayload = applyMatchLiveOverlay(responsePayload, overlaySnapshot.payload);
        }
        reply.header('Cache-Control', CACHE_CONTROL_SHORT);
        return responsePayload;
    });
}
