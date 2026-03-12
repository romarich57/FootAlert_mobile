import assert from 'node:assert/strict';
import test from 'node:test';

process.env.APP_ENV = 'test';
process.env.NODE_ENV = 'test';
process.env.NODE_ROLE = 'api';
process.env.API_FOOTBALL_KEY = 'test-server-key';
process.env.MOBILE_SESSION_JWT_SECRET = 'test-mobile-session-secret';
process.env.MOBILE_ATTESTATION_ACCEPT_MOCK = 'true';
process.env.NOTIFICATIONS_BACKEND_ENABLED = 'false';
process.env.NOTIFICATIONS_EVENT_INGEST_ENABLED = 'false';
process.env.NOTIFICATIONS_PERSISTENCE_BACKEND = 'memory';
process.env.NOTIFICATIONS_INGEST_TOKEN = 'test-notifications-ingest-token';
process.env.PUSH_TOKEN_ENCRYPTION_KEY = 'test-notifications-encryption-key';

function createUpstreamGuardSnapshot() {
  return {
    quota: {
      state: 'healthy',
      limitPerMinute: 600,
      usedThisMinute: 0,
      remainingThisMinute: 600,
    },
    circuitBreaker: {
      openFamilies: [],
    },
    routeFamilies: [],
  };
}

function createReadStoreStatusSnapshot(input: {
  refreshBacklog: number;
  bootstrapAvailable: boolean;
  workerHeartbeatAgeMs: number | null;
  refreshFailureRows: number;
}) {
  return {
    backend: 'postgres' as const,
    metrics: {
      freshHits: 0,
      staleHits: 0,
      expiredHits: 0,
      misses: 0,
      servedCount: 0,
      fallbackCount: 0,
      refreshFailures: 0,
      avgServedAgeMs: 0,
      hitRatio: 1,
    },
    refreshBacklog: input.refreshBacklog,
    liveTrackedMatches: 0,
    bootstrapAvailable: input.bootstrapAvailable,
    workerHeartbeatAgeMs: input.workerHeartbeatAgeMs,
    refreshFailureRows: input.refreshFailureRows,
  };
}

test('buildReadinessPayload degrades when the default bootstrap snapshot is missing', async () => {
  const runtimeStatusModule = await import(
    `../src/lib/runtimeStatus.ts?case=${Math.random().toString(36).slice(2)}`
  );
  const { env } = await import('../src/config/env.ts');

  const previousDatabaseUrl = env.databaseUrl;

  try {
    env.databaseUrl = 'postgres://footalert:test@localhost:5432/runtime-status';

    runtimeStatusModule.configureRuntimeStatusForTests({
      pingPostgres: async () => undefined,
      getReadStore: async () =>
        ({
          backend: 'postgres',
          countRefreshBacklog: async () => ({
            queued: 0,
            inProgress: 0,
            failed: 0,
            total: 0,
          }),
          getBootstrapSnapshot: async () => ({ status: 'miss' }),
        }) as never,
      getSnapshotStore: async () =>
        ({
          getStatusSnapshot: async () =>
            createReadStoreStatusSnapshot({
              refreshBacklog: 0,
              bootstrapAvailable: false,
              workerHeartbeatAgeMs: 1_000,
              refreshFailureRows: 0,
            }),
        }) as never,
      getUpstreamGuardSnapshot: async () => createUpstreamGuardSnapshot(),
    });

    const payload = await runtimeStatusModule.buildReadinessPayload();

    assert.equal(payload.status, 'degraded');
    assert.equal(payload.checks.readStore.ready, false);
    assert.equal(payload.checks.readStore.status, 'degraded');
    assert.equal(payload.checks.readStore.details.bootstrapSnapshotAvailable, false);
    assert.equal(payload.checks.readStore.details.backlogBlocked, false);
    assert.deepEqual(payload.checks.readStore.details.degradedReasons, [
      'bootstrap_snapshot_missing',
    ]);
  } finally {
    env.databaseUrl = previousDatabaseUrl;
    await runtimeStatusModule.resetRuntimeStatusForTests();
  }
});

