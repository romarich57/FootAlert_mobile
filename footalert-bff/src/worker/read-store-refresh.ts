import type { FastifyBaseLogger } from 'fastify';

import { env } from '../config/env.js';
import type { EntityCacheTtlConfig } from '../config/cacheTtl.js';
import {
  COMPETITION_BRACKET_POLICY,
  COMPETITION_CORE_POLICY,
  COMPETITION_PLAYER_STATS_POLICY,
  COMPETITION_TEAM_STATS_POLICY,
  COMPETITION_TRANSFERS_POLICY,
  COMPETITION_POLICY,
  MATCH_DEFAULT_POLICY,
  PLAYER_CAREER_POLICY,
  PLAYER_CORE_POLICY,
  PLAYER_MATCHES_POLICY,
  PLAYER_STATS_CATALOG_POLICY,
  PLAYER_POLICY,
  PLAYER_TROPHIES_POLICY,
  TEAM_ADVANCED_STATS_POLICY,
  TEAM_CORE_POLICY,
  TEAM_POLICY,
  TEAM_SQUAD_POLICY,
  TEAM_STATISTICS_POLICY,
  TEAM_STATS_PLAYERS_POLICY,
  TEAM_TRANSFERS_POLICY,
  TEAM_TROPHIES_POLICY,
} from '../lib/readStore/policies.js';
import { getSnapshotStore } from '../lib/readStore/runtime.js';
import type { ReadStore, SnapshotRefreshJob } from '../lib/readStore/runtime.js';
import {
  buildCompetitionBracketSection,
  buildCompetitionCoreSnapshot,
  buildCompetitionPlayerStatsSection,
  buildCompetitionTeamStatsSection,
  buildCompetitionTransfersSection,
  type CompetitionCoreSnapshotPayload,
} from '../routes/competitions/fullService.js';
import {
  buildPlayerCareerSection,
  buildPlayerCoreSnapshot,
  buildPlayerMatchesSection,
  buildPlayerStatsCatalogSection,
  buildPlayerTrophiesSection,
  type PlayerCoreSnapshotPayload,
} from '../routes/players/fullService.js';
import {
  buildTeamAdvancedStatsSection,
  buildTeamCoreSnapshot,
  buildTeamSquadSection,
  buildTeamStatisticsSection,
  buildTeamStatsPlayersSection,
  buildTeamTransfersSection,
  buildTeamTrophiesSection,
  type TeamCoreSnapshotPayload,
} from '../routes/teams/fullService.js';
import {
  hashSensitiveValue,
  logWorker,
  parseOptionalNumber,
  parseOptionalText,
  resolveDateInTimezone,
  resolveSeasonFromDate,
  type TeamFullWorkerLogger,
} from './shared.js';
import {
  BOOTSTRAP_DEFAULT_DISCOVERY_LIMIT,
  extractPlayerSeedEntriesFromCompetitionPayload,
  extractPlayerSeedEntriesFromTeamPayload,
  extractTeamSeedEntriesFromCompetitionPayload,
  HOTSET_COMPETITION_IDS,
  isCompetitionFullPayloadComplete,
  isMatchFullPayloadComplete,
  isPlayerFullPayloadComplete,
  isTeamFullPayloadComplete,
  persistWorkerMatchOverlay,
  READ_STORE_BOOTSTRAP_WARM_INTERVAL_MS,
  READ_STORE_DEFAULT_TIMEZONE,
  READ_STORE_REFRESH_CLAIM_LIMIT,
  type PlayerSeedEntry,
  type ReadStoreRefreshServices,
  resolveReadStoreRefreshServices,
  type TeamSeedEntry,
} from './read-store-refresh-support.js';

export {
  HOTSET_COMPETITION_IDS,
  READ_STORE_BOOTSTRAP_WARM_INTERVAL_MS,
  READ_STORE_DEFAULT_TIMEZONE,
} from './read-store-refresh-support.js';
export const READ_STORE_REFRESH_POLL_INTERVAL_MS = 30_000;

type WorkerHeartbeatStore = {
  upsertWorkerHeartbeat: (input: {
    workerId: string;
    seenAt: Date;
    metadata?: Record<string, unknown> | null;
  }) => Promise<void>;
};

