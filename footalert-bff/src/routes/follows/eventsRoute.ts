import { getFollowDiscoverySeeds, normalizeFollowDiscoveryPlayerId } from '@footalert/app-core';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { env } from '../../config/env.js';
import { buildCanonicalCacheKey, withCacheStaleWhileRevalidate } from '../../lib/cache.js';
import type { FollowEntityKind, FollowsDiscoveryStore } from '../../lib/follows/discoveryStore.js';
import { verifySensitiveMobileAuth } from '../../lib/mobileSessionAuth.js';
import { parseOrThrow } from '../../lib/validation.js';
import {
  FOLLOW_DISCOVERY_CACHE_TTL_MS,
  FOLLOW_DISCOVERY_DEFAULT_LIMIT,
  FOLLOW_DISCOVERY_MAX_LEAGUE_COUNT,
  FOLLOW_DISCOVERY_PLAYERS_BLOCKING_LEAGUE_COUNT,
  FOLLOW_DISCOVERY_SYNC_BUDGET_MS,
  FOLLOW_DISCOVERY_TEAMS_BLOCKING_LEAGUE_COUNT,
} from './constants.js';
import {
  discoveryQuerySchema,
  followEventSchema,
  type FollowEventPayload,
  type FollowDiscoveryPlayerItem,
  type FollowDiscoveryTeamItem,
} from './schemas.js';
import { toMetadataFromSnapshot } from './discovery/mappers.js';
import {
  buildDiscoveryResponse,
  getCurrentSeasonYear,
  hydrateDiscoveryMetadataIfNeeded,
  loadLegacyPlayerDiscovery,
  loadLegacyTeamDiscovery,
  mapDynamicPlayerDiscoveryItems,
  mapDynamicTeamDiscoveryItems,
  scheduleDiscoveryCacheRefresh,
  waitForResultWithinBudget,
} from './discovery/service.js';

type GetDiscoveryStore = () => Promise<FollowsDiscoveryStore>;

function rejectUnauthorizedFollowEventRequest(
  request: FastifyRequest,
  reply: FastifyReply,
): { subject: string } | null {
  const authResult = verifySensitiveMobileAuth(request, {
    requiredScope: 'telemetry:write',
    jwtSecret: env.mobileSessionJwtSecret,
    minIntegrity: 'device',
  });

  if (!authResult.ok) {
    reply.code(authResult.failure.statusCode).send({
      error: authResult.failure.code,
      message: authResult.failure.message,
    });
    return null;
  }

  return {
    subject: authResult.context.subject,
  };
}

async function recordFollowEvent(
  store: FollowsDiscoveryStore,
  payload: FollowEventPayload,
  subject: string,
) {
  const occurredAt = payload.occurredAt ? new Date(payload.occurredAt) : undefined;
  const normalizedEntityId =
    payload.entityKind === 'player'
      ? normalizeFollowDiscoveryPlayerId(payload.entityId)
      : payload.entityId;

  const eventResult = await store.recordEvent({
    subject,
    entityKind: payload.entityKind,
    entityId: normalizedEntityId,
    action: payload.action,
    source: payload.source,
    occurredAt,
  });

  return {
    eventResult,
    normalizedEntityId,
  };
}

export function registerFollowsEventsRoute(
  app: FastifyInstance,
  getDiscoveryStore: GetDiscoveryStore,
): void {
  app.post('/v1/follows/events', async (request, reply) => {
    const authContext = rejectUnauthorizedFollowEventRequest(request, reply);
    if (!authContext) {
      return;
    }

    parseOrThrow(z.object({}).strict(), request.query);
    const payload = parseOrThrow(followEventSchema, request.body);
    const store = await getDiscoveryStore();
    const { eventResult, normalizedEntityId } = await recordFollowEvent(
      store,
      payload,
      authContext.subject,
    );

    if (payload.entitySnapshot) {
      await store.upsertMetadata(
        payload.entityKind,
        normalizedEntityId,
        toMetadataFromSnapshot(
          payload.entityKind,
          normalizedEntityId,
          payload.entitySnapshot,
        ),
      );
    } else {
      void hydrateDiscoveryMetadataIfNeeded({
        entityKind: payload.entityKind,
        entityId: normalizedEntityId,
        store,
      }).catch(error => {
        request.log.warn(
          {
            entityKind: payload.entityKind,
            entityId: normalizedEntityId,
            err: error instanceof Error ? error.message : String(error),
          },
          'follows.discovery.metadata_hydration_failed',
        );
      });
    }

    return {
      status: 'accepted' as const,
      applied: eventResult.applied,
      state: eventResult.state,
    };
  });
}

