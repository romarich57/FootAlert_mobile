import { z } from 'zod';
import { boundedPositiveIntSchema, numericStringSchema, seasonSchema } from '../../lib/schemas.js';
const paginationCursorSchema = z.string().trim().min(1).max(2048);
export const competitionIdParamsSchema = z
    .object({
    id: numericStringSchema,
})
    .strict();
export const searchQuerySchema = z
    .object({
    q: z.string().trim().min(1).max(100),
})
    .strict();
export const seasonQuerySchema = z
    .object({
    season: seasonSchema,
    limit: boundedPositiveIntSchema(10, 100).optional(),
    cursor: paginationCursorSchema.optional(),
})
    .strict();
export const optionalSeasonQuerySchema = z
    .object({
    season: seasonSchema.optional(),
})
    .strict();
export const requiredSeasonQuerySchema = z
    .object({
    season: seasonSchema,
})
    .strict();
export const playerStatsQuerySchema = z
    .object({
    season: seasonSchema,
    type: z.enum(['topscorers', 'topassists', 'topyellowcards', 'topredcards']),
})
    .strict();
export const COMPETITION_TRANSFERS_MAX_CONCURRENCY = 3;
