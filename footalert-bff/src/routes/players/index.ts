import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { withCache } from '../../lib/cache.js';
import { parseOrThrow } from '../../lib/validation.js';

import {
  aggregateCareerTeams,
  dedupeCareerSeasons,
  mapCareerSeasons,
} from './careerMapper.js';
import { fetchPlayerCareer } from './careerService.js';
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

function toId(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

export async function registerPlayersRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/players/:id', async request => {
    const params = parseOrThrow(playerIdParamsSchema, request.params);
    const query = parseOrThrow(playerDetailsQuerySchema, request.query);

    return withCache(`players:details:${request.url}`, 60_000, () =>
      apiFootballGet(
        `/players?id=${encodeURIComponent(params.id)}&season=${encodeURIComponent(String(query.season))}`,
      ),
    );
  });

  app.get('/v1/players/:id/seasons', async request => {
    const params = parseOrThrow(playerIdParamsSchema, request.params);
    parseOrThrow(z.object({}).strict(), request.query);

    return withCache(`players:seasons:${request.url}`, 120_000, () =>
      apiFootballGet(`/players/seasons?player=${encodeURIComponent(params.id)}`),
    );
  });

  app.get('/v1/players/:id/trophies', async request => {
    const params = parseOrThrow(playerIdParamsSchema, request.params);
    parseOrThrow(z.object({}).strict(), request.query);

    return withCache(`players:trophies:${request.url}`, 120_000, () =>
      apiFootballGet(`/trophies?player=${encodeURIComponent(params.id)}`),
    );
  });

  app.get('/v1/players/:id/career', async request => {
    const params = parseOrThrow(playerIdParamsSchema, request.params);
    parseOrThrow(z.object({}).strict(), request.query);

    return withCache(`players:career:${request.url}`, 120_000, () => fetchPlayerCareer(params.id));
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

    return withCache(`players:teamfixtures:${request.url}`, 45_000, () =>
      apiFootballGet(`/fixtures?${searchParams.toString()}`),
    );
  });

  app.get('/v1/players/fixtures/:fixtureId/team/:teamId/stats', async request => {
    const params = parseOrThrow(fixtureTeamStatsParamsSchema, request.params);
    parseOrThrow(z.object({}).strict(), request.query);

    return withCache(`players:fixturestats:${request.url}`, 45_000, () =>
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
    const lastCount = typeof query.last === 'number' ? query.last : 15;

    return withCache(`players:matches:${request.url}`, 45_000, async () => {
      const fixturesPayload = await apiFootballGet<ApiFootballListResponse<PlayerFixtureDto>>(
        `/fixtures?team=${encodeURIComponent(query.teamId)}&season=${encodeURIComponent(String(query.season))}&last=${encodeURIComponent(String(lastCount))}`,
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
                `players:fixturestats:aggregate:${fixtureId}:${query.teamId}`,
                45_000,
                () =>
                  apiFootballGet<ApiFootballListResponse<PlayerFixtureStatsDto>>(
                    `/fixtures/players?fixture=${encodeURIComponent(fixtureId)}&team=${encodeURIComponent(query.teamId)}`,
                  ),
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
    });
  });
}
