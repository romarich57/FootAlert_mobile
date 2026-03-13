import type { FastifyBaseLogger } from 'fastify';

import {
  apiFootballGet,
  type UpstreamGuardSnapshot,
  getUpstreamGuardSnapshot,
} from '../apiFootballClient.js';
import {
  COMPETITION_POLICY,
  PLAYER_POLICY,
  TEAM_POLICY,
} from './policies.js';
import {
  buildReadStoreScopeKey,
  buildSnapshotWindow,
} from './readThrough.js';
import type { ReadStore, ReadStoreSnapshot } from './runtime.js';
import { buildCompetitionFullResponse } from '../../routes/competitions/fullService.js';
import { fetchPlayerFullPayload } from '../../routes/players/fullService.js';
import { fetchTeamFullPayload } from '../../routes/teams/fullService.js';
import {
  HOTSET_COMPETITION_IDS,
  READ_STORE_DEFAULT_TIMEZONE,
  extractPlayerSeedEntriesFromCompetitionPayload,
  extractPlayerSeedEntriesFromTeamPayload,
  extractTeamSeedEntriesFromCompetitionPayload,
  isCompetitionFullPayloadComplete,
  isPlayerFullPayloadComplete,
  isTeamFullPayloadComplete,
  type CompetitionFullPayload,
  type PlayerFullPayload,
  type PlayerSeedEntry,
  type TeamFullPayload,
  type TeamSeedEntry,
} from '../../worker/read-store-refresh-support.js';

type BackfillEntityKind = 'competition' | 'team' | 'player';
type BackfillOutcome = 'seeded' | 'skipped' | 'invalid';
type BackfillSkipMode = 'fresh' | 'valid' | 'present';
type BackfillSeasonMode = 'explicit' | 'listed';
type BackfillLogger = Pick<FastifyBaseLogger, 'info' | 'warn' | 'error' | 'child'>;

type CompetitionCatalogLeagueDto = {
  league?: {
    id?: number | string;
    name?: string;
    type?: string;
    logo?: string;
  };
  country?: {
    name?: string;
    code?: string | null;
    flag?: string | null;
  };
  seasons?: Array<{
    year?: number;
    current?: boolean;
  }>;
};

export type ReadStoreBackfillConfig = {
  seasons: number[];
  seasonMode: BackfillSeasonMode;
  timezone: string;
  competitionIds: string[];
  discoverAllCompetitions: boolean;
  explicitTeamSeeds: TeamSeedEntry[];
  explicitPlayerSeeds: PlayerSeedEntry[];
  maxTeamsPerCompetition: number | null;
  priority: number;
  skipMode: BackfillSkipMode;
  minDelayMs: number;
  maxDelayMs: number;
  retryBaseDelayMs: number;
  maxRetriesPerEntity: number;
  quotaReserve: number;
  circuitPaddingMs: number;
  minutePaddingMs: number;
  estimatedUpstreamCalls: {
    competition: number;
    team: number;
    player: number;
  };
};

export type ReadStoreBackfillEntityReport = {
  total: number;
  seeded: number;
  skipped: number;
  invalid: number;
  failed: number;
};

export type ReadStoreBackfillReport = {
  elapsedMs: number;
  competitions: ReadStoreBackfillEntityReport;
  teams: ReadStoreBackfillEntityReport;
  players: ReadStoreBackfillEntityReport;
};

export type ReadStoreBackfillServices = {
  buildSnapshotWindow: typeof buildSnapshotWindow;
  buildReadStoreScopeKey: typeof buildReadStoreScopeKey;
  buildCompetitionFullResponse: typeof buildCompetitionFullResponse;
  fetchTeamFullPayload: typeof fetchTeamFullPayload;
  fetchPlayerFullPayload: typeof fetchPlayerFullPayload;
  fetchCompetitionCatalog: () => Promise<CompetitionCatalogLeagueDto[]>;
  getUpstreamGuardSnapshot: typeof getUpstreamGuardSnapshot;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
};

type CompetitionTask = {
  competitionId: string;
  season: number;
};

type CompetitionSeedResult = {
  status: BackfillOutcome;
  teamEntries: TeamSeedEntry[];
  playerEntries: PlayerSeedEntry[];
};

type TeamSeedResult = {
  status: BackfillOutcome;
  playerEntries: PlayerSeedEntry[];
};

type RuntimeInput = {
  readStore: ReadStore;
  config: ReadStoreBackfillConfig;
  logger?: BackfillLogger;
  services?: Partial<ReadStoreBackfillServices>;
};

