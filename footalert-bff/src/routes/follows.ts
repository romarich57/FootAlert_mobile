import { getFollowDiscoverySeeds } from '@footalert/app-core';
import type { FastifyBaseLogger, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { env } from '../config/env.js';
import { apiFootballGet } from '../lib/apiFootballClient.js';
import { buildCanonicalCacheKey, withCache } from '../lib/cache.js';
import { mapWithConcurrency } from '../lib/concurrency/mapWithConcurrency.js';
import { getFollowsDiscoveryStore } from '../lib/follows/discoveryRuntime.js';
import type {
  FollowDiscoveryMetadata,
  FollowEntityKind,
} from '../lib/follows/discoveryStore.js';
import { verifySensitiveMobileAuth } from '../lib/mobileSessionAuth.js';
import {
  commaSeparatedNumericIdsSchema,
  numericStringSchema,
  seasonSchema,
  timezoneSchema,
} from '../lib/schemas.js';
import { parseOrThrow } from '../lib/validation.js';

const TRENDS_MAX_LEAGUE_IDS = 10;
const TRENDS_MAX_CONCURRENCY = 3;
const FOLLOW_CARDS_MAX_IDS = 50;
const FOLLOW_CARDS_CONCURRENCY = 3;
const FOLLOW_DISCOVERY_DEFAULT_LIMIT = 8;
const FOLLOW_DISCOVERY_MAX_LIMIT = 20;
const FOLLOW_DISCOVERY_CACHE_TTL_MS = 60_000;
const FOLLOW_DISCOVERY_METADATA_STALE_MS = 24 * 60 * 60 * 1000;

const FOLLOW_EVENT_SOURCES = [
  'follows_trending',
  'follows_search',
  'onboarding_trending',
  'onboarding_search',
  'team_details',
  'player_details',
  'search_tab',
] as const;

const searchQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(100),
  })
  .strict();

const searchPlayersQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(100),
    season: seasonSchema,
  })
  .strict();

const teamIdParamsSchema = z
  .object({
    teamId: numericStringSchema,
  })
  .strict();

const playerSeasonParamsSchema = z
  .object({
    playerId: numericStringSchema,
    season: seasonSchema,
  })
  .strict();

const trendsQuerySchema = z
  .object({
    leagueIds: commaSeparatedNumericIdsSchema({
      maxItems: TRENDS_MAX_LEAGUE_IDS,
    }),
    season: seasonSchema,
  })
  .strict();

const discoveryQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(FOLLOW_DISCOVERY_MAX_LIMIT).optional(),
  })
  .strict();

const teamSnapshotSchema = z
  .object({
    teamName: z.string().trim().min(1).max(160),
    teamLogo: z.string().trim().max(2048),
    country: z.string().trim().max(120).optional(),
  })
  .strict();

const playerSnapshotSchema = z
  .object({
    playerName: z.string().trim().min(1).max(160),
    playerPhoto: z.string().trim().max(2048),
    position: z.string().trim().max(80).optional(),
    teamName: z.string().trim().max(160).optional(),
    teamLogo: z.string().trim().max(2048).optional(),
    leagueName: z.string().trim().max(160).optional(),
  })
  .strict();

