import assert from 'node:assert/strict';
import test from 'node:test';

import type { ReadStore } from '../../src/lib/readStore/runtime.ts';
import type { TeamFullWorkerLogger } from '../../src/worker/shared.ts';

process.env.APP_ENV = 'test';
process.env.NODE_ENV = 'test';
process.env.NODE_ROLE = 'worker';
process.env.API_FOOTBALL_KEY = 'test-server-key';
process.env.MOBILE_SESSION_JWT_SECRET = 'test-mobile-session-secret';
process.env.MOBILE_ATTESTATION_ACCEPT_MOCK = 'true';
process.env.NOTIFICATIONS_BACKEND_ENABLED = 'true';
process.env.NOTIFICATIONS_EVENT_INGEST_ENABLED = 'true';
process.env.NOTIFICATIONS_PERSISTENCE_BACKEND = 'memory';
process.env.NOTIFICATIONS_INGEST_TOKEN = 'test-notifications-ingest-token';
process.env.PUSH_TOKEN_ENCRYPTION_KEY = 'test-notifications-encryption-key';

function createLogger(): TeamFullWorkerLogger {
  return {
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
    debug: () => undefined,
    trace: () => undefined,
    fatal: () => undefined,
    child: () => createLogger(),
  };
}

function createWindow(staleAfterMs: number, expiresAfterMs: number) {
  return {
    generatedAt: new Date('2026-03-11T08:00:00.000Z'),
    staleAt: new Date(1_000 + staleAfterMs),
    expiresAt: new Date(1_000 + expiresAfterMs),
  };
}

test('warmHotset preloads hot competitions and the default bootstrap snapshot', async () => {
  const { createReadStoreRefreshRuntime, HOTSET_COMPETITION_IDS } = await import(
    '../../src/worker/read-store-refresh.ts'
  );
  const entitySnapshots: Array<{ entityId: string; scopeKey?: string | null }> = [];
  const bootstrapScopes: string[] = [];
  const readStore = {
    upsertEntitySnapshot: async input => {
      entitySnapshots.push({ entityId: input.entityId, scopeKey: input.scopeKey });
    },
    upsertBootstrapSnapshot: async input => {
      bootstrapScopes.push(input.scopeKey);
    },
  } as unknown as ReadStore;

  const runtime = createReadStoreRefreshRuntime({
    readStore,
    logger: createLogger(),
    cacheTtl: {
      teams: 60_000,
      players: 60_000,
      competitions: 90_000,
      matches: 45_000,
    },
    services: {
      buildCompetitionFullResponse: async (competitionId, season) => ({ competitionId, season }),
      buildBootstrapPayload: async () => ({ ok: true }),
      buildBootstrapScopeKey: () => 'bootstrap:2026-03-11',
      buildReadStoreScopeKey: ({ season }) => `season:${season}`,
      buildSnapshotWindow: ({ staleAfterMs, expiresAfterMs }) =>
        createWindow(staleAfterMs, expiresAfterMs),
    },
  });

  await runtime.warmHotset();

  assert.equal(entitySnapshots.length, HOTSET_COMPETITION_IDS.length);
  assert.deepEqual(entitySnapshots.map(snapshot => snapshot.entityId), HOTSET_COMPETITION_IDS);
  assert.deepEqual(bootstrapScopes, ['bootstrap:2026-03-11']);
  assert.ok(entitySnapshots.every(snapshot => snapshot.scopeKey === 'season:2025'));
});

test('processSnapshotRefreshQueue completes successful jobs and marks failures', async () => {
  const { createReadStoreRefreshRuntime } = await import('../../src/worker/read-store-refresh.ts');
  const completedJobIds: string[] = [];
  const failedJobs: Array<{ jobId: string; error: string }> = [];
  const entitySnapshots: string[] = [];
  const overlays: string[] = [];
  const readStore = {
    claimRefreshJobs: async () => [
      {
        id: 'job-match',
        entityKind: 'match_full',
        entityId: '101',
        scopeKey: 'match:101',
        attempts: 0,
        lastError: null,
        payload: null,
      },
      {
        id: 'job-unsupported',
        entityKind: 'unknown',
        entityId: '999',
        scopeKey: 'unknown:999',
        attempts: 0,
        lastError: null,
        payload: null,
      },
    ],
    completeRefreshJob: async ({ jobId }) => {
      completedJobIds.push(jobId);
    },
    failRefreshJob: async input => {
      failedJobs.push(input);
    },
    upsertEntitySnapshot: async input => {
      entitySnapshots.push(input.entityId);
    },
    upsertMatchLiveOverlay: async ({ matchId }) => {
      overlays.push(matchId);
    },
  } as unknown as ReadStore;

  const runtime = createReadStoreRefreshRuntime({
    readStore,
    logger: createLogger(),
    cacheTtl: {
      teams: 60_000,
      players: 60_000,
      competitions: 60_000,
      matches: 45_000,
    },
    services: {
      decodeReadStoreScopeKey: () => ({ timezone: 'Europe/Paris' }),
      buildMatchFullResponse: async matchId => ({
        fixture: { id: matchId },
        lifecycleState: 'live',
        context: {},
        events: [],
        statistics: [],
        lineups: [],
        absences: [],
        playersStats: [],
      }),
      buildSnapshotWindow: ({ staleAfterMs, expiresAfterMs }) =>
        createWindow(staleAfterMs, expiresAfterMs),
    },
  });

  await runtime.processSnapshotRefreshQueue();

  assert.deepEqual(completedJobIds, ['job-match']);
  assert.equal(entitySnapshots[0], '101');
  assert.deepEqual(overlays, ['101']);
  assert.equal(failedJobs.length, 1);
  assert.equal(failedJobs[0]?.jobId, 'job-unsupported');
  assert.match(failedJobs[0]?.error ?? '', /Unsupported refresh entity kind/);
});
