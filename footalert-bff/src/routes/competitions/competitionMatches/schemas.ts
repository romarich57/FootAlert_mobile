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

export type CompetitionMatchesEnvelope = {
  response?: unknown[];
} & Record<string, unknown>;

export type RawCompetitionFixture = Record<string, unknown>;

export type OrderedFixture = {
  item: RawCompetitionFixture;
  originalIndex: number;
  roundKey: string;
  timestamp: number;
  statusShort: string;
  statusLong: string;
  elapsed: number | null;
};

export type OrderedFixtureRound = {
  fixtures: OrderedFixture[];
  roundKey: string;
  sortIndex: number;
  sortTimestamp: number;
};

export type CompetitionMatchesPageInfo = {
  hasMore: boolean;
  nextCursor: string | null;
  returnedCount: number;
  hasPrevious: boolean;
  previousCursor: string | null;
};
