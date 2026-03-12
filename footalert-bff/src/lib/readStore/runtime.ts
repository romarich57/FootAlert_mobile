import type {
  SnapshotRecord,
  SnapshotRefreshTask,
  SnapshotRefreshTaskInput,
  ReadStoreStatusSnapshot,
  SnapshotStore,
} from './snapshotStore.js';
import { createSnapshotStore } from './snapshotStore.js';

type RefreshTaskKind =
  | 'bootstrap'
  | 'team'
  | 'player'
  | 'competition'
  | 'match'
  | 'match_live';

export type ReadStoreSnapshotStatus = 'fresh' | 'stale' | 'expired' | 'miss';

export type ReadStoreSnapshot<TPayload = unknown> =
  | {
      status: 'miss';
    }
  | {
      status: Exclude<ReadStoreSnapshotStatus, 'miss'>;
      payload: TPayload;
      generatedAt: Date | null;
      staleAt: Date | null;
      expiresAt: Date | null;
      metadata: Record<string, unknown> | null;
    };

export type SnapshotRefreshBacklog = {
  queued: number;
  inProgress: number;
  failed: number;
  total: number;
};

export type SnapshotRefreshJob = {
  id: string;
  entityKind: string;
  entityId: string;
  scopeKey: string;
  attempts: number;
  lastError: string | null;
  payload: Record<string, unknown> | null;
};

export type ReadStore = {
  backend: 'memory' | 'postgres';
  getEntitySnapshot: <TPayload = unknown>(input: {
    entityKind: string;
    entityId: string;
    scopeKey?: string | null;
    now?: Date;
  }) => Promise<ReadStoreSnapshot<TPayload>>;
  upsertEntitySnapshot: (input: {
    entityKind: string;
    entityId: string;
    scopeKey?: string | null;
    payload: unknown;
    generatedAt: Date;
    staleAt: Date;
    expiresAt: Date;
    metadata?: Record<string, unknown> | null;
  }) => Promise<void>;
  getBootstrapSnapshot: <TPayload = unknown>(input: {
    scopeKey: string;
    now?: Date;
  }) => Promise<ReadStoreSnapshot<TPayload>>;
  upsertBootstrapSnapshot: (input: {
    scopeKey: string;
    payload: unknown;
    generatedAt: Date;
    staleAt: Date;
    expiresAt: Date;
    metadata?: Record<string, unknown> | null;
  }) => Promise<void>;
  getMatchLiveOverlay: <TPayload = unknown>(input: {
    matchId: string;
    now?: Date;
  }) => Promise<ReadStoreSnapshot<TPayload>>;
  upsertMatchLiveOverlay: (input: {
    matchId: string;
    payload: unknown;
    generatedAt: Date;
    staleAt: Date;
    expiresAt: Date;
    metadata?: Record<string, unknown> | null;
  }) => Promise<void>;
  enqueueRefresh: (input: {
    entityKind: string;
    entityId: string;
    scopeKey?: string | null;
    priority?: number;
    notBefore?: Date;
    payload?: Record<string, unknown> | null;
  }) => Promise<void>;
  claimRefreshJobs: (input: {
    limit: number;
    workerId: string;
    leaseForMs?: number;
  }) => Promise<SnapshotRefreshJob[]>;
  completeRefreshJob: (input: {
    jobId: string;
    nextAttemptAt?: Date;
  }) => Promise<void>;
  failRefreshJob: (input: {
    jobId: string;
    error: string;
    nextAttemptAt?: Date;
  }) => Promise<void>;
  countRefreshBacklog: () => Promise<SnapshotRefreshBacklog>;
  upsertWorkerHeartbeat: (input: {
    workerId: string;
    seenAt: Date;
    metadata?: Record<string, unknown> | null;
  }) => Promise<void>;
  getStatusSnapshot: (now?: Date) => Promise<ReadStoreStatusSnapshot>;
  deleteExpiredSnapshots: (now?: Date) => Promise<number>;
  deleteStaleHeartbeats: (staleBefore: Date) => Promise<number>;
  close: () => Promise<void>;
};

let snapshotStorePromise: Promise<SnapshotStore> | null = null;
let snapshotStoreConfigKey: string | null = null;

function buildConfigKey(options: {
  backend: 'memory' | 'postgres';
  databaseUrl: string | null;
}): string {
  return `${options.backend}:${options.databaseUrl ?? ''}`;
}

function normalizeScopeKey(scopeKey: string | null | undefined): string {
  const normalized = scopeKey?.trim();
  return normalized && normalized.length > 0 ? normalized : '';
}

