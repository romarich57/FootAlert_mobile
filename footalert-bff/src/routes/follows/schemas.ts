import { z } from 'zod';

import {
  FOLLOW_CARDS_MAX_IDS,
  FOLLOW_DISCOVERY_MAX_LIMIT,
  FOLLOW_EVENT_SOURCES,
  TRENDS_MAX_LEAGUE_IDS,
} from './constants.js';
import {
  commaSeparatedNumericIdsSchema,
  numericStringSchema,
  seasonSchema,
  timezoneSchema,
} from '../../lib/schemas.js';

export const searchQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(100),
  })
  .strict();

export const searchPlayersQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(100),
    season: seasonSchema,
  })
  .strict();

export const teamIdParamsSchema = z
  .object({
    teamId: numericStringSchema,
  })
  .strict();

export const playerSeasonParamsSchema = z
  .object({
    playerId: numericStringSchema,
    season: seasonSchema,
  })
  .strict();

export const trendsQuerySchema = z
  .object({
    leagueIds: commaSeparatedNumericIdsSchema({
      maxItems: TRENDS_MAX_LEAGUE_IDS,
    }),
    season: seasonSchema,
  })
  .strict();

export const discoveryQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(FOLLOW_DISCOVERY_MAX_LIMIT).optional(),
  })
  .strict();

export const teamSnapshotSchema = z
  .object({
    teamName: z.string().trim().min(1).max(160),
    teamLogo: z.string().trim().max(2048),
    country: z.string().trim().max(120).optional(),
  })
  .strict();

export const playerSnapshotSchema = z
  .object({
    playerName: z.string().trim().min(1).max(160),
    playerPhoto: z.string().trim().max(2048),
    position: z.string().trim().max(80).optional(),
    teamName: z.string().trim().max(160).optional(),
    teamLogo: z.string().trim().max(2048).optional(),
    leagueName: z.string().trim().max(160).optional(),
  })
  .strict();

export const followEventSchema = z.discriminatedUnion('entityKind', [
  z
    .object({
      entityKind: z.literal('team'),
      entityId: numericStringSchema,
      action: z.enum(['follow', 'unfollow']),
      source: z.enum(FOLLOW_EVENT_SOURCES),
      occurredAt: z.string().datetime().optional(),
      entitySnapshot: teamSnapshotSchema.optional(),
    })
    .strict(),
  z
    .object({
      entityKind: z.literal('player'),
      entityId: numericStringSchema,
      action: z.enum(['follow', 'unfollow']),
      source: z.enum(FOLLOW_EVENT_SOURCES),
      occurredAt: z.string().datetime().optional(),
      entitySnapshot: playerSnapshotSchema.optional(),
    })
    .strict(),
]);

export const cardsTeamIdsQuerySchema = z
  .object({
    ids: commaSeparatedNumericIdsSchema({ maxItems: FOLLOW_CARDS_MAX_IDS }),
    timezone: timezoneSchema,
  })
  .strict();

export const cardsPlayerIdsQuerySchema = z
  .object({
    ids: commaSeparatedNumericIdsSchema({ maxItems: FOLLOW_CARDS_MAX_IDS }),
    season: seasonSchema,
  })
  .strict();

export type TeamSnapshot = z.infer<typeof teamSnapshotSchema>;
export type PlayerSnapshot = z.infer<typeof playerSnapshotSchema>;
export type FollowEventPayload = z.infer<typeof followEventSchema>;

export type PlayerProfilesResponse = {
  response?: Array<{
    player?: {
      id?: number;
      name?: string;
      photo?: string;
      position?: string;
    };
  }>;
};

export type TeamDetailsResponse = {
  response?: Array<{
    team?: {
      id?: number;
      name?: string;
      logo?: string;
      country?: string;
    };
  }>;
};

export type TeamNextFixtureResponse = {
  response?: Array<{
    fixture?: {
      id?: number;
      date?: string;
    };
    teams?: {
      home?: {
        id?: number;
        name?: string;
        logo?: string;
      };
      away?: {
        id?: number;
        name?: string;
        logo?: string;
      };
    };
  }>;
};

export type PlayerSeasonResponse = {
  response?: Array<{
    player?: {
      id?: number;
      name?: string;
      photo?: string;
    };
    statistics?: Array<{
      team?: {
        name?: string;
        logo?: string;
      };
      league?: {
        name?: string;
      };
      games?: {
        position?: string;
      };
      goals?: {
        total?: number | null;
        assists?: number | null;
      };
    }>;
  }>;
};

export type FollowsApiResponse<T> = {
  response?: T[];
};

export type FollowsApiStandingDto = {
  league?: {
    standings?: Array<
      Array<{
        team?: {
          id?: number;
          name?: string;
          logo?: string;
        };
      }>
    >;
  };
};

export type FollowsApiTopScorerDto = {
  player?: {
    id?: number;
    name?: string;
  };
  statistics?: Array<{
    team?: {
      name?: string;
      logo?: string;
    };
    league?: {
      name?: string;
    };
    games?: {
      position?: string;
    };
  }>;
};

export type FollowDiscoveryTeamItem = {
  teamId: string;
  teamName: string;
  teamLogo: string;
  country: string;
  activeFollowersCount: number;
  recentNet30d: number;
  totalFollowAdds: number;
};

export type FollowDiscoveryPlayerItem = {
  playerId: string;
  playerName: string;
  playerPhoto: string;
  position: string;
  teamName: string;
  teamLogo: string;
  leagueName: string;
  activeFollowersCount: number;
  recentNet30d: number;
  totalFollowAdds: number;
};

export type FollowDiscoveryMeta = {
  source: string;
  complete: boolean;
  seedCount: number;
  generatedAt: string;
  refreshAfterMs: number | null;
};

export type FollowDiscoveryRouteResponse<T> = {
  items: T[];
  meta: FollowDiscoveryMeta;
};
