import type { FastifyInstance } from 'fastify';

import { apiFootballGet } from '../../../lib/apiFootballClient.js';
import { buildCanonicalCacheKey, withCache } from '../../../lib/cache.js';
import { computePaginationFiltersHash } from '../../../lib/pagination/cursor.js';
import { sliceByOffset } from '../../../lib/pagination/slice.js';
import { parseOrThrow } from '../../../lib/validation.js';

import { competitionIdParamsSchema } from '../schemas.js';

import {
  competitionMatchesQuerySchema,
  CompetitionMatchesEnvelope,
  DEFAULT_PAGINATION_LIMIT,
  RawCompetitionFixture,
} from './schemas.js';
import {
  buildOrderedFixtureRounds,
  flattenOrderedFixtureRounds,
} from './fixtureOrdering.js';
import {
  buildCompetitionMatchesPageInfo,
  decodeCompetitionMatchesCursor,
  resolveSmartAnchorStartPosition,
} from './pagination.js';

export function registerCompetitionMatchesRoute(app: FastifyInstance): void {
  app.get(
    '/v1/competitions/:id/matches',
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
        },
      },
    },
    async request => {
      const params = parseOrThrow(competitionIdParamsSchema, request.params);
      const query = parseOrThrow(competitionMatchesQuerySchema, request.query);
      const isCursorPagination =
        typeof query.limit === 'number' || typeof query.cursor === 'string';

      const upstreamCacheKey = buildCanonicalCacheKey('competition:matches:upstream', {
        competitionId: params.id,
        season: query.season,
      });
      const payload = await withCache(upstreamCacheKey, 90_000, () =>
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
        anchor: query.anchor,
      });
      const orderedRounds = buildOrderedFixtureRounds(
        (Array.isArray(payload.response) ? payload.response : []) as RawCompetitionFixture[],
      );
      const orderedItems = flattenOrderedFixtureRounds(orderedRounds);
      const startPosition = query.cursor
        ? decodeCompetitionMatchesCursor(query.cursor, filtersHash)
        : query.anchor === 'smart'
          ? resolveSmartAnchorStartPosition(orderedRounds)
          : 0;
      const sliced = sliceByOffset({
        items: orderedItems,
        startPosition,
        limit,
      });

      return {
        ...payload,
        response: sliced.sliced,
        pageInfo: buildCompetitionMatchesPageInfo({
          filtersHash,
          limit,
          startPosition,
          returnedCount: sliced.sliced.length,
          totalCount: orderedItems.length,
        }),
      };
    },
  );
}