const DEFAULT_PRIORITY = 150;
const DEFAULT_MIN_DELAY_MS = 4_000;
const DEFAULT_MAX_DELAY_MS = 5 * 60_000;
const DEFAULT_RETRY_BASE_DELAY_MS = 30_000;
const DEFAULT_MAX_RETRIES = 6;
const DEFAULT_QUOTA_RESERVE = 5;
const DEFAULT_CIRCUIT_PADDING_MS = 1_000;
const DEFAULT_MINUTE_PADDING_MS = 1_000;
const DEFAULT_ESTIMATED_CALLS = {
  competition: 10,
  team: 10,
  player: 7,
} as const;

function createSilentLogger() {
  const logger = {
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
    debug: () => undefined,
    fatal: () => undefined,
    trace: () => undefined,
    child: () => logger,
    level: 'silent',
    silent: () => undefined,
  } as unknown as FastifyBaseLogger;

  return logger;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function writeLog(
  logger: BackfillLogger,
  level: 'info' | 'warn' | 'error',
  message: string,
  details?: Record<string, unknown>,
): void {
  (logger[level] as unknown as (...args: unknown[]) => void)(details ?? {}, message);
}

function resolveCurrentSeason(now = new Date()): number {
  const month = now.getUTCMonth();
  const year = now.getUTCFullYear();
  return month >= 6 ? year : year - 1;
}

function parseList(rawValue: string | undefined): string[] {
  return (rawValue ?? '')
    .split(',')
    .map(value => value.trim())
    .filter(value => value.length > 0);
}

function parsePositiveInt(rawValue: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(rawValue ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function parseNonNegativeInt(rawValue: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(rawValue ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
}

function parseMaxTeamsPerCompetition(rawValue: string | undefined): number | null {
  const parsed = Number.parseInt(rawValue ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function parseSkipMode(rawValue: string | undefined): BackfillSkipMode {
  if (!rawValue) {
    return 'valid';
  }

  if (rawValue === 'fresh' || rawValue === 'valid' || rawValue === 'present') {
    return rawValue;
  }

  throw new Error(
    `READ_STORE_BACKFILL_SKIP_MODE must be one of "fresh", "valid" or "present" (received "${rawValue}").`,
  );
}

function parseSeasonMode(rawValue: string | undefined): BackfillSeasonMode {
  if (!rawValue) {
    return 'explicit';
  }

  if (rawValue === 'explicit' || rawValue === 'listed') {
    return rawValue;
  }

  throw new Error(
    `READ_STORE_BACKFILL_SEASON_MODE must be "explicit" or "listed" (received "${rawValue}").`,
  );
}

function parseBoolean(rawValue: string | undefined, fallback = false): boolean {
  if (!rawValue) {
    return fallback;
  }

  const normalized = rawValue.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
}

function parseSeasonList(rawValue: string | undefined): number[] {
  const seasons = parseList(rawValue)
    .map(value => Number.parseInt(value, 10))
    .filter(value => Number.isFinite(value) && value > 0);

  return seasons;
}

function parseExplicitTeamSeeds(rawValue: string | undefined): TeamSeedEntry[] {
  return parseList(rawValue).map(entry => {
    const [teamId, leagueId, seasonRaw] = entry.split(':').map(value => value.trim());
    const season = Number.parseInt(seasonRaw ?? '', 10);
    if (!teamId || !leagueId || !Number.isFinite(season) || season <= 0) {
      throw new Error(
        `Invalid READ_STORE_BACKFILL_EXPLICIT_TEAMS entry "${entry}". Expected "teamId:leagueId:season".`,
      );
    }

    return {
      teamId,
      leagueId,
      season,
    };
  });
}

function parseExplicitPlayerSeeds(rawValue: string | undefined): PlayerSeedEntry[] {
  return parseList(rawValue).map(entry => {
    const [playerId, seasonRaw] = entry.split(':').map(value => value.trim());
    const season = Number.parseInt(seasonRaw ?? '', 10);
    if (!playerId || !Number.isFinite(season) || season <= 0) {
      throw new Error(
        `Invalid READ_STORE_BACKFILL_EXPLICIT_PLAYERS entry "${entry}". Expected "playerId:season".`,
      );
    }

    return {
      playerId,
      season,
    };
  });
}

export function resolveReadStoreBackfillConfigFromEnv(
  environment: Record<string, string | undefined>,
): ReadStoreBackfillConfig {
  const seasons = parseSeasonList(environment.READ_STORE_BACKFILL_SEASONS);
  const competitionIds = parseList(environment.READ_STORE_BACKFILL_COMPETITION_IDS);
  const seasonMode = parseSeasonMode(environment.READ_STORE_BACKFILL_SEASON_MODE);
  const discoverAllCompetitions = parseBoolean(
    environment.READ_STORE_BACKFILL_DISCOVER_ALL_COMPETITIONS,
    false,
  );

  return {
    seasons:
      seasonMode === 'listed'
        ? seasons
        : seasons.length > 0
          ? seasons
          : [resolveCurrentSeason()],
    seasonMode,
    timezone: environment.READ_STORE_BACKFILL_TIMEZONE?.trim() || READ_STORE_DEFAULT_TIMEZONE,
    competitionIds:
      discoverAllCompetitions
        ? competitionIds
        : competitionIds.length > 0
          ? competitionIds
          : [...HOTSET_COMPETITION_IDS],
    discoverAllCompetitions,
    explicitTeamSeeds: parseExplicitTeamSeeds(environment.READ_STORE_BACKFILL_EXPLICIT_TEAMS),
    explicitPlayerSeeds: parseExplicitPlayerSeeds(environment.READ_STORE_BACKFILL_EXPLICIT_PLAYERS),
    maxTeamsPerCompetition: parseMaxTeamsPerCompetition(environment.READ_STORE_BACKFILL_TEAM_LIMIT),
    priority: parsePositiveInt(environment.READ_STORE_BACKFILL_PRIORITY, DEFAULT_PRIORITY),
    skipMode: parseSkipMode(environment.READ_STORE_BACKFILL_SKIP_MODE),
    minDelayMs: parseNonNegativeInt(environment.READ_STORE_BACKFILL_MIN_DELAY_MS, DEFAULT_MIN_DELAY_MS),
    maxDelayMs: parsePositiveInt(environment.READ_STORE_BACKFILL_MAX_DELAY_MS, DEFAULT_MAX_DELAY_MS),
    retryBaseDelayMs: parsePositiveInt(
      environment.READ_STORE_BACKFILL_RETRY_BASE_DELAY_MS,
      DEFAULT_RETRY_BASE_DELAY_MS,
    ),
    maxRetriesPerEntity: parseNonNegativeInt(
      environment.READ_STORE_BACKFILL_MAX_RETRIES,
      DEFAULT_MAX_RETRIES,
    ),
    quotaReserve: parseNonNegativeInt(environment.READ_STORE_BACKFILL_QUOTA_RESERVE, DEFAULT_QUOTA_RESERVE),
    circuitPaddingMs: parseNonNegativeInt(
      environment.READ_STORE_BACKFILL_CIRCUIT_PADDING_MS,
      DEFAULT_CIRCUIT_PADDING_MS,
    ),
    minutePaddingMs: parseNonNegativeInt(
      environment.READ_STORE_BACKFILL_MINUTE_PADDING_MS,
      DEFAULT_MINUTE_PADDING_MS,
    ),
    estimatedUpstreamCalls: {
      competition: parsePositiveInt(
        environment.READ_STORE_BACKFILL_ESTIMATED_COMPETITION_CALLS,
        DEFAULT_ESTIMATED_CALLS.competition,
      ),
      team: parsePositiveInt(
        environment.READ_STORE_BACKFILL_ESTIMATED_TEAM_CALLS,
        DEFAULT_ESTIMATED_CALLS.team,
      ),
      player: parsePositiveInt(
        environment.READ_STORE_BACKFILL_ESTIMATED_PLAYER_CALLS,
        DEFAULT_ESTIMATED_CALLS.player,
      ),
    },
  };
}

const defaultServices: ReadStoreBackfillServices = {
  buildSnapshotWindow,
  buildReadStoreScopeKey,
  buildCompetitionFullResponse,
  fetchTeamFullPayload,
  fetchPlayerFullPayload,
  fetchCompetitionCatalog: async () => {
    const payload = await apiFootballGet<{ response?: CompetitionCatalogLeagueDto[] }>('/leagues');
    return Array.isArray(payload?.response) ? payload.response : [];
  },
  getUpstreamGuardSnapshot,
  sleep,
  now: () => Date.now(),
};

function resolveReadStoreBackfillServices(
  services?: Partial<ReadStoreBackfillServices>,
): ReadStoreBackfillServices {
  return {
    ...defaultServices,
    ...services,
  };
}

function createEmptyReport(): ReadStoreBackfillReport {
  return {
    elapsedMs: 0,
    competitions: { total: 0, seeded: 0, skipped: 0, invalid: 0, failed: 0 },
    teams: { total: 0, seeded: 0, skipped: 0, invalid: 0, failed: 0 },
    players: { total: 0, seeded: 0, skipped: 0, invalid: 0, failed: 0 },
  };
}

function incrementReportBucket(
  bucket: ReadStoreBackfillEntityReport,
  status: BackfillOutcome | 'failed',
): void {
  if (status === 'seeded') {
    bucket.seeded += 1;
    return;
  }

  if (status === 'skipped') {
    bucket.skipped += 1;
    return;
  }

  if (status === 'invalid') {
    bucket.invalid += 1;
    return;
  }

  bucket.failed += 1;
}

function isSnapshotValid<TPayload>(
  snapshot: ReadStoreSnapshot<TPayload>,
  validatePayload: (payload: TPayload) => boolean,
): snapshot is Exclude<ReadStoreSnapshot<TPayload>, { status: 'miss' }> {
  if (snapshot.status === 'miss') {
    return false;
  }

  return validatePayload(snapshot.payload);
}

function shouldSkipExistingSnapshot<TPayload>(
  snapshot: ReadStoreSnapshot<TPayload>,
  skipMode: BackfillSkipMode,
  validatePayload: (payload: TPayload) => boolean,
): boolean {
  if (snapshot.status === 'miss') {
    return false;
  }

  if (skipMode === 'present') {
    return true;
  }

  if (!validatePayload(snapshot.payload)) {
    return false;
  }

  if (skipMode === 'valid') {
    return true;
  }

  return snapshot.status === 'fresh';
}

function getTeamSeedKey(entry: TeamSeedEntry): string {
  return `${entry.teamId}:${entry.leagueId}:${entry.season}`;
}

function getPlayerSeedKey(entry: PlayerSeedEntry): string {
  return `${entry.playerId}:${entry.season}`;
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function getErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }

  const maybeCode = (error as { code?: unknown }).code;
  return typeof maybeCode === 'string' ? maybeCode : null;
}

function getStatusCode(error: unknown): number | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }

  const maybeStatusCode = (error as { statusCode?: unknown }).statusCode;
  return typeof maybeStatusCode === 'number' ? maybeStatusCode : null;
}

function isThrottleError(error: unknown): boolean {
  const code = getErrorCode(error);
  if (
    code === 'UPSTREAM_CIRCUIT_OPEN'
    || code === 'UPSTREAM_QUOTA_EXCEEDED'
    || code === 'UPSTREAM_QUOTA_SHED'
    || code === 'UPSTREAM_API_RATE_LIMIT'
  ) {
    return true;
  }

  const statusCode = getStatusCode(error);
  if (statusCode === 429) {
    return true;
  }

  const message = describeError(error).toLowerCase();
  return (
    message.includes('rate limit')
    || message.includes('circuit breaker')
    || message.includes('quota')
    || message.includes('too many requests')
  );
}

function isTransientError(error: unknown): boolean {
  const statusCode = getStatusCode(error);
  if (typeof statusCode === 'number' && statusCode >= 500) {
    return true;
  }

  if (error instanceof Error && error.name === 'AbortError') {
    return true;
  }

  const message = describeError(error).toLowerCase();
  return (
    message.includes('timeout')
    || message.includes('network')
    || message.includes('fetch failed')
  );
}

function shouldRetryEntityError(error: unknown): boolean {
  return isThrottleError(error) || isTransientError(error);
}

export function resolveBackfillAdaptiveDelayMs(input: {
  snapshot: UpstreamGuardSnapshot | null;
  nowMs: number;
  attempt: number;
  estimatedCalls: number;
  minDelayMs: number;
  retryBaseDelayMs: number;
  maxDelayMs: number;
  quotaReserve: number;
  circuitPaddingMs: number;
  minutePaddingMs: number;
}): number {
  const baseRetryDelay =
    input.attempt > 0
      ? Math.min(input.maxDelayMs, input.retryBaseDelayMs * 2 ** Math.max(0, input.attempt - 1))
      : 0;
  let delayMs = Math.max(input.minDelayMs, baseRetryDelay);

  if (!input.snapshot) {
    return delayMs;
  }

  const longestOpenUntilMs = input.snapshot.circuitBreaker.openFamilies.reduce(
    (currentMax, family) => Math.max(currentMax, family.openUntilMs),
    0,
  );
  if (longestOpenUntilMs > input.nowMs) {
    delayMs = Math.max(delayMs, longestOpenUntilMs - input.nowMs + input.circuitPaddingMs);
  }

  const quotaLimit = input.snapshot.quota.limitPerMinute;
  if (quotaLimit > 0) {
    const untilNextMinuteMs = 60_000 - (input.nowMs % 60_000) + input.minutePaddingMs;
    const remainingBudget = input.snapshot.quota.remainingThisMinute;
    if (
      input.snapshot.quota.state === 'exhausted'
      || remainingBudget <= 0
      || remainingBudget <= input.estimatedCalls + input.quotaReserve
    ) {
      delayMs = Math.max(delayMs, untilNextMinuteMs);
    } else if (input.snapshot.quota.state === 'critical') {
      delayMs = Math.max(delayMs, 10_000);
    } else if (input.snapshot.quota.state === 'warning') {
      delayMs = Math.max(delayMs, 2_000);
    }
  }

  return delayMs;
}

export function createReadStoreBackfillRuntime(input: RuntimeInput) {
  const services = resolveReadStoreBackfillServices(input.services);
  const logger = input.logger ?? createSilentLogger();
  const teamFetchLogger = logger.child?.({ scope: 'read_store_backfill.team' }) ?? createSilentLogger();

  async function getEntitySnapshotSafe<TPayload>(params: {
    entityKind: string;
    entityId: string;
    scopeKey: string;
  }): Promise<ReadStoreSnapshot<TPayload>> {
    try {
      return await input.readStore.getEntitySnapshot<TPayload>({
        entityKind: params.entityKind,
        entityId: params.entityId,
        scopeKey: params.scopeKey,
      });
    } catch (error) {
      writeLog(logger, 'warn', 'read_store_backfill.snapshot_read_failed', {
        entityKind: params.entityKind,
        entityId: params.entityId,
        scopeKey: params.scopeKey,
        error: describeError(error),
      });
      return { status: 'miss' };
    }
  }

  async function getGuardSnapshotSafe(): Promise<UpstreamGuardSnapshot | null> {
    try {
      return await services.getUpstreamGuardSnapshot();
    } catch (error) {
      writeLog(logger, 'warn', 'read_store_backfill.guard_snapshot_failed', {
        error: describeError(error),
      });
      return null;
    }
  }

  async function maybeWaitBeforeAttempt(
    kind: BackfillEntityKind,
    label: string,
    attempt: number,
  ): Promise<void> {
    const snapshot = await getGuardSnapshotSafe();
    const delayMs = resolveBackfillAdaptiveDelayMs({
      snapshot,
      nowMs: services.now(),
      attempt,
      estimatedCalls: input.config.estimatedUpstreamCalls[kind],
      minDelayMs: input.config.minDelayMs,
      retryBaseDelayMs: input.config.retryBaseDelayMs,
      maxDelayMs: input.config.maxDelayMs,
      quotaReserve: input.config.quotaReserve,
      circuitPaddingMs: input.config.circuitPaddingMs,
      minutePaddingMs: input.config.minutePaddingMs,
    });

    if (delayMs <= 0) {
      return;
    }

    writeLog(logger, 'info', 'read_store_backfill.pacing_wait', {
      label,
      kind,
      attempt,
      delayMs,
      quotaState: snapshot?.quota.state ?? 'unknown',
      remainingThisMinute: snapshot?.quota.remainingThisMinute ?? null,
      openFamilies: snapshot?.circuitBreaker.openFamilies.length ?? 0,
    });
    await services.sleep(delayMs);
  }

  async function withEntityRetry<T>(
    kind: BackfillEntityKind,
    label: string,
    execute: () => Promise<T>,
  ): Promise<T> {
    let attempt = 0;

    while (true) {
      await maybeWaitBeforeAttempt(kind, label, attempt);

      try {
        return await execute();
      } catch (error) {
        if (!shouldRetryEntityError(error) || attempt >= input.config.maxRetriesPerEntity) {
          throw error;
        }

        attempt += 1;
        writeLog(logger, 'warn', 'read_store_backfill.retry_scheduled', {
          label,
          kind,
          attempt,
          error: describeError(error),
        });
      }
    }
  }

  async function enqueueRefreshSafe(inputParams: {
    entityKind: string;
    entityId: string;
    scopeKey: string;
    notBefore: Date;
  }): Promise<void> {
    try {
      await input.readStore.enqueueRefresh({
        entityKind: inputParams.entityKind,
        entityId: inputParams.entityId,
        scopeKey: inputParams.scopeKey,
        priority: input.config.priority,
        notBefore: inputParams.notBefore,
      });
    } catch (error) {
      writeLog(logger, 'warn', 'read_store_backfill.enqueue_refresh_failed', {
        entityKind: inputParams.entityKind,
        entityId: inputParams.entityId,
        scopeKey: inputParams.scopeKey,
        error: describeError(error),
      });
    }
  }

  async function seedCompetition(task: CompetitionTask): Promise<CompetitionSeedResult> {
    const scopeKey = services.buildReadStoreScopeKey({
      season: String(task.season),
    });
    const snapshot = await getEntitySnapshotSafe<CompetitionFullPayload>({
      entityKind: 'competition_full',
      entityId: task.competitionId,
      scopeKey,
    });

    if (
      shouldSkipExistingSnapshot(snapshot, input.config.skipMode, isCompetitionFullPayloadComplete)
    ) {
      const payload = snapshot.status === 'miss' ? null : snapshot.payload;
      writeLog(logger, 'info', 'read_store_backfill.competition_skipped', {
        competitionId: task.competitionId,
        season: task.season,
        snapshotStatus: snapshot.status,
        skipMode: input.config.skipMode,
      });
      return {
        status: 'skipped',
        teamEntries:
          payload === null
            ? []
            : extractTeamSeedEntriesFromCompetitionPayload(
                payload,
                task.competitionId,
                task.season,
                input.config.maxTeamsPerCompetition,
              ),
        playerEntries:
          payload === null
            ? []
            : extractPlayerSeedEntriesFromCompetitionPayload(payload, task.season),
      };
    }

    const payload = await withEntityRetry(
      'competition',
      `competition:${task.competitionId}:season:${task.season}`,
      () => services.buildCompetitionFullResponse(task.competitionId, task.season),
    );

    if (!isCompetitionFullPayloadComplete(payload)) {
      writeLog(logger, 'warn', 'read_store_backfill.competition_invalid', {
        competitionId: task.competitionId,
        season: task.season,
      });
      return {
        status: 'invalid',
        teamEntries: [],
        playerEntries: [],
      };
    }

    const window = services.buildSnapshotWindow({
      staleAfterMs: COMPETITION_POLICY.freshMs,
      expiresAfterMs: COMPETITION_POLICY.staleMs,
    });

    await input.readStore.upsertEntitySnapshot({
      entityKind: 'competition_full',
      entityId: task.competitionId,
      scopeKey,
      payload,
      generatedAt: window.generatedAt,
      staleAt: window.staleAt,
      expiresAt: window.expiresAt,
      metadata: {
        source: 'read_store_backfill',
        priority: input.config.priority,
      },
    });
    await enqueueRefreshSafe({
      entityKind: 'competition_full',
      entityId: task.competitionId,
      scopeKey,
      notBefore: window.staleAt,
    });

    writeLog(logger, 'info', 'read_store_backfill.competition_seeded', {
      competitionId: task.competitionId,
      season: task.season,
    });
    return {
      status: 'seeded',
      teamEntries: extractTeamSeedEntriesFromCompetitionPayload(
        payload,
        task.competitionId,
        task.season,
        input.config.maxTeamsPerCompetition,
      ),
      playerEntries: extractPlayerSeedEntriesFromCompetitionPayload(payload, task.season),
    };
  }

  async function seedTeam(entry: TeamSeedEntry): Promise<TeamSeedResult> {
    const scopeKey = services.buildReadStoreScopeKey({
      leagueId: entry.leagueId,
      season: String(entry.season),
      timezone: input.config.timezone,
    });
    const snapshot = await getEntitySnapshotSafe<TeamFullPayload>({
      entityKind: 'team_full',
      entityId: entry.teamId,
      scopeKey,
    });

    if (shouldSkipExistingSnapshot(snapshot, input.config.skipMode, isTeamFullPayloadComplete)) {
      const payload = snapshot.status === 'miss' ? null : snapshot.payload;
      writeLog(logger, 'info', 'read_store_backfill.team_skipped', {
        teamId: entry.teamId,
        leagueId: entry.leagueId,
        season: entry.season,
        snapshotStatus: snapshot.status,
        skipMode: input.config.skipMode,
      });
      return {
        status: 'skipped',
        playerEntries:
          payload === null ? [] : extractPlayerSeedEntriesFromTeamPayload(payload, entry.season),
      };
    }

    const payload = await withEntityRetry(
      'team',
      `team:${entry.teamId}:league:${entry.leagueId}:season:${entry.season}`,
      () =>
        services.fetchTeamFullPayload({
          teamId: entry.teamId,
          leagueId: entry.leagueId,
          season: entry.season,
          timezone: input.config.timezone,
          logger: teamFetchLogger,
        }),
    );

    if (!isTeamFullPayloadComplete(payload)) {
      writeLog(logger, 'warn', 'read_store_backfill.team_invalid', {
        teamId: entry.teamId,
        leagueId: entry.leagueId,
        season: entry.season,
      });
      return {
        status: 'invalid',
        playerEntries: [],
      };
    }

    const window = services.buildSnapshotWindow({
      staleAfterMs: TEAM_POLICY.freshMs,
      expiresAfterMs: TEAM_POLICY.staleMs,
    });

    await input.readStore.upsertEntitySnapshot({
      entityKind: 'team_full',
      entityId: entry.teamId,
      scopeKey,
      payload,
      generatedAt: window.generatedAt,
      staleAt: window.staleAt,
      expiresAt: window.expiresAt,
      metadata: {
        source: 'read_store_backfill',
        priority: input.config.priority,
      },
    });
    await enqueueRefreshSafe({
      entityKind: 'team_full',
      entityId: entry.teamId,
      scopeKey,
      notBefore: window.staleAt,
    });

    writeLog(logger, 'info', 'read_store_backfill.team_seeded', {
      teamId: entry.teamId,
      leagueId: entry.leagueId,
      season: entry.season,
    });
    return {
      status: 'seeded',
      playerEntries: extractPlayerSeedEntriesFromTeamPayload(payload, entry.season),
    };
  }

  async function seedPlayer(entry: PlayerSeedEntry): Promise<BackfillOutcome> {
    const scopeKey = services.buildReadStoreScopeKey({
      season: String(entry.season),
    });
    const snapshot = await getEntitySnapshotSafe<PlayerFullPayload>({
      entityKind: 'player_full',
      entityId: entry.playerId,
      scopeKey,
    });

    if (shouldSkipExistingSnapshot(snapshot, input.config.skipMode, isPlayerFullPayloadComplete)) {
      writeLog(logger, 'info', 'read_store_backfill.player_skipped', {
        playerId: entry.playerId,
        season: entry.season,
        snapshotStatus: snapshot.status,
        skipMode: input.config.skipMode,
      });
      return 'skipped';
    }

    const payload = await withEntityRetry(
      'player',
      `player:${entry.playerId}:season:${entry.season}`,
      () =>
        services.fetchPlayerFullPayload({
          playerId: entry.playerId,
          season: entry.season,
        }),
    );

    if (!isPlayerFullPayloadComplete(payload)) {
      writeLog(logger, 'warn', 'read_store_backfill.player_invalid', {
        playerId: entry.playerId,
        season: entry.season,
      });
      return 'invalid';
    }

    const window = services.buildSnapshotWindow({
      staleAfterMs: PLAYER_POLICY.freshMs,
      expiresAfterMs: PLAYER_POLICY.staleMs,
    });

    await input.readStore.upsertEntitySnapshot({
      entityKind: 'player_full',
      entityId: entry.playerId,
      scopeKey,
      payload,
      generatedAt: window.generatedAt,
      staleAt: window.staleAt,
      expiresAt: window.expiresAt,
      metadata: {
        source: 'read_store_backfill',
        priority: input.config.priority,
      },
    });
    await enqueueRefreshSafe({
      entityKind: 'player_full',
      entityId: entry.playerId,
      scopeKey,
      notBefore: window.staleAt,
    });

    writeLog(logger, 'info', 'read_store_backfill.player_seeded', {
      playerId: entry.playerId,
      season: entry.season,
    });
    return 'seeded';
  }

  function buildCompetitionTasks(): CompetitionTask[] {
    return [];
  }

  async function resolveCompetitionCatalog(): Promise<CompetitionCatalogLeagueDto[] | null> {
    const needsCatalog =
      input.config.discoverAllCompetitions || input.config.seasonMode === 'listed';
    if (!needsCatalog) {
      return null;
    }

    return services.fetchCompetitionCatalog();
  }

  function normalizeCompetitionId(value: unknown): string | null {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }

    return null;
  }

  function resolveListedSeasons(
    catalogEntry: CompetitionCatalogLeagueDto | undefined,
  ): number[] {
    const listedSeasons = Array.isArray(catalogEntry?.seasons)
      ? catalogEntry.seasons
          .map(season => season?.year)
          .filter((year): year is number => typeof year === 'number' && Number.isFinite(year))
      : [];

    if (listedSeasons.length > 0) {
      return Array.from(new Set(listedSeasons)).sort((first, second) => second - first);
    }

    if (input.config.seasons.length > 0) {
      return [...input.config.seasons];
    }

    return [resolveCurrentSeason(new Date(services.now()))];
  }

  async function buildCompetitionTasksFromConfig(): Promise<CompetitionTask[]> {
    const tasks: CompetitionTask[] = [];
    const catalog = await resolveCompetitionCatalog();
    const catalogByCompetitionId = new Map<string, CompetitionCatalogLeagueDto>();

    for (const entry of catalog ?? []) {
      const competitionId = normalizeCompetitionId(entry.league?.id);
      if (!competitionId || catalogByCompetitionId.has(competitionId)) {
        continue;
      }

      catalogByCompetitionId.set(competitionId, entry);
    }

    const competitionIds = input.config.discoverAllCompetitions
      ? [...catalogByCompetitionId.keys()]
      : [...input.config.competitionIds];

    for (const competitionId of competitionIds) {
      const seasons =
        input.config.seasonMode === 'listed'
          ? resolveListedSeasons(catalogByCompetitionId.get(competitionId))
          : input.config.seasons;

      for (const season of seasons) {
        tasks.push({
          competitionId,
          season,
        });
      }
    }

    return tasks;
  }

  function mergeTeamEntries(
    target: Map<string, TeamSeedEntry>,
    entries: TeamSeedEntry[],
  ): void {
    for (const entry of entries) {
      target.set(getTeamSeedKey(entry), entry);
    }
  }

  function mergePlayerEntries(
    target: Map<string, PlayerSeedEntry>,
    entries: PlayerSeedEntry[],
  ): void {
    for (const entry of entries) {
      target.set(getPlayerSeedKey(entry), entry);
    }
  }

  return {
    async run(): Promise<ReadStoreBackfillReport> {
      const report = createEmptyReport();
      const startedAt = services.now();
      const discoveredTeams = new Map<string, TeamSeedEntry>();
      const discoveredPlayers = new Map<string, PlayerSeedEntry>();
      const competitionTasks = await buildCompetitionTasksFromConfig();

      report.competitions.total = competitionTasks.length;

      for (const task of competitionTasks) {
        try {
          const result = await seedCompetition(task);
          incrementReportBucket(report.competitions, result.status);
          mergeTeamEntries(discoveredTeams, result.teamEntries);
          mergePlayerEntries(discoveredPlayers, result.playerEntries);
        } catch (error) {
          incrementReportBucket(report.competitions, 'failed');
          writeLog(logger, 'error', 'read_store_backfill.competition_failed', {
            competitionId: task.competitionId,
            season: task.season,
            error: describeError(error),
          });
        }
      }

      mergeTeamEntries(discoveredTeams, input.config.explicitTeamSeeds);
      const teamTasks = [...discoveredTeams.values()];
      report.teams.total = teamTasks.length;

      for (const entry of teamTasks) {
        try {
          const result = await seedTeam(entry);
          incrementReportBucket(report.teams, result.status);
          mergePlayerEntries(discoveredPlayers, result.playerEntries);
        } catch (error) {
          incrementReportBucket(report.teams, 'failed');
          writeLog(logger, 'error', 'read_store_backfill.team_failed', {
            teamId: entry.teamId,
            leagueId: entry.leagueId,
            season: entry.season,
            error: describeError(error),
          });
        }
      }

      mergePlayerEntries(discoveredPlayers, input.config.explicitPlayerSeeds);
      const playerTasks = [...discoveredPlayers.values()];
      report.players.total = playerTasks.length;

      for (const entry of playerTasks) {
        try {
          const status = await seedPlayer(entry);
          incrementReportBucket(report.players, status);
        } catch (error) {
          incrementReportBucket(report.players, 'failed');
          writeLog(logger, 'error', 'read_store_backfill.player_failed', {
            playerId: entry.playerId,
            season: entry.season,
            error: describeError(error),
          });
        }
      }

      report.elapsedMs = services.now() - startedAt;
      return report;
    },
  };
}
