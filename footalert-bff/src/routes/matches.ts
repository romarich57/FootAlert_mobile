import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { apiFootballGet } from '../lib/apiFootballClient.js';
import { withCache } from '../lib/cache.js';
import { boundedPositiveIntSchema, numericStringSchema, timezoneSchema } from '../lib/schemas.js';
import { parseOrThrow } from '../lib/validation.js';

const matchesQuerySchema = z
  .object({
    date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
    timezone: timezoneSchema,
  })
  .strict();

const matchByIdParamsSchema = z
  .object({
    id: numericStringSchema,
  })
  .strict();

const matchByIdQuerySchema = z
  .object({
    timezone: timezoneSchema,
  })
  .strict();

const emptyQuerySchema = z.object({}).strict();

const optionalTimezoneQuerySchema = z
  .object({
    timezone: timezoneSchema.optional(),
  })
  .strict();

const matchPlayersStatsParamsSchema = z
  .object({
    id: numericStringSchema,
    teamId: numericStringSchema,
  })
  .strict();

const headToHeadQuerySchema = z
  .object({
    timezone: timezoneSchema.optional(),
    last: boundedPositiveIntSchema(1, 20).optional(),
  })
  .strict();

type FixtureContext = {
  fixture?: {
    id?: number;
  };
  league?: {
    id?: number;
    season?: number;
  };
  teams?: {
    home?: {
      id?: number;
    };
    away?: {
      id?: number;
    };
  };
};

type FixtureListResponse = {
  response?: FixtureContext[];
};

function toNumericId(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function buildFixtureContextKey(matchId: string, timezone?: string): string {
  return timezone ? `match:context:${matchId}:${timezone}` : `match:context:${matchId}`;
}

async function fetchFixtureContext(matchId: string, timezone?: string): Promise<FixtureContext | null> {
  const contextKey = buildFixtureContextKey(matchId, timezone);
  const payload = await withCache(contextKey, 30_000, () =>
    apiFootballGet<FixtureListResponse>(
      timezone
        ? `/fixtures?id=${encodeURIComponent(matchId)}&timezone=${encodeURIComponent(timezone)}`
        : `/fixtures?id=${encodeURIComponent(matchId)}`,
    ),
  );

  return payload.response?.[0] ?? null;
}

export async function registerMatchesRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/matches', async request => {
    const query = parseOrThrow(matchesQuerySchema, request.query);

    const cacheKey = `matches:${request.url}`;
    return withCache(cacheKey, 30_000, () =>
      apiFootballGet(
        `/fixtures?date=${encodeURIComponent(query.date)}&timezone=${encodeURIComponent(query.timezone)}`,
      ),
    );
  });

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
      parseOrThrow(emptyQuerySchema, request.query);

      const cacheKey = `match:statistics:${request.url}`;
      return withCache(cacheKey, 15_000, () =>
        apiFootballGet(
          `/fixtures/statistics?fixture=${encodeURIComponent(params.id)}`,
        ),
      );
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
      if (leagueId === null || season === null || homeTeamId === null || awayTeamId === null) {
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
              return {
                teamId,
                response: payload.response ?? [],
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
