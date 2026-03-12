import { Redis as IORedis } from 'ioredis';
import { env } from '../config/env.js';
import { getUpstreamGuardSnapshot } from './apiFootballClient.js';
import { getCacheHealthSnapshot } from './cache.js';
import { getNotificationsMetricsSnapshot } from './notifications/metrics.js';
import { getNotificationsQueueClient } from './notifications/runtime.js';
import { getReadStore, getSnapshotStore, } from './readStore/runtime.js';
import { BOOTSTRAP_DEFAULT_DISCOVERY_LIMIT } from '../routes/bootstrap/schemas.js';
import { buildBootstrapScopeKey } from '../routes/bootstrap/service.js';
const READ_STORE_HEARTBEAT_STALE_MS = 5 * 60_000;
let readinessRedisClient = null;
let readinessRedisUrl = null;
let postgresHealthClient = null;
const defaultRuntimeStatusDependencies = {
    getCacheHealthSnapshot,
    getNotificationsMetricsSnapshot,
    getNotificationsQueueClient,
    getReadStore,
    getSnapshotStore,
    getUpstreamGuardSnapshot,
    pingRedis,
    pingPostgres,
};
let runtimeStatusDependencies = {
    ...defaultRuntimeStatusDependencies,
};
function isProductionLikeEnv() {
    return env.appEnv === 'staging' || env.appEnv === 'production';
}
function isQueueRequired() {
    return env.notificationsBackendEnabled && isProductionLikeEnv();
}
function buildSkippedCheck(details) {
    return {
        required: false,
        ready: true,
        status: 'skipped',
        details,
    };
}
function buildDegradedCheck(details) {
    return {
        required: true,
        ready: false,
        status: 'degraded',
        details,
    };
}
function buildReadyCheck(details) {
    return {
        required: true,
        ready: true,
        status: 'ready',
        details,
    };
}
function escapePrometheusLabelValue(value) {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}
function buildMetricLine(name, value, labels) {
    if (!labels || Object.keys(labels).length === 0) {
        return `${name} ${value}`;
    }
    const renderedLabels = Object.entries(labels)
        .map(([key, labelValue]) => `${key}="${escapePrometheusLabelValue(labelValue)}"`)
        .join(',');
    return `${name}{${renderedLabels}} ${value}`;
}
function resolveDateInTimezone(timezone, now = new Date()) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    return formatter.format(now);
}
function resolveSeasonFromDate(date) {
    const year = Number.parseInt(date.slice(0, 4), 10);
    const month = Number.parseInt(date.slice(5, 7), 10);
    if (!Number.isFinite(year) || !Number.isFinite(month)) {
        return new Date().getUTCFullYear();
    }
    return month >= 7 ? year : year - 1;
}
function appendMetricBlock(lines, name, type, help, series) {
    lines.push(`# HELP ${name} ${help}`);
    lines.push(`# TYPE ${name} ${type}`);
    lines.push(...series);
}
function getReadinessRedisClient(redisUrl) {
    if (readinessRedisClient && readinessRedisUrl === redisUrl) {
        return readinessRedisClient;
    }
    readinessRedisClient?.disconnect();
    readinessRedisUrl = redisUrl;
    readinessRedisClient = new IORedis(redisUrl, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
    });
    return readinessRedisClient;
}
async function pingRedis(redisUrl) {
    const client = getReadinessRedisClient(redisUrl);
    await client.ping();
}
async function getPostgresHealthClient(connectionString) {
    if (postgresHealthClient && postgresHealthClient.connectionString === connectionString) {
        return postgresHealthClient;
    }
    if (postgresHealthClient) {
        await postgresHealthClient.end();
    }
    const imported = await import('pg');
    const PoolConstructor = imported.Pool;
    const pool = new PoolConstructor({
        connectionString,
        max: 1,
        idleTimeoutMillis: 5_000,
    });
    postgresHealthClient = {
        connectionString,
        query: sql => pool.query(sql),
        end: () => pool.end(),
    };
    return postgresHealthClient;
}
async function pingPostgres(databaseUrl) {
    const client = await getPostgresHealthClient(databaseUrl);
    await client.query('SELECT 1');
}
async function buildRedisCheck() {
    const cacheSnapshot = runtimeStatusDependencies.getCacheHealthSnapshot();
    const required = cacheSnapshot.backend === 'redis' || (env.notificationsBackendEnabled && isProductionLikeEnv());
    if (!required) {
        return buildSkippedCheck({
            configured: Boolean(env.redisUrl),
            cacheBackend: cacheSnapshot.backend,
            cacheDegraded: cacheSnapshot.degraded,
        });
    }
    if (cacheSnapshot.backend === 'redis') {
        if (cacheSnapshot.degraded) {
            return buildDegradedCheck({
                configured: true,
                cacheBackend: cacheSnapshot.backend,
                cacheDegraded: true,
                error: cacheSnapshot.redis.lastError ?? 'Redis cache backend is degraded.',
            });
        }
        return buildReadyCheck({
            configured: true,
            cacheBackend: cacheSnapshot.backend,
            cacheDegraded: false,
        });
    }
    if (!env.redisUrl) {
        return buildDegradedCheck({
            configured: false,
            cacheBackend: cacheSnapshot.backend,
            cacheDegraded: cacheSnapshot.degraded,
            error: 'REDIS_URL is required for active runtime dependencies.',
        });
    }
    try {
        await runtimeStatusDependencies.pingRedis(env.redisUrl);
    }
    catch (error) {
        return buildDegradedCheck({
            configured: true,
            cacheBackend: cacheSnapshot.backend,
            cacheDegraded: true,
            error: error instanceof Error ? error.message : String(error),
        });
    }
    if (cacheSnapshot.degraded) {
        return buildDegradedCheck({
            configured: true,
            cacheBackend: cacheSnapshot.backend,
            cacheDegraded: true,
            error: cacheSnapshot.redis.lastError ?? 'Cache backend is degraded.',
        });
    }
    return buildReadyCheck({
        configured: true,
        cacheBackend: cacheSnapshot.backend,
        cacheDegraded: false,
    });
}
async function buildPostgresCheck() {
    // Postgres est requis si notifications OU read-store l'utilisent.
    const requiredForNotifications = env.notificationsPersistenceBackend === 'postgres';
    const requiredForReadStore = Boolean(env.databaseUrl);
    const required = requiredForNotifications || requiredForReadStore;
    if (!required) {
        return buildSkippedCheck({
            backend: env.notificationsPersistenceBackend,
            configured: false,
        });
    }
    if (!env.databaseUrl) {
        return buildDegradedCheck({
            backend: env.notificationsPersistenceBackend,
            configured: false,
            error: 'DATABASE_URL is required for postgres persistence (notifications or read-store).',
        });
    }
    try {
        await runtimeStatusDependencies.pingPostgres(env.databaseUrl);
    }
    catch (error) {
        return buildDegradedCheck({
            backend: env.notificationsPersistenceBackend,
            configured: true,
            error: error instanceof Error ? error.message : String(error),
        });
    }
    return buildReadyCheck({
        backend: env.notificationsPersistenceBackend,
        configured: true,
    });
}
async function buildQueueCheck(redisCheck) {
    const required = isQueueRequired();
    if (!required) {
        return buildSkippedCheck({
            enabled: env.notificationsBackendEnabled,
            initialized: false,
        });
    }
    if (!env.redisUrl) {
        return buildDegradedCheck({
            enabled: env.notificationsBackendEnabled,
            initialized: false,
            error: 'REDIS_URL is required for queue initialization.',
        });
    }
    try {
        await runtimeStatusDependencies.getNotificationsQueueClient({
            redisUrl: env.redisUrl,
            enabled: env.notificationsBackendEnabled,
        });
    }
    catch (error) {
        return buildDegradedCheck({
            enabled: env.notificationsBackendEnabled,
            initialized: false,
            error: error instanceof Error ? error.message : String(error),
        });
    }
    if (!redisCheck.ready) {
        return buildDegradedCheck({
            enabled: env.notificationsBackendEnabled,
            initialized: true,
            error: 'Queue initialized but Redis dependency is degraded.',
        });
    }
    return buildReadyCheck({
        enabled: env.notificationsBackendEnabled,
        initialized: true,
    });
}
async function buildReadStoreCheck() {
    const defaultTimezone = 'Europe/Paris';
    const defaultDate = resolveDateInTimezone(defaultTimezone);
    const defaultSeason = resolveSeasonFromDate(defaultDate);
    const defaultScopeKey = buildBootstrapScopeKey({
        date: defaultDate,
        timezone: defaultTimezone,
        season: defaultSeason,
        discoveryLimit: BOOTSTRAP_DEFAULT_DISCOVERY_LIMIT,
        followedPlayerIds: [],
        followedTeamIds: [],
    });
    if (!env.databaseUrl) {
        return buildSkippedCheck({
            backend: 'memory',
            postgresReachable: false,
            backlog: {
                queued: 0,
                inProgress: 0,
                failed: 0,
                total: 0,
            },
            bootstrapSnapshotAvailable: false,
            defaultScopeKey,
            workerHeartbeatAgeMs: null,
            workerHeartbeatStale: false,
            backlogBlocked: false,
            refreshFailureRows: 0,
            degradedReasons: [],
        });
    }
    try {
        const [store, snapshotStore] = await Promise.all([
            runtimeStatusDependencies.getReadStore({
                databaseUrl: env.databaseUrl,
            }),
            runtimeStatusDependencies.getSnapshotStore({
                backend: 'postgres',
                databaseUrl: env.databaseUrl,
            }),
        ]);
        const [backlog, statusSnapshot, bootstrapSnapshot] = await Promise.all([
            store.countRefreshBacklog(),
            snapshotStore.getStatusSnapshot(),
            store.getBootstrapSnapshot({
                scopeKey: defaultScopeKey,
            }),
        ]);
        const bootstrapSnapshotAvailable = bootstrapSnapshot.status !== 'miss';
        const workerHeartbeatAgeMs = statusSnapshot.workerHeartbeatAgeMs;
        const workerHeartbeatMissing = workerHeartbeatAgeMs === null;
        const workerHeartbeatStale = workerHeartbeatAgeMs !== null && workerHeartbeatAgeMs > READ_STORE_HEARTBEAT_STALE_MS;
        const backlogBlocked = backlog.queued > 0 &&
            backlog.inProgress === 0 &&
            (workerHeartbeatMissing
                || workerHeartbeatStale
                || statusSnapshot.refreshFailureRows > 0);
        const hasRefreshFailures = backlog.failed > 0 || statusSnapshot.refreshFailureRows > 0;
        const degradedReasons = [];
        if (!bootstrapSnapshotAvailable) {
            degradedReasons.push('bootstrap_snapshot_missing');
        }
        if (workerHeartbeatMissing) {
            degradedReasons.push('worker_heartbeat_missing');
        }
        else if (workerHeartbeatStale) {
            degradedReasons.push('worker_heartbeat_stale');
        }
        if (backlogBlocked) {
            degradedReasons.push('refresh_backlog_blocked');
        }
        if (hasRefreshFailures) {
            degradedReasons.push('refresh_failures_present');
        }
        const ready = bootstrapSnapshotAvailable &&
            !workerHeartbeatMissing &&
            !workerHeartbeatStale &&
            !backlogBlocked &&
            !hasRefreshFailures;
        const status = ready ? 'ready' : 'degraded';
        return {
            required: true,
            ready,
            status,
            details: {
                backend: store.backend,
                postgresReachable: true,
                backlog,
                bootstrapSnapshotAvailable,
                defaultScopeKey,
                workerHeartbeatAgeMs,
                workerHeartbeatStale,
                backlogBlocked,
                refreshFailureRows: statusSnapshot.refreshFailureRows,
                degradedReasons,
            },
        };
    }
    catch (error) {
        return {
            required: true,
            ready: false,
            status: 'degraded',
            details: {
                backend: 'postgres',
                postgresReachable: false,
                backlog: {
                    queued: 0,
                    inProgress: 0,
                    failed: 0,
                    total: 0,
                },
                bootstrapSnapshotAvailable: false,
                defaultScopeKey,
                workerHeartbeatAgeMs: null,
                workerHeartbeatStale: false,
                backlogBlocked: false,
                refreshFailureRows: 0,
                degradedReasons: ['read_store_unreachable'],
                error: error instanceof Error ? error.message : String(error),
            },
        };
    }
}
async function buildUpstreamGuardCheck() {
    const snapshot = await runtimeStatusDependencies.getUpstreamGuardSnapshot();
    const openFamilies = snapshot.circuitBreaker.openFamilies.map(item => item.family);
    const ready = snapshot.quota.state !== 'exhausted';
    const status = !ready || openFamilies.length > 0 || snapshot.quota.state === 'critical'
        ? 'degraded'
        : 'ready';
    return {
        required: true,
        ready,
        status,
        details: {
            quotaState: snapshot.quota.state,
            openFamilies,
            limitPerMinute: snapshot.quota.limitPerMinute,
            usedThisMinute: snapshot.quota.usedThisMinute,
        },
    };
}
export async function buildReadinessPayload() {
    const redisCheck = await buildRedisCheck();
    const postgresCheck = await buildPostgresCheck();
    const queueCheck = await buildQueueCheck(redisCheck);
    const readStoreCheck = await buildReadStoreCheck();
    const upstreamGuardCheck = await buildUpstreamGuardCheck();
    const status = redisCheck.ready &&
        postgresCheck.ready &&
        queueCheck.ready &&
        readStoreCheck.ready &&
        upstreamGuardCheck.ready
        ? 'ready'
        : 'degraded';
    return {
        status,
        timestamp: new Date().toISOString(),
        checks: {
            redis: redisCheck,
            postgres: postgresCheck,
            queue: queueCheck,
            readStore: readStoreCheck,
            upstreamGuard: upstreamGuardCheck,
        },
    };
}
export async function renderPrometheusMetrics() {
    const lines = [];
    const cacheSnapshot = runtimeStatusDependencies.getCacheHealthSnapshot();
    const notificationsSnapshot = runtimeStatusDependencies.getNotificationsMetricsSnapshot();
    const upstreamSnapshot = await runtimeStatusDependencies.getUpstreamGuardSnapshot();
    let readStoreMetrics = null;
    try {
        const defaultScopeKey = buildBootstrapScopeKey({
            date: resolveDateInTimezone('Europe/Paris'),
            timezone: 'Europe/Paris',
            season: resolveSeasonFromDate(resolveDateInTimezone('Europe/Paris')),
            discoveryLimit: BOOTSTRAP_DEFAULT_DISCOVERY_LIMIT,
            followedPlayerIds: [],
            followedTeamIds: [],
        });
        const [store, snapshotStore] = await Promise.all([
            runtimeStatusDependencies.getReadStore({ databaseUrl: env.databaseUrl }),
            runtimeStatusDependencies.getSnapshotStore({
                backend: env.databaseUrl ? 'postgres' : 'memory',
                databaseUrl: env.databaseUrl,
            }),
        ]);
        const [backlog, bootstrapSnapshot, statusSnapshot] = await Promise.all([
            store.countRefreshBacklog(),
            store.getBootstrapSnapshot({ scopeKey: defaultScopeKey }),
            snapshotStore.getStatusSnapshot(),
        ]);
        const workerHeartbeatAgeMs = statusSnapshot.workerHeartbeatAgeMs;
        const workerHeartbeatStale = workerHeartbeatAgeMs !== null && workerHeartbeatAgeMs > READ_STORE_HEARTBEAT_STALE_MS;
        readStoreMetrics = {
            backlog,
            bootstrapAvailable: bootstrapSnapshot.status !== 'miss',
            workerHeartbeatAgeMs: statusSnapshot.workerHeartbeatAgeMs,
            backlogBlocked: backlog.queued > 0
                && backlog.inProgress === 0
                && (workerHeartbeatAgeMs === null
                    || workerHeartbeatStale
                    || statusSnapshot.refreshFailureRows > 0),
            refreshFailureRows: statusSnapshot.refreshFailureRows,
        };
    }
    catch {
        readStoreMetrics = null;
    }
    appendMetricBlock(lines, 'footalert_bff_up', 'gauge', 'Process liveness for the FootAlert BFF.', [
        'footalert_bff_up 1',
    ]);
    appendMetricBlock(lines, 'footalert_bff_node_role', 'gauge', 'Node role exposed by this process.', [buildMetricLine('footalert_bff_node_role', 1, { role: env.nodeRole })]);
    appendMetricBlock(lines, 'footalert_bff_process_uptime_seconds', 'gauge', 'Node.js process uptime in seconds.', [`footalert_bff_process_uptime_seconds ${Math.floor(process.uptime())}`]);
    appendMetricBlock(lines, 'footalert_bff_process_heap_used_bytes', 'gauge', 'Heap used by the Node.js process.', [`footalert_bff_process_heap_used_bytes ${process.memoryUsage().heapUsed}`]);
    appendMetricBlock(lines, 'footalert_bff_cache_degraded', 'gauge', 'Cache degradation state.', [`footalert_bff_cache_degraded ${cacheSnapshot.degraded ? 1 : 0}`]);
    appendMetricBlock(lines, 'footalert_bff_cache_backend', 'gauge', 'Cache backend configured on the process.', [buildMetricLine('footalert_bff_cache_backend', 1, { backend: cacheSnapshot.backend })]);
    appendMetricBlock(lines, 'footalert_bff_upstream_quota_limit_per_minute', 'gauge', 'Configured global upstream quota budget per minute.', [`footalert_bff_upstream_quota_limit_per_minute ${upstreamSnapshot.quota.limitPerMinute}`]);
    appendMetricBlock(lines, 'footalert_bff_upstream_quota_used_this_minute', 'gauge', 'Observed upstream quota usage for the current minute bucket.', [`footalert_bff_upstream_quota_used_this_minute ${upstreamSnapshot.quota.usedThisMinute}`]);
    appendMetricBlock(lines, 'footalert_bff_upstream_quota_remaining_this_minute', 'gauge', 'Remaining upstream quota budget for the current minute bucket.', [`footalert_bff_upstream_quota_remaining_this_minute ${upstreamSnapshot.quota.remainingThisMinute}`]);
    appendMetricBlock(lines, 'footalert_bff_upstream_quota_state', 'gauge', 'Current upstream quota state by label.', [buildMetricLine('footalert_bff_upstream_quota_state', 1, { state: upstreamSnapshot.quota.state })]);
    appendMetricBlock(lines, 'footalert_bff_upstream_circuit_open_families', 'gauge', 'Number of circuit-breaker families currently open.', [`footalert_bff_upstream_circuit_open_families ${upstreamSnapshot.circuitBreaker.openFamilies.length}`]);
    const requestSeries = upstreamSnapshot.routeFamilies.map(item => buildMetricLine('footalert_bff_upstream_requests_total', item.requests, {
        family: item.family,
        priority: item.priority,
    }));
    appendMetricBlock(lines, 'footalert_bff_upstream_requests_total', 'counter', 'Observed upstream requests by route family and priority class.', requestSeries.length > 0 ? requestSeries : ['footalert_bff_upstream_requests_total 0']);
    const shedSeries = upstreamSnapshot.routeFamilies.map(item => buildMetricLine('footalert_bff_upstream_sheds_total', item.sheds, {
        family: item.family,
        priority: item.priority,
    }));
    appendMetricBlock(lines, 'footalert_bff_upstream_sheds_total', 'counter', 'Observed quota-shed events by route family and priority class.', shedSeries.length > 0 ? shedSeries : ['footalert_bff_upstream_sheds_total 0']);
    if (readStoreMetrics) {
        appendMetricBlock(lines, 'footalert_bff_readstore_refresh_queued', 'gauge', 'Number of snapshot refresh jobs queued in read-store.', [`footalert_bff_readstore_refresh_queued ${readStoreMetrics.backlog.queued}`]);
        appendMetricBlock(lines, 'footalert_bff_readstore_refresh_in_progress', 'gauge', 'Number of snapshot refresh jobs in progress in read-store.', [`footalert_bff_readstore_refresh_in_progress ${readStoreMetrics.backlog.inProgress}`]);
        appendMetricBlock(lines, 'footalert_bff_readstore_refresh_failed', 'gauge', 'Number of failed snapshot refresh jobs in read-store.', [`footalert_bff_readstore_refresh_failed ${readStoreMetrics.backlog.failed}`]);
        appendMetricBlock(lines, 'footalert_bff_readstore_backlog_total', 'gauge', 'Total number of snapshot refresh jobs currently tracked in read-store.', [`footalert_bff_readstore_backlog_total ${readStoreMetrics.backlog.total}`]);
        appendMetricBlock(lines, 'footalert_bff_readstore_bootstrap_available', 'gauge', 'Whether the default bootstrap snapshot is currently available in read-store.', [`footalert_bff_readstore_bootstrap_available ${readStoreMetrics.bootstrapAvailable ? 1 : 0}`]);
        appendMetricBlock(lines, 'footalert_bff_readstore_worker_heartbeat_age_ms', 'gauge', 'Age in milliseconds of the latest read-store worker heartbeat.', [`footalert_bff_readstore_worker_heartbeat_age_ms ${readStoreMetrics.workerHeartbeatAgeMs ?? 0}`]);
        appendMetricBlock(lines, 'footalert_bff_readstore_backlog_blocked', 'gauge', 'Whether the read-store refresh backlog is currently blocked.', [`footalert_bff_readstore_backlog_blocked ${readStoreMetrics.backlogBlocked ? 1 : 0}`]);
        appendMetricBlock(lines, 'footalert_bff_readstore_refresh_failure_rows', 'gauge', 'Number of refresh queue rows carrying a last_error value.', [`footalert_bff_readstore_refresh_failure_rows ${readStoreMetrics.refreshFailureRows}`]);
    }
    for (const [name, value] of Object.entries(notificationsSnapshot.counters)) {
        appendMetricBlock(lines, name, 'counter', `Notification counter ${name}.`, [`${name} ${value}`]);
    }
    for (const [name, value] of Object.entries(notificationsSnapshot.gauges)) {
        appendMetricBlock(lines, name, 'gauge', `Notification gauge ${name}.`, [`${name} ${value}`]);
    }
    return `${lines.join('\n')}\n`;
}
export function configureRuntimeStatusForTests(overrides) {
    runtimeStatusDependencies = {
        ...defaultRuntimeStatusDependencies,
        ...overrides,
    };
}
export async function resetRuntimeStatusForTests() {
    readinessRedisClient?.disconnect();
    readinessRedisClient = null;
    readinessRedisUrl = null;
    if (postgresHealthClient) {
        await postgresHealthClient.end();
    }
    postgresHealthClient = null;
    runtimeStatusDependencies = {
        ...defaultRuntimeStatusDependencies,
    };
}
