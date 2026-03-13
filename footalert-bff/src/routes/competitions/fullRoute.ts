import type { FastifyInstance } from 'fastify';

import { env } from '../../config/env.js';
import { ReadStoreSnapshotInvalidBffError } from '../../lib/readStore/errors.js';
import {
  buildFullPayloadHydration,
  buildHydrationSection,
} from '../../lib/readStore/hydration.js';
import {
  COMPETITION_BRACKET_POLICY,
  COMPETITION_CORE_POLICY,
  COMPETITION_PLAYER_STATS_POLICY,
  COMPETITION_TEAM_STATS_POLICY,
  COMPETITION_TRANSFERS_POLICY,
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
  buildCompetitionBracketSection,
  buildCompetitionCoreSnapshot,
  buildCompetitionPlayerStatsSection,
  buildCompetitionTeamStatsSection,
  buildCompetitionTransfersSection,
  composeCompetitionFullPayload,
  splitCompetitionFullPayload,
  type CompetitionCoreSnapshotPayload,
  type CompetitionFullResponse,
} from './fullService.js';
import { competitionIdParamsSchema, optionalSeasonQuerySchema } from './schemas.js';

const CORE_REFRESH_PRIORITY = 200;
const HEAVY_REFRESH_PRIORITY = 100;

const CACHE_CONTROL_SHORT = [
  'public',
  `max-age=${Math.max(1, Math.floor(Math.min(env.cacheTtl.competitions, 30_000) / 1_000))}`,
  `stale-while-revalidate=${Math.max(1, Math.floor(Math.min(env.cacheTtl.competitions, 30_000) / 1_000))}`,
].join(', ');

function validateCompetitionCoreSnapshot(
  payload: CompetitionCoreSnapshotPayload,
): void {
  if (payload.competition == null || !Number.isFinite(payload.season)) {
    throw new ReadStoreSnapshotInvalidBffError({
      entityKind: 'competition_core',
      season: payload.season,
    });
  }
}

function isValidCompetitionCoreSnapshot(
  payload: CompetitionCoreSnapshotPayload,
): boolean {
  try {
    validateCompetitionCoreSnapshot(payload);
    return true;
  } catch {
    return false;
  }
}

function isValidCompetitionFullPayload(
  payload: CompetitionFullResponse,
): boolean {
  try {
    validateCompetitionCoreSnapshot(splitCompetitionFullPayload(payload).core);
    return true;
  } catch {
    return false;
  }
}

function buildCompetitionCoreScopeKey(season?: number): string {
  return buildReadStoreScopeKey({
    section: 'core',
    season: season ?? null,
  });
}

function buildLegacyCompetitionFullScopeKey(season?: number): string {
  return buildReadStoreScopeKey({
    season: season ?? null,
  });
}

function buildCompetitionHeavyScopeKeys(core: CompetitionCoreSnapshotPayload): {
  bracket: string;
  playerStats: string;
  teamStats: string;
  transfers: string;
} {
  return {
    bracket: buildReadStoreScopeKey({
      section: 'bracket',
      season: core.season,
    }),
    playerStats: buildReadStoreScopeKey({
      section: 'playerStats',
      season: core.season,
    }),
    teamStats: buildReadStoreScopeKey({
      section: 'teamStats',
      season: core.season,
    }),
    transfers: buildReadStoreScopeKey({
      section: 'transfers',
      season: core.season,
    }),
  };
}