test('buildReadinessPayload degrades when the worker heartbeat is stale and the backlog is blocked', async () => {
  const runtimeStatusModule = await import(
    `../src/lib/runtimeStatus.ts?case=${Math.random().toString(36).slice(2)}`
  );
  const { env } = await import('../src/config/env.ts');

  const previousDatabaseUrl = env.databaseUrl;

  try {
    env.databaseUrl = 'postgres://footalert:test@localhost:5432/runtime-status';

    runtimeStatusModule.configureRuntimeStatusForTests({
      pingPostgres: async () => undefined,
      getReadStore: async () =>
        ({
          backend: 'postgres',
          countRefreshBacklog: async () => ({
            queued: 12,
            inProgress: 0,
            failed: 3,
            total: 15,
          }),
          getBootstrapSnapshot: async () => ({
            status: 'fresh',
            payload: { ok: true },
            generatedAt: new Date('2026-03-11T12:00:00.000Z'),
            staleAt: new Date('2026-03-11T12:05:00.000Z'),
            expiresAt: new Date('2026-03-11T12:30:00.000Z'),
            metadata: null,
          }),
        }) as never,
      getSnapshotStore: async () =>
        ({
          getStatusSnapshot: async () =>
            createReadStoreStatusSnapshot({
              refreshBacklog: 12,
              bootstrapAvailable: true,
              workerHeartbeatAgeMs: 301_000,
              refreshFailureRows: 3,
            }),
        }) as never,
      getUpstreamGuardSnapshot: async () => createUpstreamGuardSnapshot(),
    });

    const payload = await runtimeStatusModule.buildReadinessPayload();

    assert.equal(payload.status, 'degraded');
    assert.equal(payload.checks.readStore.ready, false);
    assert.equal(payload.checks.readStore.details.workerHeartbeatAgeMs, 301_000);
    assert.equal(payload.checks.readStore.details.workerHeartbeatStale, true);
    assert.equal(payload.checks.readStore.details.backlogBlocked, true);
    assert.deepEqual(payload.checks.readStore.details.degradedReasons, [
      'worker_heartbeat_stale',
      'refresh_backlog_blocked',
      'refresh_failures_present',
    ]);
  } finally {
    env.databaseUrl = previousDatabaseUrl;
    await runtimeStatusModule.resetRuntimeStatusForTests();
  }
});

test('renderPrometheusMetrics exposes read-store bootstrap, heartbeat and blockage metrics', async () => {
  const runtimeStatusModule = await import(
    `../src/lib/runtimeStatus.ts?case=${Math.random().toString(36).slice(2)}`
  );
  const { env } = await import('../src/config/env.ts');

  const previousDatabaseUrl = env.databaseUrl;

  try {
    env.databaseUrl = 'postgres://footalert:test@localhost:5432/runtime-status';

    runtimeStatusModule.configureRuntimeStatusForTests({
      getReadStore: async () =>
        ({
          backend: 'postgres',
          countRefreshBacklog: async () => ({
            queued: 8,
            inProgress: 0,
            failed: 2,
            total: 10,
          }),
          getBootstrapSnapshot: async () => ({ status: 'miss' }),
        }) as never,
      getSnapshotStore: async () =>
        ({
          getStatusSnapshot: async () =>
            createReadStoreStatusSnapshot({
              refreshBacklog: 8,
              bootstrapAvailable: false,
              workerHeartbeatAgeMs: 420_000,
              refreshFailureRows: 2,
            }),
        }) as never,
      getUpstreamGuardSnapshot: async () => createUpstreamGuardSnapshot(),
    });

    const metrics = await runtimeStatusModule.renderPrometheusMetrics();

    assert.match(metrics, /footalert_bff_readstore_refresh_queued 8/);
    assert.match(metrics, /footalert_bff_readstore_refresh_failed 2/);
    assert.match(metrics, /footalert_bff_readstore_backlog_total 10/);
    assert.match(metrics, /footalert_bff_readstore_bootstrap_available 0/);
    assert.match(metrics, /footalert_bff_readstore_worker_heartbeat_age_ms 420000/);
    assert.match(metrics, /footalert_bff_readstore_backlog_blocked 1/);
  } finally {
    env.databaseUrl = previousDatabaseUrl;
    await runtimeStatusModule.resetRuntimeStatusForTests();
  }
});
