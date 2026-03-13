import type { FastifyInstance } from 'fastify';

import { env } from '../../config/env.js';
import { ReadStoreSnapshotInvalidBffError } from '../../lib/readStore/errors.js';
import {
  buildFullPayloadHydration,
  buildHydrationSection,
} from '../../lib/readStore/hydration.js';
import {
  TEAM_ADVANCED_STATS_POLICY,
  TEAM_CORE_POLICY,
  TEAM_SQUAD_POLICY,
  TEAM_STATISTICS_POLICY,
  TEAM_STATS_PLAYERS_POLICY,
  TEAM_TRANSFERS_POLICY,
  TEAM_TROPHIES_POLICY,
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
  buildTeamAdvancedStatsSection,
  buildTeamCoreSnapshot,
  buildTeamSquadSection,
  buildTeamStatisticsSection,
  buildTeamStatsPlayersSection,
  buildTeamTransfersSection,
  buildTeamTrophiesSection,
  composeTeamFullPayload,
  fetchTeamFullPayload,
  splitTeamFullPayload,
  type TeamCoreSnapshotPayload,
  type TeamFullRoutePayload,
} from './fullService.js';
import { teamFullQuerySchema, teamIdParamsSchema } from './schemas.js';

const CORE_REFRESH_PRIORITY = 200;
const HEAVY_REFRESH_PRIORITY = 100;

function validateTeamCoreSnapshot(payload: TeamCoreSnapshotPayload): void {
  const details = payload.details?.response;
  const leagues = payload.leagues?.response;
  const selection = payload.selection;

  if (
    !Array.isArray(details)
    || details.length === 0
    || !Array.isArray(leagues)
    || leagues.length === 0
    || !selection
    || typeof selection.leagueId !== 'string'
    || selection.leagueId.trim().length === 0
    || typeof selection.season !== 'number'
    || !Number.isFinite(selection.season)
  ) {
    throw new ReadStoreSnapshotInvalidBffError({
      entityKind: 'team_core',
      selection,
    });
  }
}

function isValidTeamCoreSnapshot(payload: TeamCoreSnapshotPayload): boolean {
  try {
    validateTeamCoreSnapshot(payload);
    return true;
  } catch {
    return false;
  }
}

function isValidTeamFullPayload(payload: TeamFullRoutePayload): boolean {
  try {
    validateTeamCoreSnapshot(splitTeamFullPayload(payload).core);
    return true;
  } catch {
    return false;
  }
}

function buildRequestedCoreScopeKey(input: {
  leagueId?: string;
  season?: number;
  timezone: string;
  historySeasons?: string;
}): string {
  return buildReadStoreScopeKey({
    section: 'core',
    leagueId: input.leagueId ?? null,
    season: input.season ?? null,
    timezone: input.timezone,
    historySeasons: input.historySeasons ?? null,
  });
}

function buildLegacyFullScopeKey(input: {
  leagueId?: string;
  season?: number;
  timezone: string;
  historySeasons?: string;
}): string {
  return buildReadStoreScopeKey({
    leagueId: input.leagueId ?? null,
    season: input.season ?? null,
    timezone: input.timezone,
    historySeasons: input.historySeasons ?? null,
  });
}

function buildTeamHeavyScopeKeys(core: TeamCoreSnapshotPayload, input: {
  requestedSeason?: number;
}): {
  statistics: string;
  advancedStats: string;
  statsPlayers: string;
  squad: string;
  transfers: string;
  trophies: string;
} {
  const selectedLeagueId = core.selection.leagueId ?? null;
  const selectedSeason = core.selection.season ?? input.requestedSeason ?? null;

  return {
    statistics: buildReadStoreScopeKey({
      section: 'statistics',
      leagueId: selectedLeagueId,
      season: selectedSeason,
    }),
    advancedStats: buildReadStoreScopeKey({
      section: 'advancedStats',
      leagueId: selectedLeagueId,
      season: selectedSeason,
    }),
    statsPlayers: buildReadStoreScopeKey({
      section: 'statsPlayers',
      leagueId: selectedLeagueId,
      season: selectedSeason,
    }),
    squad: buildReadStoreScopeKey({
      section: 'squad',
    }),
    transfers: buildReadStoreScopeKey({
      section: 'transfers',
      season: selectedSeason,
    }),
    trophies: buildReadStoreScopeKey({
      section: 'trophies',
    }),
  };
}

