import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { env } from '../../config/env.js';
import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { buildCanonicalCacheKey, withCache } from '../../lib/cache.js';
import {
  PaginationCursorCodec,
  computePaginationFiltersHash,
} from '../../lib/pagination/cursor.js';
import { buildCursorPageInfo } from '../../lib/pagination/slice.js';
import { timezoneSchema } from '../../lib/schemas.js';
import { parseOrThrow } from '../../lib/validation.js';

import {
  buildTeamAdvancedStatsPayload,
  computeLeagueAdvancedTeamStats,
  TEAM_ADVANCED_STATS_CACHE_TTL_MS,
} from './advancedStats.js';
import {
  buildFixtureQuery,
  normalizeStandingsPayload,
  toNumericId,
  type ApiFootballUnknownListResponse,
} from './helpers.js';
import {
  fetchTeamOverviewPayload,
  parseOverviewHistorySeasons,
} from './overview.js';
import {
  statsQuerySchema,
  standingsQuerySchema,
  teamFixturesQuerySchema,
  teamIdParamsSchema,
  teamOverviewQuerySchema,
  teamPlayersQuerySchema,
} from './schemas.js';
import { fetchNormalizedTeamTransfers } from './transfers.js';
import { fetchTeamTrophiesWithFallback } from './trophies.js';

type TeamSquadRecord = {
  players?: unknown[];
  coach?: {
    id: number | string | null;
    name: string | null;
    photo: string | null;
    age: number | null;
  };
} & Record<string, unknown>;

type TeamCoachDto = {
  id?: number | string;
  name?: string;
  photo?: string;
  age?: number;
  career?: Array<{
    team?: {
      id?: number;
    };
    end?: string | null;
  }>;
};

type TeamPlayersEnvelope = {
  response?: unknown[];
  paging?: {
    current?: number;
    total?: number;
  };
} & Record<string, unknown>;

type TeamPlayersCursorChunk = {
  response: unknown[];
  hasMore: boolean;
  upstreamPageTotal?: number;
};

const TEAM_PLAYERS_ROUTE_PATH = '/v1/teams/:id/players';
const TEAM_PLAYERS_DEFAULT_CURSOR_LIMIT = 50;
const TEAM_PLAYERS_UPSTREAM_PAGE_SIZE_HINT = 20;
const TEAM_PLAYERS_CURSOR_FETCH_MAX_PAGES = 12;
const teamPlayersCursorCodec = new PaginationCursorCodec(
  env.paginationCursorSecret,
  env.paginationCursorTtlMs,
);

async function fetchTeamPlayersCursorChunk(input: {
  teamId: string;
  leagueId: string;
  season: number;
  startPosition: number;
  limit: number;
}): Promise<TeamPlayersCursorChunk> {
  const normalizedStart = Math.max(0, Math.floor(input.startPosition));
  const normalizedLimit = Math.max(1, Math.floor(input.limit));
  const startPage = Math.floor(normalizedStart / TEAM_PLAYERS_UPSTREAM_PAGE_SIZE_HINT) + 1;
  const startOffsetInPage =
    normalizedStart - (startPage - 1) * TEAM_PLAYERS_UPSTREAM_PAGE_SIZE_HINT;

  const aggregated: unknown[] = [];
  let page = startPage;
  let pagesFetched = 0;
  let hasMore = true;
  let upstreamPageTotal: number | undefined;

  while (
    aggregated.length < normalizedLimit &&
    hasMore &&
    pagesFetched < TEAM_PLAYERS_CURSOR_FETCH_MAX_PAGES
  ) {
    const searchParams = new URLSearchParams({
      team: input.teamId,
      league: input.leagueId,
      season: String(input.season),
      page: String(page),
    });

    const payload = await withCache(
      `team:players:${input.teamId}:${input.leagueId}:${input.season}:page:${page}`,
      60_000,
      () => apiFootballGet<TeamPlayersEnvelope>(`/players?${searchParams.toString()}`),
    );
    const pageItems = Array.isArray(payload.response) ? payload.response : [];
    const pageCurrent = typeof payload.paging?.current === 'number' ? payload.paging.current : page;
    const pageTotal = typeof payload.paging?.total === 'number' ? payload.paging.total : undefined;
    if (typeof pageTotal === 'number') {
      upstreamPageTotal = pageTotal;
    }

    const effectiveItems = page === startPage ? pageItems.slice(startOffsetInPage) : pageItems;
    const remaining = normalizedLimit - aggregated.length;
    const consumedInThisPage = Math.min(remaining, effectiveItems.length);
    if (consumedInThisPage > 0) {
      aggregated.push(...effectiveItems.slice(0, consumedInThisPage));
    }

    const hasUnconsumedItemsInCurrentPage = consumedInThisPage < effectiveItems.length;
    if (hasUnconsumedItemsInCurrentPage) {
      hasMore = true;
      break;
    }

    if (pageItems.length === 0) {
      hasMore = false;
      break;
    }

    if (typeof pageTotal === 'number') {
      hasMore = pageCurrent < pageTotal;
    } else {
      hasMore = pageItems.length > 0;
    }

    page += 1;
    pagesFetched += 1;
  }

  return {
    response: aggregated,
    hasMore,
    upstreamPageTotal,
  };
}

