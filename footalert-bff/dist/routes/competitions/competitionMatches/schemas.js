import { z } from 'zod';
import { boundedPositiveIntSchema, seasonSchema } from '../../../lib/schemas.js';
export const ROUTE_PATH = '/v1/competitions/:id/matches';
export const DEFAULT_PAGINATION_LIMIT = 50;
const paginationCursorSchema = z.string().trim().min(1).max(2048);
export const competitionMatchesQuerySchema = z
    .object({
    season: seasonSchema,
    limit: boundedPositiveIntSchema(10, 100).optional(),
    cursor: paginationCursorSchema.optional(),
    anchor: z.enum(['smart', 'start']).default('smart'),
})
    .strict();