function hasResolvedSelection(core: TeamCoreSnapshotPayload): boolean {
  return (
    typeof core.selection.leagueId === 'string'
    && core.selection.leagueId.trim().length > 0
    && typeof core.selection.season === 'number'
    && Number.isFinite(core.selection.season)
  );
}

async function upsertTeamSectionSnapshotsFromFull(input: {
  readStore: Awaited<ReturnType<typeof getReadStore>>;
  teamId: string;
  requestedCoreScopeKey: string;
  requestedSeason?: number;
  payload: TeamFullRoutePayload;
}): Promise<void> {
  const split = splitTeamFullPayload(input.payload);
  const scopeKeys = buildTeamHeavyScopeKeys(split.core, {
    requestedSeason: input.requestedSeason,
  });

  const coreWindow = buildSnapshotWindow({
    staleAfterMs: TEAM_CORE_POLICY.freshMs,
    expiresAfterMs: TEAM_CORE_POLICY.staleMs,
  });
  const statisticsWindow = buildSnapshotWindow({
    staleAfterMs: TEAM_STATISTICS_POLICY.freshMs,
    expiresAfterMs: TEAM_STATISTICS_POLICY.staleMs,
  });
  const advancedStatsWindow = buildSnapshotWindow({
    staleAfterMs: TEAM_ADVANCED_STATS_POLICY.freshMs,
    expiresAfterMs: TEAM_ADVANCED_STATS_POLICY.staleMs,
  });
  const statsPlayersWindow = buildSnapshotWindow({
    staleAfterMs: TEAM_STATS_PLAYERS_POLICY.freshMs,
    expiresAfterMs: TEAM_STATS_PLAYERS_POLICY.staleMs,
  });
  const squadWindow = buildSnapshotWindow({
    staleAfterMs: TEAM_SQUAD_POLICY.freshMs,
    expiresAfterMs: TEAM_SQUAD_POLICY.staleMs,
  });
  const transfersWindow = buildSnapshotWindow({
    staleAfterMs: TEAM_TRANSFERS_POLICY.freshMs,
    expiresAfterMs: TEAM_TRANSFERS_POLICY.staleMs,
  });
  const trophiesWindow = buildSnapshotWindow({
    staleAfterMs: TEAM_TROPHIES_POLICY.freshMs,
    expiresAfterMs: TEAM_TROPHIES_POLICY.staleMs,
  });

  await Promise.all([
    input.readStore.upsertEntitySnapshot({
      entityKind: 'team',
      entityId: input.teamId,
      scopeKey: input.requestedCoreScopeKey,
      payload: split.core,
      generatedAt: coreWindow.generatedAt,
      staleAt: coreWindow.staleAt,
      expiresAt: coreWindow.expiresAt,
      metadata: {
        route: '/v1/teams/:id/full',
        section: 'core',
        source: 'legacy_backfill',
      },
    }),
    input.readStore.upsertEntitySnapshot({
      entityKind: 'team',
      entityId: input.teamId,
      scopeKey: scopeKeys.statistics,
      payload: split.statistics,
      generatedAt: statisticsWindow.generatedAt,
      staleAt: statisticsWindow.staleAt,
      expiresAt: statisticsWindow.expiresAt,
      metadata: {
        route: '/v1/teams/:id/full',
        section: 'statistics',
        source: 'legacy_backfill',
      },
    }),
    input.readStore.upsertEntitySnapshot({
      entityKind: 'team',
      entityId: input.teamId,
      scopeKey: scopeKeys.advancedStats,
      payload: split.advancedStats,
      generatedAt: advancedStatsWindow.generatedAt,
      staleAt: advancedStatsWindow.staleAt,
      expiresAt: advancedStatsWindow.expiresAt,
      metadata: {
        route: '/v1/teams/:id/full',
        section: 'advancedStats',
        source: 'legacy_backfill',
      },
    }),
    input.readStore.upsertEntitySnapshot({
      entityKind: 'team',
      entityId: input.teamId,
      scopeKey: scopeKeys.statsPlayers,
      payload: split.statsPlayers,
      generatedAt: statsPlayersWindow.generatedAt,
      staleAt: statsPlayersWindow.staleAt,
      expiresAt: statsPlayersWindow.expiresAt,
      metadata: {
        route: '/v1/teams/:id/full',
        section: 'statsPlayers',
        source: 'legacy_backfill',
      },
    }),
    input.readStore.upsertEntitySnapshot({
      entityKind: 'team',
      entityId: input.teamId,
      scopeKey: scopeKeys.squad,
      payload: split.squad,
      generatedAt: squadWindow.generatedAt,
      staleAt: squadWindow.staleAt,
      expiresAt: squadWindow.expiresAt,
      metadata: {
        route: '/v1/teams/:id/full',
        section: 'squad',
        source: 'legacy_backfill',
      },
    }),
    input.readStore.upsertEntitySnapshot({
      entityKind: 'team',
      entityId: input.teamId,
      scopeKey: scopeKeys.transfers,
      payload: split.transfers,
      generatedAt: transfersWindow.generatedAt,
      staleAt: transfersWindow.staleAt,
      expiresAt: transfersWindow.expiresAt,
      metadata: {
        route: '/v1/teams/:id/full',
        section: 'transfers',
        source: 'legacy_backfill',
      },
    }),
    input.readStore.upsertEntitySnapshot({
      entityKind: 'team',
      entityId: input.teamId,
      scopeKey: scopeKeys.trophies,
      payload: split.trophies,
      generatedAt: trophiesWindow.generatedAt,
      staleAt: trophiesWindow.staleAt,
      expiresAt: trophiesWindow.expiresAt,
      metadata: {
        route: '/v1/teams/:id/full',
        section: 'trophies',
        source: 'legacy_backfill',
      },
    }),
  ]);
}

