function normalizeDate(value) {
    if (!value) {
        return null;
    }
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}
function normalizeScopeKey(scopeKey) {
    const normalized = scopeKey?.trim();
    return normalized && normalized.length > 0 ? normalized : '';
}
function toAgeMs(lastSourceSyncAt, now) {
    if (!lastSourceSyncAt) {
        return null;
    }
    return Math.max(now.getTime() - lastSourceSyncAt.getTime(), 0);
}
function resolveFreshness(params) {
    if (params.freshUntil && params.now <= params.freshUntil) {
        return 'fresh';
    }
    if (params.staleUntil && params.now <= params.staleUntil) {
        return 'stale';
    }
    return 'expired';
}
function buildSnapshotRecord(record, now) {
    const freshness = resolveFreshness({
        now,
        freshUntil: record.freshUntil,
        staleUntil: record.staleUntil,
    });
    return {
        payload: record.payload,
        payloadVersion: record.payloadVersion,
        freshUntil: record.freshUntil,
        staleUntil: record.staleUntil,
        lastSourceSyncAt: record.lastSourceSyncAt,
        lastAccessedAt: record.lastAccessedAt,
        freshness,
        ageMs: toAgeMs(record.lastSourceSyncAt, now),
    };
}
function toNumber(value) {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : 0;
    }
    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
}
function createInitialCounters() {
    return {
        freshHits: 0,
        staleHits: 0,
        expiredHits: 0,
        misses: 0,
        servedCount: 0,
        fallbackCount: 0,
        refreshFailures: 0,
        servedAgeMsTotal: 0,
    };
}
function buildMetricsSnapshot(counters) {
    const hitCount = counters.freshHits + counters.staleHits + counters.expiredHits;
    const totalReads = hitCount + counters.misses;
    const avgServedAgeMs = counters.servedCount > 0
        ? Math.round(counters.servedAgeMsTotal / counters.servedCount)
        : 0;
    return {
        freshHits: counters.freshHits,
        staleHits: counters.staleHits,
        expiredHits: counters.expiredHits,
        misses: counters.misses,
        servedCount: counters.servedCount,
        fallbackCount: counters.fallbackCount,
        refreshFailures: counters.refreshFailures,
        avgServedAgeMs,
        hitRatio: totalReads > 0 ? hitCount / totalReads : 0,
    };
}
function registerServedSnapshot(counters, snapshot) {
    counters.servedCount += 1;
    if (snapshot.ageMs !== null) {
        counters.servedAgeMsTotal += snapshot.ageMs;
    }
    if (snapshot.freshness === 'fresh') {
        counters.freshHits += 1;
        return;
    }
    if (snapshot.freshness === 'stale') {
        counters.staleHits += 1;
        return;
    }
    counters.expiredHits += 1;
}
function buildEntityAccessKey(entityKind, entityId, scopeKey) {
    return `${entityKind}:${entityId}:${normalizeScopeKey(scopeKey)}`;
}
function buildEntitySnapshotKey(entityKind, entityId, scopeKey) {
    return `${entityKind}:${entityId}:${normalizeScopeKey(scopeKey)}`;
}
function mapRefreshRow(row) {
    return {
        taskKey: row.task_key,
        taskKind: row.task_kind,
        entityKind: row.entity_kind,
        entityId: row.entity_id,
        scopeKey: row.scope_key,
        payload: row.payload_json ?? null,
        priority: row.priority,
        nextRefreshAt: normalizeDate(row.next_refresh_at) ?? new Date(),
        lastSuccessAt: normalizeDate(row.last_success_at),
        lastAttemptAt: normalizeDate(row.last_attempt_at),
        attemptCount: row.attempt_count,
        lastError: row.last_error,
        leaseOwner: row.lease_owner,
        leaseUntil: normalizeDate(row.lease_until),
    };
}
export function buildRefreshTaskKey(input) {
    if (input.taskKind === 'bootstrap') {
        return `bootstrap:${normalizeScopeKey(input.scopeKey) || 'global'}`;
    }
    if (input.taskKind === 'match_live') {
        return `match_live:${input.entityId ?? ''}:${normalizeScopeKey(input.scopeKey)}`;
    }
    return `${input.taskKind}:${input.entityKind ?? ''}:${input.entityId ?? ''}:${normalizeScopeKey(input.scopeKey)}`;
}
function resolveRefreshTaskKind(entityKind) {
    if (entityKind === 'bootstrap') {
        return 'bootstrap';
    }
    if (entityKind === 'team' || entityKind === 'team_full') {
        return 'team';
    }
    if (entityKind === 'player' || entityKind === 'player_full') {
        return 'player';
    }
    if (entityKind === 'competition' || entityKind === 'competition_full') {
        return 'competition';
    }
    if (entityKind === 'match_live' || entityKind === 'match_live_overlay') {
        return 'match_live';
    }
    return 'match';
}
function buildGenericRefreshTaskKey(input) {
    return `${input.entityKind}:${input.entityId}:${normalizeScopeKey(input.scopeKey)}`;
}
function mapRefreshTaskToJob(task) {
    return {
        id: task.taskKey,
        entityKind: task.entityKind ?? task.taskKind,
        entityId: task.entityId ?? '',
        scopeKey: task.scopeKey ?? '',
        attempts: task.attemptCount,
        lastError: task.lastError,
        payload: task.payload ?? null,
    };
}
class InMemorySnapshotStore {
    bootstrapSnapshots = new Map();
    entitySnapshots = new Map();
    liveOverlays = new Map();
    refreshQueue = new Map();
    workerHeartbeats = new Map();
    accessLog = new Map();
    counters = createInitialCounters();
    async getBootstrapSnapshot(snapshotKey, now = new Date()) {
        const key = normalizeScopeKey(snapshotKey) || 'global';
        const record = this.bootstrapSnapshots.get(key);
        if (!record) {
            this.counters.misses += 1;
            return null;
        }
        record.lastAccessedAt = now;
        const snapshot = buildSnapshotRecord(record, now);
        registerServedSnapshot(this.counters, snapshot);
        return snapshot;
    }
    async upsertBootstrapSnapshot(input) {
        const key = normalizeScopeKey(input.snapshotKey) || 'global';
        this.bootstrapSnapshots.set(key, {
            payload: input.payload,
            payloadVersion: input.payloadVersion,
            freshUntil: input.freshUntil,
            staleUntil: input.staleUntil,
            lastSourceSyncAt: input.lastSourceSyncAt ?? new Date(),
            lastAccessedAt: null,
        });
    }
    async getEntitySnapshot(entityKind, entityId, scopeKey, now = new Date()) {
        const normalizedScopeKey = normalizeScopeKey(scopeKey);
        const key = buildEntitySnapshotKey(entityKind, entityId, normalizedScopeKey);
        const record = this.entitySnapshots.get(key);
        if (!record) {
            this.counters.misses += 1;
            return null;
        }
        record.lastAccessedAt = now;
        this.recordEntityAccess(entityKind, entityId, normalizedScopeKey, now);
        const snapshot = buildSnapshotRecord(record, now);
        registerServedSnapshot(this.counters, snapshot);
        return snapshot;
    }
    async upsertEntitySnapshot(input) {
        const normalizedScopeKey = normalizeScopeKey(input.scopeKey);
        const key = buildEntitySnapshotKey(input.entityKind, input.entityId, normalizedScopeKey);
        this.entitySnapshots.set(key, {
            payload: input.payload,
            payloadVersion: input.payloadVersion,
            freshUntil: input.freshUntil,
            staleUntil: input.staleUntil,
            lastSourceSyncAt: input.lastSourceSyncAt ?? new Date(),
            lastAccessedAt: null,
        });
    }
    async getMatchLiveOverlay(matchId, now = new Date()) {
        const record = this.liveOverlays.get(matchId);
        if (!record) {
            this.counters.misses += 1;
            return null;
        }
        record.lastAccessedAt = now;
        const snapshot = buildSnapshotRecord(record, now);
        registerServedSnapshot(this.counters, snapshot);
        return snapshot;
    }
    async upsertMatchLiveOverlay(input) {
        this.liveOverlays.set(input.matchId, {
            payload: input.payload,
            payloadVersion: input.payloadVersion,
            freshUntil: input.freshUntil,
            staleUntil: input.staleUntil,
            lastSourceSyncAt: input.lastSourceSyncAt ?? new Date(),
            lastAccessedAt: null,
        });
    }
    async deleteMatchLiveOverlay(matchId) {
        this.liveOverlays.delete(matchId);
    }
    async enqueueRefreshTask(task) {
        const existing = this.refreshQueue.get(task.taskKey);
        if (!existing) {
            this.refreshQueue.set(task.taskKey, {
                ...task,
                scopeKey: task.scopeKey ?? null,
                payload: task.payload ?? null,
                lastSuccessAt: null,
                lastAttemptAt: null,
                attemptCount: 0,
                lastError: null,
                leaseOwner: null,
                leaseUntil: null,
            });
            return;
        }
        existing.priority = Math.max(existing.priority, task.priority);
        if (task.nextRefreshAt < existing.nextRefreshAt) {
            existing.nextRefreshAt = task.nextRefreshAt;
        }
        existing.taskKind = task.taskKind;
        existing.entityKind = task.entityKind;
        existing.entityId = task.entityId;
        existing.scopeKey = task.scopeKey ?? existing.scopeKey;
        if (task.payload) {
            existing.payload = task.payload;
        }
    }
    async leaseRefreshTasks(input) {
        const leaseUntil = new Date(input.now.getTime() + input.leaseForMs);
        const dueTasks = [...this.refreshQueue.values()]
            .filter(task => {
            if (task.nextRefreshAt > input.now) {
                return false;
            }
            if (!task.leaseUntil) {
                return true;
            }
            return task.leaseUntil < input.now;
        })
            .sort((first, second) => {
            if (second.priority !== first.priority) {
                return second.priority - first.priority;
            }
            return first.nextRefreshAt.getTime() - second.nextRefreshAt.getTime();
        })
            .slice(0, input.limit);
        dueTasks.forEach(task => {
            task.leaseOwner = input.leaseOwner;
            task.leaseUntil = leaseUntil;
            task.lastAttemptAt = input.now;
            task.attemptCount += 1;
        });
        return dueTasks;
    }
    async markRefreshTaskSuccess(input) {
        const task = this.refreshQueue.get(input.taskKey);
        if (!task) {
            return;
        }
        task.lastSuccessAt = input.completedAt;
        task.lastError = null;
        task.nextRefreshAt = input.nextRefreshAt;
        task.leaseOwner = null;
        task.leaseUntil = null;
        task.attemptCount = 0;
    }
    async markRefreshTaskFailure(input) {
        const task = this.refreshQueue.get(input.taskKey);
        if (!task) {
            return;
        }
        task.lastError = input.errorMessage;
        task.nextRefreshAt = input.nextRefreshAt;
        task.leaseOwner = null;
        task.leaseUntil = null;
        task.lastAttemptAt = input.failedAt;
        this.counters.refreshFailures += 1;
    }
    async enqueueRefresh(input) {
        const normalizedScopeKey = normalizeScopeKey(input.scopeKey);
        await this.enqueueRefreshTask({
            taskKey: buildGenericRefreshTaskKey({
                entityKind: input.entityKind,
                entityId: input.entityId,
                scopeKey: normalizedScopeKey,
            }),
            taskKind: resolveRefreshTaskKind(input.entityKind),
            entityKind: input.entityKind,
            entityId: input.entityId,
            scopeKey: normalizedScopeKey,
            payload: input.payload ?? null,
            priority: Math.max(1, input.priority ?? 100),
            nextRefreshAt: input.notBefore ?? new Date(),
        });
    }
    async claimRefreshJobs(input) {
        const tasks = await this.leaseRefreshTasks({
            now: new Date(),
            limit: Math.max(1, input.limit),
            leaseOwner: input.workerId,
            leaseForMs: Math.max(1_000, input.leaseForMs ?? 30_000),
        });
        return tasks.map(mapRefreshTaskToJob);
    }
    async completeRefreshJob(input) {
        await this.markRefreshTaskSuccess({
            taskKey: input.jobId,
            completedAt: new Date(),
            nextRefreshAt: input.nextAttemptAt ?? new Date(Date.now() + 5 * 60_000),
        });
    }
    async failRefreshJob(input) {
        await this.markRefreshTaskFailure({
            taskKey: input.jobId,
            failedAt: new Date(),
            nextRefreshAt: input.nextAttemptAt ?? new Date(Date.now() + 60_000),
            errorMessage: input.error,
        });
    }
    async countRefreshBacklog() {
        const now = new Date();
        const queued = [...this.refreshQueue.values()]
            .filter(task => task.nextRefreshAt <= now && (!task.leaseUntil || task.leaseUntil < now))
            .length;
        const inProgress = [...this.refreshQueue.values()]
            .filter(task => task.leaseUntil !== null && task.leaseUntil >= now)
            .length;
        const failed = [...this.refreshQueue.values()]
            .filter(task => task.lastError !== null)
            .length;
        return {
            queued,
            inProgress,
            failed,
            total: queued + inProgress + failed,
        };
    }
    async upsertWorkerHeartbeat(input) {
        this.workerHeartbeats.set(input.workerId, input.seenAt);
    }
    async deleteExpiredSnapshots(now) {
        let deleted = 0;
        for (const [key, snapshot] of this.entitySnapshots.entries()) {
            if (snapshot.staleUntil && snapshot.staleUntil < now) {
                this.entitySnapshots.delete(key);
                deleted++;
            }
        }
        for (const [key, snapshot] of this.bootstrapSnapshots.entries()) {
            if (snapshot.staleUntil && snapshot.staleUntil < now) {
                this.bootstrapSnapshots.delete(key);
                deleted++;
            }
        }
        for (const [key, snapshot] of this.liveOverlays.entries()) {
            if (snapshot.staleUntil && snapshot.staleUntil < now) {
                this.liveOverlays.delete(key);
                deleted++;
            }
        }
        return deleted;
    }
    async deleteStaleHeartbeats(staleBefore) {
        let deleted = 0;
        for (const [workerId, seenAt] of this.workerHeartbeats.entries()) {
            if (seenAt < staleBefore) {
                this.workerHeartbeats.delete(workerId);
                deleted++;
            }
        }
        return deleted;
    }
    async listRecentlyAccessedEntities(limit) {
        return [...this.accessLog.values()]
            .sort((first, second) => second.lastAccessedAt.getTime() - first.lastAccessedAt.getTime())
            .slice(0, Math.max(limit, 0))
            .map(entry => ({
            entityKind: entry.entityKind,
            entityId: entry.entityId,
            scopeKey: entry.scopeKey,
            lastAccessedAt: entry.lastAccessedAt,
            accessCount: entry.accessCount,
        }));
    }
    async listMostFollowedEntities(_limit) {
        return [];
    }
    async getStatusSnapshot(now = new Date()) {
        const refreshBacklog = [...this.refreshQueue.values()].filter(task => task.nextRefreshAt <= now)
            .length;
        const liveTrackedMatches = [...this.liveOverlays.values()].filter(overlay => !overlay.staleUntil || overlay.staleUntil > now).length;
        const bootstrapAvailable = this.bootstrapSnapshots.size > 0;
        const mostRecentHeartbeat = [...this.workerHeartbeats.values()]
            .sort((first, second) => second.getTime() - first.getTime())[0] ?? null;
        const refreshFailureRows = [...this.refreshQueue.values()].filter(task => task.lastError !== null)
            .length;
        return {
            backend: 'memory',
            metrics: buildMetricsSnapshot(this.counters),
            refreshBacklog,
            liveTrackedMatches,
            bootstrapAvailable,
            workerHeartbeatAgeMs: mostRecentHeartbeat
                ? Math.max(now.getTime() - mostRecentHeartbeat.getTime(), 0)
                : null,
            refreshFailureRows,
        };
    }
    recordFallback() {
        this.counters.fallbackCount += 1;
    }
    async close() {
        // No-op for memory backend.
    }
    recordEntityAccess(entityKind, entityId, scopeKey, now) {
        const key = buildEntityAccessKey(entityKind, entityId, scopeKey);
        const existing = this.accessLog.get(key);
        if (!existing) {
            this.accessLog.set(key, {
                entityKind,
                entityId,
                scopeKey,
                lastAccessedAt: now,
                accessCount: 1,
            });
            return;
        }
        existing.lastAccessedAt = now;
        existing.accessCount += 1;
    }
}
class PostgresSnapshotStore {
    pool;
    counters = createInitialCounters();
    constructor(pool) {
        this.pool = pool;
    }
    async getBootstrapSnapshot(snapshotKey, now = new Date()) {
        const key = normalizeScopeKey(snapshotKey) || 'global';
        const queryResult = await this.pool.query(`SELECT payload_json, payload_version, fresh_until, stale_until, last_source_sync_at, last_accessed_at
       FROM bootstrap_snapshots
       WHERE snapshot_key = $1
       LIMIT 1`, [key]);
        const row = queryResult.rows[0];
        if (!row) {
            this.counters.misses += 1;
            return null;
        }
        await this.pool.query(`UPDATE bootstrap_snapshots
       SET last_accessed_at = $2, updated_at = $2
       WHERE snapshot_key = $1`, [key, now.toISOString()]);
        const snapshot = buildSnapshotRecord({
            payload: row.payload_json,
            payloadVersion: row.payload_version,
            freshUntil: normalizeDate(row.fresh_until),
            staleUntil: normalizeDate(row.stale_until),
            lastSourceSyncAt: normalizeDate(row.last_source_sync_at),
            lastAccessedAt: now,
        }, now);
        registerServedSnapshot(this.counters, snapshot);
        return snapshot;
    }
    async upsertBootstrapSnapshot(input) {
        const now = new Date();
        const key = normalizeScopeKey(input.snapshotKey) || 'global';
        await this.pool.query(`INSERT INTO bootstrap_snapshots (
         snapshot_key,
         payload_json,
         payload_version,
         fresh_until,
         stale_until,
         last_source_sync_at,
         last_accessed_at,
         updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, NULL, $7)
       ON CONFLICT (snapshot_key)
       DO UPDATE SET
         payload_json = EXCLUDED.payload_json,
         payload_version = EXCLUDED.payload_version,
         fresh_until = EXCLUDED.fresh_until,
         stale_until = EXCLUDED.stale_until,
         last_source_sync_at = EXCLUDED.last_source_sync_at,
         updated_at = EXCLUDED.updated_at`, [
            key,
            input.payload,
            input.payloadVersion,
            input.freshUntil?.toISOString() ?? null,
            input.staleUntil?.toISOString() ?? null,
            (input.lastSourceSyncAt ?? now).toISOString(),
            now.toISOString(),
        ]);
    }
    async getEntitySnapshot(entityKind, entityId, scopeKey, now = new Date()) {
        const normalizedScopeKey = normalizeScopeKey(scopeKey);
        const queryResult = await this.pool.query(`SELECT payload_json, payload_version, fresh_until, stale_until, last_source_sync_at, last_accessed_at
       FROM entity_snapshots
       WHERE entity_kind = $1
         AND entity_id = $2
         AND scope_key = $3
       LIMIT 1`, [entityKind, entityId, normalizedScopeKey]);
        const row = queryResult.rows[0];
        if (!row) {
            this.counters.misses += 1;
            return null;
        }
        await this.pool.query(`UPDATE entity_snapshots
       SET last_accessed_at = $4, updated_at = $4
       WHERE entity_kind = $1
         AND entity_id = $2
         AND scope_key = $3`, [entityKind, entityId, normalizedScopeKey, now.toISOString()]);
        await this.pool.query(`INSERT INTO snapshot_access_log (
         entity_kind,
         entity_id,
         scope_key,
         last_accessed_at,
         access_count
       ) VALUES ($1, $2, $3, $4, 1)
       ON CONFLICT (entity_kind, entity_id, scope_key)
       DO UPDATE SET
         last_accessed_at = EXCLUDED.last_accessed_at,
         access_count = snapshot_access_log.access_count + 1`, [entityKind, entityId, normalizedScopeKey, now.toISOString()]);
        const snapshot = buildSnapshotRecord({
            payload: row.payload_json,
            payloadVersion: row.payload_version,
            freshUntil: normalizeDate(row.fresh_until),
            staleUntil: normalizeDate(row.stale_until),
            lastSourceSyncAt: normalizeDate(row.last_source_sync_at),
            lastAccessedAt: now,
        }, now);
        registerServedSnapshot(this.counters, snapshot);
        return snapshot;
    }
    async upsertEntitySnapshot(input) {
        const now = new Date();
        const normalizedScopeKey = normalizeScopeKey(input.scopeKey);
        await this.pool.query(`INSERT INTO entity_snapshots (
         entity_kind,
         entity_id,
         scope_key,
         payload_json,
         payload_version,
         fresh_until,
         stale_until,
         last_source_sync_at,
         last_accessed_at,
         priority,
         updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, $9, $10)
       ON CONFLICT (entity_kind, entity_id, scope_key)
       DO UPDATE SET
         payload_json = EXCLUDED.payload_json,
         payload_version = EXCLUDED.payload_version,
         fresh_until = EXCLUDED.fresh_until,
         stale_until = EXCLUDED.stale_until,
         last_source_sync_at = EXCLUDED.last_source_sync_at,
         priority = EXCLUDED.priority,
         updated_at = EXCLUDED.updated_at`, [
            input.entityKind,
            input.entityId,
            normalizedScopeKey,
            input.payload,
            input.payloadVersion,
            input.freshUntil?.toISOString() ?? null,
            input.staleUntil?.toISOString() ?? null,
            (input.lastSourceSyncAt ?? now).toISOString(),
            input.priority ?? 100,
            now.toISOString(),
        ]);
    }
    async getMatchLiveOverlay(matchId, now = new Date()) {
        const queryResult = await this.pool.query(`SELECT payload_json, payload_version, fresh_until, stale_until, last_source_sync_at, last_accessed_at
       FROM match_live_overlays
       WHERE match_id = $1
       LIMIT 1`, [matchId]);
        const row = queryResult.rows[0];
        if (!row) {
            this.counters.misses += 1;
            return null;
        }
        await this.pool.query(`UPDATE match_live_overlays
       SET updated_at = $2
       WHERE match_id = $1`, [matchId, now.toISOString()]);
        const snapshot = buildSnapshotRecord({
            payload: row.payload_json,
            payloadVersion: row.payload_version,
            freshUntil: normalizeDate(row.fresh_until),
            staleUntil: normalizeDate(row.stale_until),
            lastSourceSyncAt: normalizeDate(row.last_source_sync_at),
            lastAccessedAt: normalizeDate(row.last_accessed_at),
        }, now);
        registerServedSnapshot(this.counters, snapshot);
        return snapshot;
    }
    async upsertMatchLiveOverlay(input) {
        const now = new Date();
        await this.pool.query(`INSERT INTO match_live_overlays (
         match_id,
         payload_json,
         payload_version,
         fresh_until,
         stale_until,
         last_source_sync_at,
         updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (match_id)
       DO UPDATE SET
         payload_json = EXCLUDED.payload_json,
         payload_version = EXCLUDED.payload_version,
         fresh_until = EXCLUDED.fresh_until,
         stale_until = EXCLUDED.stale_until,
         last_source_sync_at = EXCLUDED.last_source_sync_at,
         updated_at = EXCLUDED.updated_at`, [
            input.matchId,
            input.payload,
            input.payloadVersion,
            input.freshUntil?.toISOString() ?? null,
            input.staleUntil?.toISOString() ?? null,
            (input.lastSourceSyncAt ?? now).toISOString(),
            now.toISOString(),
        ]);
    }
    async deleteMatchLiveOverlay(matchId) {
        await this.pool.query(`DELETE FROM match_live_overlays WHERE match_id = $1`, [matchId]);
    }
    async enqueueRefreshTask(task) {
        const now = new Date().toISOString();
        await this.pool.query(`INSERT INTO snapshot_refresh_queue (
         task_key,
         task_kind,
         entity_kind,
         entity_id,
         scope_key,
         payload_json,
         priority,
         next_refresh_at,
         last_success_at,
         last_attempt_at,
         attempt_count,
         last_error,
         lease_owner,
         lease_until,
         created_at,
         updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, NULL, 0, NULL, NULL, NULL, $9, $9)
       ON CONFLICT (task_key)
       DO UPDATE SET
         task_kind = EXCLUDED.task_kind,
         entity_kind = COALESCE(EXCLUDED.entity_kind, snapshot_refresh_queue.entity_kind),
         entity_id = COALESCE(EXCLUDED.entity_id, snapshot_refresh_queue.entity_id),
         scope_key = COALESCE(EXCLUDED.scope_key, snapshot_refresh_queue.scope_key),
         payload_json = COALESCE(EXCLUDED.payload_json, snapshot_refresh_queue.payload_json),
         priority = GREATEST(snapshot_refresh_queue.priority, EXCLUDED.priority),
         next_refresh_at = LEAST(snapshot_refresh_queue.next_refresh_at, EXCLUDED.next_refresh_at),
         updated_at = EXCLUDED.updated_at`, [
            task.taskKey,
            task.taskKind,
            task.entityKind,
            task.entityId,
            task.scopeKey ?? '',
            task.payload,
            task.priority,
            task.nextRefreshAt.toISOString(),
            now,
        ]);
    }
    async leaseRefreshTasks(input) {
        const client = await this.pool.connect();
        const leaseUntil = new Date(input.now.getTime() + input.leaseForMs);
        const nowIso = input.now.toISOString();
        try {
            await client.query('BEGIN');
            const queryResult = await client.query(`WITH candidates AS (
           SELECT task_key
           FROM snapshot_refresh_queue
           WHERE next_refresh_at <= $1
             AND (lease_until IS NULL OR lease_until < $1)
           ORDER BY priority DESC, next_refresh_at ASC
           LIMIT $2
           FOR UPDATE SKIP LOCKED
         )
         UPDATE snapshot_refresh_queue AS queue
         SET lease_owner = $3,
             lease_until = $4,
             last_attempt_at = $1,
             attempt_count = queue.attempt_count + 1,
             updated_at = $1
         FROM candidates
         WHERE queue.task_key = candidates.task_key
         RETURNING queue.task_key,
                   queue.task_kind,
                   queue.entity_kind,
                   queue.entity_id,
                   queue.scope_key,
                   queue.payload_json,
                   queue.priority,
                   queue.next_refresh_at,
                   queue.last_success_at,
                   queue.last_attempt_at,
                   queue.attempt_count,
                   queue.last_error,
                   queue.lease_owner,
                   queue.lease_until`, [nowIso, input.limit, input.leaseOwner, leaseUntil.toISOString()]);
            await client.query('COMMIT');
            return queryResult.rows.map(mapRefreshRow);
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async markRefreshTaskSuccess(input) {
        await this.pool.query(`UPDATE snapshot_refresh_queue
       SET last_success_at = $2,
           last_error = NULL,
           next_refresh_at = $3,
           attempt_count = 0,
           lease_owner = NULL,
           lease_until = NULL,
           updated_at = $2
       WHERE task_key = $1`, [input.taskKey, input.completedAt.toISOString(), input.nextRefreshAt.toISOString()]);
    }
    async markRefreshTaskFailure(input) {
        await this.pool.query(`UPDATE snapshot_refresh_queue
       SET last_error = $2,
           next_refresh_at = $3,
           lease_owner = NULL,
           lease_until = NULL,
           updated_at = $4
       WHERE task_key = $1`, [
            input.taskKey,
            input.errorMessage.slice(0, 1_000),
            input.nextRefreshAt.toISOString(),
            input.failedAt.toISOString(),
        ]);
        this.counters.refreshFailures += 1;
    }
    async enqueueRefresh(input) {
        const normalizedScopeKey = normalizeScopeKey(input.scopeKey);
        await this.enqueueRefreshTask({
            taskKey: buildGenericRefreshTaskKey({
                entityKind: input.entityKind,
                entityId: input.entityId,
                scopeKey: normalizedScopeKey,
            }),
            taskKind: resolveRefreshTaskKind(input.entityKind),
            entityKind: input.entityKind,
            entityId: input.entityId,
            scopeKey: normalizedScopeKey,
            payload: input.payload ?? null,
            priority: Math.max(1, input.priority ?? 100),
            nextRefreshAt: input.notBefore ?? new Date(),
        });
    }
    async claimRefreshJobs(input) {
        const tasks = await this.leaseRefreshTasks({
            now: new Date(),
            limit: Math.max(1, input.limit),
            leaseOwner: input.workerId,
            leaseForMs: Math.max(1_000, input.leaseForMs ?? 30_000),
        });
        return tasks.map(mapRefreshTaskToJob);
    }
    async completeRefreshJob(input) {
        await this.markRefreshTaskSuccess({
            taskKey: input.jobId,
            completedAt: new Date(),
            nextRefreshAt: input.nextAttemptAt ?? new Date(Date.now() + 5 * 60_000),
        });
    }
    async failRefreshJob(input) {
        await this.markRefreshTaskFailure({
            taskKey: input.jobId,
            failedAt: new Date(),
            nextRefreshAt: input.nextAttemptAt ?? new Date(Date.now() + 60_000),
            errorMessage: input.error,
        });
    }
    async countRefreshBacklog() {
        const nowIso = new Date().toISOString();
        const [queuedRow, inProgressRow, failedRow] = await Promise.all([
            this.pool.query(`SELECT COUNT(*) AS count
         FROM snapshot_refresh_queue
         WHERE next_refresh_at <= $1
           AND (lease_until IS NULL OR lease_until < $1)`, [nowIso]),
            this.pool.query(`SELECT COUNT(*) AS count
         FROM snapshot_refresh_queue
         WHERE lease_until IS NOT NULL
           AND lease_until >= $1`, [nowIso]),
            this.pool.query(`SELECT COUNT(*) AS count
         FROM snapshot_refresh_queue
         WHERE last_error IS NOT NULL`),
        ]);
        const queued = toNumber(queuedRow.rows[0]?.count);
        const inProgress = toNumber(inProgressRow.rows[0]?.count);
        const failed = toNumber(failedRow.rows[0]?.count);
        return {
            queued,
            inProgress,
            failed,
            total: queued + inProgress + failed,
        };
    }
    async upsertWorkerHeartbeat(input) {
        await this.pool.query(`INSERT INTO snapshot_worker_heartbeats (
         worker_id,
         last_seen_at,
         metadata_json,
         updated_at
       ) VALUES ($1, $2, $3, $2)
       ON CONFLICT (worker_id)
       DO UPDATE SET
         last_seen_at = EXCLUDED.last_seen_at,
         metadata_json = EXCLUDED.metadata_json,
         updated_at = EXCLUDED.updated_at`, [
            input.workerId,
            input.seenAt.toISOString(),
            input.metadata ?? null,
        ]);
    }
    async listRecentlyAccessedEntities(limit) {
        try {
            const queryResult = await this.pool.query(`SELECT entity_kind, entity_id, scope_key, last_accessed_at, access_count
         FROM snapshot_access_log
         ORDER BY last_accessed_at DESC
         LIMIT $1`, [Math.max(limit, 0)]);
            return queryResult.rows
                .map(row => ({
                entityKind: row.entity_kind,
                entityId: row.entity_id,
                scopeKey: row.scope_key.length > 0 ? row.scope_key : null,
                lastAccessedAt: normalizeDate(row.last_accessed_at) ?? new Date(),
                accessCount: toNumber(row.access_count),
            }));
        }
        catch {
            return [];
        }
    }
    async listMostFollowedEntities(limit) {
        try {
            const queryResult = await this.pool.query(`SELECT entity_kind, entity_id
         FROM follow_entity_aggregates
         WHERE active_followers_count > 0
         ORDER BY active_followers_count DESC, total_follow_adds_count DESC
         LIMIT $1`, [Math.max(limit, 0)]);
            return queryResult.rows.map(row => ({
                entityKind: row.entity_kind,
                entityId: row.entity_id,
            }));
        }
        catch {
            return [];
        }
    }
    async getStatusSnapshot(now = new Date()) {
        const nowIso = now.toISOString();
        const [backlogRow, liveRow, bootstrapRow, ageRow, failureRow] = await Promise.all([
            this.pool.query(`SELECT COUNT(*) AS count
         FROM snapshot_refresh_queue
         WHERE next_refresh_at <= $1`, [nowIso]),
            this.pool.query(`SELECT COUNT(*) AS count
         FROM match_live_overlays
         WHERE stale_until IS NULL OR stale_until > $1`, [nowIso]),
            this.pool.query(`SELECT COUNT(*) AS count
         FROM bootstrap_snapshots`),
            this.pool.query(`SELECT EXTRACT(EPOCH FROM ($1::timestamptz - MAX(last_seen_at))) * 1000 AS age_ms
         FROM snapshot_worker_heartbeats`, [nowIso]),
            this.pool.query(`SELECT COUNT(*) AS count
         FROM snapshot_refresh_queue
         WHERE last_error IS NOT NULL`),
        ]);
        return {
            backend: 'postgres',
            metrics: buildMetricsSnapshot(this.counters),
            refreshBacklog: toNumber(backlogRow.rows[0]?.count),
            liveTrackedMatches: toNumber(liveRow.rows[0]?.count),
            bootstrapAvailable: toNumber(bootstrapRow.rows[0]?.count) > 0,
            workerHeartbeatAgeMs: toNumber(ageRow.rows[0]?.age_ms),
            refreshFailureRows: toNumber(failureRow.rows[0]?.count),
        };
    }
    async deleteExpiredSnapshots(now) {
        const nowIso = now.toISOString();
        const [entitiesResult, bootstrapResult, overlaysResult] = await Promise.all([
            this.pool.query(`WITH deleted AS (
           DELETE FROM entity_snapshots WHERE stale_until IS NOT NULL AND stale_until < $1 RETURNING 1
         ) SELECT COUNT(*) AS count FROM deleted`, [nowIso]),
            this.pool.query(`WITH deleted AS (
           DELETE FROM bootstrap_snapshots WHERE stale_until IS NOT NULL AND stale_until < $1 RETURNING 1
         ) SELECT COUNT(*) AS count FROM deleted`, [nowIso]),
            this.pool.query(`WITH deleted AS (
           DELETE FROM match_live_overlays WHERE stale_until IS NOT NULL AND stale_until < $1 RETURNING 1
         ) SELECT COUNT(*) AS count FROM deleted`, [nowIso]),
        ]);
        return (toNumber(entitiesResult.rows[0]?.count) +
            toNumber(bootstrapResult.rows[0]?.count) +
            toNumber(overlaysResult.rows[0]?.count));
    }
    async deleteStaleHeartbeats(staleBefore) {
        const result = await this.pool.query(`WITH deleted AS (
         DELETE FROM snapshot_worker_heartbeats WHERE last_seen_at < $1 RETURNING 1
       ) SELECT COUNT(*) AS count FROM deleted`, [staleBefore.toISOString()]);
        return toNumber(result.rows[0]?.count);
    }
    recordFallback() {
        this.counters.fallbackCount += 1;
    }
    async close() {
        await this.pool.end();
    }
}
export async function createSnapshotStore(options) {
    if (options.backend === 'memory') {
        return new InMemorySnapshotStore();
    }
    if (!options.databaseUrl) {
        throw new Error('DATABASE_URL is required for postgres snapshot store.');
    }
    const imported = await import('pg');
    const PoolConstructor = imported.Pool;
    const pool = new PoolConstructor({
        connectionString: options.databaseUrl,
        max: 10,
        idleTimeoutMillis: 15_000,
    });
    return new PostgresSnapshotStore(pool);
}
