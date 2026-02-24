import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { apiFootballGet } from '../lib/apiFootballClient.js';
import { withCache } from '../lib/cache.js';
import {
  boundedPositiveIntSchema,
  numericStringSchema,
  seasonSchema,
  timezoneSchema,
} from '../lib/schemas.js';
import { parseOrThrow } from '../lib/validation.js';

const teamIdParamsSchema = z
  .object({
    id: numericStringSchema,
  })
  .strict();

const teamFixturesQuerySchema = z
  .object({
    season: seasonSchema.optional(),
    leagueId: numericStringSchema.optional(),
    timezone: timezoneSchema.optional(),
    next: boundedPositiveIntSchema(1, 10).optional(),
  })
  .strict();

const standingsQuerySchema = z
  .object({
    leagueId: numericStringSchema,
    season: seasonSchema,
  })
  .strict();

const statsQuerySchema = standingsQuerySchema;

const teamPlayersQuerySchema = z
  .object({
    leagueId: numericStringSchema,
    season: seasonSchema,
    page: boundedPositiveIntSchema(1, 10).optional(),
  })
  .strict();

type ApiFootballUnknownListResponse = {
  response?: unknown[];
};

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

function buildFixtureQuery(teamId: string, query: z.infer<typeof teamFixturesQuerySchema>): string {
  const searchParams = new URLSearchParams({ team: teamId });

  if (typeof query.season === 'number') {
    searchParams.set('season', String(query.season));
  }

  if (query.leagueId) {
    searchParams.set('league', query.leagueId);
  }

  if (query.timezone) {
    searchParams.set('timezone', query.timezone);
  }

  if (typeof query.next === 'number') {
    searchParams.set('next', String(query.next));
  }

  return searchParams.toString();
}

function normalizeTeamName(teamName: string): string {
  return teamName.trim().replace(/\s+/g, ' ');
}

function buildTeamNameCandidates(teamName: string): string[] {
  const normalized = normalizeTeamName(teamName);
  if (!normalized) {
    return [];
  }

  const strippedSuffix = normalizeTeamName(
    normalized.replace(/\b(fc|cf|sc|ac|afc|fk|sk|nk|ssc|cfc)\b\.?/gi, ''),
  );

  const candidates = new Set<string>([normalized]);

  if (strippedSuffix && strippedSuffix !== normalized) {
    candidates.add(strippedSuffix);
  }

  if (!/\bfc\b/i.test(normalized)) {
    candidates.add(`${strippedSuffix || normalized} FC`);
  }

  // Common aliases that can help on API-Football side.
  if (/paris saint[-\s]?germain/i.test(normalized)) {
    candidates.add('Paris SG');
    candidates.add('PSG');
  }

  if (/internazionale/i.test(normalized)) {
    candidates.add('Inter');
  }

  return Array.from(candidates).filter(Boolean);
}

