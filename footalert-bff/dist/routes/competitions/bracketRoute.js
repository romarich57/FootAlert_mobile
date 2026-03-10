// Route GET /v1/competitions/:id/bracket
// Récupère les fixtures de la saison (depuis le cache partagé avec matchesRoute
// ou via API-Football), détecte le type de compétition et construit le bracket.
import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { buildCanonicalCacheKey, withCache } from '../../lib/cache.js';
import { parseOrThrow } from '../../lib/validation.js';
import { buildCompetitionBracket } from './bracketMapper.js';
import { competitionIdParamsSchema, seasonQuerySchema } from './schemas.js';
// TTL aligné sur matchesRoute (90 secondes)
const BRACKET_CACHE_TTL_MS = 90_000;
export function registerCompetitionBracketRoute(app) {
    app.get('/v1/competitions/:id/bracket', {
        config: {
            rateLimit: {
                max: 30,
                timeWindow: '1 minute',
            },
        },
    }, async (request) => {
        const params = parseOrThrow(competitionIdParamsSchema, request.params);
        const query = parseOrThrow(seasonQuerySchema, request.query);
        const cacheKey = buildCanonicalCacheKey('competition:matches:upstream', {
            competitionId: params.id,
            season: query.season,
        });
        const payload = await withCache(cacheKey, BRACKET_CACHE_TTL_MS, () => apiFootballGet(`/fixtures?league=${encodeURIComponent(params.id)}&season=${encodeURIComponent(String(query.season))}`));
        const fixtures = Array.isArray(payload.response) ? payload.response : [];
        return buildCompetitionBracket(fixtures);
    });
}
