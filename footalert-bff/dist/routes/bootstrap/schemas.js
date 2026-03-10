import { z } from 'zod';
import { commaSeparatedNumericIdsSchema, seasonSchema, timezoneSchema, } from '../../lib/schemas.js';
import { FOLLOW_CARDS_MAX_IDS, FOLLOW_DISCOVERY_DEFAULT_LIMIT, FOLLOW_DISCOVERY_MAX_LIMIT, } from '../follows/constants.js';
const isoDateSchema = z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected date in YYYY-MM-DD format.');
export const bootstrapQuerySchema = z
    .object({
    date: isoDateSchema,
    timezone: timezoneSchema,
    season: seasonSchema,
    followedTeamIds: commaSeparatedNumericIdsSchema({
        maxItems: FOLLOW_CARDS_MAX_IDS,
    }).optional(),
    followedPlayerIds: commaSeparatedNumericIdsSchema({
        maxItems: FOLLOW_CARDS_MAX_IDS,
    }).optional(),
    discoveryLimit: z
        .coerce
        .number()
        .int()
        .min(1)
        .max(FOLLOW_DISCOVERY_MAX_LIMIT)
        .optional(),
})
    .strict();
export const BOOTSTRAP_DEFAULT_DISCOVERY_LIMIT = FOLLOW_DISCOVERY_DEFAULT_LIMIT;
