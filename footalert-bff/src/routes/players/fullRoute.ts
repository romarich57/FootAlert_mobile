import type { FastifyInstance } from 'fastify';

import { env } from '../../config/env.js';
import { ReadStoreSnapshotInvalidBffError } from '../../lib/readStore/errors.js';
import {
  buildFullPayloadHydration,
  buildHydrationSection,
} from '../../lib/readStore/hydration.js';
import {
  PLAYER_CAREER_POLICY,
  PLAYER_CORE_POLICY,
  PLAYER_MATCHES_POLICY,
  PLAYER_STATS_CATALOG_POLICY,
  PLAYER_TROPHIES_POLICY,
} from '../../lib/readStore/policies.js';
import {
  buildSnapshotWindow,
  buildReadStoreScopeKey,
  readThroughSnapshot,
} from '../../lib/readStore/readThrough.js';
import { getReadStore } from '../../lib/readStore/runtime.js';
import { resolveSectionSnapshot } from '../../lib/readStore/sectionSnapshots.js';
import { parseOrThrow } from '../../lib/validation.js';

import {
  buildPlayerCareerSection,
  buildPlayerCoreSnapshot,
  buildPlayerMatchesSection,
  buildPlayerStatsCatalogSection,
  buildPlayerTrophiesSection,
  composePlayerFullPayload,
  splitPlayerFullPayload,
  type PlayerCoreSnapshotPayload,
  type PlayerFullRoutePayload,
} from './fullService.js';
import { playerDetailsQuerySchema, playerIdParamsSchema } from './schemas.js';

const CORE_REFRESH_PRIORITY = 200;
const HEAVY_REFRESH_PRIORITY = 100;

function validatePlayerCoreSnapshot(payload: PlayerCoreSnapshotPayload): void {
  if (
    !Array.isArray(payload.details?.response)
    || payload.details.response.length === 0
    || !Array.isArray(payload.seasons?.response)
    || payload.seasons.response.length === 0
    || payload.overview?.response == null
  ) {
    throw new ReadStoreSnapshotInvalidBffError({
      entityKind: 'player_core',
    });
  }
}

function isValidPlayerCoreSnapshot(payload: PlayerCoreSnapshotPayload): boolean {
  try {
    validatePlayerCoreSnapshot(payload);
    return true;
  } catch {
    return false;
  }
}

function isValidPlayerFullPayload(payload: PlayerFullRoutePayload): boolean {
  try {
    validatePlayerCoreSnapshot(splitPlayerFullPayload(payload).core);
    return true;
  } catch {
    return false;
  }
}

function buildPlayerCoreScopeKey(season: number): string {
  return buildReadStoreScopeKey({
    section: 'core',
    season,
  });
}

function buildLegacyPlayerFullScopeKey(season: number): string {
  return buildReadStoreScopeKey({
    season,
  });
}

function readPlayerTeamId(core: PlayerCoreSnapshotPayload): string | null {
  const overview = core.overview.response;
  if (!overview || typeof overview !== 'object') {
    return null;
  }

  const profile = (overview as Record<string, unknown>).profile;
  if (!profile || typeof profile !== 'object') {
    return null;
  }

  const team = (profile as Record<string, unknown>).team;
  if (!team || typeof team !== 'object') {
    return null;
  }

  const teamId = (team as Record<string, unknown>).id;
  return typeof teamId === 'string' && teamId.trim().length > 0 ? teamId : null;
}

function buildPlayerHeavyScopeKeys(core: PlayerCoreSnapshotPayload, season: number): {
  matches: string;
  statsCatalog: string;
  career: string;
  trophies: string;
} {
  return {
    matches: buildReadStoreScopeKey({
      section: 'matches',
      season,
      teamId: readPlayerTeamId(core),
    }),
    statsCatalog: buildReadStoreScopeKey({
      section: 'statsCatalog',
    }),
    career: buildReadStoreScopeKey({
      section: 'career',
    }),
    trophies: buildReadStoreScopeKey({
      section: 'trophies',
    }),
  };
}

