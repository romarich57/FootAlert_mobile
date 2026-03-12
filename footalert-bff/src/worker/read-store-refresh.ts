import type { FastifyBaseLogger } from 'fastify';

import { env } from '../config/env.js';
import type { EntityCacheTtlConfig } from '../config/cacheTtl.js';
import {
  COMPETITION_POLICY,
  MATCH_DEFAULT_POLICY,
  PLAYER_POLICY,
  TEAM_POLICY,
} from '../lib/readStore/policies.js';
import { getSnapshotStore } from '../lib/readStore/runtime.js';
import type { ReadStore, SnapshotRefreshJob } from '../lib/readStore/runtime.js';
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
