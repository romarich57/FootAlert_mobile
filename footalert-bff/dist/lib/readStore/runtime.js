import { createSnapshotStore } from './snapshotStore.js';
let snapshotStorePromise = null;
let snapshotStoreConfigKey = null;
function buildConfigKey(options) {
    return `${options.backend}:${options.databaseUrl ?? ''}`;
}
function normalizeScopeKey(scopeKey) {
    const normalized = scopeKey?.trim();
    return normalized && normalized.length > 0 ? normalized : '';
}
function mapSnapshotRecord(snapshot) {
    if (!snapshot) {
        return { status: 'miss' };
    }
    return {
        status: snapshot.freshness,
        payload: snapshot.payload,
        generatedAt: snapshot.lastSourceSyncAt,
        staleAt: snapshot.freshUntil,
        expiresAt: snapshot.staleUntil,
        metadata: null,
    };
}
function resolveTaskKind(entityKind) {
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
function buildRefreshJobId(input) {
    return `${input.entityKind}:${input.entityId}:${input.scopeKey}`;
}
function mapRefreshTaskToJob(task) {
    const taskEntityKind = (task.entityKind ?? task.taskKind);
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
function mapEnqueueInputToTask(input) {
    const taskKind = resolveTaskKind(input.entityKind);
    return {
        taskKey: buildRefreshJobId({
            entityKind: input.entityKind,
            entityId: input.entityId,
            scopeKey: input.scopeKey,
        }),
        taskKind,
        entityKind: input.entityKind,
        entityId: input.entityId,
        scopeKey: input.scopeKey,
        payload: input.payload,
        priority: input.priority,
        nextRefreshAt: input.notBefore,
    };
}
function createReadStore(baseStore, backend) {
    return {
        backend,
        async getEntitySnapshot(input) {
            const snapshot = await baseStore.getEntitySnapshot(input.entityKind, input.entityId, input.scopeKey ?? null, input.now);
            return mapSnapshotRecord(snapshot);
        },
        async upsertEntitySnapshot(input) {
            await baseStore.upsertEntitySnapshot({
                entityKind: input.entityKind,
                entityId: input.entityId,
                scopeKey: input.scopeKey ?? null,
                payload: input.payload,
                payloadVersion: 1,
                freshUntil: input.staleAt,
                staleUntil: input.expiresAt,
                lastSourceSyncAt: input.generatedAt,
            });
        },
        async getBootstrapSnapshot(input) {
            const snapshot = await baseStore.getBootstrapSnapshot(input.scopeKey, input.now);
            return mapSnapshotRecord(snapshot);
        },
        async upsertBootstrapSnapshot(input) {
            await baseStore.upsertBootstrapSnapshot({
                snapshotKey: input.scopeKey,
                payload: input.payload,
                payloadVersion: 1,
                freshUntil: input.staleAt,
                staleUntil: input.expiresAt,
                lastSourceSyncAt: input.generatedAt,
            });
        },
        async getMatchLiveOverlay(input) {
            const snapshot = await baseStore.getMatchLiveOverlay(input.matchId, input.now);
            return mapSnapshotRecord(snapshot);
        },
        async upsertMatchLiveOverlay(input) {
            await baseStore.upsertMatchLiveOverlay({
                matchId: input.matchId,
                payload: input.payload,
                payloadVersion: 1,
                freshUntil: input.staleAt,
                staleUntil: input.expiresAt,
                lastSourceSyncAt: input.generatedAt,
            });
        },
        async enqueueRefresh(input) {
            const scopeKey = normalizeScopeKey(input.scopeKey);
            await baseStore.enqueueRefreshTask(mapEnqueueInputToTask({
                entityKind: input.entityKind,
                entityId: input.entityId,
                scopeKey,
                priority: Math.max(1, input.priority ?? 100),
                notBefore: input.notBefore ?? new Date(),
                payload: input.payload ?? null,
            }));
        },
        async claimRefreshJobs(input) {
            const claimedTasks = await baseStore.leaseRefreshTasks({
                now: new Date(),
                limit: Math.max(1, input.limit),
                leaseOwner: input.workerId,
                leaseForMs: Math.max(1_000, input.leaseForMs ?? 30_000),
            });
            return claimedTasks.map(mapRefreshTaskToJob);
        },
        async completeRefreshJob(input) {
            await baseStore.markRefreshTaskSuccess({
                taskKey: input.jobId,
                completedAt: new Date(),
                nextRefreshAt: input.nextAttemptAt ?? new Date(Date.now() + 5 * 60_000),
            });
        },
        async failRefreshJob(input) {
            await baseStore.markRefreshTaskFailure({
                taskKey: input.jobId,
                failedAt: new Date(),
                nextRefreshAt: input.nextAttemptAt ?? new Date(Date.now() + 60_000),
                errorMessage: input.error,
            });
        },
        async countRefreshBacklog() {
            return baseStore.countRefreshBacklog();
        },
        async upsertWorkerHeartbeat(input) {
            await baseStore.upsertWorkerHeartbeat(input);
        },
        async getStatusSnapshot(now) {
            return baseStore.getStatusSnapshot(now ?? new Date());
        },
        async deleteExpiredSnapshots(now) {
            return baseStore.deleteExpiredSnapshots(now ?? new Date());
        },
        async deleteStaleHeartbeats(staleBefore) {
            return baseStore.deleteStaleHeartbeats(staleBefore);
        },
        async close() {
            await closeSnapshotStoreIfAny();
        },
    };
}
async function closeSnapshotStoreIfAny() {
    if (!snapshotStorePromise) {
        return;
    }
    const store = await snapshotStorePromise;
    await store.close();
    snapshotStorePromise = null;
    snapshotStoreConfigKey = null;
}
export async function getSnapshotStore(options) {
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
export async function getReadStore(options) {
    const backend = options.databaseUrl ? 'postgres' : 'memory';
    const snapshotStore = await getSnapshotStore({
        backend,
        databaseUrl: options.databaseUrl,
    });
    return createReadStore(snapshotStore, backend);
}
export async function closeReadStoreRuntime() {
    await closeSnapshotStoreIfAny();
}
export async function resetSnapshotStoreRuntimeForTests() {
    await closeSnapshotStoreIfAny();
}
export async function resetReadStoreRuntimeForTests() {
    await closeSnapshotStoreIfAny();
}