async function upsertCompetitionSectionSnapshotsFromFull(input: {
  readStore: Awaited<ReturnType<typeof getReadStore>>;
  competitionId: string;
  requestedCoreScopeKey: string;
  payload: CompetitionFullResponse;
}): Promise<void> {
  const split = splitCompetitionFullPayload(input.payload);
  const scopeKeys = buildCompetitionHeavyScopeKeys(split.core);

  const coreWindow = buildSnapshotWindow({
    staleAfterMs: COMPETITION_CORE_POLICY.freshMs,
    expiresAfterMs: COMPETITION_CORE_POLICY.staleMs,
  });
  const bracketWindow = buildSnapshotWindow({
    staleAfterMs: COMPETITION_BRACKET_POLICY.freshMs,
    expiresAfterMs: COMPETITION_BRACKET_POLICY.staleMs,
  });
  const playerStatsWindow = buildSnapshotWindow({
    staleAfterMs: COMPETITION_PLAYER_STATS_POLICY.freshMs,
    expiresAfterMs: COMPETITION_PLAYER_STATS_POLICY.staleMs,
  });
  const teamStatsWindow = buildSnapshotWindow({
    staleAfterMs: COMPETITION_TEAM_STATS_POLICY.freshMs,
    expiresAfterMs: COMPETITION_TEAM_STATS_POLICY.staleMs,
  });
  const transfersWindow = buildSnapshotWindow({
    staleAfterMs: COMPETITION_TRANSFERS_POLICY.freshMs,
    expiresAfterMs: COMPETITION_TRANSFERS_POLICY.staleMs,
  });

  await Promise.all([
    input.readStore.upsertEntitySnapshot({
      entityKind: 'competition',
      entityId: input.competitionId,
      scopeKey: input.requestedCoreScopeKey,
      payload: split.core,
      generatedAt: coreWindow.generatedAt,
      staleAt: coreWindow.staleAt,
      expiresAt: coreWindow.expiresAt,
      metadata: {
        route: '/v1/competitions/:id/full',
        section: 'core',
        source: 'legacy_backfill',
      },
    }),
    input.readStore.upsertEntitySnapshot({
      entityKind: 'competition',
      entityId: input.competitionId,
      scopeKey: scopeKeys.bracket,
      payload: split.bracket,
      generatedAt: bracketWindow.generatedAt,
      staleAt: bracketWindow.staleAt,
      expiresAt: bracketWindow.expiresAt,
      metadata: {
        route: '/v1/competitions/:id/full',
        section: 'bracket',
        source: 'legacy_backfill',
      },
    }),
    input.readStore.upsertEntitySnapshot({
      entityKind: 'competition',
      entityId: input.competitionId,
      scopeKey: scopeKeys.playerStats,
      payload: split.playerStats,
      generatedAt: playerStatsWindow.generatedAt,
      staleAt: playerStatsWindow.staleAt,
      expiresAt: playerStatsWindow.expiresAt,
      metadata: {
        route: '/v1/competitions/:id/full',
        section: 'playerStats',
        source: 'legacy_backfill',
      },
    }),
    input.readStore.upsertEntitySnapshot({
      entityKind: 'competition',
      entityId: input.competitionId,
      scopeKey: scopeKeys.teamStats,
      payload: split.teamStats,
      generatedAt: teamStatsWindow.generatedAt,
      staleAt: teamStatsWindow.staleAt,
      expiresAt: teamStatsWindow.expiresAt,
      metadata: {
        route: '/v1/competitions/:id/full',
        section: 'teamStats',
        source: 'legacy_backfill',
      },
    }),
    input.readStore.upsertEntitySnapshot({
      entityKind: 'competition',
      entityId: input.competitionId,
      scopeKey: scopeKeys.transfers,
      payload: split.transfers,
      generatedAt: transfersWindow.generatedAt,
      staleAt: transfersWindow.staleAt,
      expiresAt: transfersWindow.expiresAt,
      metadata: {
        route: '/v1/competitions/:id/full',
        section: 'transfers',
        source: 'legacy_backfill',
      },
    }),
  ]);
}

