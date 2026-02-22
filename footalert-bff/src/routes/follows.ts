import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { apiFootballGet } from '../lib/apiFootballClient.js';
import { withCache } from '../lib/cache.js';
import {
  commaSeparatedNumericIdsSchema,
  numericStringSchema,
  seasonSchema,
  timezoneSchema,
} from '../lib/schemas.js';
import { parseOrThrow } from '../lib/validation.js';

const TRENDS_MAX_LEAGUE_IDS = 10;
const TRENDS_MAX_CONCURRENCY = 3;

const searchQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(100),
  })
  .strict();

const searchPlayersQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(100),
    season: seasonSchema,
  })
  .strict();

const teamIdParamsSchema = z
  .object({
    teamId: numericStringSchema,
  })
  .strict();

const playerSeasonParamsSchema = z
  .object({
    playerId: numericStringSchema,
    season: seasonSchema,
  })
  .strict();

const trendsQuerySchema = z
  .object({
    leagueIds: commaSeparatedNumericIdsSchema({
      maxItems: TRENDS_MAX_LEAGUE_IDS,
    }),
    season: seasonSchema,
  })
  .strict();

async function mapWithConcurrency<T, U>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<U>,
): Promise<U[]> {
  const boundedConcurrency = Math.max(1, Math.min(concurrency, items.length));
  const results = new Array<U>(items.length);
  let nextIndex = 0;

  const consume = async (): Promise<void> => {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      if (currentIndex >= items.length) {
        return;
      }

      results[currentIndex] = await worker(items[currentIndex] as T);
    }
  };

  await Promise.all(Array.from({ length: boundedConcurrency }, () => consume()));
  return results;
}

export async function registerFollowsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/follows/search/teams', async request => {
    const query = parseOrThrow(searchQuerySchema, request.query);

    return withCache(`follows:search:teams:${request.url}`, 60_000, () =>
      apiFootballGet(`/teams?search=${encodeURIComponent(query.q)}`),
    );
  });

  app.get('/v1/follows/search/players', async request => {
    const query = parseOrThrow(searchPlayersQuerySchema, request.query);

    return withCache(`follows:search:players:${request.url}`, 60_000, () =>
      apiFootballGet(
        `/players?search=${encodeURIComponent(query.q)}&season=${encodeURIComponent(String(query.season))}`,
      ),
    );
  });

  app.get('/v1/follows/teams/:teamId', async request => {
    const params = parseOrThrow(teamIdParamsSchema, request.params);
    parseOrThrow(z.object({}).strict(), request.query);

    return withCache(`follows:team:${request.url}`, 120_000, () =>
      apiFootballGet(`/teams?id=${encodeURIComponent(params.teamId)}`),
    );
  });

  app.get('/v1/follows/teams/:teamId/next-fixture', async request => {
    const params = parseOrThrow(teamIdParamsSchema, request.params);
    const query = parseOrThrow(
      z
        .object({
          timezone: timezoneSchema,
        })
        .strict(),
      request.query,
    );

    return withCache(`follows:nextfixture:${request.url}`, 45_000, () =>
      apiFootballGet(
        `/fixtures?team=${encodeURIComponent(params.teamId)}&next=1&timezone=${encodeURIComponent(query.timezone)}`,
      ),
    );
  });

  app.get('/v1/follows/players/:playerId/season/:season', async request => {
    const params = parseOrThrow(playerSeasonParamsSchema, request.params);
    parseOrThrow(z.object({}).strict(), request.query);

    return withCache(`follows:playerseason:${request.url}`, 60_000, () =>
      apiFootballGet(
        `/players?id=${encodeURIComponent(params.playerId)}&season=${encodeURIComponent(String(params.season))}`,
      ),
    );
  });

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
          ).catch(() => ({ response: [] })),
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

      const responses = await withCache(
        `follows:trendsplayers:${request.url}`,
        120_000,
        async () =>
          mapWithConcurrency(query.leagueIds, TRENDS_MAX_CONCURRENCY, leagueId =>
            apiFootballGet(
              `/players/topscorers?league=${encodeURIComponent(leagueId)}&season=${encodeURIComponent(String(query.season))}`,
            ).catch(() => ({ response: [] })),
          ),
      );

      return {
        response: responses,
      };
    },
  );
}