function mapSnapshotRecord<TPayload>(
  snapshot: SnapshotRecord<unknown> | null,
): ReadStoreSnapshot<TPayload> {
  if (!snapshot) {
    return { status: 'miss' };
  }

  return {
    status: snapshot.freshness,
    payload: snapshot.payload as TPayload,
    generatedAt: snapshot.lastSourceSyncAt,
    staleAt: snapshot.freshUntil,
    expiresAt: snapshot.staleUntil,
    metadata: null,
  };
}

function resolveTaskKind(entityKind: string): RefreshTaskKind {
  if (entityKind === 'bootstrap') {
    return 'bootstrap';
  }
  if (entityKind === 'team_full' || entityKind === 'team') {
    return 'team';
  }
  if (entityKind === 'player_full' || entityKind === 'player') {
    return 'player';
  }
  if (entityKind === 'competition_full' || entityKind === 'competition') {
    return 'competition';
  }
  if (entityKind === 'match_live_overlay' || entityKind === 'match_live') {
    return 'match_live';
  }
  return 'match';
}

function buildRefreshJobId(input: {
  entityKind: string;
  entityId: string;
  scopeKey: string;
}): string {
  return `${input.entityKind}:${input.entityId}:${input.scopeKey}`;
}

function mapRefreshTaskToJob(task: SnapshotRefreshTask): SnapshotRefreshJob {
  const taskEntityKind = (task.entityKind ?? task.taskKind) as string;
  return {
    id: task.taskKey,
    entityKind: taskEntityKind,
    entityId: task.entityId ?? '',
    scopeKey: task.scopeKey ?? '',
    attempts: task.attemptCount,
    lastError: task.lastError,
    payload: task.payload ?? null,
  };
}

function mapEnqueueInputToTask(input: {
  entityKind: string;
  entityId: string;
  scopeKey: string;
  priority: number;
  notBefore: Date;
  payload: Record<string, unknown> | null;
}): SnapshotRefreshTaskInput {
  const taskKind = resolveTaskKind(input.entityKind);
  return {
    taskKey: buildRefreshJobId({
      entityKind: input.entityKind,
      entityId: input.entityId,
      scopeKey: input.scopeKey,
    }),
    taskKind,
    entityKind: input.entityKind as SnapshotRefreshTaskInput['entityKind'],
    entityId: input.entityId,
    scopeKey: input.scopeKey,
    payload: input.payload,
    priority: input.priority,
    nextRefreshAt: input.notBefore,
  };
}

