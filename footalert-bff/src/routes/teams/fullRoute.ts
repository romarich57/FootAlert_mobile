import type { FastifyInstance } from 'fastify';

import { env } from '../../config/env.js';
import { buildCanonicalCacheKey, withCacheStaleWhileRevalidate } from '../../lib/cache.js';
import { parseOrThrow } from '../../lib/validation.js';

import { fetchTeamFullPayload } from './fullService.js';
import { teamFullQuerySchema, teamIdParamsSchema } from './schemas.js';

export async function registerTeamFullRoute(app: FastifyInstance): Promise<void> {
  app.get('/v1/teams/:id/full', async request => {
    const params = parseOrThrow(teamIdParamsSchema, request.params);
    const query = parseOrThrow(teamFullQuerySchema, request.query);

    return withCacheStaleWhileRevalidate(
      buildCanonicalCacheKey('teams:full', {
        teamId: params.id,
        leagueId: query.leagueId ?? null,
        season: query.season ?? null,
        timezone: query.timezone,
        historySeasons: query.historySeasons ?? null,
      }),
      env.cacheTtl.teams,
      () =>
        fetchTeamFullPayload({
          teamId: params.id,
          leagueId: query.leagueId,
          season: query.season,
          timezone: query.timezone,
          historySeasons: query.historySeasons,
          logger: request.log,
        }),
    );
  });
}
