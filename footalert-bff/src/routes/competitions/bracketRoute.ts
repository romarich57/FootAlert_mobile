// Route GET /v1/competitions/:id/bracket
// Récupère les fixtures de la saison (depuis le cache partagé avec matchesRoute
// ou via API-Football), détecte le type de compétition et construit le bracket.

import type { FastifyInstance } from 'fastify';

import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { withCache } from '../../lib/cache.js';
import { parseOrThrow } from '../../lib/validation.js';

import { buildCompetitionBracket } from './bracketMapper.js';
import { competitionIdParamsSchema, seasonQuerySchema } from './schemas.js';

// TTL aligné sur matchesRoute (90 secondes)
const BRACKET_CACHE_TTL_MS = 90_000;

type FixturesEnvelope = {
  response?: unknown[];
} & Record<string, unknown>;

export function registerCompetitionBracketRoute(app: FastifyInstance): void {
  app.get(
    '/v1/competitions/:id/bracket',
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
      const query = parseOrThrow(seasonQuerySchema, request.query);

      // Clé de cache identique à celle de matchesRoute pour bénéficier du cache chaud.
      // matchesRoute utilise `competition:matches:${request.url}` où request.url
      // vaut `/v1/competitions/${id}/matches?season=${season}`.
      // On reconstruit cette clé manuellement depuis les params validés.
      const matchesUrl = `/v1/competitions/${params.id}/matches?season=${String(query.season)}`;
      const cacheKey = `competition:matches:${matchesUrl}`;

      const payload = await withCache<FixturesEnvelope>(cacheKey, BRACKET_CACHE_TTL_MS, () =>
        apiFootballGet<FixturesEnvelope>(
          `/fixtures?league=${encodeURIComponent(params.id)}&season=${encodeURIComponent(String(query.season))}`,
        ),
      );

      const fixtures = Array.isArray(payload.response) ? payload.response : [];
      return buildCompetitionBracket(fixtures);
    },
  );
}
