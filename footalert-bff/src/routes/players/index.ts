import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { env } from '../../config/env.js';
import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { buildCanonicalCacheKey, withCache } from '../../lib/cache.js';
import { parseOrThrow } from '../../lib/validation.js';

import { fetchPlayerOverview, fetchPlayerStatsCatalog } from './aggregates.js';
import {
  aggregateCareerTeams,
  dedupeCareerSeasons,
  mapCareerSeasons,
} from './careerMapper.js';
import { fetchPlayerCareer } from './careerService.js';
import { registerPlayerFullRoute } from './fullRoute.js';
import {
  mapPlayerMatchPerformance,
  type PlayerFixtureDto,
  type PlayerFixtureStatsDto,
  type PlayerMatchPerformanceAggregate,
} from './matchMapper.js';
import {
  fixtureTeamStatsParamsSchema,
  playerDetailsQuerySchema,
  playerIdParamsSchema,
  playerMatchesQuerySchema,
  playerOverviewQuerySchema,
  playerStatsCatalogQuerySchema,
  PLAYER_MATCHES_LIMIT,
  teamFixturesParamsSchema,
  teamFixturesQuerySchema,
} from './schemas.js';

export {
  aggregateCareerTeams,
  dedupeCareerSeasons,
  mapCareerSeasons,
  mapPlayerMatchPerformance,
};

type ApiFootballListResponse<T> = {
  response?: T[];
};

type PlayerCacheMetricRoute = 'overview' | 'stats-catalog' | 'matches';

