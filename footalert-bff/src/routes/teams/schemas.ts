import { z } from 'zod';

import {
  boundedPositiveIntSchema,
  numericStringSchema,
  seasonSchema,
  timezoneSchema,
} from '../../lib/schemas.js';

const paginationCursorSchema = z.string().trim().min(1).max(2048);

export const teamIdParamsSchema = z
  .object({
    id: numericStringSchema,
  })
  .strict();

export const teamFixturesQuerySchema = z
  .object({
    season: seasonSchema.optional(),
    leagueId: numericStringSchema.optional(),
    timezone: timezoneSchema.optional(),
    next: boundedPositiveIntSchema(1, 10).optional(),
  })
  .strict();

export const standingsQuerySchema = z
  .object({
    leagueId: numericStringSchema,
    season: seasonSchema,
  })
  .strict();

export const statsQuerySchema = standingsQuerySchema;

export const teamPlayersQuerySchema = z
  .object({
    leagueId: numericStringSchema,
    season: seasonSchema,
    page: boundedPositiveIntSchema(1, 10).optional(),
    limit: boundedPositiveIntSchema(10, 100).optional(),
    cursor: paginationCursorSchema.optional(),
  })
  .strict();
