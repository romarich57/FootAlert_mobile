import { Redis as IORedis } from 'ioredis';

import { env } from '../config/env.js';
import { getUpstreamGuardSnapshot } from './apiFootballClient.js';
import { getCacheHealthSnapshot } from './cache.js';
import { getNotificationsMetricsSnapshot } from './notifications/metrics.js';
import { getNotificationsQueueClient } from './notifications/runtime.js';

type DependencyStatus = 'ready' | 'degraded' | 'skipped';

type DependencyCheck<TDetails = Record<string, unknown>> = {
  required: boolean;
  ready: boolean;
  status: DependencyStatus;
  details: TDetails;
};

export type ReadinessPayload = {
  status: 'ready' | 'degraded';
  timestamp: string;
  checks: {
    redis: DependencyCheck<{
      configured: boolean;
      cacheBackend: string;
      cacheDegraded: boolean;
      error?: string;
    }>;
    postgres: DependencyCheck<{
      backend: string;
      configured: boolean;
      error?: string;
    }>;
    queue: DependencyCheck<{
      enabled: boolean;
      initialized: boolean;
      error?: string;
    }>;
    upstreamGuard: DependencyCheck<{
      quotaState: string;
      openFamilies: string[];
      limitPerMinute: number;
      usedThisMinute: number;
    }>;
  };
};

let readinessRedisClient: IORedis | null = null;
let readinessRedisUrl: string | null = null;
let postgresHealthClient:
  | {
      connectionString: string;
      query: (sql: string) => Promise<unknown>;
      end: () => Promise<void>;
    }
  | null = null;

function isProductionLikeEnv(): boolean {
  return env.appEnv === 'staging' || env.appEnv === 'production';
}

function isQueueRequired(): boolean {
  return env.notificationsBackendEnabled && isProductionLikeEnv();
}

function buildSkippedCheck<TDetails>(details: TDetails): DependencyCheck<TDetails> {
  return {
    required: false,
    ready: true,
    status: 'skipped',
    details,
  };
}

function buildDegradedCheck<TDetails>(details: TDetails): DependencyCheck<TDetails> {
  return {
    required: true,
    ready: false,
    status: 'degraded',
    details,
  };
}

function buildReadyCheck<TDetails>(details: TDetails): DependencyCheck<TDetails> {
  return {
    required: true,
    ready: true,
    status: 'ready',
    details,
  };
}

function escapePrometheusLabelValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function buildMetricLine(
  name: string,
  value: number,
  labels?: Record<string, string>,
): string {
  if (!labels || Object.keys(labels).length === 0) {
    return `${name} ${value}`;
  }

  const renderedLabels = Object.entries(labels)
    .map(([key, labelValue]) => `${key}="${escapePrometheusLabelValue(labelValue)}"`)
    .join(',');
  return `${name}{${renderedLabels}} ${value}`;
}

function appendMetricBlock(
  lines: string[],
  name: string,
  type: 'counter' | 'gauge',
  help: string,
  series: string[],
): void {
  lines.push(`# HELP ${name} ${help}`);
  lines.push(`# TYPE ${name} ${type}`);
  lines.push(...series);
}