function normalizeTransferDate(value: string): string | null {
  const explicitDate = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (explicitDate) {
    return explicitDate;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function toTransferTimestamp(value: string | null): number {
  if (!value) {
    return Number.MIN_SAFE_INTEGER;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return Number.MIN_SAFE_INTEGER;
  }

  return parsed.getTime();
}

function normalizeTransferKeyText(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function toNumericId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
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
        // Do not cache empty responses aggressively if it might be a rate limit or error
        if (!data || !data.response || data.response.length === 0) {
          throw new Error('No standings data returned from API');
        }
        return data;
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
        // Do not cache empty responses aggressively if it might be a rate limit or error
        if (!data || !data.response || data.response.length === 0) {
          throw new Error('No standings data returned from API');
        }
        return data;
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

      // Find the active coach (end of career is null or future)
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

    return withCache(`team:transfers:v2:${request.url}`, 120_000, async () => {
      const data = await apiFootballGet<{ response?: unknown[] }>(
        `/transfers?team=${encodeURIComponent(params.id)}`,
      );
      const rawTransfers = Array.isArray(data?.response) ? data.response : [];
      const dedupedTransfersMap = new Map<string, unknown>();

      for (const transferBlock of rawTransfers) {
        const transferBlockRecord = (transferBlock ?? {}) as Record<string, unknown>;
        const player = (transferBlockRecord.player ?? {}) as Record<string, unknown>;
        const playerId = toNumericId(player.id);
        const playerName = typeof player.name === 'string' ? player.name.trim() : '';
        if (!playerId || !playerName) {
          continue;
        }

        const update = typeof transferBlockRecord.update === 'string'
          ? transferBlockRecord.update.trim()
          : null;
        const transferItems = Array.isArray(transferBlockRecord.transfers)
          ? transferBlockRecord.transfers
          : [];

        for (const transferItem of transferItems) {
          const transfer = (transferItem ?? {}) as Record<string, unknown>;
          const transferDateRaw = typeof transfer.date === 'string' ? transfer.date.trim() : '';
          const transferDate = transferDateRaw ? normalizeTransferDate(transferDateRaw) : null;
          const transferType = typeof transfer.type === 'string' ? transfer.type.trim() : '';
          if (!transferDate || !transferType) {
            continue;
          }

          const transferTeams = (transfer.teams ?? {}) as Record<string, unknown>;
          const teamIn = (transferTeams.in ?? {}) as Record<string, unknown>;
          const teamOut = (transferTeams.out ?? {}) as Record<string, unknown>;

          const teamInId = toNumericId(teamIn.id);
          const teamOutId = toNumericId(teamOut.id);
          const teamInName = typeof teamIn.name === 'string' ? teamIn.name.trim() : '';
          const teamOutName = typeof teamOut.name === 'string' ? teamOut.name.trim() : '';
          if (!teamInId || !teamOutId || !teamInName || !teamOutName) {
            continue;
          }

          const transferKey = [
            playerId,
            normalizeTransferKeyText(playerName),
            normalizeTransferKeyText(transferType),
            teamOutId,
            teamInId,
          ].join('|');

          const existingTransfer = dedupedTransfersMap.get(transferKey);
          if (existingTransfer) {
            const existingTransferRecord = existingTransfer as Record<string, unknown>;
            const existingTransfers = Array.isArray(existingTransferRecord.transfers)
              ? existingTransferRecord.transfers
              : [];
            const existingTransferItem = (existingTransfers[0] ?? {}) as Record<string, unknown>;
            const existingDate = typeof existingTransferItem.date === 'string'
              ? existingTransferItem.date
              : null;
            if (toTransferTimestamp(existingDate) >= toTransferTimestamp(transferDate)) {
              continue;
            }
          }

          dedupedTransfersMap.set(transferKey, {
            player: {
              id: playerId,
              name: playerName,
            },
            update,
            transfers: [
              {
                date: transferDate,
                type: transferType,
                teams: {
                  in: {
                    id: teamInId,
                    name: teamInName,
                    logo: typeof teamIn.logo === 'string' ? teamIn.logo : '',
                  },
                  out: {
                    id: teamOutId,
                    name: teamOutName,
                    logo: typeof teamOut.logo === 'string' ? teamOut.logo : '',
                  },
                },
              },
            ],
          });
        }
      }

      return {
        ...data,
        response: Array.from(dedupedTransfersMap.values()),
      };
    });
  });

  app.get('/v1/teams/:id/trophies', async request => {
    const params = parseOrThrow(teamIdParamsSchema, request.params);
    parseOrThrow(z.object({}).strict(), request.query);

    return withCache(`team:trophies:${request.url}`, 120_000, async () => {
      const trophiesById = await apiFootballGet<{ response?: unknown[] }>(
        `/trophies?team=${encodeURIComponent(params.id)}`,
      );

      if ((trophiesById.response?.length ?? 0) > 0) {
        return trophiesById;
      }

      try {
        const teamLookup = await apiFootballGet<{
          response?: Array<{
            team?: {
              name?: string;
              country?: string;
            };
          }>;
        }>(`/teams?id=${encodeURIComponent(params.id)}`);

        const teamName = teamLookup.response?.[0]?.team?.name?.trim();
        if (!teamName) {
          return trophiesById;
        }

        const teamNameCandidates = buildTeamNameCandidates(teamName);
        for (const teamNameCandidate of teamNameCandidates) {
          const trophiesByName = await apiFootballGet<{ response?: unknown[] }>(
            `/trophies?team=${encodeURIComponent(teamNameCandidate)}`,
          );

          if ((trophiesByName.response?.length ?? 0) > 0) {
            return trophiesByName;
          }
        }
      } catch (outerErr) {
        request.log.warn({ err: outerErr, teamId: params.id }, 'Team trophies name lookup failed');
        return trophiesById;
      }

      return trophiesById;
    });
  });
}
