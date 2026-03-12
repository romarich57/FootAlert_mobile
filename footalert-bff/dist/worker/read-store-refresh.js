import { COMPETITION_POLICY, MATCH_DEFAULT_POLICY, PLAYER_POLICY, TEAM_POLICY, } from '../lib/readStore/policies.js';
import { hashSensitiveValue, logWorker, parseOptionalNumber, parseOptionalText, resolveDateInTimezone, resolveSeasonFromDate, } from './shared.js';
import { BOOTSTRAP_DEFAULT_DISCOVERY_LIMIT, HOTSET_COMPETITION_IDS, persistWorkerMatchOverlay, READ_STORE_BOOTSTRAP_WARM_INTERVAL_MS, READ_STORE_DEFAULT_TIMEZONE, READ_STORE_REFRESH_CLAIM_LIMIT, resolveReadStoreRefreshServices, } from './read-store-refresh-support.js';
export { HOTSET_COMPETITION_IDS, READ_STORE_BOOTSTRAP_WARM_INTERVAL_MS, READ_STORE_DEFAULT_TIMEZONE, } from './read-store-refresh-support.js';
export const READ_STORE_REFRESH_POLL_INTERVAL_MS = 30_000;
export function createReadStoreRefreshRuntime(input) {
    const services = resolveReadStoreRefreshServices(input.services);
    const workerId = input.workerId ?? `notifications-worker-${process.pid}`;
    const policyWindow = (policy) => services.buildSnapshotWindow({
        staleAfterMs: policy.freshMs,
        expiresAfterMs: policy.staleMs,
    });
    async function refreshSnapshotForJob(job) {
        if (job.entityKind === 'bootstrap') {
            const parsedScope = services.parseBootstrapScopeKey(job.scopeKey);
            if (!parsedScope) {
                throw new Error(`Invalid bootstrap scope key: ${job.scopeKey}`);
            }
            const payload = await services.buildBootstrapPayload({
                date: parsedScope.date,
                timezone: parsedScope.timezone,
                season: parsedScope.season,
                followedTeamIds: parsedScope.followedTeamIds,
                followedPlayerIds: parsedScope.followedPlayerIds,
                discoveryLimit: parsedScope.discoveryLimit,
                logger: input.logger,
            });
            const window = services.buildSnapshotWindow({
                staleAfterMs: READ_STORE_BOOTSTRAP_WARM_INTERVAL_MS,
                expiresAfterMs: READ_STORE_BOOTSTRAP_WARM_INTERVAL_MS * 6,
            });
            await input.readStore.upsertBootstrapSnapshot({
                scopeKey: job.scopeKey,
                payload,
                generatedAt: window.generatedAt,
                staleAt: window.staleAt,
                expiresAt: window.expiresAt,
                metadata: { source: 'worker.refresh' },
            });
            return;
        }
        const scope = services.decodeReadStoreScopeKey(job.scopeKey);
        if (job.entityKind === 'team_full') {
            const timezone = parseOptionalText(scope.timezone);
            if (!timezone) {
                throw new Error(`team_full scope missing timezone for job ${job.id}`);
            }
            await input.readStore.upsertEntitySnapshot({
                entityKind: job.entityKind,
                entityId: job.entityId,
                scopeKey: job.scopeKey,
                payload: await services.fetchTeamFullPayload({
                    teamId: job.entityId,
                    leagueId: parseOptionalText(scope.leagueId),
                    season: parseOptionalNumber(scope.season),
                    timezone,
                    historySeasons: parseOptionalText(scope.historySeasons),
                    logger: input.logger,
                }),
                metadata: { source: 'worker.refresh' },
                ...policyWindow(TEAM_POLICY),
            });
            return;
        }
        if (job.entityKind === 'player_full') {
            const season = parseOptionalNumber(scope.season);
            if (!season) {
                throw new Error(`player_full scope missing season for job ${job.id}`);
            }
            await input.readStore.upsertEntitySnapshot({
                entityKind: job.entityKind,
                entityId: job.entityId,
                scopeKey: job.scopeKey,
                payload: await services.fetchPlayerFullPayload({
                    playerId: job.entityId,
                    season,
                }),
                metadata: { source: 'worker.refresh' },
                ...policyWindow(PLAYER_POLICY),
            });
            return;
        }
        if (job.entityKind === 'competition_full') {
            await input.readStore.upsertEntitySnapshot({
                entityKind: job.entityKind,
                entityId: job.entityId,
                scopeKey: job.scopeKey,
                payload: await services.buildCompetitionFullResponse(job.entityId, parseOptionalNumber(scope.season)),
                metadata: { source: 'worker.refresh' },
                ...policyWindow(COMPETITION_POLICY),
            });
            return;
        }
        if (job.entityKind === 'match_full') {
            const timezone = parseOptionalText(scope.timezone);
            if (!timezone) {
                throw new Error(`match_full scope missing timezone for job ${job.id}`);
            }
            const payload = await services.buildMatchFullResponse(job.entityId, timezone);
            await input.readStore.upsertEntitySnapshot({
                entityKind: job.entityKind,
                entityId: job.entityId,
                scopeKey: job.scopeKey,
                payload,
                metadata: { source: 'worker.refresh' },
                ...policyWindow(MATCH_DEFAULT_POLICY),
            });
            await persistWorkerMatchOverlay({
                readStore: input.readStore,
                services,
                matchId: job.entityId,
                payload,
            });
            return;
        }
        throw new Error(`Unsupported refresh entity kind: ${job.entityKind}`);
    }
    async function warmBootstrapSnapshot() {
        const date = resolveDateInTimezone(READ_STORE_DEFAULT_TIMEZONE);
        const season = resolveSeasonFromDate(date);
        const window = services.buildSnapshotWindow({
            staleAfterMs: READ_STORE_BOOTSTRAP_WARM_INTERVAL_MS,
            expiresAfterMs: READ_STORE_BOOTSTRAP_WARM_INTERVAL_MS * 6,
        });
        await input.readStore.upsertBootstrapSnapshot({
            scopeKey: services.buildBootstrapScopeKey({
                date,
                timezone: READ_STORE_DEFAULT_TIMEZONE,
                season,
            }),
            payload: await services.buildBootstrapPayload({
                date,
                timezone: READ_STORE_DEFAULT_TIMEZONE,
                season,
                followedTeamIds: [],
                followedPlayerIds: [],
                discoveryLimit: BOOTSTRAP_DEFAULT_DISCOVERY_LIMIT,
            }),
            generatedAt: window.generatedAt,
            staleAt: window.staleAt,
            expiresAt: window.expiresAt,
            metadata: { source: 'worker.warm' },
        });
    }
    async function warmHotset() {
        const date = resolveDateInTimezone(READ_STORE_DEFAULT_TIMEZONE);
        const season = resolveSeasonFromDate(date);
        const scopeKey = services.buildReadStoreScopeKey({ season: String(season) });
        logWorker('info', 'hotset_warm_start', {
            competitionCount: HOTSET_COMPETITION_IDS.length,
            date,
            season,
        });
        let warmedCount = 0;
        let failedCount = 0;
        for (let i = 0; i < HOTSET_COMPETITION_IDS.length; i += 3) {
            const results = await Promise.allSettled(HOTSET_COMPETITION_IDS.slice(i, i + 3).map(async (competitionId) => {
                const window = services.buildSnapshotWindow({
                    staleAfterMs: COMPETITION_POLICY.freshMs,
                    expiresAfterMs: COMPETITION_POLICY.staleMs,
                });
                await input.readStore.upsertEntitySnapshot({
                    entityKind: 'competition_full',
                    entityId: competitionId,
                    scopeKey,
                    payload: await services.buildCompetitionFullResponse(competitionId, season),
                    generatedAt: window.generatedAt,
                    staleAt: window.staleAt,
                    expiresAt: window.expiresAt,
                    metadata: { source: 'worker.hotset_warm' },
                });
            }));
            for (const result of results) {
                if (result.status === 'fulfilled') {
                    warmedCount++;
                }
                else {
                    failedCount++;
                    logWorker('error', 'hotset_warm_competition_failed', {
                        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
                    });
                }
            }
        }
        try {
            await warmBootstrapSnapshot();
        }
        catch (error) {
            logWorker('error', 'hotset_warm_bootstrap_failed', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
        logWorker('info', 'hotset_warm_complete', {
            warmedCompetitions: warmedCount,
            failedCompetitions: failedCount,
            totalCompetitions: HOTSET_COMPETITION_IDS.length,
        });
    }
    async function processSnapshotRefreshQueue() {
        const claimedJobs = await input.readStore.claimRefreshJobs({
            limit: READ_STORE_REFRESH_CLAIM_LIMIT,
            workerId,
        });
        for (const job of claimedJobs) {
            try {
                await refreshSnapshotForJob(job);
                await input.readStore.completeRefreshJob({ jobId: job.id });
            }
            catch (error) {
                await input.readStore.failRefreshJob({
                    jobId: job.id,
                    error: error instanceof Error ? error.message : String(error),
                });
                logWorker('error', 'read_store_refresh_failed', {
                    jobId: job.id,
                    entityKind: job.entityKind,
                    entityId: hashSensitiveValue(job.entityId),
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
    }
    return {
        processSnapshotRefreshQueue,
        refreshSnapshotForJob,
        warmBootstrapSnapshot,
        warmHotset,
    };
}