function getReadinessRedisClient(redisUrl: string): IORedis {
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

async function pingRedis(redisUrl: string): Promise<void> {
  const client = getReadinessRedisClient(redisUrl);
  await client.ping();
}

async function getPostgresHealthClient(connectionString: string): Promise<{
  query: (sql: string) => Promise<unknown>;
  end: () => Promise<void>;
}> {
  if (postgresHealthClient && postgresHealthClient.connectionString === connectionString) {
    return postgresHealthClient;
  }

  if (postgresHealthClient) {
    await postgresHealthClient.end();
  }

  const imported = await import('pg');
  const PoolConstructor = imported.Pool as unknown as new (config: Record<string, unknown>) => {
    query: (sql: string) => Promise<unknown>;
    end: () => Promise<void>;
  };
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

async function pingPostgres(databaseUrl: string): Promise<void> {
  const client = await getPostgresHealthClient(databaseUrl);
  await client.query('SELECT 1');
}

async function buildRedisCheck(): Promise<ReadinessPayload['checks']['redis']> {
  const cacheSnapshot = getCacheHealthSnapshot();
  const required =
    cacheSnapshot.backend === 'redis' || (env.notificationsBackendEnabled && isProductionLikeEnv());

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
    await pingRedis(env.redisUrl);
  } catch (error) {
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

async function buildPostgresCheck(): Promise<ReadinessPayload['checks']['postgres']> {
  if (env.notificationsPersistenceBackend !== 'postgres') {
    return buildSkippedCheck({
      backend: env.notificationsPersistenceBackend,
      configured: Boolean(env.databaseUrl),
    });
  }

  if (!env.databaseUrl) {
    return buildDegradedCheck({
      backend: env.notificationsPersistenceBackend,
      configured: false,
      error: 'DATABASE_URL is required for postgres notifications persistence.',
    });
  }

  try {
    await pingPostgres(env.databaseUrl);
  } catch (error) {
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

async function buildQueueCheck(
  redisCheck: ReadinessPayload['checks']['redis'],
): Promise<ReadinessPayload['checks']['queue']> {
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
    await getNotificationsQueueClient({
      redisUrl: env.redisUrl,
      enabled: env.notificationsBackendEnabled,
    });
  } catch (error) {
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

async function buildUpstreamGuardCheck(): Promise<ReadinessPayload['checks']['upstreamGuard']> {
  const snapshot = await getUpstreamGuardSnapshot();
  const openFamilies = snapshot.circuitBreaker.openFamilies.map(item => item.family);
  const ready = snapshot.quota.state !== 'exhausted';
  const status: DependencyStatus =
    !ready || openFamilies.length > 0 || snapshot.quota.state === 'critical'
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

export async function buildReadinessPayload(): Promise<ReadinessPayload> {
  const redisCheck = await buildRedisCheck();
  const postgresCheck = await buildPostgresCheck();
  const queueCheck = await buildQueueCheck(redisCheck);
  const upstreamGuardCheck = await buildUpstreamGuardCheck();

  const status =
    redisCheck.ready && postgresCheck.ready && queueCheck.ready && upstreamGuardCheck.ready
      ? 'ready'
      : 'degraded';

  return {
    status,
    timestamp: new Date().toISOString(),
    checks: {
      redis: redisCheck,
      postgres: postgresCheck,
      queue: queueCheck,
      upstreamGuard: upstreamGuardCheck,
    },
  };
}

export async function renderPrometheusMetrics(): Promise<string> {
  const lines: string[] = [];
  const cacheSnapshot = getCacheHealthSnapshot();
  const notificationsSnapshot = getNotificationsMetricsSnapshot();
  const upstreamSnapshot = await getUpstreamGuardSnapshot();

  appendMetricBlock(lines, 'footalert_bff_up', 'gauge', 'Process liveness for the FootAlert BFF.', [
    'footalert_bff_up 1',
  ]);
  appendMetricBlock(
    lines,
    'footalert_bff_node_role',
    'gauge',
    'Node role exposed by this process.',
    [buildMetricLine('footalert_bff_node_role', 1, { role: env.nodeRole })],
  );
  appendMetricBlock(
    lines,
    'footalert_bff_process_uptime_seconds',
    'gauge',
    'Node.js process uptime in seconds.',
    [`footalert_bff_process_uptime_seconds ${Math.floor(process.uptime())}`],
  );
  appendMetricBlock(
    lines,
    'footalert_bff_process_heap_used_bytes',
    'gauge',
    'Heap used by the Node.js process.',
    [`footalert_bff_process_heap_used_bytes ${process.memoryUsage().heapUsed}`],
  );
  appendMetricBlock(
    lines,
    'footalert_bff_cache_degraded',
    'gauge',
    'Cache degradation state.',
    [`footalert_bff_cache_degraded ${cacheSnapshot.degraded ? 1 : 0}`],
  );
  appendMetricBlock(
    lines,
    'footalert_bff_cache_backend',
    'gauge',
    'Cache backend configured on the process.',
    [buildMetricLine('footalert_bff_cache_backend', 1, { backend: cacheSnapshot.backend })],
  );
  appendMetricBlock(
    lines,
    'footalert_bff_upstream_quota_limit_per_minute',
    'gauge',
    'Configured global upstream quota budget per minute.',
    [`footalert_bff_upstream_quota_limit_per_minute ${upstreamSnapshot.quota.limitPerMinute}`],
  );
  appendMetricBlock(
    lines,
    'footalert_bff_upstream_quota_used_this_minute',
    'gauge',
    'Observed upstream quota usage for the current minute bucket.',
    [`footalert_bff_upstream_quota_used_this_minute ${upstreamSnapshot.quota.usedThisMinute}`],
  );
  appendMetricBlock(
    lines,
    'footalert_bff_upstream_quota_remaining_this_minute',
    'gauge',
    'Remaining upstream quota budget for the current minute bucket.',
    [`footalert_bff_upstream_quota_remaining_this_minute ${upstreamSnapshot.quota.remainingThisMinute}`],
  );
  appendMetricBlock(
    lines,
    'footalert_bff_upstream_quota_state',
    'gauge',
    'Current upstream quota state by label.',
    [buildMetricLine('footalert_bff_upstream_quota_state', 1, { state: upstreamSnapshot.quota.state })],
  );
  appendMetricBlock(
    lines,
    'footalert_bff_upstream_circuit_open_families',
    'gauge',
    'Number of circuit-breaker families currently open.',
    [`footalert_bff_upstream_circuit_open_families ${upstreamSnapshot.circuitBreaker.openFamilies.length}`],
  );

  const requestSeries = upstreamSnapshot.routeFamilies.map(item =>
    buildMetricLine('footalert_bff_upstream_requests_total', item.requests, {
      family: item.family,
      priority: item.priority,
    }),
  );
  appendMetricBlock(
    lines,
    'footalert_bff_upstream_requests_total',
    'counter',
    'Observed upstream requests by route family and priority class.',
    requestSeries.length > 0 ? requestSeries : ['footalert_bff_upstream_requests_total 0'],
  );

  const shedSeries = upstreamSnapshot.routeFamilies.map(item =>
    buildMetricLine('footalert_bff_upstream_sheds_total', item.sheds, {
      family: item.family,
      priority: item.priority,
    }),
  );
  appendMetricBlock(
    lines,
    'footalert_bff_upstream_sheds_total',
    'counter',
    'Observed quota-shed events by route family and priority class.',
    shedSeries.length > 0 ? shedSeries : ['footalert_bff_upstream_sheds_total 0'],
  );

  for (const [name, value] of Object.entries(notificationsSnapshot.counters)) {
    appendMetricBlock(
      lines,
      name,
      'counter',
      `Notification counter ${name}.`,
      [`${name} ${value}`],
    );
  }

  for (const [name, value] of Object.entries(notificationsSnapshot.gauges)) {
    appendMetricBlock(
      lines,
      name,
      'gauge',
      `Notification gauge ${name}.`,
      [`${name} ${value}`],
    );
  }

  return `${lines.join('\n')}\n`;
}

export async function resetRuntimeStatusForTests(): Promise<void> {
  readinessRedisClient?.disconnect();
  readinessRedisClient = null;
  readinessRedisUrl = null;

  if (postgresHealthClient) {
    await postgresHealthClient.end();
  }
  postgresHealthClient = null;
}
