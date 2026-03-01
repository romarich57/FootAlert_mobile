import type { FastifyInstance } from 'fastify';

import { env } from '../../config/env.js';
import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { withCache } from '../../lib/cache.js';
import {
  PaginationCursorCodec,
  computePaginationFiltersHash,
} from '../../lib/pagination/cursor.js';
import { buildCursorPageInfo, sliceByOffset } from '../../lib/pagination/slice.js';
import { parseOrThrow } from '../../lib/validation.js';

import { competitionIdParamsSchema, seasonQuerySchema } from './schemas.js';

const ROUTE_PATH = '/v1/competitions/:id/matches';
const DEFAULT_PAGINATION_LIMIT = 50;
const cursorCodec = new PaginationCursorCodec(
  env.paginationCursorSecret,
  env.paginationCursorTtlMs,
);

type CompetitionMatchesEnvelope = {
  response?: unknown[];
} & Record<string, unknown>;

export function registerCompetitionMatchesRoute(app: FastifyInstance): void {
  app.get('/v1/competitions/:id/matches', async request => {
    const params = parseOrThrow(competitionIdParamsSchema, request.params);
    const query = parseOrThrow(seasonQuerySchema, request.query);
    const isCursorPagination = typeof query.limit === 'number' || typeof query.cursor === 'string';

    const cacheKey = `competition:matches:${params.id}:${query.season}`;
    const payload = await withCache(cacheKey, 60_000, () =>
      apiFootballGet<CompetitionMatchesEnvelope>(
        `/fixtures?league=${encodeURIComponent(params.id)}&season=${encodeURIComponent(String(query.season))}`,
      ),
    );

    if (!isCursorPagination) {
      return payload;
    }

    const limit = query.limit ?? DEFAULT_PAGINATION_LIMIT;
    const filtersHash = computePaginationFiltersHash({
      competitionId: params.id,
      season: query.season,
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
