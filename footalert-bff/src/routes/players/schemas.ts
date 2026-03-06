import { z } from 'zod';

import {
  boundedPositiveIntSchema,
  numericStringSchema,
  seasonSchema,
} from '../../lib/schemas.js';

export const PLAYER_MATCHES_LIMIT = 99;

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

export const playerOverviewQuerySchema = playerDetailsQuerySchema;

export const playerStatsCatalogQuerySchema = z.object({}).strict();

export const teamFixturesParamsSchema = z
  .object({
    teamId: numericStringSchema,
  })
  .strict();

export const teamFixturesQuerySchema = z
  .object({
    season: seasonSchema,
    last: boundedPositiveIntSchema(1, PLAYER_MATCHES_LIMIT).optional(),
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
    last: boundedPositiveIntSchema(1, PLAYER_MATCHES_LIMIT).optional(),
  })
  .strict();
