import { buildCanonicalCacheKey, withCacheStaleWhileRevalidate } from '../../../lib/cache.js';
import { parseOrThrow } from '../../../lib/validation.js';
import { competitionIdParamsSchema, requiredSeasonQuerySchema } from '../schemas.js';
import { buildCompetitionTeamStatsResponse } from './service.js';
export function registerCompetitionTeamStatsRoute(app) {
    app.get('/v1/competitions/:id/team-stats', {
        config: {
            rateLimit: {
                max: 20,
                timeWindow: '1 minute',
            },
        },
    }, async (request) => {
        const params = parseOrThrow(competitionIdParamsSchema, request.params);
        const query = parseOrThrow(requiredSeasonQuerySchema, request.query);
        return withCacheStaleWhileRevalidate(buildCanonicalCacheKey('competition:team-stats:v1', {
            leagueId: params.id,
            season: query.season,
        }), 5 * 60_000, () => buildCompetitionTeamStatsResponse(params.id, query.season));
    });
}
