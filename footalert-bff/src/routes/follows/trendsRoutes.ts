import type { FastifyInstance } from 'fastify';

import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { withCache } from '../../lib/cache.js';
import { mapWithConcurrency } from '../../lib/concurrency/mapWithConcurrency.js';
import { parseOrThrow } from '../../lib/validation.js';
import { TOP_COMPETITIONS, TRENDS_MAX_CONCURRENCY } from './constants.js';
import { trendsQuerySchema } from './schemas.js';

export function registerFollowsTrendsRoutes(app: FastifyInstance): void {
  app.get(
    '/v1/follows/trends/competitions',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
    },
    async () =>
      withCache('follows:trendscompetitions', 3_600_000, async () => ({
        competitions: TOP_COMPETITIONS,
      })),
  );

  app.get(
    '/v1/follows/trends/teams',
    {
      config: {
        rateLimit: {
          max: 18,
          timeWindow: '1 minute',
        },
      },
    },
    async request => {
      const query = parseOrThrow(trendsQuerySchema, request.query);

      const responses = await withCache(`follows:trendsteams:${request.url}`, 120_000, async () =>
        mapWithConcurrency(query.leagueIds, TRENDS_MAX_CONCURRENCY, leagueId =>
          apiFootballGet(
            `/standings?league=${encodeURIComponent(leagueId)}&season=${encodeURIComponent(String(query.season))}`,
          ).catch(err => {
            request.log.warn({ leagueId, err: (err as Error).message }, 'api.upstream.failure');
            return { response: [] };
          }),
        ),
      );

      return {
        response: responses,
      };
    },
  );

  app.get(
    '/v1/follows/trends/players',
    {
      config: {
        rateLimit: {
          max: 18,
          timeWindow: '1 minute',
        },
      },
    },
    async request => {
      const query = parseOrThrow(trendsQuerySchema, request.query);

      const responses = await withCache(`follows:trendsplayers:${request.url}`, 120_000, async () =>
        mapWithConcurrency(query.leagueIds, TRENDS_MAX_CONCURRENCY, leagueId =>
          apiFootballGet(
            `/players/topscorers?league=${encodeURIComponent(leagueId)}&season=${encodeURIComponent(String(query.season))}`,
          ).catch(err => {
            request.log.warn({ leagueId, err: (err as Error).message }, 'api.upstream.failure');
            return { response: [] };
          }),
        ),
      );

      return {
        response: responses,
      };
    },
  );
}
