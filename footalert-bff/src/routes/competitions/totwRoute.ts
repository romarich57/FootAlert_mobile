import type { FastifyInstance } from 'fastify';

import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { withCache } from '../../lib/cache.js';
import { parseOrThrow } from '../../lib/validation.js';

import { competitionIdParamsSchema, optionalSeasonQuerySchema } from './schemas.js';
import { buildPlayerStatsPath } from './transfersMapper.js';

// Type interne pour le cast des réponses API-Football player-stats
// La forme réelle est { response: PlayerStatDto[] } mais on garde `unknown[]` pour ne pas coupler au DTO
type PlayerStatsRaw = { response?: unknown[] } & Record<string, unknown>;

// Réponse agrégée retournée au mobile : 4 listes extraites de leurs enveloppes respectives
type TotwAggregatedResponse = {
  topScorers: unknown[];
  topAssists: unknown[];
  topYellowCards: unknown[];
  topRedCards: unknown[];
};

export function registerCompetitionTotwRoute(app: FastifyInstance): void {
  app.get(
    '/v1/competitions/:id/totw',
    {
      config: {
        rateLimit: {
          // Chaque requête consomme 4 crédits API-Football (un par type de stat)
          max: 5,
          timeWindow: '1 minute',
        },
      },
    },
    async request => {
      const params = parseOrThrow(competitionIdParamsSchema, request.params);

      // Réutilisation de optionalSeasonQuerySchema : season obligatoire en pratique
      // mais le schéma existant l'accepte comme optionnel — on le valide manuellement ci-dessous
      const rawQuery = parseOrThrow(optionalSeasonQuerySchema, request.query);

      // Fail-fast : la saison est requise pour les stats de joueurs
      if (rawQuery.season === undefined) {
        throw Object.assign(new Error('Le paramètre season est requis'), { statusCode: 400 });
      }

      const season = rawQuery.season;

      // Clé de cache stable par compétition et saison
      const cacheKey = `competition:totw:${params.id}:${season}`;

      return withCache<TotwAggregatedResponse>(cacheKey, 5 * 60_000, async () => {
        // Lancement des 4 appels en parallèle pour minimiser la latence
        const [scorersRaw, assistsRaw, yellowCardsRaw, redCardsRaw] = await Promise.all([
          apiFootballGet(buildPlayerStatsPath('topscorers', params.id, season)),
          apiFootballGet(buildPlayerStatsPath('topassists', params.id, season)),
          apiFootballGet(buildPlayerStatsPath('topyellowcards', params.id, season)),
          apiFootballGet(buildPlayerStatsPath('topredcards', params.id, season)),
        ]);

        // Extraction des tableaux depuis les enveloppes { response: [...] }
        const extractResponse = (raw: unknown): unknown[] =>
          ((raw as PlayerStatsRaw).response) ?? [];

        return {
          topScorers: extractResponse(scorersRaw),
          topAssists: extractResponse(assistsRaw),
          topYellowCards: extractResponse(yellowCardsRaw),
          topRedCards: extractResponse(redCardsRaw),
        };
      });
    },
  );
}
