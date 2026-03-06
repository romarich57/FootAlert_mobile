import type { FastifyInstance } from 'fastify';

import { env } from '../../config/env.js';
import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { buildCanonicalCacheKey, withCache } from '../../lib/cache.js';
import {
  PaginationCursorCodec,
  computePaginationFiltersHash,
} from '../../lib/pagination/cursor.js';
import { buildCursorPageInfo, sliceByOffset } from '../../lib/pagination/slice.js';
import { parseOrThrow } from '../../lib/validation.js';

import { matchesQuerySchema } from './schemas.js';

const ROUTE_PATH = '/v1/matches';
const DEFAULT_PAGINATION_LIMIT = 50;
const cursorCodec = new PaginationCursorCodec(
  env.paginationCursorSecret,
  env.paginationCursorTtlMs,
);

type MatchesEnvelope = {
  response?: unknown[];
} & Record<string, unknown>;

export function registerMatchesListingRoutes(app: FastifyInstance): void {
  app.get('/v1/matches', async request => {
    const query = parseOrThrow(matchesQuerySchema, request.query);
    const isCursorPagination = typeof query.limit === 'number' || typeof query.cursor === 'string';

    const cacheKey = buildCanonicalCacheKey('matches:listing', {
      date: query.date,
      timezone: query.timezone,
    });
    const payload = await withCache(cacheKey, 30_000, () =>
      apiFootballGet<MatchesEnvelope>(
        `/fixtures?date=${encodeURIComponent(query.date)}&timezone=${encodeURIComponent(query.timezone)}`,
      ),
    );

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
