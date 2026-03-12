import { BOOTSTRAP_POLICY } from '../../lib/readStore/policies.js';
import { readThroughSnapshot } from '../../lib/readStore/readThrough.js';
import { getReadStore } from '../../lib/readStore/runtime.js';
import { parseOrThrow } from '../../lib/validation.js';
import { BOOTSTRAP_DEFAULT_DISCOVERY_LIMIT, } from '../bootstrap/schemas.js';
import { buildBootstrapPayload, buildBootstrapScopeKey, } from '../bootstrap/service.js';
import { PaginationCursorCodec, computePaginationFiltersHash, } from '../../lib/pagination/cursor.js';
import { buildCursorPageInfo, sliceByOffset } from '../../lib/pagination/slice.js';
import { env } from '../../config/env.js';
import { matchesQuerySchema } from './schemas.js';
const ROUTE_PATH = '/v1/matches';
const DEFAULT_PAGINATION_LIMIT = 50;
const CACHE_CONTROL_SHORT = [
    'public',
    `max-age=${Math.max(1, Math.floor(Math.min(env.cacheTtl.matches, 30_000) / 1_000))}`,
    `stale-while-revalidate=${Math.max(1, Math.floor(Math.min(env.cacheTtl.matches, 30_000) / 1_000))}`,
].join(', ');
const cursorCodec = new PaginationCursorCodec(env.paginationCursorSecret, env.paginationCursorTtlMs);
function resolveSeasonFromDate(date) {
    const year = Number.parseInt(date.slice(0, 4), 10);
    const month = Number.parseInt(date.slice(5, 7), 10);
    if (!Number.isFinite(year) || !Number.isFinite(month)) {
        return new Date().getUTCFullYear();
    }
    return month >= 7 ? year : year - 1;
}
function toMatchesEnvelope(payload) {
    return {
        response: payload.matchesToday,
        date: payload.date,
        timezone: payload.timezone,
        season: payload.season,
        generatedAt: payload.generatedAt,
        source: 'bootstrap_snapshot',
    };
}
export function registerMatchesListingRoutes(app) {
    app.get('/v1/matches', async (request, reply) => {
        const query = parseOrThrow(matchesQuerySchema, request.query);
        const isCursorPagination = typeof query.limit === 'number' || typeof query.cursor === 'string';
        const season = resolveSeasonFromDate(query.date);
        const scopeKey = buildBootstrapScopeKey({
            date: query.date,
            timezone: query.timezone,
            season,
            discoveryLimit: BOOTSTRAP_DEFAULT_DISCOVERY_LIMIT,
            followedPlayerIds: [],
            followedTeamIds: [],
        });
        const readStore = await getReadStore({
            databaseUrl: env.databaseUrl,
        });
        const snapshot = await readThroughSnapshot({
            cacheKey: `matches_listing:${scopeKey}`,
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
                    route: '/v1/matches',
                    source: 'route.matches.bootstrap',
                },
            }),
            fetchFresh: () => buildBootstrapPayload({
                date: query.date,
                timezone: query.timezone,
                season,
                followedTeamIds: [],
                followedPlayerIds: [],
                discoveryLimit: BOOTSTRAP_DEFAULT_DISCOVERY_LIMIT,
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
        const payload = toMatchesEnvelope(snapshot.payload);
        reply.header('Cache-Control', CACHE_CONTROL_SHORT);
        if (!isCursorPagination) {
            return payload;
        }
        const limit = query.limit ?? DEFAULT_PAGINATION_LIMIT;
        const filtersHash = computePaginationFiltersHash({
            date: query.date,
            timezone: query.timezone,
        });
        const startPosition = query.cursor
            ? cursorCodec.decode(query.cursor, {
                route: ROUTE_PATH,
                filtersHash,
            }).position
            : 0;
        const items = Array.isArray(payload.response) ? payload.response : [];
        const sliced = sliceByOffset({
            items,
            startPosition,
            limit,
        });
        const pageInfo = buildCursorPageInfo({
            route: ROUTE_PATH,
            filtersHash,
            startPosition,
            returnedCount: sliced.sliced.length,
            hasMore: sliced.hasMore,
            cursorCodec,
        });
        return {
            ...payload,
            response: sliced.sliced,
            pageInfo,
        };
    });
}
