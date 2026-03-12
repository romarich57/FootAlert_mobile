/**
 * Script de seed production — Rate-Limit Aware (v2).
 *
 * Pré-remplit la base PostgreSQL avec les données API-Football pour un
 * chargement quasi-instantané côté mobile.
 *
 * Différences avec la v1 :
 * - Exécution séquentielle (1 entité à la fois) pour éviter le circuit breaker
 * - Pause configurable entre chaque entité (DELAY_BETWEEN_ENTITIES_MS)
 * - Retry automatique avec backoff exponentiel
 * - Validation du payload (ne sauvegarde pas de données vides)
 * - Reprise sur interruption (skip les entités déjà fraîches en DB)
 *
 * Usage :
 *   npm run db:seed:prod
 *
 * Variables d'environnement requises :
 *   DATABASE_URL — connexion PostgreSQL
 *   API_FOOTBALL_KEY — clé API-Football
 */

import { env } from '../../src/config/env.js';
import {
    COMPETITION_POLICY,
    TEAM_POLICY,
} from '../../src/lib/readStore/policies.js';
import {
    buildReadStoreScopeKey,
    buildSnapshotWindow,
} from '../../src/lib/readStore/readThrough.js';
import { getReadStore } from '../../src/lib/readStore/runtime.js';
import { buildCompetitionFullResponse } from '../../src/routes/competitions/fullService.js';
import { fetchTeamFullPayload } from '../../src/routes/teams/fullService.js';

// ─── Configuration ───

const SEED_TIMEZONE = 'Europe/Paris';

/** Compétitions à seeder — top 5 ligues européennes + Ligue des Champions + Europa League */
const SEED_COMPETITION_IDS = ['39'];

/** Nombre max d'équipes à seeder par compétition */
const MAX_TEAMS_PER_COMPETITION = 20;

/** Priorité dans la refresh queue (100 = normal, 150 = seed) */
const SEED_PRIORITY = 150;

/** Pause en ms entre chaque entité (compétition ou équipe) pour rester sous le quota API */
const DELAY_BETWEEN_ENTITIES_MS = 4_000;

/** Nombre max de retries par entité */
const MAX_RETRIES = 3;

/** Délai initial de retry en ms (doublé à chaque tentative) */
const INITIAL_RETRY_DELAY_MS = 30_000;

// ─── Utilitaires ───

