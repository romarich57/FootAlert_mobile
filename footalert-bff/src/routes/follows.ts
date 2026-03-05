import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { apiFootballGet } from '../lib/apiFootballClient.js';
import { withCache } from '../lib/cache.js';
import { mapWithConcurrency } from '../lib/concurrency/mapWithConcurrency.js';
import {
  commaSeparatedNumericIdsSchema,
  numericStringSchema,
  seasonSchema,
  timezoneSchema,
} from '../lib/schemas.js';
import { parseOrThrow } from '../lib/validation.js';

const TRENDS_MAX_LEAGUE_IDS = 10;
const TRENDS_MAX_CONCURRENCY = 3;

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

  app.get('/v1/follows/players/:playerId/season/:season', async request => {
    const params = parseOrThrow(playerSeasonParamsSchema, request.params);
    parseOrThrow(z.object({}).strict(), request.query);

    return withCache(`follows:playerseason:${request.url}`, 60_000, () =>
      apiFootballGet(
        `/players?id=${encodeURIComponent(params.playerId)}&season=${encodeURIComponent(String(params.season))}`,
      ),
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
}
