import assert from 'node:assert/strict';
import test from 'node:test';

import type { ReadStore, ReadStoreSnapshot } from '../src/lib/readStore/runtime.ts';
import { UpstreamBffError } from '../src/lib/errors.ts';

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

function createLogger() {
  const logger = {
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
    debug: () => undefined,
    trace: () => undefined,
    fatal: () => undefined,
    child: () => logger,
  };

  return logger;
}

function createGuardSnapshot(input?: {
  state?: 'healthy' | 'warning' | 'critical' | 'exhausted';
  remainingThisMinute?: number;
  openUntilMs?: number;
}) {
  return {
    quota: {
      limitPerMinute: 120,
      usedThisMinute: 0,
      remainingThisMinute: input?.remainingThisMinute ?? 120,
      utilizationPct: input?.state === 'exhausted' ? 100 : 10,
      state: input?.state ?? 'healthy',
      thresholds: {
        warningPct: 70,
        backgroundShedPct: 70,
        secondaryShedPct: 85,
        criticalPct: 95,
      },
    },
    circuitBreaker: {
      openFamilies: input?.openUntilMs
        ? [
            {
              family: 'player-stats',
              openUntilMs: input.openUntilMs,
              consecutiveFailures: 2,
              consecutiveRateLimits: 2,
            },
          ]
        : [],
      windowMs: 30_000,
    },
    routeFamilies: [],
    redis: {
      configured: false,
      ready: false,
    },
  };
}

function createCompetitionPayload(competitionId: string, season: number) {
  return {
    _meta: {},
    competition: { id: competitionId },
    competitionKind: 'league',
    season,
    standings: {
      league: {
        standings: [[
          { team: { id: 101 } },
          { team: { id: 102 } },
        ]],
      },
    },
    matches: [],
    bracket: null,
    playerStats: {
      topScorers: [{ player: { id: 901 } }],
      topAssists: [],
      topYellowCards: [],
      topRedCards: [],
    },
    teamStats: null,
    transfers: [],
  };
}

function createTeamPayload(teamId: string, leagueId: string, season: number) {
  return {
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
  };
}

function createPlayerPayload(playerId: string, season: number) {
  return {
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
  };
}

function createConfig(
  overrides: Record<string, unknown> = {},
) {
  return {
    seasons: [2025],
    seasonMode: 'explicit',
    timezone: 'Europe/Paris',
    competitionIds: ['39'],
    discoverAllCompetitions: false,
    explicitTeamSeeds: [],
    explicitPlayerSeeds: [],
    maxTeamsPerCompetition: null,
    priority: 150,
    skipMode: 'valid',
    minDelayMs: 0,
    maxDelayMs: 120_000,
    retryBaseDelayMs: 1_000,
    maxRetriesPerEntity: 2,
    quotaReserve: 4,
    circuitPaddingMs: 500,
    minutePaddingMs: 500,
    estimatedUpstreamCalls: {
      competition: 8,
      team: 8,
      player: 6,
    },
    ...overrides,
  };
}

test('resolveReadStoreBackfillConfigFromEnv parses configured scopes and seeds', async () => {
  const moduleRef = await import(`../src/lib/readStore/backfill.ts?case=${Math.random().toString(36).slice(2)}`);
  const config = moduleRef.resolveReadStoreBackfillConfigFromEnv({
    READ_STORE_BACKFILL_COMPETITION_IDS: '39, 140',
    READ_STORE_BACKFILL_SEASONS: '2024,2025',
    READ_STORE_BACKFILL_TIMEZONE: 'UTC',
    READ_STORE_BACKFILL_TEAM_LIMIT: '0',
    READ_STORE_BACKFILL_SKIP_MODE: 'valid',
    READ_STORE_BACKFILL_EXPLICIT_TEAMS: '33:39:2025,44:140:2024',
    READ_STORE_BACKFILL_EXPLICIT_PLAYERS: '10:2025,20:2024',
  });

  assert.deepEqual(config.competitionIds, ['39', '140']);
  assert.deepEqual(config.seasons, [2024, 2025]);
  assert.equal(config.seasonMode, 'explicit');
  assert.equal(config.timezone, 'UTC');
  assert.equal(config.maxTeamsPerCompetition, null);
  assert.equal(config.skipMode, 'valid');
  assert.deepEqual(config.explicitTeamSeeds, [
    { teamId: '33', leagueId: '39', season: 2025 },
    { teamId: '44', leagueId: '140', season: 2024 },
  ]);
  assert.deepEqual(config.explicitPlayerSeeds, [
    { playerId: '10', season: 2025 },
    { playerId: '20', season: 2024 },
  ]);
});