const followEventSchema = z.discriminatedUnion('entityKind', [
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

type PlayerProfilesResponse = {
  response?: Array<{
    player?: {
      id?: number;
      name?: string;
      photo?: string;
      position?: string;
    };
  }>;
};

type TeamDetailsResponse = {
  response?: Array<{
    team?: {
      id?: number;
      name?: string;
      logo?: string;
      country?: string;
    };
  }>;
};

type TeamNextFixtureResponse = {
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

type PlayerSeasonResponse = {
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

type FollowsApiResponse<T> = {
  response?: T[];
};

type FollowsApiStandingDto = {
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

type FollowsApiTopScorerDto = {
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
      season?: number;
    };
    games?: {
      position?: string;
    };
  }>;
};

type FollowDiscoveryTeamItem = {
  teamId: string;
  teamName: string;
  teamLogo: string;
  country: string;
  activeFollowersCount: number;
  recentNet30d: number;
  totalFollowAdds: number;
};

type FollowDiscoveryPlayerItem = {
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

const cardsTeamIdsQuerySchema = z
  .object({
    ids: commaSeparatedNumericIdsSchema({
      maxItems: FOLLOW_CARDS_MAX_IDS,
    }),
    timezone: timezoneSchema,
  })
  .strict();

const cardsPlayerIdsQuerySchema = z
  .object({
    ids: commaSeparatedNumericIdsSchema({
      maxItems: FOLLOW_CARDS_MAX_IDS,
    }),
    season: seasonSchema,
  })
  .strict();

function getCurrentSeasonYear(now = new Date()): number {
  return now.getUTCMonth() + 1 >= 7 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}

function getLegacyDiscoveryLeagueIds(): string[] {
  return TOP_COMPETITIONS
    .filter(item => item.type === 'League')
    .slice(0, 5)
    .map(item => item.competitionId);
}

function toSafeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function rejectUnauthorizedFollowEventRequest(
  request: FastifyRequest,
  reply: FastifyReply,
): { subject: string } | null {
  const authResult = verifySensitiveMobileAuth(request, {
    requiredScope: 'telemetry:write',
    jwtSecret: env.mobileSessionJwtSecret,
    minIntegrity: 'device',
  });

  if (!authResult.ok) {
    reply.code(authResult.failure.statusCode).send({
      error: authResult.failure.code,
      message: authResult.failure.message,
    });
    return null;
  }

  return {
    subject: authResult.context.subject,
  };
}

function toMetadataFromSnapshot(
  entityKind: FollowEntityKind,
  snapshot: z.infer<typeof teamSnapshotSchema> | z.infer<typeof playerSnapshotSchema>,
): FollowDiscoveryMetadata {
  if (entityKind === 'team') {
    const typedSnapshot = snapshot as z.infer<typeof teamSnapshotSchema>;
    return {
      name: typedSnapshot.teamName,
      imageUrl: typedSnapshot.teamLogo,
      country: typedSnapshot.country ?? null,
    };
  }

  const typedSnapshot = snapshot as z.infer<typeof playerSnapshotSchema>;
  return {
    name: typedSnapshot.playerName,
    imageUrl: typedSnapshot.playerPhoto,
    position: typedSnapshot.position ?? null,
    teamName: typedSnapshot.teamName ?? null,
    teamLogo: typedSnapshot.teamLogo ?? null,
    leagueName: typedSnapshot.leagueName ?? null,
  };
}

function mapDynamicTeamDiscoveryItem(input: {
  entityId: string;
  metadata: FollowDiscoveryMetadata;
  activeFollowersCount: number;
  recentNet30d: number;
  totalFollowAddsCount: number;
}): FollowDiscoveryTeamItem {
  return {
    teamId: input.entityId,
    teamName: input.metadata.name,
    teamLogo: input.metadata.imageUrl,
    country: input.metadata.country ?? '',
    activeFollowersCount: input.activeFollowersCount,
    recentNet30d: input.recentNet30d,
    totalFollowAdds: input.totalFollowAddsCount,
  };
}

function mapDynamicPlayerDiscoveryItem(input: {
  entityId: string;
  metadata: FollowDiscoveryMetadata;
  activeFollowersCount: number;
  recentNet30d: number;
  totalFollowAddsCount: number;
}): FollowDiscoveryPlayerItem {
  return {
    playerId: input.entityId,
    playerName: input.metadata.name,
    playerPhoto: input.metadata.imageUrl,
    position: input.metadata.position ?? '',
    teamName: input.metadata.teamName ?? '',
    teamLogo: input.metadata.teamLogo ?? '',
    leagueName: input.metadata.leagueName ?? '',
    activeFollowersCount: input.activeFollowersCount,
    recentNet30d: input.recentNet30d,
    totalFollowAdds: input.totalFollowAddsCount,
  };
}

async function loadLegacyTeamDiscovery(
  limit: number,
  season: number,
  logger?: FastifyBaseLogger,
): Promise<FollowDiscoveryTeamItem[]> {
  const leagueIds = getLegacyDiscoveryLeagueIds();
  if (limit <= 0 || leagueIds.length === 0) {
    return [];
  }

  const responses = await mapWithConcurrency(leagueIds, TRENDS_MAX_CONCURRENCY, leagueId =>
    apiFootballGet<FollowsApiResponse<FollowsApiStandingDto>>(
      `/standings?league=${encodeURIComponent(leagueId)}&season=${encodeURIComponent(String(season))}`,
    ).catch(error => {
      logger?.warn(
        {
          leagueId,
          err: error instanceof Error ? error.message : String(error),
        },
        'follows.discovery.legacy_team_failed',
      );
      return { response: [] };
    }),
  );

  const items: FollowDiscoveryTeamItem[] = [];
  const seen = new Set<string>();

  for (const payload of responses) {
    for (const leagueItem of payload.response ?? []) {
      const standing = leagueItem.league?.standings?.[0] ?? [];
      for (const row of standing) {
        const teamId = String(row.team?.id ?? '').trim();
        const teamName = row.team?.name?.trim() ?? '';
        if (!teamId || !teamName || seen.has(teamId)) {
          continue;
        }

        seen.add(teamId);
        items.push({
          teamId,
          teamName,
          teamLogo: row.team?.logo ?? '',
          country: '',
          activeFollowersCount: 0,
          recentNet30d: 0,
          totalFollowAdds: 0,
        });

        if (items.length >= limit) {
          return items;
        }
      }
    }
  }

  return items;
}

async function loadLegacyPlayerDiscovery(
  limit: number,
  season: number,
  logger?: FastifyBaseLogger,
): Promise<FollowDiscoveryPlayerItem[]> {
  const leagueIds = getLegacyDiscoveryLeagueIds();
  if (limit <= 0 || leagueIds.length === 0) {
    return [];
  }

  const responses = await mapWithConcurrency(leagueIds, TRENDS_MAX_CONCURRENCY, leagueId =>
    apiFootballGet<FollowsApiResponse<FollowsApiTopScorerDto>>(
      `/players/topscorers?league=${encodeURIComponent(leagueId)}&season=${encodeURIComponent(String(season))}`,
    ).catch(error => {
      logger?.warn(
        {
          leagueId,
          err: error instanceof Error ? error.message : String(error),
        },
        'follows.discovery.legacy_player_failed',
      );
      return { response: [] };
    }),
  );

  const items: FollowDiscoveryPlayerItem[] = [];
  const seen = new Set<string>();

  for (const payload of responses) {
    for (const item of payload.response ?? []) {
      const playerId = String(item.player?.id ?? '').trim();
      const playerName = item.player?.name?.trim() ?? '';
      if (!playerId || !playerName || seen.has(playerId)) {
        continue;
      }

      const firstStats = item.statistics?.[0];
      seen.add(playerId);
      items.push({
        playerId,
        playerName,
        playerPhoto: item.player?.photo ?? '',
        position: firstStats?.games?.position ?? '',
        teamName: firstStats?.team?.name ?? '',
        teamLogo: firstStats?.team?.logo ?? '',
        leagueName: firstStats?.league?.season ? String(firstStats.league.season) : '',
        activeFollowersCount: 0,
        recentNet30d: 0,
        totalFollowAdds: 0,
      });

      if (items.length >= limit) {
        return items;
      }
    }
  }

  return items;
}

function mergeDiscoveryItems<T>(
  sources: T[][],
  getId: (item: T) => string,
  limit: number,
): T[] {
  if (limit <= 0) {
    return [];
  }

  const merged: T[] = [];
  const seen = new Set<string>();

  for (const source of sources) {
    for (const item of source) {
      const itemId = getId(item);
      if (!itemId || seen.has(itemId)) {
        continue;
      }

      seen.add(itemId);
      merged.push(item);

      if (merged.length >= limit) {
        return merged;
      }
    }
  }

  return merged;
}

async function hydrateDiscoveryMetadataIfNeeded(params: {
  entityKind: FollowEntityKind;
  entityId: string;
  store: Awaited<ReturnType<typeof getFollowsDiscoveryStore>>;
}): Promise<void> {
  const updatedAt = await params.store.getMetadataUpdatedAt(params.entityKind, params.entityId);
  if (updatedAt && Date.now() - updatedAt.getTime() < FOLLOW_DISCOVERY_METADATA_STALE_MS) {
    return;
  }

  if (params.entityKind === 'team') {
    const payload = await apiFootballGet<TeamDetailsResponse>(
      `/teams?id=${encodeURIComponent(params.entityId)}`,
    );
    const team = payload.response?.[0]?.team;
    const teamId = toSafeNumber(team?.id);
    const teamName = team?.name?.trim() ?? '';

    if (!teamId || !teamName) {
      return;
    }

    await params.store.upsertMetadata('team', params.entityId, {
      name: teamName,
      imageUrl: team?.logo ?? '',
      country: team?.country ?? null,
    });
    return;
  }

  const payload = await apiFootballGet<PlayerSeasonResponse>(
    `/players?id=${encodeURIComponent(params.entityId)}&season=${encodeURIComponent(String(getCurrentSeasonYear()))}`,
  );
  const item = payload.response?.[0];
  const playerId = toSafeNumber(item?.player?.id);
  const playerName = item?.player?.name?.trim() ?? '';

  if (!item || !playerId || !playerName) {
    return;
  }

  const firstStats = item.statistics?.[0];
  await params.store.upsertMetadata('player', params.entityId, {
    name: playerName,
    imageUrl: item?.player?.photo ?? '',
    position: firstStats?.games?.position ?? null,
    teamName: firstStats?.team?.name ?? null,
    teamLogo: firstStats?.team?.logo ?? null,
    leagueName: firstStats?.league?.name ?? null,
  });
}

function mapTeamCard(
  teamId: string,
  detailsPayload: TeamDetailsResponse,
  nextFixturePayload: TeamNextFixtureResponse,
) {
  const team = detailsPayload.response?.[0]?.team;
  const nextFixture = nextFixturePayload.response?.[0];
  const homeTeamId = nextFixture?.teams?.home?.id;
  const isHomeTeam = String(homeTeamId ?? '') === teamId;
  const opponent = isHomeTeam ? nextFixture?.teams?.away : nextFixture?.teams?.home;

  return {
    teamId,
    teamName: team?.name ?? '',
    teamLogo: team?.logo ?? '',
    nextMatch: nextFixture?.fixture?.id && nextFixture?.fixture?.date
      ? {
        fixtureId: String(nextFixture.fixture.id),
        opponentTeamName: opponent?.name ?? '',
        opponentTeamLogo: opponent?.logo ?? '',
        startDate: nextFixture.fixture.date,
      }
      : null,
  };
}

function mapPlayerCard(playerId: string, payload: PlayerSeasonResponse) {
  const item = payload.response?.[0];
  const firstStats = item?.statistics?.[0];

  return {
    playerId,
    playerName: item?.player?.name ?? '',
    playerPhoto: item?.player?.photo ?? '',
    position: firstStats?.games?.position ?? '',
    teamName: firstStats?.team?.name ?? '',
    teamLogo: firstStats?.team?.logo ?? '',
    leagueName: firstStats?.league?.name ?? '',
    goals: typeof firstStats?.goals?.total === 'number' ? firstStats.goals.total : null,
    assists: typeof firstStats?.goals?.assists === 'number' ? firstStats.goals.assists : null,
  };
}

// Top 20 compétitions mondiales (liste curative)
const TOP_COMPETITIONS: Array<{
  competitionId: string;
  competitionName: string;
  competitionLogo: string;
  country: string;
  type: string;
}> = [
  { competitionId: '39', competitionName: 'Premier League', competitionLogo: 'https://media.api-sports.io/football/leagues/39.png', country: 'England', type: 'League' },
  { competitionId: '140', competitionName: 'La Liga', competitionLogo: 'https://media.api-sports.io/football/leagues/140.png', country: 'Spain', type: 'League' },
  { competitionId: '135', competitionName: 'Serie A', competitionLogo: 'https://media.api-sports.io/football/leagues/135.png', country: 'Italy', type: 'League' },
  { competitionId: '78', competitionName: 'Bundesliga', competitionLogo: 'https://media.api-sports.io/football/leagues/78.png', country: 'Germany', type: 'League' },
  { competitionId: '61', competitionName: 'Ligue 1', competitionLogo: 'https://media.api-sports.io/football/leagues/61.png', country: 'France', type: 'League' },
  { competitionId: '2', competitionName: 'UEFA Champions League', competitionLogo: 'https://media.api-sports.io/football/leagues/2.png', country: 'World', type: 'Cup' },
  { competitionId: '3', competitionName: 'UEFA Europa League', competitionLogo: 'https://media.api-sports.io/football/leagues/3.png', country: 'World', type: 'Cup' },
  { competitionId: '848', competitionName: 'UEFA Conference League', competitionLogo: 'https://media.api-sports.io/football/leagues/848.png', country: 'World', type: 'Cup' },
  { competitionId: '88', competitionName: 'Eredivisie', competitionLogo: 'https://media.api-sports.io/football/leagues/88.png', country: 'Netherlands', type: 'League' },
  { competitionId: '94', competitionName: 'Primeira Liga', competitionLogo: 'https://media.api-sports.io/football/leagues/94.png', country: 'Portugal', type: 'League' },
  { competitionId: '144', competitionName: 'Jupiler Pro League', competitionLogo: 'https://media.api-sports.io/football/leagues/144.png', country: 'Belgium', type: 'League' },
  { competitionId: '71', competitionName: 'Brasileirão Série A', competitionLogo: 'https://media.api-sports.io/football/leagues/71.png', country: 'Brazil', type: 'League' },
  { competitionId: '128', competitionName: 'Liga Profesional Argentina', competitionLogo: 'https://media.api-sports.io/football/leagues/128.png', country: 'Argentina', type: 'League' },
  { competitionId: '253', competitionName: 'MLS', competitionLogo: 'https://media.api-sports.io/football/leagues/253.png', country: 'USA', type: 'League' },
  { competitionId: '1', competitionName: 'FIFA World Cup', competitionLogo: 'https://media.api-sports.io/football/leagues/1.png', country: 'World', type: 'Cup' },
  { competitionId: '4', competitionName: 'UEFA Euro', competitionLogo: 'https://media.api-sports.io/football/leagues/4.png', country: 'World', type: 'Cup' },
  { competitionId: '9', competitionName: 'Copa America', competitionLogo: 'https://media.api-sports.io/football/leagues/9.png', country: 'World', type: 'Cup' },
  { competitionId: '45', competitionName: 'FA Cup', competitionLogo: 'https://media.api-sports.io/football/leagues/45.png', country: 'England', type: 'Cup' },
  { competitionId: '143', competitionName: 'Copa del Rey', competitionLogo: 'https://media.api-sports.io/football/leagues/143.png', country: 'Spain', type: 'Cup' },
  { competitionId: '137', competitionName: 'Coppa Italia', competitionLogo: 'https://media.api-sports.io/football/leagues/137.png', country: 'Italy', type: 'Cup' },
];

export async function registerFollowsRoutes(app: FastifyInstance): Promise<void> {
  const getDiscoveryStore = () =>
    getFollowsDiscoveryStore({
      backend: env.notificationsPersistenceBackend,
      databaseUrl: env.databaseUrl,
    });

  app.get(
    '/v1/follows/trends/competitions',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
    },
    async () => {
      return withCache('follows:trendscompetitions', 3_600_000, async () => ({
        competitions: TOP_COMPETITIONS,
      }));
    },
  );

  app.get(
    '/v1/follows/search/competitions',
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
        },
      },
    },
    async request => {
      const query = parseOrThrow(searchQuerySchema, request.query);

      return withCache(`follows:search:competitions:${request.url}`, 60_000, () =>
        apiFootballGet(`/leagues?search=${encodeURIComponent(query.q)}`),
      );
    },
  );

  app.get('/v1/follows/search/teams', async request => {
    const query = parseOrThrow(searchQuerySchema, request.query);

    return withCache(`follows:search:teams:${request.url}`, 60_000, () =>
      apiFootballGet(`/teams?search=${encodeURIComponent(query.q)}`),
    );
  });

  app.get('/v1/follows/search/players', async request => {
    const query = parseOrThrow(searchPlayersQuerySchema, request.query);

    return withCache(`follows:search:players-profiles:${request.url}`, 60_000, async () => {
      const result = await apiFootballGet<PlayerProfilesResponse>(
        `/players/profiles?search=${encodeURIComponent(query.q)}`,
      );

      const mapped = (result.response ?? []).map(item => ({
        player: {
          id: item.player?.id,
          name: item.player?.name,
          photo: item.player?.photo,
        },
        statistics: [
          {
            games: {
              position: item.player?.position,
            },
          },
        ],
      }));

      return {
        response: mapped,
      };
    });
  });

  app.get('/v1/follows/teams/:teamId', async request => {
    const params = parseOrThrow(teamIdParamsSchema, request.params);
    parseOrThrow(z.object({}).strict(), request.query);

    return withCache(`follows:team:${request.url}`, 120_000, () =>
      apiFootballGet(`/teams?id=${encodeURIComponent(params.teamId)}`),
    );
  });

  app.get('/v1/follows/teams/:teamId/next-fixture', async request => {
    const params = parseOrThrow(teamIdParamsSchema, request.params);
    const query = parseOrThrow(
      z
        .object({
          timezone: timezoneSchema,
        })
        .strict(),
      request.query,
    );

    return withCache(`follows:nextfixture:${request.url}`, 45_000, () =>
      apiFootballGet(
        `/fixtures?team=${encodeURIComponent(params.teamId)}&next=1&timezone=${encodeURIComponent(query.timezone)}`,
      ),
    );
  });

  app.get('/v1/follows/teams/cards', async request => {
    const query = parseOrThrow(cardsTeamIdsQuerySchema, request.query);

    return withCache(
      buildCanonicalCacheKey('follows:team-cards', {
        ids: query.ids,
        timezone: query.timezone,
      }),
      45_000,
      async () => {
        const cards = await mapWithConcurrency(query.ids, FOLLOW_CARDS_CONCURRENCY, async teamId => {
          const [detailsPayload, nextFixturePayload] = await Promise.all([
            withCache<TeamDetailsResponse>(
              buildCanonicalCacheKey('follows:team-details', { teamId }),
              120_000,
              () => apiFootballGet(`/teams?id=${encodeURIComponent(teamId)}`),
            ),
            withCache<TeamNextFixtureResponse>(
              buildCanonicalCacheKey('follows:team-next-fixture', {
                teamId,
                timezone: query.timezone,
              }),
              45_000,
              () =>
                apiFootballGet(
                  `/fixtures?team=${encodeURIComponent(teamId)}&next=1&timezone=${encodeURIComponent(query.timezone)}`,
                ),
            ),
          ]);

          return mapTeamCard(teamId, detailsPayload, nextFixturePayload);
        });

        return {
          response: cards,
        };
      },
    );
  });

  app.get('/v1/follows/players/:playerId/season/:season', async request => {
    const params = parseOrThrow(playerSeasonParamsSchema, request.params);
    parseOrThrow(z.object({}).strict(), request.query);

    return withCache(`follows:playerseason:${request.url}`, 60_000, () =>
      apiFootballGet(
        `/players?id=${encodeURIComponent(params.playerId)}&season=${encodeURIComponent(String(params.season))}`,
      ),
    );
  });

  app.get('/v1/follows/players/cards', async request => {
    const query = parseOrThrow(cardsPlayerIdsQuerySchema, request.query);

    return withCache(
      buildCanonicalCacheKey('follows:player-cards', {
        ids: query.ids,
        season: query.season,
      }),
      60_000,
      async () => {
        const cards = await mapWithConcurrency(query.ids, FOLLOW_CARDS_CONCURRENCY, async playerId => {
          const payload = await withCache<PlayerSeasonResponse>(
            buildCanonicalCacheKey('follows:player-season', {
              playerId,
              season: query.season,
            }),
            60_000,
            () =>
              apiFootballGet(
                `/players?id=${encodeURIComponent(playerId)}&season=${encodeURIComponent(String(query.season))}`,
              ),
          );

          return mapPlayerCard(playerId, payload);
        });

        return {
          response: cards,
        };
      },
    );
  });

  app.get(
    '/v1/follows/trends/teams',
    {
      config: {
        rateLimit: {
          max: 18,
          timeWindow: '1 minute',
        },
      },
    },
    async request => {
      const query = parseOrThrow(trendsQuerySchema, request.query);

      const responses = await withCache(`follows:trendsteams:${request.url}`, 120_000, async () =>
        mapWithConcurrency(query.leagueIds, TRENDS_MAX_CONCURRENCY, leagueId =>
          apiFootballGet(
            `/standings?league=${encodeURIComponent(leagueId)}&season=${encodeURIComponent(String(query.season))}`,
          ).catch(err => {
            request.log.warn({ leagueId, err: (err as Error).message }, 'api.upstream.failure');
            return { response: [] };
          }),
        ),
      );

      return {
        response: responses,
      };
    },
  );

  app.get(
    '/v1/follows/trends/players',
    {
      config: {
        rateLimit: {
          max: 18,
          timeWindow: '1 minute',
        },
      },
    },
    async request => {
      const query = parseOrThrow(trendsQuerySchema, request.query);

      const responses = await withCache(
        `follows:trendsplayers:${request.url}`,
        120_000,
        async () =>
          mapWithConcurrency(query.leagueIds, TRENDS_MAX_CONCURRENCY, leagueId =>
            apiFootballGet(
              `/players/topscorers?league=${encodeURIComponent(leagueId)}&season=${encodeURIComponent(String(query.season))}`,
            ).catch(err => {
              request.log.warn({ leagueId, err: (err as Error).message }, 'api.upstream.failure');
              return { response: [] };
            }),
          ),
      );

      return {
        response: responses,
      };
    },
  );

  app.post('/v1/follows/events', async (request, reply) => {
    const authContext = rejectUnauthorizedFollowEventRequest(request, reply);
    if (!authContext) {
      return;
    }

    parseOrThrow(z.object({}).strict(), request.query);
    const payload = parseOrThrow(followEventSchema, request.body);
    const store = await getDiscoveryStore();
    const occurredAt = payload.occurredAt ? new Date(payload.occurredAt) : undefined;
    const eventResult = await store.recordEvent({
      subject: authContext.subject,
      entityKind: payload.entityKind,
      entityId: payload.entityId,
      action: payload.action,
      source: payload.source,
      occurredAt,
    });

    if (payload.entitySnapshot) {
      await store.upsertMetadata(
        payload.entityKind,
        payload.entityId,
        toMetadataFromSnapshot(payload.entityKind, payload.entitySnapshot),
      );
    } else {
      void hydrateDiscoveryMetadataIfNeeded({
        entityKind: payload.entityKind,
        entityId: payload.entityId,
        store,
      }).catch(error => {
        request.log.warn(
          {
            entityKind: payload.entityKind,
            entityId: payload.entityId,
            err: error instanceof Error ? error.message : String(error),
          },
          'follows.discovery.metadata_hydration_failed',
        );
      });
    }

    return {
      status: 'accepted' as const,
      applied: eventResult.applied,
      state: eventResult.state,
    };
  });

  app.get('/v1/follows/discovery/teams', async request => {
    const query = parseOrThrow(discoveryQuerySchema, request.query);
    const limit = query.limit ?? FOLLOW_DISCOVERY_DEFAULT_LIMIT;
    const season = getCurrentSeasonYear();

    return withCache(
      buildCanonicalCacheKey('follows:discovery:teams', { limit }),
      FOLLOW_DISCOVERY_CACHE_TTL_MS,
      async () => {
        const store = await getDiscoveryStore();
        const dynamicItems = (await store.getDiscovery('team', limit)).map(mapDynamicTeamDiscoveryItem);

        if (dynamicItems.length >= limit) {
          return {
            items: dynamicItems.slice(0, limit),
            meta: {
              source: 'dynamic' as const,
            },
          };
        }

        const legacyItems = await loadLegacyTeamDiscovery(limit, season, request.log);
        const staticItems = getFollowDiscoverySeeds('team', limit) as FollowDiscoveryTeamItem[];
        const merged = mergeDiscoveryItems(
          [dynamicItems, legacyItems, staticItems],
          item => item.teamId,
          limit,
        );
        const source =
          dynamicItems.length === 0
            ? legacyItems.length > 0
              ? 'legacy_fill'
              : 'static_seed'
            : 'hybrid';

        return {
          items: merged,
          meta: {
            source,
          },
        };
      },
    );
  });

  app.get('/v1/follows/discovery/players', async request => {
    const query = parseOrThrow(discoveryQuerySchema, request.query);
    const limit = query.limit ?? FOLLOW_DISCOVERY_DEFAULT_LIMIT;
    const season = getCurrentSeasonYear();

    return withCache(
      buildCanonicalCacheKey('follows:discovery:players', { limit }),
      FOLLOW_DISCOVERY_CACHE_TTL_MS,
      async () => {
        const store = await getDiscoveryStore();
        const dynamicItems = (await store.getDiscovery('player', limit)).map(mapDynamicPlayerDiscoveryItem);

        if (dynamicItems.length >= limit) {
          return {
            items: dynamicItems.slice(0, limit),
            meta: {
              source: 'dynamic' as const,
            },
          };
        }

        const legacyItems = await loadLegacyPlayerDiscovery(limit, season, request.log);
        const staticItems = getFollowDiscoverySeeds('player', limit) as FollowDiscoveryPlayerItem[];
        const merged = mergeDiscoveryItems(
          [dynamicItems, legacyItems, staticItems],
          item => item.playerId,
          limit,
        );
        const source =
          dynamicItems.length === 0
            ? legacyItems.length > 0
              ? 'legacy_fill'
              : 'static_seed'
            : 'hybrid';

        return {
          items: merged,
          meta: {
            source,
          },
        };
      },
    );
  });
}