function toId(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function buildPlayerCacheKey(
  legacyKey: string,
  routeName: string,
  params: Record<string, unknown>,
): string {
  if (!env.bffEnablePlayerCanonicalCacheKeys) {
    return legacyKey;
  }

  return buildCanonicalCacheKey(routeName, params);
}

function observePlayerCacheEvent(
  request: FastifyRequest,
  route: PlayerCacheMetricRoute,
  context: Record<string, unknown>,
) {
  return (event: 'hit' | 'miss' | 'stale') => {
    if (event === 'hit') {
      request.log.info(
        {
          metric: 'player_cache_hit_total',
          value: 1,
          route,
          ...context,
        },
        'player.perf.metric',
      );
      return;
    }

    if (event === 'stale') {
      request.log.info(
        {
          metric: 'player_cache_stale_served_total',
          value: 1,
          route,
          ...context,
        },
        'player.perf.metric',
      );
    }
  };
}

function trackPlayerUpstreamRequests(
  request: FastifyRequest,
  route: PlayerCacheMetricRoute,
  value: number,
  context: Record<string, unknown>,
): void {
  if (value <= 0) {
    return;
  }

  request.log.info(
    {
      metric: 'player_upstream_request_total',
      value,
      route,
      ...context,
    },
    'player.perf.metric',
  );
}

export async function registerPlayersRoutes(app: FastifyInstance): Promise<void> {
  await registerPlayerFullRoute(app);

  app.get('/v1/players/:id', async request => {
    const params = parseOrThrow(playerIdParamsSchema, request.params);
    const query = parseOrThrow(playerDetailsQuerySchema, request.query);

    return withCache(
      buildPlayerCacheKey(
        `players:details:${request.url}`,
        'players:details',
        { playerId: params.id, season: query.season },
      ),
      60_000,
      () =>
      apiFootballGet(
        `/players?id=${encodeURIComponent(params.id)}&season=${encodeURIComponent(String(query.season))}`,
      ),
    );
  });

  app.get('/v1/players/:id/seasons', async request => {
    const params = parseOrThrow(playerIdParamsSchema, request.params);
    parseOrThrow(z.object({}).strict(), request.query);

    return withCache(
      buildPlayerCacheKey(
        `players:seasons:${request.url}`,
        'players:seasons',
        { playerId: params.id },
      ),
      120_000,
      () =>
      apiFootballGet(`/players/seasons?player=${encodeURIComponent(params.id)}`),
    );
  });

  app.get('/v1/players/:id/trophies', async request => {
    const params = parseOrThrow(playerIdParamsSchema, request.params);
    parseOrThrow(z.object({}).strict(), request.query);

    return withCache(
      buildPlayerCacheKey(
        `players:trophies:${request.url}`,
        'players:trophies',
        { playerId: params.id },
      ),
      120_000,
      () =>
      apiFootballGet(`/trophies?player=${encodeURIComponent(params.id)}`),
    );
  });

  app.get('/v1/players/:id/career', async request => {
    const params = parseOrThrow(playerIdParamsSchema, request.params);
    parseOrThrow(z.object({}).strict(), request.query);

    return withCache(
      buildPlayerCacheKey(
        `players:career:${request.url}`,
        'players:career',
        { playerId: params.id },
      ),
      120_000,
      () => fetchPlayerCareer(params.id),
    );
  });

  if (env.bffEnablePlayerOverviewRoute) {
    app.get('/v1/players/:id/overview', async request => {
      const params = parseOrThrow(playerIdParamsSchema, request.params);
      const query = parseOrThrow(playerOverviewQuerySchema, request.query);
      const startedAt = Date.now();
      let upstreamRequestCount = 0;

      const payload = await withCache(
        buildPlayerCacheKey(
          `players:overview:${request.url}`,
          'players:overview',
          { playerId: params.id, season: query.season },
        ),
        60_000,
        () =>
          fetchPlayerOverview(params.id, query.season, {
            onUpstreamRequest: () => {
              upstreamRequestCount += 1;
            },
          }),
        {
          onEvent: observePlayerCacheEvent(request, 'overview', {
            playerId: params.id,
            season: query.season,
          }),
        },
      );

      trackPlayerUpstreamRequests(request, 'overview', upstreamRequestCount, {
        playerId: params.id,
        season: query.season,
      });

      request.log.info(
        {
          metric: 'player_overview_latency_ms',
          value: Date.now() - startedAt,
          playerId: params.id,
          season: query.season,
        },
        'player.perf.metric',
      );

      return payload;
    });
  }

  app.get('/v1/players/:id/stats-catalog', async request => {
    const params = parseOrThrow(playerIdParamsSchema, request.params);
    parseOrThrow(playerStatsCatalogQuerySchema, request.query);
    const startedAt = Date.now();
    let upstreamRequestCount = 0;

    const payload = await withCache(
      buildPlayerCacheKey(
        `players:stats-catalog:${request.url}`,
        'players:stats-catalog',
        { playerId: params.id },
      ),
      10 * 60_000,
      () =>
        fetchPlayerStatsCatalog(params.id, {
          onUpstreamRequest: () => {
            upstreamRequestCount += 1;
          },
        }),
      {
        onEvent: observePlayerCacheEvent(request, 'stats-catalog', {
          playerId: params.id,
        }),
      },
    );

    trackPlayerUpstreamRequests(request, 'stats-catalog', upstreamRequestCount, {
      playerId: params.id,
    });

    request.log.info(
      {
        metric: 'player_stats_catalog_latency_ms',
        value: Date.now() - startedAt,
        playerId: params.id,
      },
      'player.perf.metric',
    );

    return payload;
  });

  app.get('/v1/players/team/:teamId/fixtures', async request => {
    const params = parseOrThrow(teamFixturesParamsSchema, request.params);
    const query = parseOrThrow(teamFixturesQuerySchema, request.query);

    const searchParams = new URLSearchParams({
      team: params.teamId,
      season: String(query.season),
    });

    if (typeof query.last === 'number') {
      searchParams.set('last', String(query.last));
    }

    return withCache(
      buildPlayerCacheKey(
        `players:teamfixtures:${request.url}`,
        'players:team-fixtures',
        { teamId: params.teamId, season: query.season, last: query.last ?? null },
      ),
      45_000,
      () =>
      apiFootballGet(`/fixtures?${searchParams.toString()}`),
    );
  });

  app.get('/v1/players/fixtures/:fixtureId/team/:teamId/stats', async request => {
    const params = parseOrThrow(fixtureTeamStatsParamsSchema, request.params);
    parseOrThrow(z.object({}).strict(), request.query);

    return withCache(
      buildPlayerCacheKey(
        `players:fixturestats:${request.url}`,
        'players:fixture-stats',
        { fixtureId: params.fixtureId, teamId: params.teamId },
      ),
      45_000,
      () =>
      apiFootballGet(
        `/fixtures/players?fixture=${encodeURIComponent(params.fixtureId)}&team=${encodeURIComponent(params.teamId)}`,
      ),
    );
  });

  app.get(
    '/v1/players/:id/matches',
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute',
        },
      },
    },
    async request => {
    const params = parseOrThrow(playerIdParamsSchema, request.params);
    const query = parseOrThrow(playerMatchesQuerySchema, request.query);
    const lastCount = typeof query.last === 'number' ? query.last : PLAYER_MATCHES_LIMIT;
    const startedAt = Date.now();

    let upstreamRequestCount = 0;
    const buildMatchesPayload = async () => {
      const fixturesPayload = await withCache(
        buildPlayerCacheKey(
          `players:matches:fixtures:${query.teamId}:${query.season}:${lastCount}`,
          'players:matches:fixtures',
          { teamId: query.teamId, season: query.season, last: lastCount },
        ),
        45_000,
        () => {
          upstreamRequestCount += 1;
          return apiFootballGet<ApiFootballListResponse<PlayerFixtureDto>>(
            `/fixtures?team=${encodeURIComponent(query.teamId)}&season=${encodeURIComponent(String(query.season))}&last=${encodeURIComponent(String(lastCount))}`,
          );
        },
      );
      const fixtures = fixturesPayload.response ?? [];

      const performances = await Promise.all(
        fixtures
          .filter(fixture => Boolean(fixture.fixture?.id))
          .map(async fixture => {
            const fixtureId = toId(fixture.fixture?.id);
            if (!fixtureId) {
              return null;
            }

            try {
              const fixtureStatsPayload = await withCache(
                buildPlayerCacheKey(
                  `players:fixturestats:aggregate:${fixtureId}:${query.teamId}`,
                  'players:matches:fixture-stats',
                  { fixtureId, teamId: query.teamId },
                ),
                45_000,
                () => {
                  upstreamRequestCount += 1;
                  return (
                  apiFootballGet<ApiFootballListResponse<PlayerFixtureStatsDto>>(
                    `/fixtures/players?fixture=${encodeURIComponent(fixtureId)}&team=${encodeURIComponent(query.teamId)}`,
                  )
                  );
                },
              );

              const fixtureStats = fixtureStatsPayload.response?.[0] ?? null;
              return mapPlayerMatchPerformance(params.id, query.teamId, fixture, fixtureStats);
            } catch (err: unknown) {
              request.log.warn(
                { fixtureId, err: err instanceof Error ? err.message : String(err) },
                'api.upstream.failure',
              );
              return mapPlayerMatchPerformance(params.id, query.teamId, fixture, null);
            }
          }),
      );

      return {
        response: performances.filter(
          (performance): performance is PlayerMatchPerformanceAggregate =>
            performance !== null,
        ),
      };
    };

    const payload = env.bffEnablePlayerMatchesSwr
      ? await withCache(
          buildPlayerCacheKey(
            `players:matches:${request.url}`,
            'players:matches',
            { playerId: params.id, teamId: query.teamId, season: query.season, last: lastCount },
          ),
          45_000,
          buildMatchesPayload,
          {
            onEvent: observePlayerCacheEvent(request, 'matches', {
              playerId: params.id,
              teamId: query.teamId,
              season: query.season,
              last: lastCount,
            }),
          },
        )
      : await buildMatchesPayload();

    trackPlayerUpstreamRequests(request, 'matches', upstreamRequestCount, {
      playerId: params.id,
      teamId: query.teamId,
      season: query.season,
      last: lastCount,
    });

    request.log.info(
      {
        metric: 'player_matches_latency_ms',
        value: Date.now() - startedAt,
        playerId: params.id,
        teamId: query.teamId,
        season: query.season,
        last: lastCount,
      },
      'player.perf.metric',
    );

    return payload;
  });
}
