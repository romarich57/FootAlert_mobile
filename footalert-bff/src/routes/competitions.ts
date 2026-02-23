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

const COMPETITION_TRANSFERS_MAX_CONCURRENCY = 3;

type CompetitionTransferTeamPayload = {
  id: number;
  name: string;
  logo: string;
};

function toFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function toTransferTimestamp(value: string | null): number {
  if (!value) {
    return Number.MIN_SAFE_INTEGER;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.MIN_SAFE_INTEGER;
}

function isDateInSeason(dateIso: string | null, season: number): boolean {
  if (!dateIso) {
    return false;
  }

  const parsed = new Date(dateIso);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  const seasonStart = new Date(Date.UTC(season, 6, 1, 0, 0, 0));
  const seasonEnd = new Date(Date.UTC(season + 1, 5, 30, 23, 59, 59));

  return parsed >= seasonStart && parsed <= seasonEnd;
}

function mapTransferTeamPayload(team: unknown): CompetitionTransferTeamPayload {
  const raw = (team ?? {}) as Record<string, unknown>;
  return {
    id: toFiniteNumber(raw.id) ?? 0,
    name: toText(raw.name, ''),
    logo: toText(raw.logo, ''),
  };
}

function buildTransferKey(
  playerId: number,
  transferDate: string,
  transferType: string,
  teamInId: number,
  teamOutId: number,
): string {
  return `${playerId}:${transferDate}:${transferType}:${teamInId}:${teamOutId}`;
}

async function mapWithConcurrency<T, U>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<U>,
): Promise<U[]> {
  if (items.length === 0) {
    return [];
  }

  const boundedConcurrency = Math.max(1, Math.min(concurrency, items.length));
  const results = new Array<U>(items.length);
  let nextIndex = 0;

  const consume = async (): Promise<void> => {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= items.length) {
        return;
      }

      results[currentIndex] = await worker(items[currentIndex] as T);
    }
  };

  await Promise.all(Array.from({ length: boundedConcurrency }, () => consume()));
  return results;
}

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
    const selectedSeason = query.season ?? new Date().getFullYear();

    // Cache for 1 hour to heavily preserve API quotas since it does many requests
    return withCache(cacheKey, 3_600_000, async () => {
      // 1. Fetch teams for the league
      const teamsResponse = (await apiFootballGet(
        `/teams?league=${encodeURIComponent(params.id)}&season=${encodeURIComponent(String(selectedSeason))}`
      )) as any;

      const teams = teamsResponse?.response || [];
      if (teams.length === 0) {
        return { response: [] };
      }

      const leagueTeamIds = new Set<number>();
      teams.forEach((teamData: any) => {
        const teamId = toFiniteNumber(teamData?.team?.id);
        if (teamId !== null) {
          leagueTeamIds.add(teamId);
        }
      });

      const transfersResponses = await mapWithConcurrency(
        teams,
        COMPETITION_TRANSFERS_MAX_CONCURRENCY,
        async (teamData: any) => {
          const teamId = toFiniteNumber(teamData?.team?.id);
          if (teamId === null) {
            return { response: [] };
          }

          try {
            return (await apiFootballGet(`/transfers?team=${teamId}`)) as {
              response?: unknown[];
            };
          } catch {
            // Ignore one failing team call and keep the rest of the league transfers.
            return { response: [] };
          }
        },
      );

      const flattenedTransfersMap = new Map<string, any>();

      for (const teamTransfersResponse of transfersResponses) {
        const playerTransfers = Array.isArray(teamTransfersResponse?.response)
          ? teamTransfersResponse.response
          : [];

        for (const playerTransfer of playerTransfers) {
          const transferBlock = (playerTransfer ?? {}) as Record<string, unknown>;
          const player = (transferBlock.player ?? {}) as Record<string, unknown>;
          const playerId = toFiniteNumber(player.id);
          if (playerId === null) {
            continue;
          }

          const transferItems = Array.isArray(transferBlock.transfers)
            ? transferBlock.transfers
            : [];

          for (const transferItem of transferItems) {
            const transfer = (transferItem ?? {}) as Record<string, unknown>;
            const transferDate = toText(transfer.date);
            if (!isDateInSeason(transferDate, selectedSeason)) {
              continue;
            }

            const transferType = toText(transfer.type);
            const transferTeams = (transfer.teams ?? {}) as Record<string, unknown>;
            const teamInPayload = mapTransferTeamPayload(transferTeams.in);
            const teamOutPayload = mapTransferTeamPayload(transferTeams.out);

            const teamInInLeague = teamInPayload.id > 0 && leagueTeamIds.has(teamInPayload.id);
            const teamOutInLeague = teamOutPayload.id > 0 && leagueTeamIds.has(teamOutPayload.id);
            if (!teamInInLeague && !teamOutInLeague) {
              continue;
            }

            const transferKey = buildTransferKey(
              playerId,
              transferDate,
              transferType,
              teamInPayload.id,
              teamOutPayload.id,
            );

            if (flattenedTransfersMap.has(transferKey)) {
              continue;
            }

            flattenedTransfersMap.set(transferKey, {
              player: {
                id: playerId,
                name: toText(player.name, ''),
              },
              update: toText(transferBlock.update),
              transfers: [
                {
                  date: transferDate,
                  type: transferType,
                  teams: {
                    in: teamInPayload,
                    out: teamOutPayload,
                  },
                },
              ],
              context: {
                teamInInLeague,
                teamOutInLeague,
              },
            });
          }
        }
      }

      const flattenedTransfers = Array.from(flattenedTransfersMap.values()).sort((a, b) => {
        const dateA = toTransferTimestamp(a.transfers?.[0]?.date ?? null);
        const dateB = toTransferTimestamp(b.transfers?.[0]?.date ?? null);
        return dateB - dateA;
      });

      return { response: flattenedTransfers };
    });
  });
}
