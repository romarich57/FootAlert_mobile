import { z } from 'zod';

import {
  boundedPositiveIntSchema,
  numericStringSchema,
  seasonSchema,
} from '../../lib/schemas.js';

export const playerIdParamsSchema = z
  .object({
    id: numericStringSchema,
  })
  .strict();

export const playerDetailsQuerySchema = z
  .object({
    season: seasonSchema,
  })
  .strict();

export const teamFixturesParamsSchema = z
  .object({
    teamId: numericStringSchema,
  })
  .strict();

export const teamFixturesQuerySchema = z
  .object({
    season: seasonSchema,
    last: boundedPositiveIntSchema(1, 20).optional(),
  })
  .strict();

export const fixtureTeamStatsParamsSchema = z
  .object({
    fixtureId: numericStringSchema,
    teamId: numericStringSchema,
  })
  .strict();

export const playerMatchesQuerySchema = z
  .object({
    teamId: numericStringSchema,
    season: seasonSchema,
    last: boundedPositiveIntSchema(1, 20).optional(),
  })
  .strict();
