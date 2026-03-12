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
  const entitySnapshots: Array<{
    entityKind: string;
    entityId: string;
    scopeKey?: string | null;
  }> = [];
  const bootstrapScopes: string[] = [];
  const readStore = {
    getEntitySnapshot: async () => ({ status: 'miss' }),
    upsertEntitySnapshot: async input => {
      entitySnapshots.push({
        entityKind: input.entityKind,
        entityId: input.entityId,
        scopeKey: input.scopeKey,
      });
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
      buildCompetitionFullResponse: async (competitionId, season) => ({
        _meta: {},
        competition: { id: competitionId },
        competitionKind: 'league',
        season,
        standings: {
          league: {
            standings: [[
              { team: { id: Number.parseInt(`${competitionId}01`, 10) } },
              { team: { id: Number.parseInt(`${competitionId}02`, 10) } },
            ]],
          },
        },
        matches: [],
        bracket: null,
        playerStats: {
          topScorers: [{ player: { id: Number.parseInt(`${competitionId}99`, 10) } }],
          topAssists: [],
          topYellowCards: [],
          topRedCards: [],
        },
        teamStats: null,
        transfers: [],
      }),
      buildBootstrapPayload: async () => ({ ok: true }),
      buildBootstrapScopeKey: () => 'bootstrap:2026-03-11',
      buildReadStoreScopeKey: parts =>
        new URLSearchParams(
          Object.entries(parts)
            .filter(([, value]) => value !== null && value !== undefined)
            .map(([key, value]) => [key, String(value)]),
        ).toString(),
      buildSnapshotWindow: ({ staleAfterMs, expiresAfterMs }) =>
        createWindow(staleAfterMs, expiresAfterMs),
      fetchTeamFullPayload: async ({ teamId, leagueId, season }) => ({
        _meta: {},
        response: {
          details: { response: [{ team: { id: teamId } }] },
          leagues: { response: [{ league: { id: leagueId } }] },
          selection: { leagueId, season },
          overview: null,
          overviewLeaders: null,
          standings: { response: null },
          matches: { response: [] },
          statistics: { response: null },
          advancedStats: { response: null },
          statsPlayers: { response: [] },
          squad: {
            response: [{
              players: [
                { id: Number.parseInt(`${teamId}1`, 10) },
                { id: Number.parseInt(`${teamId}2`, 10) },
              ],
              coach: null,
            }],
          },
          transfers: { response: [] },
          trophies: { response: [] },
        },
      }),
      fetchPlayerFullPayload: async ({ playerId, season }) => ({
        _meta: {},
        response: {
          details: { response: [{ player: { id: playerId } }] },
          seasons: { response: [season] },
          trophies: { response: [] },
          career: { response: { seasons: [], teams: [] } },
          overview: { response: { profile: { player: { id: playerId } } } },
          statsCatalog: { response: {} },
          matches: { response: [] },
        },
      }),
    },
  });

  await runtime.warmHotset();

  const competitions = entitySnapshots.filter(snapshot => snapshot.entityKind === 'competition_full');
  const teams = entitySnapshots.filter(snapshot => snapshot.entityKind === 'team_full');
  const players = entitySnapshots.filter(snapshot => snapshot.entityKind === 'player_full');

  assert.equal(competitions.length, HOTSET_COMPETITION_IDS.length);
  assert.deepEqual(competitions.map(snapshot => snapshot.entityId), HOTSET_COMPETITION_IDS);
  assert.equal(teams.length, HOTSET_COMPETITION_IDS.length * 2);
  assert.equal(players.length, HOTSET_COMPETITION_IDS.length * 5);
  assert.deepEqual(bootstrapScopes, ['bootstrap:2026-03-11']);
  assert.ok(competitions.every(snapshot => snapshot.scopeKey === 'season=2025'));
  assert.ok(teams.every(snapshot => snapshot.scopeKey?.includes('season=2025')));
  assert.ok(players.every(snapshot => snapshot.scopeKey === 'season=2025'));
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

test('refreshSnapshotForJob rejects incomplete player payloads without overwriting the stored snapshot', async () => {
  const { createReadStoreRefreshRuntime } = await import('../../src/worker/read-store-refresh.ts');
  const upsertedEntityIds: string[] = [];
  const runtime = createReadStoreRefreshRuntime({
    readStore: {
      upsertEntitySnapshot: async input => {
        upsertedEntityIds.push(input.entityId);
      },
    } as unknown as ReadStore,
    logger: createLogger(),
    cacheTtl: {
      teams: 60_000,
      players: 60_000,
      competitions: 60_000,
      matches: 45_000,
    },
    services: {
      decodeReadStoreScopeKey: () => ({ season: '2025' }),
      fetchPlayerFullPayload: async () => ({
        _meta: {},
        response: {
          details: { response: [] },
          seasons: { response: [] },
          trophies: { response: [] },
          career: { response: { seasons: [], teams: [] } },
          overview: { response: null },
          statsCatalog: { response: null },
          matches: { response: [] },
        },
      }),
      buildSnapshotWindow: ({ staleAfterMs, expiresAfterMs }) =>
        createWindow(staleAfterMs, expiresAfterMs),
    },
  });

  await assert.rejects(
    runtime.refreshSnapshotForJob({
      id: 'player-job',
      entityKind: 'player_full',
      entityId: '501',
      scopeKey: 'season=2025',
      attempts: 0,
      lastError: null,
      payload: null,
    }),
    /player_full snapshot is incomplete/i,
  );

  assert.deepEqual(upsertedEntityIds, []);
});

test('processSnapshotRefreshQueue publishes a worker heartbeat for the cycle', async () => {
  const { createReadStoreRefreshRuntime } = await import('../../src/worker/read-store-refresh.ts');
  const heartbeats: Array<{ workerId: string; metadata?: Record<string, unknown> | null }> = [];
  const runtime = createReadStoreRefreshRuntime({
    readStore: {
      claimRefreshJobs: async () => [],
    } as unknown as ReadStore,
    logger: createLogger(),
    cacheTtl: {
      teams: 60_000,
      players: 60_000,
      competitions: 60_000,
      matches: 45_000,
    },
    workerId: 'read-store-worker-test',
    heartbeatStore: {
      upsertWorkerHeartbeat: async input => {
        heartbeats.push({
          workerId: input.workerId,
          metadata: input.metadata ?? null,
        });
      },
    },
  });

  await runtime.processSnapshotRefreshQueue();

  assert.ok(heartbeats.length >= 1);
  assert.equal(heartbeats[0]?.workerId, 'read-store-worker-test');
  assert.equal(heartbeats[0]?.metadata?.source, 'read_store_refresh_cycle');
});
