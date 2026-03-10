import { z } from 'zod';
import { boundedPositiveIntSchema, numericStringSchema, timezoneSchema } from '../../lib/schemas.js';
const paginationCursorSchema = z.string().trim().min(1).max(2048);
export const matchesQuerySchema = z
    .object({
    date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
    timezone: timezoneSchema,
    limit: boundedPositiveIntSchema(10, 100).optional(),
    cursor: paginationCursorSchema.optional(),
})
    .strict();
export const matchByIdParamsSchema = z
    .object({
    id: numericStringSchema,
})
    .strict();
export const matchByIdQuerySchema = z
    .object({
    timezone: timezoneSchema,
})
    .strict();
export const emptyQuerySchema = z.object({}).strict();
export const optionalTimezoneQuerySchema = z
    .object({
    timezone: timezoneSchema.optional(),
})
    .strict();
export const matchPlayersStatsParamsSchema = z
    .object({
    id: numericStringSchema,
    teamId: numericStringSchema,
})
    .strict();
export const headToHeadQuerySchema = z
    .object({
    timezone: timezoneSchema.optional(),
    last: boundedPositiveIntSchema(1, 20).optional(),
})
    .strict();
const statisticsPeriodSchema = z.enum(['all', 'first', 'second']);
export const matchStatisticsQuerySchema = z
    .object({
    period: statisticsPeriodSchema.optional(),
})
    .strict();
