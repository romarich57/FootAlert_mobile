import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { apiFootballGet } from '../lib/apiFootballClient.js';
import { withCache } from '../lib/cache.js';
import { boundedPositiveIntSchema, numericStringSchema, timezoneSchema } from '../lib/schemas.js';
import { parseOrThrow } from '../lib/validation.js';

const matchesQuerySchema = z
  .object({
    date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
    timezone: timezoneSchema,
  })
  .strict();

const matchByIdParamsSchema = z
  .object({
    id: numericStringSchema,
  })
  .strict();

const matchByIdQuerySchema = z
  .object({
    timezone: timezoneSchema,
  })
  .strict();

const emptyQuerySchema = z.object({}).strict();

const optionalTimezoneQuerySchema = z
  .object({
    timezone: timezoneSchema.optional(),
  })
  .strict();

const matchPlayersStatsParamsSchema = z
  .object({
    id: numericStringSchema,
    teamId: numericStringSchema,
  })
  .strict();

const headToHeadQuerySchema = z
  .object({
    timezone: timezoneSchema.optional(),
    last: boundedPositiveIntSchema(1, 20).optional(),
  })
  .strict();

const statisticsPeriodSchema = z.enum(['all', 'first', 'second']);

const matchStatisticsQuerySchema = z
  .object({
    period: statisticsPeriodSchema.optional(),
  })
  .strict();

type MatchStatisticsPeriod = Exclude<z.infer<typeof statisticsPeriodSchema>, 'all'>;

type FixtureContext = {
  fixture?: {
    id?: number;
    date?: string;
    timestamp?: number;
  };
  league?: {
    id?: number;
    season?: number;
  };
  teams?: {
    home?: {
      id?: number;
    };
    away?: {
      id?: number;
    };
  };
};

type FixtureListResponse = {
  response?: FixtureContext[];
};