function log(level: 'info' | 'warn' | 'error', event: string, data?: Record<string, unknown>) {
    const timestamp = new Date().toISOString();
    console.log(JSON.stringify({ timestamp, level, event, ...data }));
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function resolveCurrentSeason(): number {
    const now = new Date();
    const month = now.getUTCMonth();
    const year = now.getUTCFullYear();
    return month >= 6 ? year : year - 1;
}

function createSilentLogger() {
    const logger = {
        info: () => { },
        warn: () => { },
        error: () => { },
        debug: () => { },
        fatal: () => { },
        trace: () => { },
        child: () => logger,
        level: 'silent',
        silent: () => { },
    } as unknown as import('fastify').FastifyBaseLogger;
    return logger;
}

type TeamIdEntry = {
    teamId: string;
    leagueId: string;
    season: number;
};

function extractTeamIdsFromCompetitionPayload(
    payload: Awaited<ReturnType<typeof buildCompetitionFullResponse>>,
    competitionId: string,
    season: number,
): TeamIdEntry[] {
    const teamIds = new Set<string>();
    const entries: TeamIdEntry[] = [];

    // Extract from standings
    const standings = payload.standings;
    if (standings && typeof standings === 'object') {
        const standingsRecord = standings as Record<string, unknown>;
        const league = standingsRecord.league as Record<string, unknown> | undefined;
        const standingsGroups = league?.standings;
        if (Array.isArray(standingsGroups)) {
            for (const group of standingsGroups) {
                if (Array.isArray(group)) {
                    for (const row of group) {
                        const team = (row as Record<string, unknown>)?.team as Record<string, unknown> | undefined;
                        const id = team?.id;
                        if (id !== undefined && id !== null) {
                            const teamId = String(id);
                            if (!teamIds.has(teamId)) {
                                teamIds.add(teamId);
                                entries.push({ teamId, leagueId: competitionId, season });
                            }
                        }
                    }
                }
            }
        }
    }

    // Fallback: extract from matches
    if (entries.length === 0) {
        const matches = payload.matches;
        if (Array.isArray(matches)) {
            for (const match of matches) {
                const teams = (match as Record<string, unknown>)?.teams as Record<string, unknown> | undefined;
                if (!teams) continue;
                for (const side of ['home', 'away'] as const) {
                    const team = teams[side] as Record<string, unknown> | undefined;
                    const id = team?.id;
                    if (id !== undefined && id !== null) {
                        const teamId = String(id);
                        if (!teamIds.has(teamId)) {
                            teamIds.add(teamId);
                            entries.push({ teamId, leagueId: competitionId, season });
                        }
                    }
                }
            }
        }
    }

    return entries.slice(0, MAX_TEAMS_PER_COMPETITION);
}

// ─── Validation ───

function isCompetitionPayloadValid(
    payload: Awaited<ReturnType<typeof buildCompetitionFullResponse>>,
): boolean {
    const hasMatches = Array.isArray(payload.matches) && payload.matches.length > 0;
    const hasStandings = payload.standings !== null && payload.standings !== undefined;
    const hasPlayerStats =
        payload.playerStats?.topScorers?.length > 0 ||
        payload.playerStats?.topAssists?.length > 0;

    // Au moins une des trois conditions doit être vraie
    return hasMatches || hasStandings || hasPlayerStats;
}

function isTeamPayloadValid(
    payload: Awaited<ReturnType<typeof fetchTeamFullPayload>>,
): boolean {
    const response = payload.response;
    if (!response) return false;

    const hasDetails = Array.isArray(response.details?.response) && response.details.response.length > 0;
    return hasDetails;
}

// ─── Retry wrapper ───

async function withRetry<T>(
    label: string,
    fn: () => Promise<T>,
): Promise<T> {
    let lastError: unknown = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            const errorMessage = error instanceof Error ? error.message : String(error);
            const isRateLimit =
                errorMessage.includes('circuit breaker') ||
                errorMessage.includes('rate limit') ||
                errorMessage.includes('quota');

            if (attempt < MAX_RETRIES && isRateLimit) {
                const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
                log('warn', 'seed_retry', {
                    label,
                    attempt: attempt + 1,
                    maxRetries: MAX_RETRIES,
                    delayMs: delay,
                    error: errorMessage,
                });
                await sleep(delay);
                continue;
            }

            throw error;
        }
    }

    throw lastError;
}

// ─── Seed functions ───

async function isEntityFresh(
    readStore: Awaited<ReturnType<typeof getReadStore>>,
    entityKind: string,
    entityId: string,
    scopeKey: string,
): Promise<boolean> {
    try {
        const snapshot = await readStore.getEntitySnapshot({
            entityKind,
            entityId,
            scopeKey,
        });
        if (!snapshot || snapshot.status === 'miss') return false;
        return snapshot.status === 'fresh';
    } catch {
        return false;
    }
}

