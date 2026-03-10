import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { withCache } from '../../lib/cache.js';
import { parseOrThrow } from '../../lib/validation.js';
import { competitionIdParamsSchema, requiredSeasonQuerySchema } from './schemas.js';
import { buildPlayerStatsPath } from './transfersMapper.js';
export function registerCompetitionTotwRoute(app) {
    app.get('/v1/competitions/:id/totw', {
        config: {
            rateLimit: {
                // Chaque requête consomme 4 crédits API-Football (un par type de stat)
                max: 5,
                timeWindow: '1 minute',
            },
        },
    }, async (request) => {
        const params = parseOrThrow(competitionIdParamsSchema, request.params);
        const query = parseOrThrow(requiredSeasonQuerySchema, request.query);
        const season = query.season;
        // Clé de cache stable par compétition et saison
        const cacheKey = `competition:totw:${params.id}:${season}`;
        return withCache(cacheKey, 30 * 60_000, async () => {
            // Lancement des 4 appels en parallèle pour minimiser la latence
            const [scorersRaw, assistsRaw, yellowCardsRaw, redCardsRaw] = await Promise.all([
                apiFootballGet(buildPlayerStatsPath('topscorers', params.id, season)),
                apiFootballGet(buildPlayerStatsPath('topassists', params.id, season)),
                apiFootballGet(buildPlayerStatsPath('topyellowcards', params.id, season)),
                apiFootballGet(buildPlayerStatsPath('topredcards', params.id, season)),
            ]);
            // Extraction des tableaux depuis les enveloppes { response: [...] }
            const extractResponse = (raw) => (raw.response) ?? [];
            return {
                topScorers: extractResponse(scorersRaw),
                topAssists: extractResponse(assistsRaw),
                topYellowCards: extractResponse(yellowCardsRaw),
                topRedCards: extractResponse(redCardsRaw),
            };
        });
    });
}