function toNumericId(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toEpochMilliseconds(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  if (value > 1_000_000_000_000) {
    return value;
  }

  if (value > 1_000_000_000) {
    return value * 1_000;
  }

  return null;
}

function toDateMilliseconds(value: unknown): number | null {
  if (typeof value !== 'string') {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function toInjuryFixtureId(value: unknown): number | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const fixture = record.fixture;
  if (!fixture || typeof fixture !== 'object') {
    return null;
  }

  const fixtureRecord = fixture as Record<string, unknown>;
  return toNumericId(fixtureRecord.id);
}

function toInjuryFixtureDateMs(value: unknown): number | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const fixture = record.fixture;
  if (!fixture || typeof fixture !== 'object') {
    return null;
  }

  const fixtureRecord = fixture as Record<string, unknown>;
  return toEpochMilliseconds(fixtureRecord.timestamp) ?? toDateMilliseconds(fixtureRecord.date);
}

function toInjuryPlayerName(value: unknown): string {
  if (!value || typeof value !== 'object') {
    return '';
  }

  const record = value as Record<string, unknown>;
  const player = record.player;
  if (!player || typeof player !== 'object') {
    return '';
  }

  const playerRecord = player as Record<string, unknown>;
  if (typeof playerRecord.name !== 'string') {
    return '';
  }

  return playerRecord.name.trim().toLowerCase();
}

function sortInjuriesByDate(entries: unknown[]): unknown[] {
  return [...entries].sort((left, right) => {
    const leftDate = toInjuryFixtureDateMs(left);
    const rightDate = toInjuryFixtureDateMs(right);

    if (leftDate === null && rightDate !== null) {
      return 1;
    }

    if (leftDate !== null && rightDate === null) {
      return -1;
    }

    if (leftDate !== null && rightDate !== null && leftDate !== rightDate) {
      return rightDate - leftDate;
    }

    return toInjuryPlayerName(left).localeCompare(toInjuryPlayerName(right));
  });
}

function filterInjuriesForMatch(
  entries: unknown[],
  matchFixtureId: number,
  matchFixtureDateMs: number | null,
): unknown[] {
  if (entries.length === 0) {
    return [];
  }

  const exactFixtureEntries = entries.filter(entry => toInjuryFixtureId(entry) === matchFixtureId);
  if (exactFixtureEntries.length > 0) {
    return sortInjuriesByDate(exactFixtureEntries);
  }

  if (matchFixtureDateMs === null) {
    return [];
  }

  const oneDayMs = 24 * 60 * 60 * 1_000;
  const nearbyEntries = entries.filter(entry => {
    const injuryDateMs = toInjuryFixtureDateMs(entry);
    if (injuryDateMs === null) {
      return false;
    }

    return Math.abs(injuryDateMs - matchFixtureDateMs) <= oneDayMs;
  });

  return sortInjuriesByDate(nearbyEntries);
}

function normalizeText(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().toLowerCase().replace(/[_-]+/g, ' ');
}

function detectStatisticsPeriod(value: unknown): MatchStatisticsPeriod | null {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  if (/\b(1st|first)\b/.test(normalized)) {
    return 'first';
  }

  if (/\b(2nd|second)\b/.test(normalized)) {
    return 'second';
  }

  return null;
}

function stripPeriodHintFromType(type: string): string {
  const sanitized = type
    .replace(/\(\s*(1st|first|2nd|second)\s*half\s*\)/gi, '')
    .replace(/\b(1st|first)\s*half\b/gi, '')
    .replace(/\b(2nd|second)\s*half\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return sanitized.length > 0 ? sanitized : type;
}

function hasPeriodHintsInFixtureStatistics(response: unknown[]): boolean {
  return response.some(entry => {
    if (!entry || typeof entry !== 'object') {
      return false;
    }

    const record = entry as Record<string, unknown>;
    if (detectStatisticsPeriod(record.period ?? record.half ?? record.label ?? record.type)) {
      return true;
    }

    const statistics = Array.isArray(record.statistics) ? record.statistics : [];
    return statistics.some(stat => {
      if (!stat || typeof stat !== 'object') {
        return false;
      }
      const statRecord = stat as Record<string, unknown>;
      return Boolean(
        detectStatisticsPeriod(statRecord.period ?? statRecord.half ?? statRecord.label ?? statRecord.type),
      );
    });
  });
}

function filterFixtureStatisticsByPeriod(payload: unknown, period: MatchStatisticsPeriod) {
  const payloadRecord = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  const response = Array.isArray(payloadRecord.response) ? payloadRecord.response : [];

  if (!hasPeriodHintsInFixtureStatistics(response)) {
    return {
      ...payloadRecord,
      response: [],
    };
  }

  const filteredResponse = response
    .map(entry => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const entryRecord = entry as Record<string, unknown>;
      const teamPeriod = detectStatisticsPeriod(
        entryRecord.period ?? entryRecord.half ?? entryRecord.label ?? entryRecord.type,
      );
      if (teamPeriod && teamPeriod !== period) {
        return null;
      }

      const statistics = Array.isArray(entryRecord.statistics) ? entryRecord.statistics : [];
      const filteredStatistics = statistics
        .map(stat => {
          if (!stat || typeof stat !== 'object') {
            return null;
          }

          const statRecord = stat as Record<string, unknown>;
          const statPeriod = detectStatisticsPeriod(
            statRecord.period ?? statRecord.half ?? statRecord.label ?? statRecord.type,
          );
          const effectivePeriod = statPeriod ?? teamPeriod;
          if (effectivePeriod !== period) {
            return null;
          }

          const statType = typeof statRecord.type === 'string'
            ? stripPeriodHintFromType(statRecord.type)
            : statRecord.type;

          return {
            ...statRecord,
            type: statType,
          };
        })
        .filter((stat): stat is NonNullable<typeof stat> => stat !== null);

      if (filteredStatistics.length === 0) {
        return null;
      }

      return {
        ...entryRecord,
        statistics: filteredStatistics,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  return {
    ...payloadRecord,
    response: filteredResponse,
  };
}

function buildFixtureContextKey(matchId: string, timezone?: string): string {
  return timezone ? `match:context:${matchId}:${timezone}` : `match:context:${matchId}`;
}

async function fetchFixtureContext(matchId: string, timezone?: string): Promise<FixtureContext | null> {
  const contextKey = buildFixtureContextKey(matchId, timezone);
  const payload = await withCache(contextKey, 30_000, () =>
    apiFootballGet<FixtureListResponse>(
      timezone
        ? `/fixtures?id=${encodeURIComponent(matchId)}&timezone=${encodeURIComponent(timezone)}`
        : `/fixtures?id=${encodeURIComponent(matchId)}`,
    ),
  );

  return payload.response?.[0] ?? null;
}

export async function registerMatchesRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/matches', async request => {
    const query = parseOrThrow(matchesQuerySchema, request.query);

    const cacheKey = `matches:${request.url}`;
    return withCache(cacheKey, 30_000, () =>
      apiFootballGet(
        `/fixtures?date=${encodeURIComponent(query.date)}&timezone=${encodeURIComponent(query.timezone)}`,
      ),
    );
  });

  app.get(
    '/v1/matches/:id',
    {
      config: {
        rateLimit: {
          max: 80,
          timeWindow: '1 minute',
        },
      },
    },
    async request => {
      const params = parseOrThrow(matchByIdParamsSchema, request.params);
      const query = parseOrThrow(matchByIdQuerySchema, request.query);

      const cacheKey = `match:${request.url}`;
      return withCache(cacheKey, 30_000, () =>
        apiFootballGet(
          `/fixtures?id=${encodeURIComponent(params.id)}&timezone=${encodeURIComponent(query.timezone)}`,
        ),
      );
    },
  );

  app.get(
    '/v1/matches/:id/events',
    {
      config: {
        rateLimit: {
          max: 80,
          timeWindow: '1 minute',
        },
      },
    },
    async request => {
      const params = parseOrThrow(matchByIdParamsSchema, request.params);
      parseOrThrow(emptyQuerySchema, request.query);

      const cacheKey = `match:events:${request.url}`;
      return withCache(cacheKey, 15_000, () =>
        apiFootballGet(
          `/fixtures/events?fixture=${encodeURIComponent(params.id)}`,
        ),
      );
    },
  );

  app.get(
    '/v1/matches/:id/statistics',
    {
      config: {
        rateLimit: {
          max: 80,
          timeWindow: '1 minute',
        },
      },
    },
    async request => {
      const params = parseOrThrow(matchByIdParamsSchema, request.params);
      const query = parseOrThrow(matchStatisticsQuerySchema, request.query);
      const period = query.period ?? 'all';

      const cacheKey = `match:statistics:${params.id}:${period}`;
      if (period === 'all') {
        return withCache(cacheKey, 15_000, () =>
          apiFootballGet(
            `/fixtures/statistics?fixture=${encodeURIComponent(params.id)}`,
          ),
        );
      }

      const context = await fetchFixtureContext(params.id);
      const season = toNumericId(context?.league?.season);
      if (season === null || season < 2024) {
        return { response: [] };
      }

      return withCache(cacheKey, 15_000, async () => {
        const payload = await apiFootballGet(
          `/fixtures/statistics?fixture=${encodeURIComponent(params.id)}&half=true`,
        );

        return filterFixtureStatisticsByPeriod(payload, period);
      });
    },
  );

  app.get(
    '/v1/matches/:id/lineups',
    async request => {
      const params = parseOrThrow(matchByIdParamsSchema, request.params);
      parseOrThrow(emptyQuerySchema, request.query);

      const cacheKey = `match:lineups:${request.url}`;
      return withCache(cacheKey, 30_000, () =>
        apiFootballGet(
          `/fixtures/lineups?fixture=${encodeURIComponent(params.id)}`,
        ),
      );
    },
  );

  app.get(
    '/v1/matches/:id/head-to-head',
    async request => {
      const params = parseOrThrow(matchByIdParamsSchema, request.params);
      const query = parseOrThrow(headToHeadQuerySchema, request.query);

      const context = await fetchFixtureContext(params.id, query.timezone);
      const homeTeamId = toNumericId(context?.teams?.home?.id);
      const awayTeamId = toNumericId(context?.teams?.away?.id);
      if (homeTeamId === null || awayTeamId === null) {
        return { response: [] };
      }

      const h2hParam = `${homeTeamId}-${awayTeamId}`;
      const suffix = typeof query.last === 'number' ? `&last=${encodeURIComponent(String(query.last))}` : '';
      const cacheKey = `match:h2h:${params.id}:${query.last ?? 'default'}:${query.timezone ?? 'none'}`;

      return withCache(cacheKey, 600_000, () =>
        apiFootballGet(
          `/fixtures/headtohead?h2h=${encodeURIComponent(h2hParam)}${suffix}`,
        ),
      );
    },
  );

  app.get(
    '/v1/matches/:id/predictions',
    async request => {
      const params = parseOrThrow(matchByIdParamsSchema, request.params);
      parseOrThrow(emptyQuerySchema, request.query);

      const cacheKey = `match:predictions:${request.url}`;
      return withCache(cacheKey, 600_000, () =>
        apiFootballGet(
          `/predictions?fixture=${encodeURIComponent(params.id)}`,
        ),
      );
    },
  );

  app.get(
    '/v1/matches/:id/players/:teamId/stats',
    {
      config: {
        rateLimit: {
          max: 80,
          timeWindow: '1 minute',
        },
      },
    },
    async request => {
      const params = parseOrThrow(matchPlayersStatsParamsSchema, request.params);
      parseOrThrow(emptyQuerySchema, request.query);

      const cacheKey = `match:players:${request.url}`;
      return withCache(cacheKey, 20_000, () =>
        apiFootballGet(
          `/fixtures/players?fixture=${encodeURIComponent(params.id)}&team=${encodeURIComponent(params.teamId)}`,
        ),
      );
    },
  );

  app.get(
    '/v1/matches/:id/absences',
    async request => {
      const params = parseOrThrow(matchByIdParamsSchema, request.params);
      const query = parseOrThrow(optionalTimezoneQuerySchema, request.query);

      const context = await fetchFixtureContext(params.id, query.timezone);
      const leagueId = toNumericId(context?.league?.id);
      const season = toNumericId(context?.league?.season);
      const homeTeamId = toNumericId(context?.teams?.home?.id);
      const awayTeamId = toNumericId(context?.teams?.away?.id);
      const fallbackFixtureId = Number.parseInt(params.id, 10);
      const fixtureId = toNumericId(context?.fixture?.id) ?? (Number.isFinite(fallbackFixtureId) ? fallbackFixtureId : null);
      const fixtureDateMs = toEpochMilliseconds(context?.fixture?.timestamp) ?? toDateMilliseconds(context?.fixture?.date);
      if (leagueId === null || season === null || homeTeamId === null || awayTeamId === null || fixtureId === null) {
        return { response: [] };
      }

      const teamIds = [homeTeamId, awayTeamId];
      const cacheKey = `match:absences:${params.id}:${leagueId}:${season}`;

      return withCache(cacheKey, 1_800_000, async () => {
        const entries = await Promise.all(
          teamIds.map(async teamId => {
            try {
              const payload = await apiFootballGet<{ response?: unknown[] }>(
                `/injuries?league=${encodeURIComponent(String(leagueId))}&season=${encodeURIComponent(String(season))}&team=${encodeURIComponent(String(teamId))}`,
              );

              const filteredResponse = filterInjuriesForMatch(payload.response ?? [], fixtureId, fixtureDateMs);
              return {
                teamId,
                response: filteredResponse,
              };
            } catch {
              return {
                teamId,
                response: [],
              };
            }
          }),
        );

        return {
          response: entries,
        };
      });
    },
  );
}