async function upsertPlayerSectionSnapshotsFromFull(input: {
  readStore: Awaited<ReturnType<typeof getReadStore>>;
  playerId: string;
  season: number;
  requestedCoreScopeKey: string;
  payload: PlayerFullRoutePayload;
}): Promise<void> {
  const split = splitPlayerFullPayload(input.payload);
  const scopeKeys = buildPlayerHeavyScopeKeys(split.core, input.season);

  const coreWindow = buildSnapshotWindow({
    staleAfterMs: PLAYER_CORE_POLICY.freshMs,
    expiresAfterMs: PLAYER_CORE_POLICY.staleMs,
  });
  const matchesWindow = buildSnapshotWindow({
    staleAfterMs: PLAYER_MATCHES_POLICY.freshMs,
    expiresAfterMs: PLAYER_MATCHES_POLICY.staleMs,
  });
  const statsCatalogWindow = buildSnapshotWindow({
    staleAfterMs: PLAYER_STATS_CATALOG_POLICY.freshMs,
    expiresAfterMs: PLAYER_STATS_CATALOG_POLICY.staleMs,
  });
  const careerWindow = buildSnapshotWindow({
    staleAfterMs: PLAYER_CAREER_POLICY.freshMs,
    expiresAfterMs: PLAYER_CAREER_POLICY.staleMs,
  });
  const trophiesWindow = buildSnapshotWindow({
    staleAfterMs: PLAYER_TROPHIES_POLICY.freshMs,
    expiresAfterMs: PLAYER_TROPHIES_POLICY.staleMs,
  });

  await Promise.all([
    input.readStore.upsertEntitySnapshot({
      entityKind: 'player',
      entityId: input.playerId,
      scopeKey: input.requestedCoreScopeKey,
      payload: split.core,
      generatedAt: coreWindow.generatedAt,
      staleAt: coreWindow.staleAt,
      expiresAt: coreWindow.expiresAt,
      metadata: {
        route: '/v1/players/:id/full',
        section: 'core',
        source: 'legacy_backfill',
      },
    }),
    input.readStore.upsertEntitySnapshot({
      entityKind: 'player',
      entityId: input.playerId,
      scopeKey: scopeKeys.matches,
      payload: split.matches,
      generatedAt: matchesWindow.generatedAt,
      staleAt: matchesWindow.staleAt,
      expiresAt: matchesWindow.expiresAt,
      metadata: {
        route: '/v1/players/:id/full',
        section: 'matches',
        source: 'legacy_backfill',
      },
    }),
    input.readStore.upsertEntitySnapshot({
      entityKind: 'player',
      entityId: input.playerId,
      scopeKey: scopeKeys.statsCatalog,
      payload: split.statsCatalog,
      generatedAt: statsCatalogWindow.generatedAt,
      staleAt: statsCatalogWindow.staleAt,
      expiresAt: statsCatalogWindow.expiresAt,
      metadata: {
        route: '/v1/players/:id/full',
        section: 'statsCatalog',
        source: 'legacy_backfill',
      },
    }),
    input.readStore.upsertEntitySnapshot({
      entityKind: 'player',
      entityId: input.playerId,
      scopeKey: scopeKeys.career,
      payload: split.career,
      generatedAt: careerWindow.generatedAt,
      staleAt: careerWindow.staleAt,
      expiresAt: careerWindow.expiresAt,
      metadata: {
        route: '/v1/players/:id/full',
        section: 'career',
        source: 'legacy_backfill',
      },
    }),
    input.readStore.upsertEntitySnapshot({
      entityKind: 'player',
      entityId: input.playerId,
      scopeKey: scopeKeys.trophies,
      payload: split.trophies,
      generatedAt: trophiesWindow.generatedAt,
      staleAt: trophiesWindow.staleAt,
      expiresAt: trophiesWindow.expiresAt,
      metadata: {
        route: '/v1/players/:id/full',
        section: 'trophies',
        source: 'legacy_backfill',
      },
    }),
  ]);
}