export async function registerTeamsRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/v1/teams/standings',
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
        },
      },
    },
    async request => {
      const query = parseOrThrow(standingsQuerySchema, request.query);

      return withCache(`team:standings:${request.url}`, 60_000, async () => {
        const data = await apiFootballGet<ApiFootballUnknownListResponse>(
          `/standings?league=${encodeURIComponent(query.leagueId)}&season=${encodeURIComponent(String(query.season))}`,
        );

        return normalizeStandingsPayload(data);
      });
    },
  );

  app.get('/v1/teams/:id', async request => {
    const params = parseOrThrow(teamIdParamsSchema, request.params);
    parseOrThrow(z.object({}).strict(), request.query);

    return withCache(`team:details:${request.url}`, 120_000, () =>
      apiFootballGet(`/teams?id=${encodeURIComponent(params.id)}`),
    );
  });

  app.get('/v1/teams/:id/leagues', async request => {
    const params = parseOrThrow(teamIdParamsSchema, request.params);
    parseOrThrow(z.object({}).strict(), request.query);

    return withCache(`team:leagues:${request.url}`, 120_000, () =>
      apiFootballGet(`/leagues?team=${encodeURIComponent(params.id)}`),
    );
  });

  app.get('/v1/teams/:id/fixtures', async request => {
    const params = parseOrThrow(teamIdParamsSchema, request.params);
    const query = parseOrThrow(teamFixturesQuerySchema, request.query);

    return withCache(`team:fixtures:${request.url}`, 45_000, () =>
      apiFootballGet(`/fixtures?${buildFixtureQuery(params.id, query)}`),
    );
  });

  app.get('/v1/teams/:id/next-fixture', async request => {
    const params = parseOrThrow(teamIdParamsSchema, request.params);
    const query = parseOrThrow(
      z
        .object({
          timezone: timezoneSchema,
        })
        .strict(),
      request.query,
    );

    return withCache(`team:nextfixture:${request.url}`, 45_000, () =>
      apiFootballGet(
        `/fixtures?team=${encodeURIComponent(params.id)}&next=1&timezone=${encodeURIComponent(query.timezone)}`,
      ),
    );
  });

  app.get('/v1/teams/:id/overview', async request => {
    const params = parseOrThrow(teamIdParamsSchema, request.params);
    const query = parseOrThrow(teamOverviewQuerySchema, request.query);
    const historySeasons = parseOverviewHistorySeasons(query.historySeasons);

    return withCache(
      buildCanonicalCacheKey('team:overview', {
        teamId: params.id,
        leagueId: query.leagueId,
        season: query.season,
        timezone: query.timezone,
        historySeasons: historySeasons?.join(','),
      }),
      45_000,
      () =>
        fetchTeamOverviewPayload({
          teamId: params.id,
          leagueId: query.leagueId,
          season: query.season,
          timezone: query.timezone,
          historySeasons,
          logger: request.log,
        }),
    );
  });

  app.get(
    '/v1/teams/:id/standings',
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
        },
      },
    },
    async request => {
      parseOrThrow(teamIdParamsSchema, request.params);
      const query = parseOrThrow(standingsQuerySchema, request.query);

      return withCache(`team:standings:${request.url}`, 60_000, async () => {
        const data = await apiFootballGet<ApiFootballUnknownListResponse>(
          `/standings?league=${encodeURIComponent(query.leagueId)}&season=${encodeURIComponent(String(query.season))}`,
        );

        return normalizeStandingsPayload(data);
      });
    },
  );

  app.get('/v1/teams/:id/stats', async request => {
    const params = parseOrThrow(teamIdParamsSchema, request.params);
    const query = parseOrThrow(statsQuerySchema, request.query);

    return withCache(`team:stats:${request.url}`, 60_000, () =>
      apiFootballGet(
        `/teams/statistics?league=${encodeURIComponent(query.leagueId)}&season=${encodeURIComponent(String(query.season))}&team=${encodeURIComponent(params.id)}`,
      ),
    );
  });

  app.get(
    '/v1/teams/:id/advanced-stats',
    {
      config: {
        rateLimit: {
          max: 25,
          timeWindow: '1 minute',
        },
      },
    },
    async request => {
      const params = parseOrThrow(teamIdParamsSchema, request.params);
      const query = parseOrThrow(statsQuerySchema, request.query);
      const teamId = toNumericId(params.id) ?? Number(params.id);

      const leagueSeasonStats = await withCache(
        `team:advancedstats:league:${query.leagueId}:season:${query.season}`,
        TEAM_ADVANCED_STATS_CACHE_TTL_MS,
        () => computeLeagueAdvancedTeamStats(query.leagueId, query.season),
      );

      return {
        response: buildTeamAdvancedStatsPayload(
          teamId,
          leagueSeasonStats.leagueId,
          leagueSeasonStats.season,
          leagueSeasonStats.rankings,
        ),
      };
    },
  );

  app.get('/v1/teams/:id/players', async request => {
    const params = parseOrThrow(teamIdParamsSchema, request.params);
    const query = parseOrThrow(teamPlayersQuerySchema, request.query);
    const isCursorPagination = typeof query.limit === 'number' || typeof query.cursor === 'string';

    if (!isCursorPagination) {
      const searchParams = new URLSearchParams({
        team: params.id,
        league: query.leagueId,
        season: String(query.season),
      });

      if (typeof query.page === 'number') {
        searchParams.set('page', String(query.page));
      }

      return withCache(`team:players:${request.url}`, 60_000, () =>
        apiFootballGet(`/players?${searchParams.toString()}`),
      );
    }

    const limit = query.limit ?? TEAM_PLAYERS_DEFAULT_CURSOR_LIMIT;
    const filtersHash = computePaginationFiltersHash({
      teamId: params.id,
      leagueId: query.leagueId,
      season: query.season,
    });
    const startPositionFromPage =
      typeof query.page === 'number' ? Math.max(0, (query.page - 1) * limit) : 0;
    const startPosition = query.cursor
      ? teamPlayersCursorCodec.decode(query.cursor, {
        route: TEAM_PLAYERS_ROUTE_PATH,
        filtersHash,
      }).position
      : startPositionFromPage;
    const paginatedPayload = await fetchTeamPlayersCursorChunk({
      teamId: params.id,
      leagueId: query.leagueId,
      season: query.season,
      startPosition,
      limit,
    });
    const pageInfo = buildCursorPageInfo({
      route: TEAM_PLAYERS_ROUTE_PATH,
      filtersHash,
      startPosition,
      returnedCount: paginatedPayload.response.length,
      hasMore: paginatedPayload.hasMore,
      cursorCodec: teamPlayersCursorCodec,
    });
    const syntheticCurrentPage =
      typeof query.page === 'number' ? query.page : Math.floor(startPosition / limit) + 1;

    return {
      response: paginatedPayload.response,
      paging: {
        current: syntheticCurrentPage,
        total: paginatedPayload.upstreamPageTotal,
      },
      pageInfo,
    };
  });

  app.get('/v1/teams/:id/squad', async request => {
    const params = parseOrThrow(teamIdParamsSchema, request.params);
    parseOrThrow(z.object({}).strict(), request.query);

    return withCache(`team:squad:${request.url}`, 120_000, async () => {
      const [squadRes, coachRes] = await Promise.all([
        apiFootballGet<{ response?: TeamSquadRecord[] }>(
          `/players/squads?team=${encodeURIComponent(params.id)}`,
        ),
        apiFootballGet<{ response?: TeamCoachDto[] }>(`/coachs?team=${encodeURIComponent(params.id)}`),
      ]);

      const squadData: TeamSquadRecord = squadRes.response?.[0] ?? { players: [] };
      const coaches = coachRes.response ?? [];
      const teamIdAsNumber = Number(params.id);

      const currentCoach = coaches.find(c => {
        const currentJob = c.career?.[0];
        return currentJob && currentJob.team?.id === teamIdAsNumber && currentJob.end === null;
      }) || coaches[0] || null;

      if (currentCoach) {
        squadData.coach = {
          id: currentCoach.id ?? null,
          name: typeof currentCoach.name === 'string' ? currentCoach.name : null,
          photo: typeof currentCoach.photo === 'string' ? currentCoach.photo : null,
          age: typeof currentCoach.age === 'number' ? currentCoach.age : null,
        };
      }

      return {
        ...squadRes,
        response: [squadData],
      };
    });
  });

  app.get('/v1/teams/:id/transfers', async request => {
    const params = parseOrThrow(teamIdParamsSchema, request.params);
    parseOrThrow(z.object({}).strict(), request.query);

    return withCache(`team:transfers:v2:${request.url}`, 120_000, () =>
      fetchNormalizedTeamTransfers(params.id),
    );
  });

  app.get('/v1/teams/:id/trophies', async request => {
    const params = parseOrThrow(teamIdParamsSchema, request.params);
    parseOrThrow(z.object({}).strict(), request.query);

    return withCache(`team:trophies:${request.url}`, 120_000, () =>
      fetchTeamTrophiesWithFallback(params.id, request.log),
    );
  });
}
