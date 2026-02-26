import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { withCache } from '../../lib/cache.js';
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
  statsQuerySchema,
  standingsQuerySchema,
  teamFixturesQuerySchema,
  teamIdParamsSchema,
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