export async function registerPlayerFullRoute(app: FastifyInstance): Promise<void> {
  app.get('/v1/players/:id/full', async request => {
    const params = parseOrThrow(playerIdParamsSchema, request.params);
    const query = parseOrThrow(playerDetailsQuerySchema, request.query);
    const requestedCoreScopeKey = buildPlayerCoreScopeKey(query.season);
    const legacyFullScopeKey = buildLegacyPlayerFullScopeKey(query.season);
    const readStore = await getReadStore({
      databaseUrl: env.databaseUrl,
    });

    const coreResult = await readThroughSnapshot({
      cacheKey: `player:core:${params.id}:${requestedCoreScopeKey}`,
      staleAfterMs: PLAYER_CORE_POLICY.freshMs,
      expiresAfterMs: PLAYER_CORE_POLICY.staleMs,
      logger: request.log,
      getSnapshot: async () => {
        const sectionSnapshot = await readStore.getEntitySnapshot<PlayerCoreSnapshotPayload>({
          entityKind: 'player',
          entityId: params.id,
          scopeKey: requestedCoreScopeKey,
        });

        if (
          sectionSnapshot.status !== 'miss'
          && isValidPlayerCoreSnapshot(sectionSnapshot.payload)
        ) {
          return sectionSnapshot;
        }

        const legacySnapshot = await readStore.getEntitySnapshot<PlayerFullRoutePayload>({
          entityKind: 'player_full',
          entityId: params.id,
          scopeKey: legacyFullScopeKey,
        });
        if (
          legacySnapshot.status !== 'miss'
          && isValidPlayerFullPayload(legacySnapshot.payload)
        ) {
          await upsertPlayerSectionSnapshotsFromFull({
            readStore,
            playerId: params.id,
            season: query.season,
            requestedCoreScopeKey,
            payload: legacySnapshot.payload,
          });

          return {
            status: legacySnapshot.status,
            payload: splitPlayerFullPayload(legacySnapshot.payload).core,
          };
        }

        return { status: 'miss' } as const;
      },
      upsertSnapshot: input =>
        readStore.upsertEntitySnapshot({
          entityKind: 'player',
          entityId: params.id,
          scopeKey: requestedCoreScopeKey,
          payload: input.payload,
          generatedAt: input.generatedAt,
          staleAt: input.staleAt,
          expiresAt: input.expiresAt,
          metadata: {
            route: '/v1/players/:id/full',
            section: 'core',
          },
        }),
      fetchFresh: () =>
        buildPlayerCoreSnapshot({
          playerId: params.id,
          season: query.season,
        }),
      isSnapshotPayloadValid: isValidPlayerCoreSnapshot,
      validateFreshPayload: validatePlayerCoreSnapshot,
      queue: {
        store: readStore,
        target: {
          entityKind: 'player',
          entityId: params.id,
          scopeKey: requestedCoreScopeKey,
          priority: CORE_REFRESH_PRIORITY,
          payload: {
            refreshKind: 'core',
            section: 'core',
          },
        },
      },
    });

    const coreSnapshot = await readStore.getEntitySnapshot<PlayerCoreSnapshotPayload>({
      entityKind: 'player',
      entityId: params.id,
      scopeKey: requestedCoreScopeKey,
    });
    const coreHydration = buildHydrationSection({
      state: 'ready',
      freshness: coreResult.freshness,
      updatedAt: coreSnapshot.status === 'miss' ? null : coreSnapshot.generatedAt,
    });

    const heavyScopeKeys = buildPlayerHeavyScopeKeys(coreResult.payload, query.season);
    const matchesUnavailable = readPlayerTeamId(coreResult.payload) === null;

    const [
      matchesResult,
      statsCatalogResult,
      careerResult,
      trophiesResult,
    ] = await Promise.all([
      resolveSectionSnapshot({
        readStore,
        entityKind: 'player',
        entityId: params.id,
        scopeKey: heavyScopeKeys.matches,
        cacheKey: `player:matches:${params.id}:${heavyScopeKeys.matches}`,
        defaultValue: { response: [] },
        unavailable: matchesUnavailable,
        priority: HEAVY_REFRESH_PRIORITY,
        payload: {
          refreshKind: 'heavy',
          section: 'matches',
        },
        logger: request.log,
      }),
      resolveSectionSnapshot({
        readStore,
        entityKind: 'player',
        entityId: params.id,
        scopeKey: heavyScopeKeys.statsCatalog,
        cacheKey: `player:statsCatalog:${params.id}:${heavyScopeKeys.statsCatalog}`,
        defaultValue: { response: null },
        priority: HEAVY_REFRESH_PRIORITY,
        payload: {
          refreshKind: 'heavy',
          section: 'statsCatalog',
        },
        logger: request.log,
      }),
      resolveSectionSnapshot({
        readStore,
        entityKind: 'player',
        entityId: params.id,
        scopeKey: heavyScopeKeys.career,
        cacheKey: `player:career:${params.id}:${heavyScopeKeys.career}`,
        defaultValue: { response: { seasons: [], teams: [] } },
        priority: HEAVY_REFRESH_PRIORITY,
        payload: {
          refreshKind: 'heavy',
          section: 'career',
        },
        logger: request.log,
      }),
      resolveSectionSnapshot({
        readStore,
        entityKind: 'player',
        entityId: params.id,
        scopeKey: heavyScopeKeys.trophies,
        cacheKey: `player:trophies:${params.id}:${heavyScopeKeys.trophies}`,
        defaultValue: { response: [] },
        priority: HEAVY_REFRESH_PRIORITY,
        payload: {
          refreshKind: 'heavy',
          section: 'trophies',
        },
        logger: request.log,
      }),
    ]);

    const hydration = buildFullPayloadHydration({
      sections: {
        details: coreHydration,
        seasons: coreHydration,
        overview: coreHydration,
        matches: matchesResult.hydration,
        statsCatalog: statsCatalogResult.hydration,
        career: careerResult.hydration,
        trophies: trophiesResult.hydration,
      },
      enqueuedHeavyRefresh:
        matchesResult.enqueued ||
        statsCatalogResult.enqueued ||
        careerResult.enqueued ||
        trophiesResult.enqueued,
    });

    return composePlayerFullPayload({
      core: coreResult.payload,
      matches: matchesResult.value,
      statsCatalog: statsCatalogResult.value,
      career: careerResult.value,
      trophies: trophiesResult.value,
      hydration,
    });
  });
}
