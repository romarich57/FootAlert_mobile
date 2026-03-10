import { z } from 'zod';
import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { withCache } from '../../lib/cache.js';
import { parseOrThrow } from '../../lib/validation.js';
import { competitionIdParamsSchema, searchQuerySchema } from './schemas.js';
export function registerCompetitionCoreRoutes(app) {
    app.get('/v1/competitions', async (request) => {
        parseOrThrow(z.object({}).strict(), request.query);
        const cacheKey = `competitions:${request.url}`;
        return withCache(cacheKey, 3_600_000, () => apiFootballGet('/leagues'));
    });
    app.get('/v1/competitions/search', async (request) => {
        const query = parseOrThrow(searchQuerySchema, request.query);
        const cacheKey = `competitions:search:${request.url}`;
        return withCache(cacheKey, 60_000, () => apiFootballGet(`/leagues?search=${encodeURIComponent(query.q)}`));
    });
    app.get('/v1/competitions/:id', async (request) => {
        const params = parseOrThrow(competitionIdParamsSchema, request.params);
        parseOrThrow(z.object({}).strict(), request.query);
        const cacheKey = `competition:${request.url}`;
        return withCache(cacheKey, 120_000, () => apiFootballGet(`/leagues?id=${encodeURIComponent(params.id)}`));
    });
}