export function registerFollowsDiscoveryRoutes(
  app: FastifyInstance,
  getDiscoveryStore: GetDiscoveryStore,
): void {
  app.get('/v1/follows/discovery/teams', async request => {
    const query = parseOrThrow(discoveryQuerySchema, request.query);
    const limit = query.limit ?? FOLLOW_DISCOVERY_DEFAULT_LIMIT;
    const season = getCurrentSeasonYear();
    const cacheKey = buildCanonicalCacheKey('follows:discovery:teams', { limit });

    return withCacheStaleWhileRevalidate(
      cacheKey,
      FOLLOW_DISCOVERY_CACHE_TTL_MS,
      async () => {
        const store = await getDiscoveryStore();
        const dynamicItems = mapDynamicTeamDiscoveryItems(await store.getDiscovery('team', limit));
        const staticItems = getFollowDiscoverySeeds('team', limit) as FollowDiscoveryTeamItem[];

        if (dynamicItems.length >= limit) {
          return buildDiscoveryResponse({
            dynamicItems: dynamicItems.slice(0, limit),
            legacyItems: [],
            staticItems: [],
            getId: item => item.teamId,
            limit,
          });
        }

        const blockingLegacyPromise = loadLegacyTeamDiscovery(
          limit,
          season,
          request.log,
          FOLLOW_DISCOVERY_TEAMS_BLOCKING_LEAGUE_COUNT,
        );
        const fullLegacyPromise = loadLegacyTeamDiscovery(
          limit,
          season,
          request.log,
          FOLLOW_DISCOVERY_MAX_LEAGUE_COUNT,
        );

        const blockingLegacyItems = await waitForResultWithinBudget(
          blockingLegacyPromise,
          FOLLOW_DISCOVERY_SYNC_BUDGET_MS,
        );

        if (blockingLegacyItems === null) {
          const immediateResponse = buildDiscoveryResponse({
            dynamicItems,
            legacyItems: [],
            staticItems,
            getId: item => item.teamId,
            limit,
          });

          scheduleDiscoveryCacheRefresh({
            cacheKey,
            logger: request.log,
            refreshPromise: fullLegacyPromise.then(legacyItems =>
              buildDiscoveryResponse({
                dynamicItems,
                legacyItems,
                staticItems,
                getId: item => item.teamId,
                limit,
              })),
          });

          return immediateResponse;
        }

        const response = buildDiscoveryResponse({
          dynamicItems,
          legacyItems: blockingLegacyItems,
          staticItems,
          getId: item => item.teamId,
          limit,
        });

        if (!response.meta.complete) {
          scheduleDiscoveryCacheRefresh({
            cacheKey,
            logger: request.log,
            refreshPromise: fullLegacyPromise.then(legacyItems =>
              buildDiscoveryResponse({
                dynamicItems,
                legacyItems,
                staticItems,
                getId: item => item.teamId,
                limit,
              })),
          });
        }

        return response;
      },
    );
  });

  app.get('/v1/follows/discovery/players', async request => {
    const query = parseOrThrow(discoveryQuerySchema, request.query);
    const limit = query.limit ?? FOLLOW_DISCOVERY_DEFAULT_LIMIT;
    const season = getCurrentSeasonYear();
    const cacheKey = buildCanonicalCacheKey('follows:discovery:players', { limit });

    return withCacheStaleWhileRevalidate(
      cacheKey,
      FOLLOW_DISCOVERY_CACHE_TTL_MS,
      async () => {
        const store = await getDiscoveryStore();
        const dynamicItems = mapDynamicPlayerDiscoveryItems(await store.getDiscovery('player', limit));
        const staticItems = getFollowDiscoverySeeds('player', limit) as FollowDiscoveryPlayerItem[];

        if (dynamicItems.length >= limit) {
          return buildDiscoveryResponse({
            dynamicItems: dynamicItems.slice(0, limit),
            legacyItems: [],
            staticItems: [],
            getId: item => item.playerId,
            limit,
          });
        }

        const blockingLegacyPromise = loadLegacyPlayerDiscovery(
          limit,
          season,
          request.log,
          FOLLOW_DISCOVERY_PLAYERS_BLOCKING_LEAGUE_COUNT,
        );
        const fullLegacyPromise = loadLegacyPlayerDiscovery(
          limit,
          season,
          request.log,
          FOLLOW_DISCOVERY_MAX_LEAGUE_COUNT,
        );

        const blockingLegacyItems = await waitForResultWithinBudget(
          blockingLegacyPromise,
          FOLLOW_DISCOVERY_SYNC_BUDGET_MS,
        );

        if (blockingLegacyItems === null) {
          const immediateResponse = buildDiscoveryResponse({
            dynamicItems,
            legacyItems: [],
            staticItems,
            getId: item => item.playerId,
            limit,
          });

          scheduleDiscoveryCacheRefresh({
            cacheKey,
            logger: request.log,
            refreshPromise: fullLegacyPromise.then(legacyItems =>
              buildDiscoveryResponse({
                dynamicItems,
                legacyItems,
                staticItems,
                getId: item => item.playerId,
                limit,
              })),
          });

          return immediateResponse;
        }

        const response = buildDiscoveryResponse({
          dynamicItems,
          legacyItems: blockingLegacyItems,
          staticItems,
          getId: item => item.playerId,
          limit,
        });

        if (!response.meta.complete) {
          scheduleDiscoveryCacheRefresh({
            cacheKey,
            logger: request.log,
            refreshPromise: fullLegacyPromise.then(legacyItems =>
              buildDiscoveryResponse({
                dynamicItems,
                legacyItems,
                staticItems,
                getId: item => item.playerId,
                limit,
              })),
          });
        }

        return response;
      },
    );
  });
}
