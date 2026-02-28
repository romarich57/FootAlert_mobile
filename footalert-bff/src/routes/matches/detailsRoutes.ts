import type { FastifyInstance } from 'fastify';

import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { withCache } from '../../lib/cache.js';
import { parseOrThrow } from '../../lib/validation.js';

import { filterInjuriesForMatch } from './absences.js';
import {
  fetchFixtureContext,
  toDateMilliseconds,
  toEpochMilliseconds,
  toNumericId,
} from './fixtureContext.js';
import {
  emptyQuerySchema,
  headToHeadQuerySchema,
  matchByIdParamsSchema,
  matchByIdQuerySchema,
  matchPlayersStatsParamsSchema,
  matchStatisticsQuerySchema,
  optionalTimezoneQuerySchema,
} from './schemas.js';
import { filterFixtureStatisticsByPeriod } from './statistics.js';

export function registerMatchDetailRoutes(app: FastifyInstance): void {
  app.get(
    '/v1/matches/:id',
    {
      config: {
        rateLimit: {
          max: 80,
          timeWindow: '1 minute',
        },
      },
    },
    async request => {
      const params = parseOrThrow(matchByIdParamsSchema, request.params);
      const query = parseOrThrow(matchByIdQuerySchema, request.query);

      const cacheKey = `match:${request.url}`;
      return withCache(cacheKey, 30_000, () =>
        apiFootballGet(
          `/fixtures?id=${encodeURIComponent(params.id)}&timezone=${encodeURIComponent(query.timezone)}`,
        ),
      );
    },
  );

  app.get(
    '/v1/matches/:id/events',
    {
      config: {
        rateLimit: {
          max: 80,
          timeWindow: '1 minute',
        },
      },
    },
    async request => {
      const params = parseOrThrow(matchByIdParamsSchema, request.params);
      parseOrThrow(emptyQuerySchema, request.query);

      const cacheKey = `match:events:${request.url}`;
      return withCache(cacheKey, 15_000, () =>
        apiFootballGet(
          `/fixtures/events?fixture=${encodeURIComponent(params.id)}`,
        ),
      );
    },
  );

  app.get(
    '/v1/matches/:id/statistics',
    {
      config: {
        rateLimit: {
          max: 80,
          timeWindow: '1 minute',
        },
      },
    },
    async request => {
      const params = parseOrThrow(matchByIdParamsSchema, request.params);
      const query = parseOrThrow(matchStatisticsQuerySchema, request.query);
      const period = query.period ?? 'all';

      const cacheKey = `match:statistics:${params.id}:${period}`;
      if (period === 'all') {
        return withCache(cacheKey, 15_000, () =>
          apiFootballGet(
            `/fixtures/statistics?fixture=${encodeURIComponent(params.id)}`,
          ),
        );
      }

      const context = await fetchFixtureContext(params.id);
      const season = toNumericId(context?.league?.season);
      if (season === null || season < 2024) {
        return { response: [] };
      }

      return withCache(cacheKey, 15_000, async () => {
        const payload = await apiFootballGet(
          `/fixtures/statistics?fixture=${encodeURIComponent(params.id)}&half=true`,
        );

        return filterFixtureStatisticsByPeriod(payload, period);
      });
    },
  );

  app.get(
    '/v1/matches/:id/lineups',
    async request => {
      const params = parseOrThrow(matchByIdParamsSchema, request.params);
      parseOrThrow(emptyQuerySchema, request.query);

      const cacheKey = `match:lineups:${request.url}`;
      return withCache(cacheKey, 30_000, () =>
        apiFootballGet(
          `/fixtures/lineups?fixture=${encodeURIComponent(params.id)}`,
        ),
      );
    },
  );

  app.get(
    '/v1/matches/:id/head-to-head',
    async request => {
      const params = parseOrThrow(matchByIdParamsSchema, request.params);
      const query = parseOrThrow(headToHeadQuerySchema, request.query);

      const context = await fetchFixtureContext(params.id, query.timezone);
      const homeTeamId = toNumericId(context?.teams?.home?.id);
      const awayTeamId = toNumericId(context?.teams?.away?.id);
      if (homeTeamId === null || awayTeamId === null) {
        return { response: [] };
      }

      const h2hParam = `${homeTeamId}-${awayTeamId}`;
      const suffix = typeof query.last === 'number' ? `&last=${encodeURIComponent(String(query.last))}` : '';
      const cacheKey = `match:h2h:${params.id}:${query.last ?? 'default'}:${query.timezone ?? 'none'}`;

      return withCache(cacheKey, 600_000, () =>
        apiFootballGet(
          `/fixtures/headtohead?h2h=${encodeURIComponent(h2hParam)}${suffix}`,
        ),
      );
    },
  );

  app.get(
    '/v1/matches/:id/predictions',
    async request => {
      const params = parseOrThrow(matchByIdParamsSchema, request.params);
      parseOrThrow(emptyQuerySchema, request.query);

      const cacheKey = `match:predictions:${request.url}`;
      return withCache(cacheKey, 600_000, () =>
        apiFootballGet(
          `/predictions?fixture=${encodeURIComponent(params.id)}`,
        ),
      );
    },
  );

  app.get(
    '/v1/matches/:id/players/:teamId/stats',
    {
      config: {
        rateLimit: {
          max: 80,
          timeWindow: '1 minute',
        },
      },
    },
    async request => {
      const params = parseOrThrow(matchPlayersStatsParamsSchema, request.params);
      parseOrThrow(emptyQuerySchema, request.query);

      const cacheKey = `match:players:${request.url}`;
      return withCache(cacheKey, 20_000, () =>
        apiFootballGet(
          `/fixtures/players?fixture=${encodeURIComponent(params.id)}&team=${encodeURIComponent(params.teamId)}`,
        ),
      );
    },
  );

  app.get(
    '/v1/matches/:id/absences',
    async request => {
      const params = parseOrThrow(matchByIdParamsSchema, request.params);
      const query = parseOrThrow(optionalTimezoneQuerySchema, request.query);

      const context = await fetchFixtureContext(params.id, query.timezone);
      const leagueId = toNumericId(context?.league?.id);
      const season = toNumericId(context?.league?.season);
      const homeTeamId = toNumericId(context?.teams?.home?.id);
      const awayTeamId = toNumericId(context?.teams?.away?.id);
      const fallbackFixtureId = Number.parseInt(params.id, 10);
      const fixtureId = toNumericId(context?.fixture?.id) ?? (Number.isFinite(fallbackFixtureId) ? fallbackFixtureId : null);
      const fixtureDateMs = toEpochMilliseconds(context?.fixture?.timestamp) ?? toDateMilliseconds(context?.fixture?.date);
      if (leagueId === null || season === null || homeTeamId === null || awayTeamId === null || fixtureId === null) {
        return { response: [] };
      }

      const teamIds = [homeTeamId, awayTeamId];
      const cacheKey = `match:absences:${params.id}:${leagueId}:${season}`;

      return withCache(cacheKey, 1_800_000, async () => {
        const entries = await Promise.all(
          teamIds.map(async teamId => {
            try {
              const payload = await apiFootballGet<{ response?: unknown[] }>(
                `/injuries?league=${encodeURIComponent(String(leagueId))}&season=${encodeURIComponent(String(season))}&team=${encodeURIComponent(String(teamId))}`,
              );

              const filteredResponse = filterInjuriesForMatch(payload.response ?? [], fixtureId, fixtureDateMs);
              return {
                teamId,
                response: filteredResponse,
              };
            } catch {
              return {
                teamId,
                response: [],
              };
            }
          }),
        );

        return {
          response: entries,
        };
      });
    },
  );
}