async function seedCompetition(
    readStore: Awaited<ReturnType<typeof getReadStore>>,
    competitionId: string,
    season: number,
    index: number,
    total: number,
): Promise<TeamIdEntry[]> {
    const scopeKey = buildReadStoreScopeKey({ season: String(season) });

    // Check if already fresh
    const alreadyFresh = await isEntityFresh(readStore, 'competition_full', competitionId, scopeKey);
    if (alreadyFresh) {
        log('info', 'seed_competition_skip', { competitionId, season, reason: 'already_fresh', progress: `${index + 1}/${total}` });
        // Still need to extract team IDs from the existing snapshot
        try {
            const existing = await readStore.getEntitySnapshot({
                entityKind: 'competition_full',
                entityId: competitionId,
                scopeKey,
            });
            if (existing && existing.status !== 'miss' && existing.payload) {
                return extractTeamIdsFromCompetitionPayload(
                    existing.payload as Awaited<ReturnType<typeof buildCompetitionFullResponse>>,
                    competitionId,
                    season,
                );
            }
        } catch { /* fallthrough */ }
        return [];
    }

    log('info', 'seed_competition_start', { competitionId, season, progress: `${index + 1}/${total}` });

    const payload = await withRetry(`competition:${competitionId}`, () =>
        buildCompetitionFullResponse(competitionId, season),
    );

    if (!isCompetitionPayloadValid(payload)) {
        log('warn', 'seed_competition_empty', {
            competitionId,
            season,
            matchesCount: payload.matches?.length ?? 0,
            hasStandings: payload.standings !== null,
        });
        return [];
    }

    const window = buildSnapshotWindow({
        staleAfterMs: COMPETITION_POLICY.freshMs,
        expiresAfterMs: COMPETITION_POLICY.staleMs,
    });

    await readStore.upsertEntitySnapshot({
        entityKind: 'competition_full',
        entityId: competitionId,
        scopeKey,
        payload,
        generatedAt: window.generatedAt,
        staleAt: window.staleAt,
        expiresAt: window.expiresAt,
        metadata: { source: 'seed-v2', priority: SEED_PRIORITY },
    });

    await readStore.enqueueRefresh({
        entityKind: 'competition_full',
        entityId: competitionId,
        scopeKey,
        priority: SEED_PRIORITY,
        notBefore: window.staleAt,
    });

    const teamEntries = extractTeamIdsFromCompetitionPayload(payload, competitionId, season);
    log('info', 'seed_competition_done', {
        competitionId,
        matchesCount: payload.matches?.length ?? 0,
        teamsExtracted: teamEntries.length,
        progress: `${index + 1}/${total}`,
    });

    return teamEntries;
}

async function seedTeam(
    readStore: Awaited<ReturnType<typeof getReadStore>>,
    entry: TeamIdEntry,
    index: number,
    total: number,
): Promise<boolean> {
    const scopeKey = buildReadStoreScopeKey({
        leagueId: entry.leagueId,
        season: String(entry.season),
        timezone: SEED_TIMEZONE,
    });

    // Check if already fresh
    const alreadyFresh = await isEntityFresh(readStore, 'team_full', entry.teamId, scopeKey);
    if (alreadyFresh) {
        log('info', 'seed_team_skip', { teamId: entry.teamId, leagueId: entry.leagueId, reason: 'already_fresh', progress: `${index + 1}/${total}` });
        return true;
    }

    log('info', 'seed_team_start', { teamId: entry.teamId, leagueId: entry.leagueId, progress: `${index + 1}/${total}` });

    const logger = createSilentLogger();
    const payload = await withRetry(`team:${entry.teamId}`, () =>
        fetchTeamFullPayload({
            teamId: entry.teamId,
            leagueId: entry.leagueId,
            season: entry.season,
            timezone: SEED_TIMEZONE,
            logger,
        }),
    );

    if (!isTeamPayloadValid(payload)) {
        log('warn', 'seed_team_empty', { teamId: entry.teamId, leagueId: entry.leagueId });
        return false;
    }

    const window = buildSnapshotWindow({
        staleAfterMs: TEAM_POLICY.freshMs,
        expiresAfterMs: TEAM_POLICY.staleMs,
    });

    await readStore.upsertEntitySnapshot({
        entityKind: 'team_full',
        entityId: entry.teamId,
        scopeKey,
        payload,
        generatedAt: window.generatedAt,
        staleAt: window.staleAt,
        expiresAt: window.expiresAt,
        metadata: { source: 'seed-v2', priority: SEED_PRIORITY },
    });

    await readStore.enqueueRefresh({
        entityKind: 'team_full',
        entityId: entry.teamId,
        scopeKey,
        priority: SEED_PRIORITY,
        notBefore: window.staleAt,
    });

    log('info', 'seed_team_done', { teamId: entry.teamId, progress: `${index + 1}/${total}` });
    return true;
}

// ─── Main ───

