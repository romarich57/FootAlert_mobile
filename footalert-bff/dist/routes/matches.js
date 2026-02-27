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
function toNumericId(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
function normalizeText(value) {
    if (typeof value !== 'string') {
        return '';
    }
    return value.trim().toLowerCase().replace(/[_-]+/g, ' ');
}
function detectStatisticsPeriod(value) {
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
function stripPeriodHintFromType(type) {
    const sanitized = type
        .replace(/\(\s*(1st|first|2nd|second)\s*half\s*\)/gi, '')
        .replace(/\b(1st|first)\s*half\b/gi, '')
        .replace(/\b(2nd|second)\s*half\b/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
    return sanitized.length > 0 ? sanitized : type;
}
function hasPeriodHintsInFixtureStatistics(response) {
    return response.some(entry => {
        if (!entry || typeof entry !== 'object') {
            return false;
        }
        const record = entry;
        if (detectStatisticsPeriod(record.period ?? record.half ?? record.label ?? record.type)) {
            return true;
        }
        const statistics = Array.isArray(record.statistics) ? record.statistics : [];
        return statistics.some(stat => {
            if (!stat || typeof stat !== 'object') {
                return false;
            }
            const statRecord = stat;
            return Boolean(detectStatisticsPeriod(statRecord.period ?? statRecord.half ?? statRecord.label ?? statRecord.type));
        });
    });
}
function filterFixtureStatisticsByPeriod(payload, period) {
    const payloadRecord = payload && typeof payload === 'object' ? payload : {};
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
        const entryRecord = entry;
        const teamPeriod = detectStatisticsPeriod(entryRecord.period ?? entryRecord.half ?? entryRecord.label ?? entryRecord.type);
        if (teamPeriod && teamPeriod !== period) {
            return null;
        }
        const statistics = Array.isArray(entryRecord.statistics) ? entryRecord.statistics : [];
        const filteredStatistics = statistics
            .map(stat => {
            if (!stat || typeof stat !== 'object') {
                return null;
            }
            const statRecord = stat;
            const statPeriod = detectStatisticsPeriod(statRecord.period ?? statRecord.half ?? statRecord.label ?? statRecord.type);
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
            .filter((stat) => stat !== null);
        if (filteredStatistics.length === 0) {
            return null;
        }
        return {
            ...entryRecord,
            statistics: filteredStatistics,
        };
    })
        .filter((entry) => entry !== null);
    return {
        ...payloadRecord,
        response: filteredResponse,
    };
}
function buildFixtureContextKey(matchId, timezone) {
    return timezone ? `match:context:${matchId}:${timezone}` : `match:context:${matchId}`;
}
async function fetchFixtureContext(matchId, timezone) {
    const contextKey = buildFixtureContextKey(matchId, timezone);
    const payload = await withCache(contextKey, 30_000, () => apiFootballGet(timezone
        ? `/fixtures?id=${encodeURIComponent(matchId)}&timezone=${encodeURIComponent(timezone)}`
        : `/fixtures?id=${encodeURIComponent(matchId)}`));
    return payload.response?.[0] ?? null;
}
export async function registerMatchesRoutes(app) {
    app.get('/v1/matches', async (request) => {
        const query = parseOrThrow(matchesQuerySchema, request.query);
        const cacheKey = `matches:${request.url}`;
        return withCache(cacheKey, 30_000, () => apiFootballGet(`/fixtures?date=${encodeURIComponent(query.date)}&timezone=${encodeURIComponent(query.timezone)}`));
    });
    app.get('/v1/matches/:id', {
        config: {
            rateLimit: {
                max: 80,
                timeWindow: '1 minute',
            },
        },
    }, async (request) => {
        const params = parseOrThrow(matchByIdParamsSchema, request.params);
        const query = parseOrThrow(matchByIdQuerySchema, request.query);
        const cacheKey = `match:${request.url}`;
        return withCache(cacheKey, 30_000, () => apiFootballGet(`/fixtures?id=${encodeURIComponent(params.id)}&timezone=${encodeURIComponent(query.timezone)}`));
    });
    app.get('/v1/matches/:id/events', {
        config: {
            rateLimit: {
                max: 80,
                timeWindow: '1 minute',
            },
        },
    }, async (request) => {
        const params = parseOrThrow(matchByIdParamsSchema, request.params);
        parseOrThrow(emptyQuerySchema, request.query);
        const cacheKey = `match:events:${request.url}`;
        return withCache(cacheKey, 15_000, () => apiFootballGet(`/fixtures/events?fixture=${encodeURIComponent(params.id)}`));
    });
    app.get('/v1/matches/:id/statistics', {
        config: {
            rateLimit: {
                max: 80,
                timeWindow: '1 minute',
            },
        },
    }, async (request) => {
        const params = parseOrThrow(matchByIdParamsSchema, request.params);
        const query = parseOrThrow(matchStatisticsQuerySchema, request.query);
        const period = query.period ?? 'all';
        const cacheKey = `match:statistics:${params.id}:${period}`;
        if (period === 'all') {
            return withCache(cacheKey, 15_000, () => apiFootballGet(`/fixtures/statistics?fixture=${encodeURIComponent(params.id)}`));
        }
        const context = await fetchFixtureContext(params.id);
        const season = toNumericId(context?.league?.season);
        if (season === null || season < 2024) {
            return { response: [] };
        }
        return withCache(cacheKey, 15_000, async () => {
            const payload = await apiFootballGet(`/fixtures/statistics?fixture=${encodeURIComponent(params.id)}&half=true`);
            return filterFixtureStatisticsByPeriod(payload, period);
        });
    });
    app.get('/v1/matches/:id/lineups', async (request) => {
        const params = parseOrThrow(matchByIdParamsSchema, request.params);
        parseOrThrow(emptyQuerySchema, request.query);
        const cacheKey = `match:lineups:${request.url}`;
        return withCache(cacheKey, 30_000, () => apiFootballGet(`/fixtures/lineups?fixture=${encodeURIComponent(params.id)}`));
    });
    app.get('/v1/matches/:id/head-to-head', async (request) => {
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
        return withCache(cacheKey, 600_000, () => apiFootballGet(`/fixtures/headtohead?h2h=${encodeURIComponent(h2hParam)}${suffix}`));
    });
    app.get('/v1/matches/:id/predictions', async (request) => {
        const params = parseOrThrow(matchByIdParamsSchema, request.params);
        parseOrThrow(emptyQuerySchema, request.query);
        const cacheKey = `match:predictions:${request.url}`;
        return withCache(cacheKey, 600_000, () => apiFootballGet(`/predictions?fixture=${encodeURIComponent(params.id)}`));
    });
    app.get('/v1/matches/:id/players/:teamId/stats', {
        config: {
            rateLimit: {
                max: 80,
                timeWindow: '1 minute',
            },
        },
    }, async (request) => {
        const params = parseOrThrow(matchPlayersStatsParamsSchema, request.params);
        parseOrThrow(emptyQuerySchema, request.query);
        const cacheKey = `match:players:${request.url}`;
        return withCache(cacheKey, 20_000, () => apiFootballGet(`/fixtures/players?fixture=${encodeURIComponent(params.id)}&team=${encodeURIComponent(params.teamId)}`));
    });
    app.get('/v1/matches/:id/absences', async (request) => {
        const params = parseOrThrow(matchByIdParamsSchema, request.params);
        const query = parseOrThrow(optionalTimezoneQuerySchema, request.query);
        const context = await fetchFixtureContext(params.id, query.timezone);
        const leagueId = toNumericId(context?.league?.id);
        const season = toNumericId(context?.league?.season);
        const homeTeamId = toNumericId(context?.teams?.home?.id);
        const awayTeamId = toNumericId(context?.teams?.away?.id);
        if (leagueId === null || season === null || homeTeamId === null || awayTeamId === null) {
            return { response: [] };
        }
        const teamIds = [homeTeamId, awayTeamId];
        const cacheKey = `match:absences:${params.id}:${leagueId}:${season}`;
        return withCache(cacheKey, 1_800_000, async () => {
            const entries = await Promise.all(teamIds.map(async (teamId) => {
                try {
                    const payload = await apiFootballGet(`/injuries?league=${encodeURIComponent(String(leagueId))}&season=${encodeURIComponent(String(season))}&team=${encodeURIComponent(String(teamId))}`);
                    return {
                        teamId,
                        response: payload.response ?? [],
                    };
                }
                catch {
                    return {
                        teamId,
                        response: [],
                    };
                }
            }));
            return {
                response: entries,
            };
        });
    });
}
