import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { apiFootballGet } from '../lib/apiFootballClient.js';
import { withCache } from '../lib/cache.js';
import { numericStringSchema, seasonSchema } from '../lib/schemas.js';
import { parseOrThrow } from '../lib/validation.js';

const competitionIdParamsSchema = z
  .object({
    id: numericStringSchema,
  })
  .strict();

const searchQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(100),
  })
  .strict();

const seasonQuerySchema = z
  .object({
    season: seasonSchema,
  })
  .strict();

const playerStatsQuerySchema = z
  .object({
    season: seasonSchema,
    type: z.enum(['topscorers', 'topassists', 'topyellowcards', 'topredcards']),
  })
  .strict();

function buildPlayerStatsPath(type: string, leagueId: string, season: number): string {
  return `/players/${type}?league=${encodeURIComponent(leagueId)}&season=${encodeURIComponent(String(season))}`;
}

export async function registerCompetitionsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/competitions', async request => {
    parseOrThrow(z.object({}).strict(), request.query);

    const cacheKey = `competitions:${request.url}`;
    return withCache(cacheKey, 120_000, () => apiFootballGet('/leagues'));
  });

  app.get('/v1/competitions/search', async request => {
    const query = parseOrThrow(searchQuerySchema, request.query);

    const cacheKey = `competitions:search:${request.url}`;
    return withCache(cacheKey, 60_000, () =>
      apiFootballGet(`/leagues?search=${encodeURIComponent(query.q)}`),
    );
  });

  app.get('/v1/competitions/:id', async request => {
    const params = parseOrThrow(competitionIdParamsSchema, request.params);
    parseOrThrow(z.object({}).strict(), request.query);

    const cacheKey = `competition:${request.url}`;
    return withCache(cacheKey, 120_000, () =>
      apiFootballGet(`/leagues?id=${encodeURIComponent(params.id)}`),
    );
  });

  app.get(
    '/v1/competitions/:id/standings',
    {
      config: {
        rateLimit: {
          max: 35,
          timeWindow: '1 minute',
        },
      },
    },
    async request => {
      const params = parseOrThrow(competitionIdParamsSchema, request.params);
      const query = parseOrThrow(seasonQuerySchema, request.query);

      const cacheKey = `competition:standings:${request.url}`;
      return withCache(cacheKey, 60_000, () =>
        apiFootballGet(
          `/standings?league=${encodeURIComponent(params.id)}&season=${encodeURIComponent(String(query.season))}`,
        ),
      );
    },
  );

  app.get('/v1/competitions/:id/matches', async request => {
    const params = parseOrThrow(competitionIdParamsSchema, request.params);
    const query = parseOrThrow(seasonQuerySchema, request.query);

    const cacheKey = `competition:matches:${request.url}`;
    return withCache(cacheKey, 60_000, () =>
      apiFootballGet(
        `/fixtures?league=${encodeURIComponent(params.id)}&season=${encodeURIComponent(String(query.season))}`,
      ),
    );
  });

  app.get(
    '/v1/competitions/:id/player-stats',
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
      const query = parseOrThrow(playerStatsQuerySchema, request.query);

      const cacheKey = `competition:playerstats:${request.url}`;
      return withCache(cacheKey, 90_000, () =>
        apiFootballGet(buildPlayerStatsPath(query.type, params.id, query.season)),
      );
    },
  );

  app.get('/v1/competitions/:id/transfers', async request => {
    parseOrThrow(competitionIdParamsSchema, request.params);
    parseOrThrow(z.object({ season: seasonSchema.optional() }).strict(), request.query);

    const cacheKey = `competition:transfers:${request.url}`;
    return withCache(cacheKey, 120_000, async () => ({ response: [] as unknown[] }));
  });
}
