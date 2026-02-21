import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { apiFootballGet } from '../lib/apiFootballClient.js';
import { withCache } from '../lib/cache.js';
import {
  numericStringSchema,
  positiveIntSchema,
  seasonSchema,
  timezoneSchema,
} from '../lib/schemas.js';
import { parseOrThrow } from '../lib/validation.js';

const teamIdParamsSchema = z
  .object({
    id: numericStringSchema,
  })
  .strict();

const teamFixturesQuerySchema = z
  .object({
    season: seasonSchema.optional(),
    leagueId: numericStringSchema.optional(),
    timezone: timezoneSchema.optional(),
    next: positiveIntSchema.optional(),
  })
  .strict();

const standingsQuerySchema = z
  .object({
    leagueId: numericStringSchema,
    season: seasonSchema,
  })
  .strict();

const statsQuerySchema = standingsQuerySchema;

const teamPlayersQuerySchema = z
  .object({
    leagueId: numericStringSchema,
    season: seasonSchema,
    page: positiveIntSchema.optional(),
  })
  .strict();

function buildFixtureQuery(teamId: string, query: z.infer<typeof teamFixturesQuerySchema>): string {
  const searchParams = new URLSearchParams({ team: teamId });

  if (typeof query.season === 'number') {
    searchParams.set('season', String(query.season));
  }

  if (query.leagueId) {
    searchParams.set('league', query.leagueId);
  }

  if (query.timezone) {
    searchParams.set('timezone', query.timezone);
  }

  if (typeof query.next === 'number') {
    searchParams.set('next', String(query.next));
  }

  return searchParams.toString();
}

export async function registerTeamsRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/v1/teams/standings',
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
        },
      },
    },
    async request => {
      const query = parseOrThrow(standingsQuerySchema, request.query);

      return withCache(`team:standings:${request.url}`, 60_000, () =>
        apiFootballGet(
          `/standings?league=${encodeURIComponent(query.leagueId)}&season=${encodeURIComponent(String(query.season))}`,
        ),
      );
    },
  );

  app.get('/v1/teams/:id', async request => {
    const params = parseOrThrow(teamIdParamsSchema, request.params);
    parseOrThrow(z.object({}).strict(), request.query);

    return withCache(`team:details:${request.url}`, 120_000, () =>
      apiFootballGet(`/teams?id=${encodeURIComponent(params.id)}`),
    );
  });

  app.get('/v1/teams/:id/leagues', async request => {
    const params = parseOrThrow(teamIdParamsSchema, request.params);
    parseOrThrow(z.object({}).strict(), request.query);

    return withCache(`team:leagues:${request.url}`, 120_000, () =>
      apiFootballGet(`/leagues?team=${encodeURIComponent(params.id)}`),
    );
  });

  app.get('/v1/teams/:id/fixtures', async request => {
    const params = parseOrThrow(teamIdParamsSchema, request.params);
    const query = parseOrThrow(teamFixturesQuerySchema, request.query);

    return withCache(`team:fixtures:${request.url}`, 45_000, () =>
      apiFootballGet(`/fixtures?${buildFixtureQuery(params.id, query)}`),
    );
  });

  app.get('/v1/teams/:id/next-fixture', async request => {
    const params = parseOrThrow(teamIdParamsSchema, request.params);
    const query = parseOrThrow(
      z
        .object({
          timezone: timezoneSchema,
        })
        .strict(),
      request.query,
    );

    return withCache(`team:nextfixture:${request.url}`, 45_000, () =>
      apiFootballGet(
        `/fixtures?team=${encodeURIComponent(params.id)}&next=1&timezone=${encodeURIComponent(query.timezone)}`,
      ),
    );
  });

  app.get(
    '/v1/teams/:id/standings',
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
        },
      },
    },
    async request => {
      parseOrThrow(teamIdParamsSchema, request.params);
      const query = parseOrThrow(standingsQuerySchema, request.query);

      return withCache(`team:standings:${request.url}`, 60_000, () =>
        apiFootballGet(
          `/standings?league=${encodeURIComponent(query.leagueId)}&season=${encodeURIComponent(String(query.season))}`,
        ),
      );
    },
  );

  app.get('/v1/teams/:id/stats', async request => {
    const params = parseOrThrow(teamIdParamsSchema, request.params);
    const query = parseOrThrow(statsQuerySchema, request.query);

    return withCache(`team:stats:${request.url}`, 60_000, () =>
      apiFootballGet(
        `/teams/statistics?league=${encodeURIComponent(query.leagueId)}&season=${encodeURIComponent(String(query.season))}&team=${encodeURIComponent(params.id)}`,
      ),
    );
  });

  app.get('/v1/teams/:id/players', async request => {
    const params = parseOrThrow(teamIdParamsSchema, request.params);
    const query = parseOrThrow(teamPlayersQuerySchema, request.query);

    const searchParams = new URLSearchParams({
      team: params.id,
      league: query.leagueId,
      season: String(query.season),
    });

    if (typeof query.page === 'number') {
      searchParams.set('page', String(query.page));
    }

    return withCache(`team:players:${request.url}`, 60_000, () =>
      apiFootballGet(`/players?${searchParams.toString()}`),
    );
  });

  app.get('/v1/teams/:id/squad', async request => {
    const params = parseOrThrow(teamIdParamsSchema, request.params);
    parseOrThrow(z.object({}).strict(), request.query);

    return withCache(`team:squad:${request.url}`, 120_000, () =>
      apiFootballGet(`/players/squads?team=${encodeURIComponent(params.id)}`),
    );
  });

  app.get('/v1/teams/:id/transfers', async request => {
    const params = parseOrThrow(teamIdParamsSchema, request.params);
    parseOrThrow(z.object({}).strict(), request.query);

    return withCache(`team:transfers:${request.url}`, 120_000, () =>
      apiFootballGet(`/transfers?team=${encodeURIComponent(params.id)}`),
    );
  });

  app.get('/v1/teams/:id/trophies', async request => {
    const params = parseOrThrow(teamIdParamsSchema, request.params);
    parseOrThrow(z.object({}).strict(), request.query);

    return withCache(`team:trophies:${request.url}`, 120_000, () =>
      apiFootballGet(`/trophies?team=${encodeURIComponent(params.id)}`),
    );
  });
}
