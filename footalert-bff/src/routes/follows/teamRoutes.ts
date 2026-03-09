import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { buildCanonicalCacheKey, withCache } from '../../lib/cache.js';
import { mapWithConcurrency } from '../../lib/concurrency/mapWithConcurrency.js';
import { timezoneSchema } from '../../lib/schemas.js';
import { parseOrThrow } from '../../lib/validation.js';
import { mapTeamCard } from './cards.js';
import { FOLLOW_CARDS_CONCURRENCY } from './constants.js';
import {
  cardsTeamIdsQuerySchema,
  teamIdParamsSchema,
  type TeamDetailsResponse,
  type TeamNextFixtureResponse,
} from './schemas.js';

export function registerFollowsTeamRoutes(app: FastifyInstance): void {
  app.get('/v1/follows/teams/:teamId', async request => {
    const params = parseOrThrow(teamIdParamsSchema, request.params);
    parseOrThrow(z.object({}).strict(), request.query);

    return withCache(`follows:team:${request.url}`, 120_000, () =>
      apiFootballGet(`/teams?id=${encodeURIComponent(params.teamId)}`),
    );
  });

  app.get('/v1/follows/teams/:teamId/next-fixture', async request => {
    const params = parseOrThrow(teamIdParamsSchema, request.params);
    const query = parseOrThrow(
      z
        .object({
          timezone: timezoneSchema,
        })
        .strict(),
      request.query,
    );

    return withCache(`follows:nextfixture:${request.url}`, 45_000, () =>
      apiFootballGet(
        `/fixtures?team=${encodeURIComponent(params.teamId)}&next=1&timezone=${encodeURIComponent(query.timezone)}`,
      ),
    );
  });

  app.get('/v1/follows/teams/cards', async request => {
    const query = parseOrThrow(cardsTeamIdsQuerySchema, request.query);

    return withCache(
      buildCanonicalCacheKey('follows:team-cards', {
        ids: query.ids,
        timezone: query.timezone,
      }),
      45_000,
      async () => {
        const cards = await mapWithConcurrency(query.ids, FOLLOW_CARDS_CONCURRENCY, async teamId => {
          const [detailsPayload, nextFixturePayload] = await Promise.all([
            withCache<TeamDetailsResponse>(
              buildCanonicalCacheKey('follows:team-details', { teamId }),
              120_000,
              () => apiFootballGet(`/teams?id=${encodeURIComponent(teamId)}`),
            ),
            withCache<TeamNextFixtureResponse>(
              buildCanonicalCacheKey('follows:team-next-fixture', {
                teamId,
                timezone: query.timezone,
              }),
              45_000,
              () =>
                apiFootballGet(
                  `/fixtures?team=${encodeURIComponent(teamId)}&next=1&timezone=${encodeURIComponent(query.timezone)}`,
                ),
            ),
          ]);

          return mapTeamCard(teamId, detailsPayload, nextFixturePayload);
        });

        return {
          response: cards,
        };
      },
    );
  });
}