export function createReadStoreRefreshRuntime(input: {
  readStore: ReadStore;
  logger: TeamFullWorkerLogger;
  cacheTtl: EntityCacheTtlConfig;
  services?: Partial<ReadStoreRefreshServices>;
  workerId?: string;
  heartbeatStore?: WorkerHeartbeatStore;
}) {
  const services = resolveReadStoreRefreshServices(input.services);
  const workerId = input.workerId ?? `read-store-worker-${process.pid}`;
  const heartbeatStorePromise = input.heartbeatStore
    ? Promise.resolve(input.heartbeatStore)
    : getSnapshotStore({
        backend: env.databaseUrl ? 'postgres' : 'memory',
        databaseUrl: env.databaseUrl,
      });

  const policyWindow = (policy: { freshMs: number; staleMs: number }) =>
    services.buildSnapshotWindow({
      staleAfterMs: policy.freshMs,
      expiresAfterMs: policy.staleMs,
    });

  async function publishWorkerHeartbeat(source = 'read_store_refresh_cycle'): Promise<void> {
    try {
      const heartbeatStore = await heartbeatStorePromise;
      await heartbeatStore.upsertWorkerHeartbeat({
        workerId,
        seenAt: new Date(),
        metadata: {
          source,
          pid: process.pid,
          nodeRole: env.nodeRole,
        },
      });
    } catch (error) {
      logWorker('error', 'read_store_heartbeat_failed', {
        workerId,
        source,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function assertCompleteSnapshot(
    entityKind: 'competition_full' | 'team_full' | 'player_full' | 'match_full',
    payload: unknown,
  ): void {
    const isComplete =
      entityKind === 'competition_full'
        ? isCompetitionFullPayloadComplete(payload as never)
        : entityKind === 'team_full'
          ? isTeamFullPayloadComplete(payload as never)
          : entityKind === 'player_full'
            ? isPlayerFullPayloadComplete(payload as never)
            : isMatchFullPayloadComplete(payload as never);

    if (!isComplete) {
      throw new Error(`${entityKind} snapshot is incomplete`);
    }
  }

  async function getFreshEntitySnapshotPayload<TPayload>(inputSnapshot: {
    entityKind: 'competition_full' | 'team_full' | 'player_full';
    entityId: string;
    scopeKey: string;
    validate: (payload: TPayload) => boolean;
  }): Promise<TPayload | null> {
    const snapshot = await input.readStore.getEntitySnapshot<TPayload>({
      entityKind: inputSnapshot.entityKind,
      entityId: inputSnapshot.entityId,
      scopeKey: inputSnapshot.scopeKey,
    });
    if (snapshot.status !== 'fresh' || !inputSnapshot.validate(snapshot.payload)) {
      return null;
    }

    return snapshot.payload;
  }

  function readJobPayloadText(
    job: SnapshotRefreshJob,
    key: string,
  ): string | null {
    const value = job.payload?.[key];
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
  }

  function readJobSection(
    job: SnapshotRefreshJob,
    scope: Record<string, string>,
  ): string | null {
    return readJobPayloadText(job, 'section') ?? parseOptionalText(scope.section) ?? null;
  }

  function assertTeamCoreSnapshotComplete(payload: TeamCoreSnapshotPayload): void {
    if (
      !Array.isArray(payload.details.response)
      || payload.details.response.length === 0
      || !Array.isArray(payload.leagues.response)
      || payload.leagues.response.length === 0
      || payload.selection.leagueId === null
      || payload.selection.season === null
    ) {
      throw new Error('team core snapshot is incomplete');
    }
  }

  function assertPlayerCoreSnapshotComplete(payload: PlayerCoreSnapshotPayload): void {
    if (
      !Array.isArray(payload.details.response)
      || payload.details.response.length === 0
      || !Array.isArray(payload.seasons.response)
      || payload.seasons.response.length === 0
      || payload.overview.response == null
    ) {
      throw new Error('player core snapshot is incomplete');
    }
  }

  function assertCompetitionCoreSnapshotComplete(
    payload: CompetitionCoreSnapshotPayload,
  ): void {
    if (payload.competition == null || !Number.isFinite(payload.season)) {
      throw new Error('competition core snapshot is incomplete');
    }
  }

  async function upsertSectionSnapshot(inputSnapshot: {
    entityKind: 'team' | 'player' | 'competition';
    entityId: string;
    scopeKey: string;
    section: string;
    payload: unknown;
    policy: { freshMs: number; staleMs: number };
  }): Promise<void> {
    const window = policyWindow(inputSnapshot.policy);
    await input.readStore.upsertEntitySnapshot({
      entityKind: inputSnapshot.entityKind,
      entityId: inputSnapshot.entityId,
      scopeKey: inputSnapshot.scopeKey,
      payload: inputSnapshot.payload,
      metadata: {
        source: 'worker.refresh',
        section: inputSnapshot.section,
      },
      ...window,
    });
  }

  async function getOrBuildCompetitionCoreSnapshot(inputSnapshot: {
    competitionId: string;
    season?: number;
  }): Promise<CompetitionCoreSnapshotPayload> {
    const coreScopeKey = services.buildReadStoreScopeKey({
      section: 'core',
      season: inputSnapshot.season ?? null,
    });
    const snapshot = await input.readStore.getEntitySnapshot<CompetitionCoreSnapshotPayload>({
      entityKind: 'competition',
      entityId: inputSnapshot.competitionId,
      scopeKey: coreScopeKey,
    });

    if (snapshot.status !== 'miss') {
      assertCompetitionCoreSnapshotComplete(snapshot.payload);
      return snapshot.payload;
    }

    const payload = await buildCompetitionCoreSnapshot(
      inputSnapshot.competitionId,
      inputSnapshot.season,
    );
    assertCompetitionCoreSnapshotComplete(payload);
    await upsertSectionSnapshot({
      entityKind: 'competition',
      entityId: inputSnapshot.competitionId,
      scopeKey: coreScopeKey,
      section: 'core',
      payload,
      policy: COMPETITION_CORE_POLICY,
    });
    return payload;
  }

  async function refreshSectionedEntityJob(
    job: SnapshotRefreshJob,
    scope: Record<string, string>,
  ): Promise<boolean> {
    const section = readJobSection(job, scope);
    if (!section) {
      return false;
    }

    if (job.entityKind === 'team') {
      if (section === 'core') {
        const timezone = parseOptionalText(scope.timezone);
        if (!timezone) {
          throw new Error(`team core scope missing timezone for job ${job.id}`);
        }

        const payload = await buildTeamCoreSnapshot({
          teamId: job.entityId,
          leagueId: parseOptionalText(scope.leagueId) ?? undefined,
          season: parseOptionalNumber(scope.season) ?? undefined,
          timezone,
          historySeasons: parseOptionalText(scope.historySeasons) ?? undefined,
          logger: input.logger as unknown as FastifyBaseLogger,
        });
        assertTeamCoreSnapshotComplete(payload);
        await upsertSectionSnapshot({
          entityKind: 'team',
          entityId: job.entityId,
          scopeKey: job.scopeKey,
          section,
          payload,
          policy: TEAM_CORE_POLICY,
        });
        return true;
      }

      const selection = {
        leagueId: parseOptionalText(scope.leagueId) ?? null,
        season: parseOptionalNumber(scope.season) ?? null,
      };

      if (section === 'statistics') {
        await upsertSectionSnapshot({
          entityKind: 'team',
          entityId: job.entityId,
          scopeKey: job.scopeKey,
          section,
          payload: await buildTeamStatisticsSection({
            teamId: job.entityId,
            selection,
          }),
          policy: TEAM_STATISTICS_POLICY,
        });
        return true;
      }

      if (section === 'advancedStats') {
        await upsertSectionSnapshot({
          entityKind: 'team',
          entityId: job.entityId,
          scopeKey: job.scopeKey,
          section,
          payload: await buildTeamAdvancedStatsSection({
            teamId: job.entityId,
            selection,
          }),
          policy: TEAM_ADVANCED_STATS_POLICY,
        });
        return true;
      }

      if (section === 'statsPlayers') {
        await upsertSectionSnapshot({
          entityKind: 'team',
          entityId: job.entityId,
          scopeKey: job.scopeKey,
          section,
          payload: await buildTeamStatsPlayersSection({
            teamId: job.entityId,
            selection,
          }),
          policy: TEAM_STATS_PLAYERS_POLICY,
        });
        return true;
      }

      if (section === 'squad') {
        await upsertSectionSnapshot({
          entityKind: 'team',
          entityId: job.entityId,
          scopeKey: job.scopeKey,
          section,
          payload: await buildTeamSquadSection({
            teamId: job.entityId,
          }),
          policy: TEAM_SQUAD_POLICY,
        });
        return true;
      }

      if (section === 'transfers') {
        await upsertSectionSnapshot({
          entityKind: 'team',
          entityId: job.entityId,
          scopeKey: job.scopeKey,
          section,
          payload: await buildTeamTransfersSection({
            teamId: job.entityId,
            selection,
            requestedSeason: parseOptionalNumber(scope.season) ?? undefined,
          }),
          policy: TEAM_TRANSFERS_POLICY,
        });
        return true;
      }

      if (section === 'trophies') {
        await upsertSectionSnapshot({
          entityKind: 'team',
          entityId: job.entityId,
          scopeKey: job.scopeKey,
          section,
          payload: await buildTeamTrophiesSection({
            teamId: job.entityId,
            logger: input.logger as unknown as FastifyBaseLogger,
          }),
          policy: TEAM_TROPHIES_POLICY,
        });
        return true;
      }
    }

    if (job.entityKind === 'player') {
      if (section === 'core') {
        const season = parseOptionalNumber(scope.season);
        if (!season) {
          throw new Error(`player core scope missing season for job ${job.id}`);
        }

        const payload = await buildPlayerCoreSnapshot({
          playerId: job.entityId,
          season,
        });
        assertPlayerCoreSnapshotComplete(payload);
        await upsertSectionSnapshot({
          entityKind: 'player',
          entityId: job.entityId,
          scopeKey: job.scopeKey,
          section,
          payload,
          policy: PLAYER_CORE_POLICY,
        });
        return true;
      }

      if (section === 'matches') {
        const season = parseOptionalNumber(scope.season);
        if (!season) {
          throw new Error(`player matches scope missing season for job ${job.id}`);
        }

        const payload = await buildPlayerMatchesSection({
          playerId: job.entityId,
          season,
          core: {
            details: { response: [] },
            seasons: { response: [] },
            overview: {
              response: {
                profile: {
                  team: {
                    id: parseOptionalText(scope.teamId),
                  },
                },
              },
            },
          } as PlayerCoreSnapshotPayload,
        });
        await upsertSectionSnapshot({
          entityKind: 'player',
          entityId: job.entityId,
          scopeKey: job.scopeKey,
          section,
          payload,
          policy: PLAYER_MATCHES_POLICY,
        });
        return true;
      }

      if (section === 'statsCatalog') {
        await upsertSectionSnapshot({
          entityKind: 'player',
          entityId: job.entityId,
          scopeKey: job.scopeKey,
          section,
          payload: await buildPlayerStatsCatalogSection({
            playerId: job.entityId,
          }),
          policy: PLAYER_STATS_CATALOG_POLICY,
        });
        return true;
      }

      if (section === 'career') {
        await upsertSectionSnapshot({
          entityKind: 'player',
          entityId: job.entityId,
          scopeKey: job.scopeKey,
          section,
          payload: await buildPlayerCareerSection({
            playerId: job.entityId,
          }),
          policy: PLAYER_CAREER_POLICY,
        });
        return true;
      }

      if (section === 'trophies') {
        await upsertSectionSnapshot({
          entityKind: 'player',
          entityId: job.entityId,
          scopeKey: job.scopeKey,
          section,
          payload: await buildPlayerTrophiesSection({
            playerId: job.entityId,
          }),
          policy: PLAYER_TROPHIES_POLICY,
        });
        return true;
      }
    }

    if (job.entityKind === 'competition') {
      if (section === 'core') {
        const payload = await buildCompetitionCoreSnapshot(
          job.entityId,
          parseOptionalNumber(scope.season) ?? undefined,
        );
        assertCompetitionCoreSnapshotComplete(payload);
        await upsertSectionSnapshot({
          entityKind: 'competition',
          entityId: job.entityId,
          scopeKey: job.scopeKey,
          section,
          payload,
          policy: COMPETITION_CORE_POLICY,
        });
        return true;
      }

      const season = parseOptionalNumber(scope.season) ?? undefined;
      const core = await getOrBuildCompetitionCoreSnapshot({
        competitionId: job.entityId,
        season,
      });

      if (section === 'bracket') {
        await upsertSectionSnapshot({
          entityKind: 'competition',
          entityId: job.entityId,
          scopeKey: job.scopeKey,
          section,
          payload: await buildCompetitionBracketSection({
            core,
          }),
          policy: COMPETITION_BRACKET_POLICY,
        });
        return true;
      }

      if (section === 'playerStats') {
        await upsertSectionSnapshot({
          entityKind: 'competition',
          entityId: job.entityId,
          scopeKey: job.scopeKey,
          section,
          payload: await buildCompetitionPlayerStatsSection({
            competitionId: job.entityId,
            core,
          }),
          policy: COMPETITION_PLAYER_STATS_POLICY,
        });
        return true;
      }

      if (section === 'teamStats') {
        await upsertSectionSnapshot({
          entityKind: 'competition',
          entityId: job.entityId,
          scopeKey: job.scopeKey,
          section,
          payload: await buildCompetitionTeamStatsSection({
            competitionId: job.entityId,
            core,
          }),
          policy: COMPETITION_TEAM_STATS_POLICY,
        });
        return true;
      }

      if (section === 'transfers') {
        await upsertSectionSnapshot({
          entityKind: 'competition',
          entityId: job.entityId,
          scopeKey: job.scopeKey,
          section,
          payload: await buildCompetitionTransfersSection({
            competitionId: job.entityId,
            core,
          }),
          policy: COMPETITION_TRANSFERS_POLICY,
        });
        return true;
      }
    }

    return false;
  }

  async function refreshSnapshotForJob(job: SnapshotRefreshJob): Promise<void> {
    if (job.entityKind === 'bootstrap') {
      const parsedScope = services.parseBootstrapScopeKey(job.scopeKey);
      if (!parsedScope) {
        throw new Error(`Invalid bootstrap scope key: ${job.scopeKey}`);
      }

      const payload = await services.buildBootstrapPayload({
        date: parsedScope.date,
        timezone: parsedScope.timezone,
        season: parsedScope.season,
        followedTeamIds: parsedScope.followedTeamIds,
        followedPlayerIds: parsedScope.followedPlayerIds,
        discoveryLimit: parsedScope.discoveryLimit,
        logger: input.logger as unknown as FastifyBaseLogger,
      });
      const window = services.buildSnapshotWindow({
        staleAfterMs: READ_STORE_BOOTSTRAP_WARM_INTERVAL_MS,
        expiresAfterMs: READ_STORE_BOOTSTRAP_WARM_INTERVAL_MS * 6,
      });

      await input.readStore.upsertBootstrapSnapshot({
        scopeKey: job.scopeKey,
        payload,
        generatedAt: window.generatedAt,
        staleAt: window.staleAt,
        expiresAt: window.expiresAt,
        metadata: { source: 'worker.refresh' },
      });
      return;
    }

    const scope = services.decodeReadStoreScopeKey(job.scopeKey);

    if (await refreshSectionedEntityJob(job, scope)) {
      return;
    }

    if (job.entityKind === 'team_full') {
      const timezone = parseOptionalText(scope.timezone);
      if (!timezone) {
        throw new Error(`team_full scope missing timezone for job ${job.id}`);
      }

      const payload = await services.fetchTeamFullPayload({
        teamId: job.entityId,
        leagueId: parseOptionalText(scope.leagueId),
        season: parseOptionalNumber(scope.season),
        timezone,
        historySeasons: parseOptionalText(scope.historySeasons),
        logger: input.logger as unknown as FastifyBaseLogger,
      });
      assertCompleteSnapshot('team_full', payload);

      await input.readStore.upsertEntitySnapshot({
        entityKind: job.entityKind,
        entityId: job.entityId,
        scopeKey: job.scopeKey,
        payload,
        metadata: { source: 'worker.refresh' },
        ...policyWindow(TEAM_POLICY),
      });
      return;
    }

    if (job.entityKind === 'player_full') {
      const season = parseOptionalNumber(scope.season);
      if (!season) {
        throw new Error(`player_full scope missing season for job ${job.id}`);
      }

      const payload = await services.fetchPlayerFullPayload({
        playerId: job.entityId,
        season,
      });
      assertCompleteSnapshot('player_full', payload);

      await input.readStore.upsertEntitySnapshot({
        entityKind: job.entityKind,
        entityId: job.entityId,
        scopeKey: job.scopeKey,
        payload,
        metadata: { source: 'worker.refresh' },
        ...policyWindow(PLAYER_POLICY),
      });
      return;
    }

    if (job.entityKind === 'competition_full') {
      const payload = await services.buildCompetitionFullResponse(
        job.entityId,
        parseOptionalNumber(scope.season),
      );
      assertCompleteSnapshot('competition_full', payload);

      await input.readStore.upsertEntitySnapshot({
        entityKind: job.entityKind,
        entityId: job.entityId,
        scopeKey: job.scopeKey,
        payload,
        metadata: { source: 'worker.refresh' },
        ...policyWindow(COMPETITION_POLICY),
      });
      return;
    }

    if (job.entityKind === 'match_full') {
      const timezone = parseOptionalText(scope.timezone);
      if (!timezone) {
        throw new Error(`match_full scope missing timezone for job ${job.id}`);
      }

      const payload = await services.buildMatchFullResponse(job.entityId, timezone);
      assertCompleteSnapshot('match_full', payload);
      await input.readStore.upsertEntitySnapshot({
        entityKind: job.entityKind,
        entityId: job.entityId,
        scopeKey: job.scopeKey,
        payload,
        metadata: { source: 'worker.refresh' },
        ...policyWindow(MATCH_DEFAULT_POLICY),
      });
      await persistWorkerMatchOverlay({
        readStore: input.readStore,
        services,
        matchId: job.entityId,
        payload,
      });
      return;
    }

    throw new Error(`Unsupported refresh entity kind: ${job.entityKind}`);
  }

  async function warmBootstrapSnapshot(): Promise<void> {
    await publishWorkerHeartbeat('read_store_bootstrap_warm');

    const date = resolveDateInTimezone(READ_STORE_DEFAULT_TIMEZONE);
    const season = resolveSeasonFromDate(date);
    const window = services.buildSnapshotWindow({
      staleAfterMs: READ_STORE_BOOTSTRAP_WARM_INTERVAL_MS,
      expiresAfterMs: READ_STORE_BOOTSTRAP_WARM_INTERVAL_MS * 6,
    });

    await input.readStore.upsertBootstrapSnapshot({
      scopeKey: services.buildBootstrapScopeKey({
        date,
        timezone: READ_STORE_DEFAULT_TIMEZONE,
        season,
        discoveryLimit: BOOTSTRAP_DEFAULT_DISCOVERY_LIMIT,
        followedPlayerIds: [],
        followedTeamIds: [],
      }),
      payload: await services.buildBootstrapPayload({
        date,
        timezone: READ_STORE_DEFAULT_TIMEZONE,
        season,
        followedTeamIds: [],
        followedPlayerIds: [],
        discoveryLimit: BOOTSTRAP_DEFAULT_DISCOVERY_LIMIT,
      }),
      generatedAt: window.generatedAt,
      staleAt: window.staleAt,
      expiresAt: window.expiresAt,
      metadata: { source: 'worker.warm' },
    });
  }

  async function warmHotset(): Promise<void> {
    const date = resolveDateInTimezone(READ_STORE_DEFAULT_TIMEZONE);
    const season = resolveSeasonFromDate(date);
    const competitionScopeKey = services.buildReadStoreScopeKey({ season: String(season) });
    const teamEntries = new Map<string, TeamSeedEntry>();
    const playerEntries = new Map<string, PlayerSeedEntry>();

    logWorker('info', 'hotset_warm_start', {
      competitionCount: HOTSET_COMPETITION_IDS.length,
      date,
      season,
    });

    let warmedCompetitions = 0;
    let failedCompetitions = 0;
    let warmedTeams = 0;
    let failedTeams = 0;
    let warmedPlayers = 0;
    let failedPlayers = 0;

    for (let i = 0; i < HOTSET_COMPETITION_IDS.length; i += 3) {
      await publishWorkerHeartbeat('read_store_hotset_competitions');
      const results = await Promise.allSettled(
        HOTSET_COMPETITION_IDS.slice(i, i + 3).map(async competitionId => {
          const freshSnapshot = await getFreshEntitySnapshotPayload({
            entityKind: 'competition_full',
            entityId: competitionId,
            scopeKey: competitionScopeKey,
            validate: isCompetitionFullPayloadComplete,
          });
          const payload = freshSnapshot
            ?? await services.buildCompetitionFullResponse(competitionId, season);

          if (!freshSnapshot) {
            assertCompleteSnapshot('competition_full', payload);
            const window = services.buildSnapshotWindow({
              staleAfterMs: COMPETITION_POLICY.freshMs,
              expiresAfterMs: COMPETITION_POLICY.staleMs,
            });
            await input.readStore.upsertEntitySnapshot({
              entityKind: 'competition_full',
              entityId: competitionId,
              scopeKey: competitionScopeKey,
              payload,
              generatedAt: window.generatedAt,
              staleAt: window.staleAt,
              expiresAt: window.expiresAt,
              metadata: { source: 'worker.hotset_warm' },
            });
          }

          return {
            fromSnapshot: Boolean(freshSnapshot),
            teams: extractTeamSeedEntriesFromCompetitionPayload(payload, competitionId, season),
            players: extractPlayerSeedEntriesFromCompetitionPayload(payload, season),
          };
        }),
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          if (result.value.fromSnapshot) {
            // Snapshot déjà frais: aucune réécriture nécessaire.
          } else {
            warmedCompetitions++;
          }
          for (const entry of result.value.teams) {
            teamEntries.set(`${entry.teamId}:${entry.leagueId}:${entry.season}`, entry);
          }
          for (const entry of result.value.players) {
            playerEntries.set(`${entry.playerId}:${entry.season}`, entry);
          }
        } else {
          failedCompetitions++;
          logWorker('error', 'hotset_warm_competition_failed', {
            error: result.reason instanceof Error ? result.reason.message : String(result.reason),
          });
        }
      }
    }

    const orderedTeamEntries = Array.from(teamEntries.values());
    for (let i = 0; i < orderedTeamEntries.length; i += 3) {
      await publishWorkerHeartbeat('read_store_hotset_teams');
      const results = await Promise.allSettled(
        orderedTeamEntries.slice(i, i + 3).map(async entry => {
          const teamScopeKey = services.buildReadStoreScopeKey({
            leagueId: entry.leagueId,
            season: String(entry.season),
            timezone: READ_STORE_DEFAULT_TIMEZONE,
          });
          const freshSnapshot = await getFreshEntitySnapshotPayload({
            entityKind: 'team_full',
            entityId: entry.teamId,
            scopeKey: teamScopeKey,
            validate: isTeamFullPayloadComplete,
          });
          const payload = freshSnapshot
            ?? await services.fetchTeamFullPayload({
              teamId: entry.teamId,
              leagueId: entry.leagueId,
              season: entry.season,
              timezone: READ_STORE_DEFAULT_TIMEZONE,
              logger: input.logger as unknown as FastifyBaseLogger,
            });

          if (!freshSnapshot) {
            assertCompleteSnapshot('team_full', payload);
            const window = services.buildSnapshotWindow({
              staleAfterMs: TEAM_POLICY.freshMs,
              expiresAfterMs: TEAM_POLICY.staleMs,
            });
            await input.readStore.upsertEntitySnapshot({
              entityKind: 'team_full',
              entityId: entry.teamId,
              scopeKey: teamScopeKey,
              payload,
              generatedAt: window.generatedAt,
              staleAt: window.staleAt,
              expiresAt: window.expiresAt,
              metadata: { source: 'worker.hotset_warm' },
            });
          }

          return {
            fromSnapshot: Boolean(freshSnapshot),
            players: extractPlayerSeedEntriesFromTeamPayload(payload, entry.season),
          };
        }),
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          if (!result.value.fromSnapshot) {
            warmedTeams++;
          }
          for (const entry of result.value.players) {
            playerEntries.set(`${entry.playerId}:${entry.season}`, entry);
          }
        } else {
          failedTeams++;
          logWorker('error', 'hotset_warm_team_failed', {
            error: result.reason instanceof Error ? result.reason.message : String(result.reason),
          });
        }
      }
    }

    const orderedPlayerEntries = Array.from(playerEntries.values());
    for (let i = 0; i < orderedPlayerEntries.length; i += 5) {
      await publishWorkerHeartbeat('read_store_hotset_players');
      const results = await Promise.allSettled(
        orderedPlayerEntries.slice(i, i + 5).map(async entry => {
          const playerScopeKey = services.buildReadStoreScopeKey({
            season: String(entry.season),
          });
          const freshSnapshot = await getFreshEntitySnapshotPayload({
            entityKind: 'player_full',
            entityId: entry.playerId,
            scopeKey: playerScopeKey,
            validate: isPlayerFullPayloadComplete,
          });
          const payload = freshSnapshot
            ?? await services.fetchPlayerFullPayload({
              playerId: entry.playerId,
              season: entry.season,
            });

          if (!freshSnapshot) {
            assertCompleteSnapshot('player_full', payload);
            const window = services.buildSnapshotWindow({
              staleAfterMs: PLAYER_POLICY.freshMs,
              expiresAfterMs: PLAYER_POLICY.staleMs,
            });
            await input.readStore.upsertEntitySnapshot({
              entityKind: 'player_full',
              entityId: entry.playerId,
              scopeKey: playerScopeKey,
              payload,
              generatedAt: window.generatedAt,
              staleAt: window.staleAt,
              expiresAt: window.expiresAt,
              metadata: { source: 'worker.hotset_warm' },
            });
          }

          return {
            fromSnapshot: Boolean(freshSnapshot),
          };
        }),
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          if (!result.value.fromSnapshot) {
            warmedPlayers++;
          }
        } else {
          failedPlayers++;
          logWorker('error', 'hotset_warm_player_failed', {
            error: result.reason instanceof Error ? result.reason.message : String(result.reason),
          });
        }
      }
    }

    try {
      await warmBootstrapSnapshot();
    } catch (error) {
      logWorker('error', 'hotset_warm_bootstrap_failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    logWorker('info', 'hotset_warm_complete', {
      warmedCompetitions,
      failedCompetitions,
      warmedTeams,
      failedTeams,
      warmedPlayers,
      failedPlayers,
      discoveredTeams: orderedTeamEntries.length,
      discoveredPlayers: orderedPlayerEntries.length,
      totalCompetitions: HOTSET_COMPETITION_IDS.length,
    });
  }

  async function processSnapshotRefreshQueue(): Promise<void> {
    await publishWorkerHeartbeat('read_store_refresh_cycle');

    const claimedJobs = await input.readStore.claimRefreshJobs({
      limit: READ_STORE_REFRESH_CLAIM_LIMIT,
      workerId,
    });

    for (const job of claimedJobs) {
      try {
        await refreshSnapshotForJob(job);
        await input.readStore.completeRefreshJob({ jobId: job.id });
        await publishWorkerHeartbeat('read_store_refresh_cycle');
      } catch (error) {
        await input.readStore.failRefreshJob({
          jobId: job.id,
          error: error instanceof Error ? error.message : String(error),
        });
        logWorker('error', 'read_store_refresh_failed', {
          jobId: job.id,
          entityKind: job.entityKind,
          entityId: hashSensitiveValue(job.entityId),
          error: error instanceof Error ? error.message : String(error),
        });
        await publishWorkerHeartbeat('read_store_refresh_cycle');
      }
    }
  }

  return {
    workerId,
    publishWorkerHeartbeat,
    processSnapshotRefreshQueue,
    refreshSnapshotForJob,
    warmBootstrapSnapshot,
    warmHotset,
  };
}