async function main() {
    if (!env.databaseUrl) {
        log('error', 'seed_abort', { reason: 'DATABASE_URL is not set' });
        process.exit(1);
    }

    if (!env.apiFootballKey) {
        log('error', 'seed_abort', { reason: 'API_FOOTBALL_KEY is not set' });
        process.exit(1);
    }

    const season = resolveCurrentSeason();

    log('info', 'seed_v2_start', {
        competitions: SEED_COMPETITION_IDS,
        maxTeamsPerCompetition: MAX_TEAMS_PER_COMPETITION,
        delayBetweenEntitiesMs: DELAY_BETWEEN_ENTITIES_MS,
        maxRetries: MAX_RETRIES,
        season,
    });

    const readStore = await getReadStore({ databaseUrl: env.databaseUrl });
    const startTime = Date.now();

    // ═══════════════════════════════════════════════
    // Phase 1 : Seed des compétitions (séquentiel)
    // ═══════════════════════════════════════════════

    log('info', 'phase1_start', { phase: 'competitions', count: SEED_COMPETITION_IDS.length });

    const allTeamEntries: TeamIdEntry[] = [];
    let competitionsSucceeded = 0;
    let competitionsFailed = 0;
    let competitionsSkipped = 0;

    for (let i = 0; i < SEED_COMPETITION_IDS.length; i++) {
        const competitionId = SEED_COMPETITION_IDS[i];
        try {
            const entries = await seedCompetition(readStore, competitionId, season, i, SEED_COMPETITION_IDS.length);
            allTeamEntries.push(...entries);
            competitionsSucceeded++;
        } catch (error) {
            competitionsFailed++;
            log('error', 'seed_competition_failed', {
                competitionId,
                error: error instanceof Error ? error.message : String(error),
            });
        }

        // Pause between competitions (except after the last one)
        if (i < SEED_COMPETITION_IDS.length - 1) {
            await sleep(DELAY_BETWEEN_ENTITIES_MS);
        }
    }

    log('info', 'phase1_complete', {
        succeeded: competitionsSucceeded,
        failed: competitionsFailed,
        skipped: competitionsSkipped,
        totalTeamsExtracted: allTeamEntries.length,
    });

    // ═══════════════════════════════════════════════
    // Phase 2 : Seed des équipes (séquentiel)
    // ═══════════════════════════════════════════════

    const uniqueTeams = new Map<string, TeamIdEntry>();
    for (const entry of allTeamEntries) {
        if (!uniqueTeams.has(entry.teamId)) {
            uniqueTeams.set(entry.teamId, entry);
        }
    }

    const teamsToSeed = Array.from(uniqueTeams.values());
    log('info', 'phase2_start', { phase: 'teams', count: teamsToSeed.length });

    let teamsSucceeded = 0;
    let teamsFailed = 0;
    let teamsSkipped = 0;

    for (let i = 0; i < teamsToSeed.length; i++) {
        const entry = teamsToSeed[i];
        try {
            const success = await seedTeam(readStore, entry, i, teamsToSeed.length);
            if (success) {
                teamsSucceeded++;
            } else {
                teamsSkipped++;
            }
        } catch (error) {
            teamsFailed++;
            log('error', 'seed_team_failed', {
                teamId: entry.teamId,
                leagueId: entry.leagueId,
                error: error instanceof Error ? error.message : String(error),
            });
        }

        // Pause between teams (except after the last one)
        if (i < teamsToSeed.length - 1) {
            await sleep(DELAY_BETWEEN_ENTITIES_MS);
        }
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);

    // ═══════════════════════════════════════════════
    // Résumé final
    // ═══════════════════════════════════════════════

    log('info', 'seed_v2_complete', {
        elapsedSeconds: elapsed,
        elapsedMinutes: Math.round(elapsed / 60),
        competitions: {
            total: SEED_COMPETITION_IDS.length,
            succeeded: competitionsSucceeded,
            failed: competitionsFailed,
        },
        teams: {
            total: teamsToSeed.length,
            succeeded: teamsSucceeded,
            failed: teamsFailed,
            skipped: teamsSkipped,
        },
        season,
    });

    await readStore.close();
    process.exit(competitionsFailed + teamsFailed > 0 ? 1 : 0);
}

main().catch(error => {
    log('error', 'seed_fatal', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
});
