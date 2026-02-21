import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { apiFootballGet } from '../lib/apiFootballClient.js';
import { withCache } from '../lib/cache.js';
import { numericStringSchema, positiveIntSchema, seasonSchema } from '../lib/schemas.js';
import { parseOrThrow } from '../lib/validation.js';

const playerIdParamsSchema = z
  .object({
    id: numericStringSchema,
  })
  .strict();

const playerDetailsQuerySchema = z
  .object({
    season: seasonSchema,
  })
  .strict();

const teamFixturesParamsSchema = z
  .object({
    teamId: numericStringSchema,
  })
  .strict();

const teamFixturesQuerySchema = z
  .object({
    season: seasonSchema,
    last: positiveIntSchema.optional(),
  })
  .strict();

const fixtureTeamStatsParamsSchema = z
  .object({
    fixtureId: numericStringSchema,
    teamId: numericStringSchema,
  })
  .strict();

export async function registerPlayersRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/players/:id', async request => {
    const params = parseOrThrow(playerIdParamsSchema, request.params);
    const query = parseOrThrow(playerDetailsQuerySchema, request.query);

    return withCache(`players:details:${request.url}`, 60_000, () =>
      apiFootballGet(
        `/players?id=${encodeURIComponent(params.id)}&season=${encodeURIComponent(String(query.season))}`,
      ),
    );
  });

  app.get('/v1/players/:id/seasons', async request => {
    const params = parseOrThrow(playerIdParamsSchema, request.params);
    parseOrThrow(z.object({}).strict(), request.query);

    return withCache(`players:seasons:${request.url}`, 120_000, () =>
      apiFootballGet(`/players/seasons?player=${encodeURIComponent(params.id)}`),
    );
  });

  app.get('/v1/players/:id/trophies', async request => {
    const params = parseOrThrow(playerIdParamsSchema, request.params);
    parseOrThrow(z.object({}).strict(), request.query);

    return withCache(`players:trophies:${request.url}`, 120_000, () =>
      apiFootballGet(`/trophies?player=${encodeURIComponent(params.id)}`),
    );
  });

  app.get('/v1/players/team/:teamId/fixtures', async request => {
    const params = parseOrThrow(teamFixturesParamsSchema, request.params);
    const query = parseOrThrow(teamFixturesQuerySchema, request.query);

    const searchParams = new URLSearchParams({
      team: params.teamId,
      season: String(query.season),
    });

    if (typeof query.last === 'number') {
      searchParams.set('last', String(query.last));
    }

    return withCache(`players:teamfixtures:${request.url}`, 45_000, () =>
      apiFootballGet(`/fixtures?${searchParams.toString()}`),
    );
  });

  app.get('/v1/players/fixtures/:fixtureId/team/:teamId/stats', async request => {
    const params = parseOrThrow(fixtureTeamStatsParamsSchema, request.params);
    parseOrThrow(z.object({}).strict(), request.query);

    return withCache(`players:fixturestats:${request.url}`, 45_000, () =>
      apiFootballGet(
        `/fixtures/players?fixture=${encodeURIComponent(params.fixtureId)}&team=${encodeURIComponent(params.teamId)}`,
      ),
    );
  });
}
