import { z } from 'zod';

import { numericStringSchema, seasonSchema } from '../../lib/schemas.js';

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
  })
  .strict();

export const optionalSeasonQuerySchema = z
  .object({
    season: seasonSchema.optional(),
  })
  .strict();

export const playerStatsQuerySchema = z
  .object({
    season: seasonSchema,
    type: z.enum(['topscorers', 'topassists', 'topyellowcards', 'topredcards']),
  })
  .strict();

export const COMPETITION_TRANSFERS_MAX_CONCURRENCY = 3;

export type CompetitionTransferTeamPayload = {
  id: number;
  name: string;
  logo: string;
};

export type CompetitionLeagueTeamEntry = {
  team?: {
    id?: number;
  };
};

export type CompetitionTransfersResponse = {
  response?: unknown[];
};

export type FlattenedCompetitionTransfer = {
  player: {
    id: number;
    name: string;
  };
  update: string;
  transfers: Array<{
    date: string;
    type: string;
    teams: {
      in: CompetitionTransferTeamPayload;
      out: CompetitionTransferTeamPayload;
    };
  }>;
  context: {
    teamInInLeague: boolean;
    teamOutInLeague: boolean;
  };
};
