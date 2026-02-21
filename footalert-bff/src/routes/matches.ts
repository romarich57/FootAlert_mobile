import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { apiFootballGet } from '../lib/apiFootballClient.js';
import { withCache } from '../lib/cache.js';
import { numericStringSchema, timezoneSchema } from '../lib/schemas.js';
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
}
