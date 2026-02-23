import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { apiFootballGet } from '../lib/apiFootballClient.js';
import { withCache } from '../lib/cache.js';
import { numericStringSchema, seasonSchema } from '../lib/schemas.js';
import { parseOrThrow } from '../lib/validation.js';

const competitionIdParamsSchema = z
  .object({
    id: numericStringSchema,
  })
  .strict();

const searchQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(100),
  })
  .strict();

const seasonQuerySchema = z
  .object({
    season: seasonSchema,
  })
  .strict();

const playerStatsQuerySchema = z
  .object({
    season: seasonSchema,
    type: z.enum(['topscorers', 'topassists', 'topyellowcards', 'topredcards']),
  })
  .strict();

function buildPlayerStatsPath(type: string, leagueId: string, season: number): string {
  return `/players/${type}?league=${encodeURIComponent(leagueId)}&season=${encodeURIComponent(String(season))}`;
}

export async function registerCompetitionsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/competitions', async request => {
    parseOrThrow(z.object({}).strict(), request.query);

    const cacheKey = `competitions:${request.url}`;
    return withCache(cacheKey, 120_000, () => apiFootballGet('/leagues'));
  });

  app.get('/v1/competitions/search', async request => {
    const query = parseOrThrow(searchQuerySchema, request.query);

    const cacheKey = `competitions:search:${request.url}`;
    return withCache(cacheKey, 60_000, () =>
      apiFootballGet(`/leagues?search=${encodeURIComponent(query.q)}`),
    );
  });

  app.get('/v1/competitions/:id', async request => {
    const params = parseOrThrow(competitionIdParamsSchema, request.params);
    parseOrThrow(z.object({}).strict(), request.query);

    const cacheKey = `competition:${request.url}`;
    return withCache(cacheKey, 120_000, () =>
      apiFootballGet(`/leagues?id=${encodeURIComponent(params.id)}`),
    );
  });

  app.get(
    '/v1/competitions/:id/standings',
    {
      config: {
        rateLimit: {
          max: 35,
          timeWindow: '1 minute',
        },
      },
    },
    async request => {
      const params = parseOrThrow(competitionIdParamsSchema, request.params);
      const query = parseOrThrow(seasonQuerySchema, request.query);

      const cacheKey = `competition:standings:${request.url}`;
      return withCache(cacheKey, 60_000, () =>
        apiFootballGet(
          `/standings?league=${encodeURIComponent(params.id)}&season=${encodeURIComponent(String(query.season))}`,
        ),
      );
    },
  );

  app.get('/v1/competitions/:id/matches', async request => {
    const params = parseOrThrow(competitionIdParamsSchema, request.params);
    const query = parseOrThrow(seasonQuerySchema, request.query);

    const cacheKey = `competition:matches:${request.url}`;
    return withCache(cacheKey, 60_000, () =>
      apiFootballGet(
        `/fixtures?league=${encodeURIComponent(params.id)}&season=${encodeURIComponent(String(query.season))}`,
      ),
    );
  });

  app.get(
    '/v1/competitions/:id/player-stats',
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
        },
      },
    },
    async request => {
      const params = parseOrThrow(competitionIdParamsSchema, request.params);
      const query = parseOrThrow(playerStatsQuerySchema, request.query);

      const cacheKey = `competition:playerstats:${request.url}`;
      return withCache(cacheKey, 90_000, () =>
        apiFootballGet(buildPlayerStatsPath(query.type, params.id, query.season)),
      );
    },
  );

  app.get('/v1/competitions/:id/transfers', async request => {
    const params = parseOrThrow(competitionIdParamsSchema, request.params);
    const query = parseOrThrow(z.object({ season: seasonSchema.optional() }).strict(), request.query);

    const cacheKey = `competition:transfers:${request.url}`;

    // Cache for 1 hour to heavily preserve API quotas since it does many requests
    return withCache(cacheKey, 3_600_000, async () => {
      // 1. Fetch teams for the league
      const teamsResponse = (await apiFootballGet(
        `/teams?league=${encodeURIComponent(params.id)}&season=${encodeURIComponent(String(query.season ?? new Date().getFullYear()))}`
      )) as any;

      const teams = teamsResponse?.response || [];
      if (teams.length === 0) {
        return { response: [] };
      }

      // 2. Fetch transfers for each team concurrently (using Promise.allSettled to avoid failing the whole request if one team fails)
      const transfersPromises = teams.map((teamData: any) => {
        const teamId = teamData.team.id;
        // The /transfers endpoint by team returns all transfers for the player if they have one transfer involving this team
        return apiFootballGet(`/transfers?team=${teamId}`);
      });

      const transfersResponses = await Promise.allSettled(transfersPromises);

      // 3. Aggregate and deduplicate transfers
      const allTransfers = new Map<string, any>();

      for (const result of transfersResponses) {
        if (result.status === 'fulfilled' && result.value.response) {
          const teamTransfers = result.value.response;

          for (const playerTransfer of teamTransfers) {
            // Uniquely identify a player's transfer block by player ID
            if (!allTransfers.has(String(playerTransfer.player.id))) {
              allTransfers.set(String(playerTransfer.player.id), playerTransfer);
            } else {
              // If player already exists, we might need to merge their transfers array if new ones exist
              // But usually the API returns the complete transfer history for that player anyway,
              // so the first one we get is sufficient.
            }
          }
        }
      }

      // 4. Flatten the specific transfers that involve teams from this league (Optional, but good for filtering to current season)
      // Since the API returns ALL transfers for a player, we should ideally filter the inner `transfers` array
      // to only those happening recently or involving the league's teams.
      // However, to match the app's needs (showing recent transfers), we can just return all unique player transfer blocks
      // and let the frontend flatten & filter by date, or we can flatten and sort by date here.

      // Let's flatten to a structure where each item is { player, update, transfer }
      const flattenedTransfers: any[] = [];

      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      for (const playerTransfer of allTransfers.values()) {
        const { player, update, transfers } = playerTransfer;

        for (const transfer of transfers) {
          const transferDate = new Date(transfer.date);
          // We can optionally filter out very old transfers to reduce payload size
          if (transferDate >= oneYearAgo) {
            flattenedTransfers.push({
              player,
              update,
              transfers: [transfer] // Keep nested structure for compatibility
            });
          }
        }
      }

      // Sort by date descending
      flattenedTransfers.sort((a, b) => {
        const dateA = new Date(a.transfers[0].date).getTime();
        const dateB = new Date(b.transfers[0].date).getTime();
        return dateB - dateA;
      });

      return { response: flattenedTransfers };
    });
  });
}