test('resolveReadStoreBackfillConfigFromEnv supports all-competition discovery with listed seasons', async () => {
  const moduleRef = await import(`../src/lib/readStore/backfill.ts?case=${Math.random().toString(36).slice(2)}`);
  const config = moduleRef.resolveReadStoreBackfillConfigFromEnv({
    READ_STORE_BACKFILL_DISCOVER_ALL_COMPETITIONS: 'true',
    READ_STORE_BACKFILL_SEASON_MODE: 'listed',
  });

  assert.equal(config.discoverAllCompetitions, true);
  assert.equal(config.seasonMode, 'listed');
  assert.deepEqual(config.competitionIds, []);
  assert.deepEqual(config.seasons, []);
});

test('run skips valid stored competition snapshots and backfills downstream entities without refetching the competition', async () => {
  const moduleRef = await import(`../src/lib/readStore/backfill.ts?case=${Math.random().toString(36).slice(2)}`);
  const storedCompetition = createCompetitionPayload('39', 2025);
  const upserted: Array<{ entityKind: string; entityId: string }> = [];
  const competitionFetches: string[] = [];

  const readStore = {
    getEntitySnapshot: async <TPayload,>(input: {
      entityKind: string;
      entityId: string;
    }): Promise<ReadStoreSnapshot<TPayload>> => {
      if (input.entityKind === 'competition_full') {
        return {
          status: 'stale',
          payload: storedCompetition as TPayload,
          generatedAt: new Date('2026-03-11T08:00:00.000Z'),
          staleAt: new Date('2026-03-11T12:00:00.000Z'),
          expiresAt: new Date('2026-03-12T12:00:00.000Z'),
          metadata: { source: 'existing' },
        };
      }

      return { status: 'miss' };
    },
    upsertEntitySnapshot: async input => {
      upserted.push({
        entityKind: input.entityKind,
        entityId: input.entityId,
      });
    },
    enqueueRefresh: async () => undefined,
  } as unknown as ReadStore;

  const runtime = moduleRef.createReadStoreBackfillRuntime({
    readStore,
    logger: createLogger(),
    config: createConfig(),
    services: {
      buildCompetitionFullResponse: async competitionId => {
        competitionFetches.push(competitionId);
        return createCompetitionPayload(competitionId, 2025);
      },
      fetchTeamFullPayload: async ({ teamId, leagueId, season }) =>
        createTeamPayload(teamId, leagueId, season),
      fetchPlayerFullPayload: async ({ playerId, season }) =>
        createPlayerPayload(playerId, season),
      getUpstreamGuardSnapshot: async () => createGuardSnapshot(),
      sleep: async () => undefined,
      now: () => Date.parse('2026-03-12T10:00:00.000Z'),
    },
  });

  const report = await runtime.run();

  assert.deepEqual(competitionFetches, []);
  assert.equal(report.competitions.skipped, 1);
  assert.equal(report.teams.seeded, 2);
  assert.equal(report.players.seeded, 5);
  assert.deepEqual(
    upserted.filter(entry => entry.entityKind === 'competition_full'),
    [],
  );
});