export async function registerTeamFullRoute(app: FastifyInstance): Promise<void> {
  app.get('/v1/teams/:id/full', async request => {
    const params = parseOrThrow(teamIdParamsSchema, request.params);
    const query = parseOrThrow(teamFullQuerySchema, request.query);
    const requestedCoreScopeKey = buildRequestedCoreScopeKey({
      leagueId: query.leagueId,
      season: query.season,
      timezone: query.timezone,
      historySeasons: query.historySeasons,
    });
    const legacyFullScopeKey = buildLegacyFullScopeKey({
      leagueId: query.leagueId,
      season: query.season,
      timezone: query.timezone,
      historySeasons: query.historySeasons,
    });
    const readStore = await getReadStore({
      databaseUrl: env.databaseUrl,
    });

    const coreResult = await readThroughSnapshot({
      cacheKey: `team:core:${params.id}:${requestedCoreScopeKey}`,
      staleAfterMs: TEAM_CORE_POLICY.freshMs,
      expiresAfterMs: TEAM_CORE_POLICY.staleMs,
      logger: request.log,
      getSnapshot: async () => {
        const sectionSnapshot = await readStore.getEntitySnapshot<TeamCoreSnapshotPayload>({
          entityKind: 'team',
          entityId: params.id,
          scopeKey: requestedCoreScopeKey,
        });

        if (
          sectionSnapshot.status !== 'miss'
          && isValidTeamCoreSnapshot(sectionSnapshot.payload)
        ) {
          return sectionSnapshot;
        }

        const legacySnapshot = await readStore.getEntitySnapshot<TeamFullRoutePayload>({
          entityKind: 'team_full',
          entityId: params.id,
          scopeKey: legacyFullScopeKey,
        });
        if (
          legacySnapshot.status !== 'miss'
          && isValidTeamFullPayload(legacySnapshot.payload)
        ) {
          await upsertTeamSectionSnapshotsFromFull({
            readStore,
            teamId: params.id,
            requestedCoreScopeKey,
            requestedSeason: query.season,
            payload: legacySnapshot.payload,
          });

          return {
            status: legacySnapshot.status,
            payload: splitTeamFullPayload(legacySnapshot.payload).core,
          };
        }

        return { status: 'miss' } as const;
      },
      upsertSnapshot: input =>
        readStore.upsertEntitySnapshot({
          entityKind: 'team',
          entityId: params.id,
          scopeKey: requestedCoreScopeKey,
          payload: input.payload,
          generatedAt: input.generatedAt,
          staleAt: input.staleAt,
          expiresAt: input.expiresAt,
          metadata: {
            route: '/v1/teams/:id/full',
            section: 'core',
          },
        }),
      fetchFresh: () =>
        buildTeamCoreSnapshot({
          teamId: params.id,
          leagueId: query.leagueId,
          season: query.season,
          timezone: query.timezone,
          historySeasons: query.historySeasons,
          logger: request.log,
        }),
      isSnapshotPayloadValid: isValidTeamCoreSnapshot,
      validateFreshPayload: validateTeamCoreSnapshot,
      queue: {
        store: readStore,
        target: {
          entityKind: 'team',
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

    const coreSnapshot = await readStore.getEntitySnapshot<TeamCoreSnapshotPayload>({
      entityKind: 'team',
      entityId: params.id,
      scopeKey: requestedCoreScopeKey,
    });
    const coreHydration = buildHydrationSection({
      state: 'ready',
      freshness: coreResult.freshness,
      updatedAt: coreSnapshot.status === 'miss' ? null : coreSnapshot.generatedAt,
    });

    const heavyScopeKeys = buildTeamHeavyScopeKeys(coreResult.payload, {
      requestedSeason: query.season,
    });
    const selectionResolved = hasResolvedSelection(coreResult.payload);

    const [
      statisticsResult,
      advancedStatsResult,
      statsPlayersResult,
      squadResult,
      transfersResult,
      trophiesResult,
    ] = await Promise.all([
      resolveSectionSnapshot({
        readStore,
        entityKind: 'team',
        entityId: params.id,
        scopeKey: heavyScopeKeys.statistics,
        cacheKey: `team:statistics:${params.id}:${heavyScopeKeys.statistics}`,
        defaultValue: { response: null },
        unavailable: !selectionResolved,
        priority: HEAVY_REFRESH_PRIORITY,
        payload: {
          refreshKind: 'heavy',
          section: 'statistics',
        },
        logger: request.log,
      }),
      resolveSectionSnapshot({
        readStore,
        entityKind: 'team',
        entityId: params.id,
        scopeKey: heavyScopeKeys.advancedStats,
        cacheKey: `team:advancedStats:${params.id}:${heavyScopeKeys.advancedStats}`,
        defaultValue: { response: null },
        unavailable: !selectionResolved,
        priority: HEAVY_REFRESH_PRIORITY,
        payload: {
          refreshKind: 'heavy',
          section: 'advancedStats',
        },
        logger: request.log,
      }),
      resolveSectionSnapshot({
        readStore,
        entityKind: 'team',
        entityId: params.id,
        scopeKey: heavyScopeKeys.statsPlayers,
        cacheKey: `team:statsPlayers:${params.id}:${heavyScopeKeys.statsPlayers}`,
        defaultValue: { response: [] },
        unavailable: !selectionResolved,
        priority: HEAVY_REFRESH_PRIORITY,
        payload: {
          refreshKind: 'heavy',
          section: 'statsPlayers',
        },
        logger: request.log,
      }),
      resolveSectionSnapshot({
        readStore,
        entityKind: 'team',
        entityId: params.id,
        scopeKey: heavyScopeKeys.squad,
        cacheKey: `team:squad:${params.id}:${heavyScopeKeys.squad}`,
        defaultValue: { response: [{ players: [], coach: null }] },
        priority: HEAVY_REFRESH_PRIORITY,
        payload: {
          refreshKind: 'heavy',
          section: 'squad',
        },
        logger: request.log,
      }),
      resolveSectionSnapshot({
        readStore,
        entityKind: 'team',
        entityId: params.id,
        scopeKey: heavyScopeKeys.transfers,
        cacheKey: `team:transfers:${params.id}:${heavyScopeKeys.transfers}`,
        defaultValue: { response: [] },
        priority: HEAVY_REFRESH_PRIORITY,
        payload: {
          refreshKind: 'heavy',
          section: 'transfers',
        },
        logger: request.log,
      }),
      resolveSectionSnapshot({
        readStore,
        entityKind: 'team',
        entityId: params.id,
        scopeKey: heavyScopeKeys.trophies,
        cacheKey: `team:trophies:${params.id}:${heavyScopeKeys.trophies}`,
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
        leagues: coreHydration,
        selection: coreHydration,
        overview: coreHydration,
        overviewLeaders: coreHydration,
        standings: coreHydration,
        matches: coreHydration,
        statistics: statisticsResult.hydration,
        advancedStats: advancedStatsResult.hydration,
        statsPlayers: statsPlayersResult.hydration,
        squad: squadResult.hydration,
        transfers: transfersResult.hydration,
        trophies: trophiesResult.hydration,
      },
      enqueuedHeavyRefresh:
        statisticsResult.enqueued ||
        advancedStatsResult.enqueued ||
        statsPlayersResult.enqueued ||
        squadResult.enqueued ||
        transfersResult.enqueued ||
        trophiesResult.enqueued,
    });

    return composeTeamFullPayload({
      core: coreResult.payload,
      statistics: statisticsResult.value,
      advancedStats: advancedStatsResult.value,
      statsPlayers: statsPlayersResult.value,
      squad: squadResult.value,
      transfers: transfersResult.value,
      trophies: trophiesResult.value,
      hydration,
    });
  });
}