export function registerCompetitionFullRoute(app: FastifyInstance): void {
  app.get(
    '/v1/competitions/:id/full',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const params = parseOrThrow(competitionIdParamsSchema, request.params);
      const query = parseOrThrow(optionalSeasonQuerySchema, request.query);
      const requestedCoreScopeKey = buildCompetitionCoreScopeKey(query.season);
      const legacyFullScopeKey = buildLegacyCompetitionFullScopeKey(query.season);
      const readStore = await getReadStore({
        databaseUrl: env.databaseUrl,
      });

      reply.header('Cache-Control', CACHE_CONTROL_SHORT);

      const coreResult = await readThroughSnapshot({
        cacheKey: `competition:core:${params.id}:${requestedCoreScopeKey}`,
        staleAfterMs: COMPETITION_CORE_POLICY.freshMs,
        expiresAfterMs: COMPETITION_CORE_POLICY.staleMs,
        logger: request.log,
        getSnapshot: async () => {
          const sectionSnapshot = await readStore.getEntitySnapshot<CompetitionCoreSnapshotPayload>({
            entityKind: 'competition',
            entityId: params.id,
            scopeKey: requestedCoreScopeKey,
          });

          if (
            sectionSnapshot.status !== 'miss'
            && isValidCompetitionCoreSnapshot(sectionSnapshot.payload)
          ) {
            return sectionSnapshot;
          }

          const legacySnapshot = await readStore.getEntitySnapshot<CompetitionFullResponse>({
            entityKind: 'competition_full',
            entityId: params.id,
            scopeKey: legacyFullScopeKey,
          });
          if (
            legacySnapshot.status !== 'miss'
            && isValidCompetitionFullPayload(legacySnapshot.payload)
          ) {
            await upsertCompetitionSectionSnapshotsFromFull({
              readStore,
              competitionId: params.id,
              requestedCoreScopeKey,
              payload: legacySnapshot.payload,
            });

            return {
              status: legacySnapshot.status,
              payload: splitCompetitionFullPayload(legacySnapshot.payload).core,
            };
          }

          return { status: 'miss' } as const;
        },
        upsertSnapshot: input =>
          readStore.upsertEntitySnapshot({
            entityKind: 'competition',
            entityId: params.id,
            scopeKey: requestedCoreScopeKey,
            payload: input.payload,
            generatedAt: input.generatedAt,
            staleAt: input.staleAt,
            expiresAt: input.expiresAt,
            metadata: {
              route: '/v1/competitions/:id/full',
              section: 'core',
            },
          }),
        fetchFresh: () => buildCompetitionCoreSnapshot(params.id, query.season),
        isSnapshotPayloadValid: isValidCompetitionCoreSnapshot,
        validateFreshPayload: validateCompetitionCoreSnapshot,
        queue: {
          store: readStore,
          target: {
            entityKind: 'competition',
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

      const coreSnapshot = await readStore.getEntitySnapshot<CompetitionCoreSnapshotPayload>({
        entityKind: 'competition',
        entityId: params.id,
        scopeKey: requestedCoreScopeKey,
      });
      const coreHydration = buildHydrationSection({
        state: 'ready',
        freshness: coreResult.freshness,
        updatedAt: coreSnapshot.status === 'miss' ? null : coreSnapshot.generatedAt,
      });
      const heavyScopeKeys = buildCompetitionHeavyScopeKeys(coreResult.payload);

      const bracketSnapshot = await readStore.getEntitySnapshot<CompetitionFullResponse['bracket']>({
        entityKind: 'competition',
        entityId: params.id,
        scopeKey: heavyScopeKeys.bracket,
      });
      let bracketValue = bracketSnapshot.status === 'miss'
        ? null
        : bracketSnapshot.payload;
      let bracketHydration = buildHydrationSection({
        state: coreResult.payload.competitionKind === 'league' ? 'unavailable' : 'ready',
        freshness:
          coreResult.payload.competitionKind === 'league'
            ? 'miss'
            : (bracketSnapshot.status === 'miss' ? coreResult.freshness : (bracketSnapshot.status === 'fresh' ? 'fresh' : 'stale')),
        updatedAt:
          bracketSnapshot.status === 'miss'
            ? (coreSnapshot.status === 'miss' ? null : coreSnapshot.generatedAt)
            : bracketSnapshot.generatedAt,
      });

      if (coreResult.payload.competitionKind !== 'league' && bracketSnapshot.status === 'miss') {
        bracketValue = await buildCompetitionBracketSection({
          core: coreResult.payload,
        });
        const bracketWindow = buildSnapshotWindow({
          staleAfterMs: COMPETITION_BRACKET_POLICY.freshMs,
          expiresAfterMs: COMPETITION_BRACKET_POLICY.staleMs,
        });
        await readStore.upsertEntitySnapshot({
          entityKind: 'competition',
          entityId: params.id,
          scopeKey: heavyScopeKeys.bracket,
          payload: bracketValue,
          generatedAt: bracketWindow.generatedAt,
          staleAt: bracketWindow.staleAt,
          expiresAt: bracketWindow.expiresAt,
          metadata: {
            route: '/v1/competitions/:id/full',
            section: 'bracket',
            source: 'route.compute',
          },
        });
        bracketHydration = buildHydrationSection({
          state: 'ready',
          freshness: coreResult.freshness,
          updatedAt: bracketWindow.generatedAt,
        });
      }

      const playerStatsUnavailable = coreResult.payload.competitionKind === 'cup';
      const teamStatsUnavailable = coreResult.payload.competitionKind === 'cup';

      const [
        playerStatsResult,
        teamStatsResult,
        transfersResult,
      ] = await Promise.all([
        resolveSectionSnapshot({
          readStore,
          entityKind: 'competition',
          entityId: params.id,
          scopeKey: heavyScopeKeys.playerStats,
          cacheKey: `competition:playerStats:${params.id}:${heavyScopeKeys.playerStats}`,
          defaultValue: {
            topScorers: [],
            topAssists: [],
            topYellowCards: [],
            topRedCards: [],
          },
          unavailable: playerStatsUnavailable,
          priority: HEAVY_REFRESH_PRIORITY,
          payload: {
            refreshKind: 'heavy',
            section: 'playerStats',
          },
          logger: request.log,
        }),
        resolveSectionSnapshot({
          readStore,
          entityKind: 'competition',
          entityId: params.id,
          scopeKey: heavyScopeKeys.teamStats,
          cacheKey: `competition:teamStats:${params.id}:${heavyScopeKeys.teamStats}`,
          defaultValue: null,
          unavailable: teamStatsUnavailable,
          priority: HEAVY_REFRESH_PRIORITY,
          payload: {
            refreshKind: 'heavy',
            section: 'teamStats',
          },
          logger: request.log,
        }),
        resolveSectionSnapshot({
          readStore,
          entityKind: 'competition',
          entityId: params.id,
          scopeKey: heavyScopeKeys.transfers,
          cacheKey: `competition:transfers:${params.id}:${heavyScopeKeys.transfers}`,
          defaultValue: [],
          priority: HEAVY_REFRESH_PRIORITY,
          payload: {
            refreshKind: 'heavy',
            section: 'transfers',
          },
          logger: request.log,
        }),
      ]);

      const hydration = buildFullPayloadHydration({
        sections: {
          competition: coreHydration,
          competitionKind: coreHydration,
          season: coreHydration,
          standings: coreHydration,
          matches: coreHydration,
          bracket: bracketHydration,
          playerStats: playerStatsResult.hydration,
          teamStats: teamStatsResult.hydration,
          transfers: transfersResult.hydration,
        },
        enqueuedHeavyRefresh:
          playerStatsResult.enqueued ||
          teamStatsResult.enqueued ||
          transfersResult.enqueued,
      });

      return composeCompetitionFullPayload({
        core: coreResult.payload,
        bracket: bracketValue,
        playerStats: playerStatsResult.value,
        teamStats: teamStatsResult.value,
        transfers: transfersResult.value,
        hydration,
      });
    },
  );
}