test('run retries throttled player seeds after an adaptive wait and persists the snapshot on success', async () => {
  const moduleRef = await import(`../src/lib/readStore/backfill.ts?case=${Math.random().toString(36).slice(2)}`);
  const sleepCalls: number[] = [];
  const upsertedPlayerIds: string[] = [];
  let fetchAttempts = 0;
  let guardCalls = 0;

  const readStore = {
    getEntitySnapshot: async () => ({ status: 'miss' }),
    upsertEntitySnapshot: async input => {
      upsertedPlayerIds.push(input.entityId);
    },
    enqueueRefresh: async () => undefined,
  } as unknown as ReadStore;

  const runtime = moduleRef.createReadStoreBackfillRuntime({
    readStore,
    logger: createLogger(),
    config: createConfig({
      competitionIds: [],
      explicitPlayerSeeds: [{ playerId: '77', season: 2025 }],
    }),
    services: {
      fetchPlayerFullPayload: async ({ playerId, season }) => {
        fetchAttempts += 1;
        if (fetchAttempts === 1) {
          throw new UpstreamBffError(
            429,
            'UPSTREAM_QUOTA_EXCEEDED',
            'API-Football global quota budget exceeded.',
          );
        }

        return createPlayerPayload(playerId, season);
      },
      getUpstreamGuardSnapshot: async () => {
        guardCalls += 1;
        if (guardCalls === 1) {
          return createGuardSnapshot();
        }

        if (guardCalls === 2) {
          return createGuardSnapshot({
            state: 'exhausted',
            remainingThisMinute: 0,
            openUntilMs: Date.parse('2026-03-12T10:01:05.000Z'),
          });
        }

        return createGuardSnapshot();
      },
      sleep: async ms => {
        sleepCalls.push(ms);
      },
      now: () => Date.parse('2026-03-12T10:00:15.000Z'),
    },
  });

  const report = await runtime.run();

  assert.equal(fetchAttempts, 2);
  assert.equal(report.players.seeded, 1);
  assert.deepEqual(upsertedPlayerIds, ['77']);
  assert.ok(sleepCalls.some(ms => ms >= 50_000));
});

test('run discovers all competitions and uses the seasons listed in the catalog when configured', async () => {
  const moduleRef = await import(`../src/lib/readStore/backfill.ts?case=${Math.random().toString(36).slice(2)}`);
  const seededCompetitions: Array<{ entityId: string; scopeKey?: string | null }> = [];

  const readStore = {
    getEntitySnapshot: async () => ({ status: 'miss' }),
    upsertEntitySnapshot: async input => {
      if (input.entityKind === 'competition_full') {
        seededCompetitions.push({
          entityId: input.entityId,
          scopeKey: input.scopeKey,
        });
      }
    },
    enqueueRefresh: async () => undefined,
  } as unknown as ReadStore;

  const runtime = moduleRef.createReadStoreBackfillRuntime({
    readStore,
    logger: createLogger(),
    config: createConfig({
      seasons: [],
      seasonMode: 'listed',
      competitionIds: [],
      discoverAllCompetitions: true,
    }),
    services: {
      fetchCompetitionCatalog: async () => [
        {
          league: { id: 39, name: 'Premier League', type: 'League', logo: '' },
          country: { name: 'England', code: 'GB', flag: null },
          seasons: [
            { year: 2025, current: true },
            { year: 2024, current: false },
          ],
        },
        {
          league: { id: 140, name: 'La Liga', type: 'League', logo: '' },
          country: { name: 'Spain', code: 'ES', flag: null },
          seasons: [{ year: 2025, current: true }],
        },
      ],
      buildCompetitionFullResponse: async (competitionId, season) =>
        createCompetitionPayload(competitionId, season),
      fetchTeamFullPayload: async ({ teamId, leagueId, season }) =>
        createTeamPayload(teamId, leagueId, season),
      fetchPlayerFullPayload: async ({ playerId, season }) =>
        createPlayerPayload(playerId, season),
      getUpstreamGuardSnapshot: async () => createGuardSnapshot(),
      sleep: async () => undefined,
      now: () => Date.parse('2026-03-12T10:00:00.000Z'),
    },
  });

  const report = await runtime.run();

  assert.equal(report.competitions.total, 3);
  assert.deepEqual(seededCompetitions, [
    { entityId: '39', scopeKey: 'season=2025' },
    { entityId: '39', scopeKey: 'season=2024' },
    { entityId: '140', scopeKey: 'season=2025' },
  ]);
});