function createReadStore(baseStore: SnapshotStore, backend: 'memory' | 'postgres'): ReadStore {
  return {
    backend,
    async getEntitySnapshot<TPayload>(input: {
      entityKind: string;
      entityId: string;
      scopeKey?: string | null;
      now?: Date;
    }): Promise<ReadStoreSnapshot<TPayload>> {
      const snapshot = await baseStore.getEntitySnapshot(
        input.entityKind as never,
        input.entityId,
        input.scopeKey ?? null,
        input.now,
      );
      return mapSnapshotRecord<TPayload>(snapshot);
    },
    async upsertEntitySnapshot(
      input: Parameters<ReadStore['upsertEntitySnapshot']>[0],
    ): Promise<void> {
      await baseStore.upsertEntitySnapshot({
        entityKind: input.entityKind as never,
        entityId: input.entityId,
        scopeKey: input.scopeKey ?? null,
        payload: input.payload,
        payloadVersion: 1,
        freshUntil: input.staleAt,
        staleUntil: input.expiresAt,
        lastSourceSyncAt: input.generatedAt,
      });
    },
    async getBootstrapSnapshot<TPayload>(input: {
      scopeKey: string;
      now?: Date;
    }): Promise<ReadStoreSnapshot<TPayload>> {
      const snapshot = await baseStore.getBootstrapSnapshot(input.scopeKey, input.now);
      return mapSnapshotRecord<TPayload>(snapshot);
    },
    async upsertBootstrapSnapshot(
      input: Parameters<ReadStore['upsertBootstrapSnapshot']>[0],
    ): Promise<void> {
      await baseStore.upsertBootstrapSnapshot({
        snapshotKey: input.scopeKey,
        payload: input.payload,
        payloadVersion: 1,
        freshUntil: input.staleAt,
        staleUntil: input.expiresAt,
        lastSourceSyncAt: input.generatedAt,
      });
    },
    async getMatchLiveOverlay<TPayload>(input: {
      matchId: string;
      now?: Date;
    }): Promise<ReadStoreSnapshot<TPayload>> {
      const snapshot = await baseStore.getMatchLiveOverlay(input.matchId, input.now);
      return mapSnapshotRecord<TPayload>(snapshot);
    },
    async upsertMatchLiveOverlay(
      input: Parameters<ReadStore['upsertMatchLiveOverlay']>[0],
    ): Promise<void> {
      await baseStore.upsertMatchLiveOverlay({
        matchId: input.matchId,
        payload: input.payload,
        payloadVersion: 1,
        freshUntil: input.staleAt,
        staleUntil: input.expiresAt,
        lastSourceSyncAt: input.generatedAt,
      });
    },
    async enqueueRefresh(input): Promise<void> {
      const scopeKey = normalizeScopeKey(input.scopeKey);
      await baseStore.enqueueRefreshTask(
        mapEnqueueInputToTask({
          entityKind: input.entityKind,
          entityId: input.entityId,
          scopeKey,
          priority: Math.max(1, input.priority ?? 100),
          notBefore: input.notBefore ?? new Date(),
          payload: input.payload ?? null,
        }),
      );
    },
    async claimRefreshJobs(input): Promise<SnapshotRefreshJob[]> {
      const claimedTasks = await baseStore.leaseRefreshTasks({
        now: new Date(),
        limit: Math.max(1, input.limit),
        leaseOwner: input.workerId,
        leaseForMs: Math.max(1_000, input.leaseForMs ?? 30_000),
      });
      return claimedTasks.map(mapRefreshTaskToJob);
    },
    async completeRefreshJob(input): Promise<void> {
      await baseStore.markRefreshTaskSuccess({
        taskKey: input.jobId,
        completedAt: new Date(),
        nextRefreshAt: input.nextAttemptAt ?? new Date(Date.now() + 5 * 60_000),
      });
    },
    async failRefreshJob(input): Promise<void> {
      await baseStore.markRefreshTaskFailure({
        taskKey: input.jobId,
        failedAt: new Date(),
        nextRefreshAt: input.nextAttemptAt ?? new Date(Date.now() + 60_000),
        errorMessage: input.error,
      });
    },
    async countRefreshBacklog(): Promise<SnapshotRefreshBacklog> {
      return baseStore.countRefreshBacklog();
    },
    async upsertWorkerHeartbeat(input): Promise<void> {
      await baseStore.upsertWorkerHeartbeat(input);
    },
    async getStatusSnapshot(now?: Date): Promise<ReadStoreStatusSnapshot> {
      return baseStore.getStatusSnapshot(now ?? new Date());
    },
    async deleteExpiredSnapshots(now?: Date): Promise<number> {
      return baseStore.deleteExpiredSnapshots(now ?? new Date());
    },
    async deleteStaleHeartbeats(staleBefore: Date): Promise<number> {
      return baseStore.deleteStaleHeartbeats(staleBefore);
    },
    async close(): Promise<void> {
      await closeSnapshotStoreIfAny();
    },
  };
}

async function closeSnapshotStoreIfAny(): Promise<void> {
  if (!snapshotStorePromise) {
    return;
  }

  const store = await snapshotStorePromise;
  await store.close();
  snapshotStorePromise = null;
  snapshotStoreConfigKey = null;
}

export async function getSnapshotStore(options: {
  backend: 'memory' | 'postgres';
  databaseUrl: string | null;
}): Promise<SnapshotStore> {
  const nextConfigKey = buildConfigKey(options);
  if (snapshotStorePromise && snapshotStoreConfigKey !== nextConfigKey) {
    await closeSnapshotStoreIfAny();
  }

  if (!snapshotStorePromise) {
    snapshotStorePromise = createSnapshotStore(options);
    snapshotStoreConfigKey = nextConfigKey;
  }

  return snapshotStorePromise;
}

export async function getReadStore(options: {
  databaseUrl: string | null;
}): Promise<ReadStore> {
  const backend: 'memory' | 'postgres' = options.databaseUrl ? 'postgres' : 'memory';
  const snapshotStore = await getSnapshotStore({
    backend,
    databaseUrl: options.databaseUrl,
  });
  return createReadStore(snapshotStore, backend);
}

export async function closeReadStoreRuntime(): Promise<void> {
  await closeSnapshotStoreIfAny();
}

export async function resetSnapshotStoreRuntimeForTests(): Promise<void> {
  await closeSnapshotStoreIfAny();
}

export async function resetReadStoreRuntimeForTests(): Promise<void> {
  await closeSnapshotStoreIfAny();
}
