/**
 * Script de seed du read store PostgreSQL.
 *
 * Pré-remplit la base avec les données statiques des compétitions populaires
 * et leurs équipes, pour un chargement instantané au premier accès mobile.
 *
 * Usage :
 *   npx tsx scripts/db/seed-read-store.ts
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
const SEED_COMPETITION_IDS = ['39', '140', '135', '78', '61', '2', '3'];

/** Nombre max d'équipes à seeder par compétition */
const MAX_TEAMS_PER_COMPETITION = 20;

/** Concurrence max pour les appels API */
const CONCURRENCY = 3;

/** Priorité dans la refresh queue (100 = normal, 200 = haute) */
const SEED_PRIORITY = 150;

// ─── Utilitaires ───

function log(level: 'info' | 'warn' | 'error', event: string, data?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  console.log(JSON.stringify({ timestamp, level, event, ...data }));
}

function resolveCurrentSeason(): number {
  const now = new Date();
  const month = now.getUTCMonth();
  const year = now.getUTCFullYear();
  return month >= 6 ? year : year - 1;
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

// ─── Seed principal ───

async function seedCompetition(
  readStore: Awaited<ReturnType<typeof getReadStore>>,
  competitionId: string,
  season: number,
): Promise<TeamIdEntry[]> {
  const scopeKey = buildReadStoreScopeKey({ season: String(season) });
  const window = buildSnapshotWindow({
    staleAfterMs: COMPETITION_POLICY.freshMs,
    expiresAfterMs: COMPETITION_POLICY.staleMs,
  });

  log('info', 'seed_competition_start', { competitionId, season });

  const payload = await buildCompetitionFullResponse(competitionId, season);

  await readStore.upsertEntitySnapshot({
    entityKind: 'competition_full',
    entityId: competitionId,
    scopeKey,
    payload,
    generatedAt: window.generatedAt,
    staleAt: window.staleAt,
    expiresAt: window.expiresAt,
    metadata: { source: 'seed', priority: SEED_PRIORITY },
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
    teamsExtracted: teamEntries.length,
  });

  return teamEntries;
}

async function seedTeam(
  readStore: Awaited<ReturnType<typeof getReadStore>>,
  entry: TeamIdEntry,
): Promise<void> {
  const scopeKey = buildReadStoreScopeKey({
    leagueId: entry.leagueId,
    season: String(entry.season),
    timezone: SEED_TIMEZONE,
  });
  const window = buildSnapshotWindow({
    staleAfterMs: TEAM_POLICY.freshMs,
    expiresAfterMs: TEAM_POLICY.staleMs,
  });

  const logger = {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
    fatal: () => {},
    trace: () => {},
    child: () => logger,
    level: 'silent',
    silent: () => {},
  } as unknown as import('fastify').FastifyBaseLogger;

  const payload = await fetchTeamFullPayload({
    teamId: entry.teamId,
    leagueId: entry.leagueId,
    season: entry.season,
    timezone: SEED_TIMEZONE,
    logger,
  });

  await readStore.upsertEntitySnapshot({
    entityKind: 'team_full',
    entityId: entry.teamId,
    scopeKey,
    payload,
    generatedAt: window.generatedAt,
    staleAt: window.staleAt,
    expiresAt: window.expiresAt,
    metadata: { source: 'seed', priority: SEED_PRIORITY },
  });

  await readStore.enqueueRefresh({
    entityKind: 'team_full',
    entityId: entry.teamId,
    scopeKey,
    priority: SEED_PRIORITY,
    notBefore: window.staleAt,
  });
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<{ succeeded: number; failed: number }> {
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const results = await Promise.allSettled(batch.map(fn));
    for (const result of results) {
      if (result.status === 'fulfilled') {
        succeeded++;
      } else {
        failed++;
        log('error', 'seed_item_failed', {
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        });
      }
    }
  }

  return { succeeded, failed };
}

// ─── Main ───

async function main() {
  if (!env.databaseUrl) {
    log('error', 'seed_abort', { reason: 'DATABASE_URL is not set' });
    process.exit(1);
  }

  log('info', 'seed_start', {
    competitions: SEED_COMPETITION_IDS,
    maxTeamsPerCompetition: MAX_TEAMS_PER_COMPETITION,
    concurrency: CONCURRENCY,
  });

  const readStore = await getReadStore({ databaseUrl: env.databaseUrl });
  const season = resolveCurrentSeason();

  // Phase 1 : Seed des compétitions
  const allTeamEntries: TeamIdEntry[] = [];
  const competitionResults = await runWithConcurrency(
    SEED_COMPETITION_IDS,
    CONCURRENCY,
    async competitionId => {
      const entries = await seedCompetition(readStore, competitionId, season);
      allTeamEntries.push(...entries);
    },
  );

  log('info', 'seed_competitions_summary', {
    succeeded: competitionResults.succeeded,
    failed: competitionResults.failed,
    totalTeamsToSeed: allTeamEntries.length,
  });

  // Phase 2 : Seed des équipes (extraites des classements)
  const uniqueTeams = new Map<string, TeamIdEntry>();
  for (const entry of allTeamEntries) {
    if (!uniqueTeams.has(entry.teamId)) {
      uniqueTeams.set(entry.teamId, entry);
    }
  }

  const teamsToSeed = Array.from(uniqueTeams.values());
  log('info', 'seed_teams_start', { uniqueTeams: teamsToSeed.length });

  const teamResults = await runWithConcurrency(
    teamsToSeed,
    CONCURRENCY,
    async entry => {
      log('info', 'seed_team', { teamId: entry.teamId, leagueId: entry.leagueId });
      await seedTeam(readStore, entry);
    },
  );

  log('info', 'seed_teams_summary', {
    succeeded: teamResults.succeeded,
    failed: teamResults.failed,
  });

  // Résumé final
  log('info', 'seed_complete', {
    competitions: {
      total: SEED_COMPETITION_IDS.length,
      succeeded: competitionResults.succeeded,
      failed: competitionResults.failed,
    },
    teams: {
      total: teamsToSeed.length,
      succeeded: teamResults.succeeded,
      failed: teamResults.failed,
    },
    season,
  });

  await readStore.close();
  process.exit(0);
}

main().catch(error => {
  log('error', 'seed_fatal', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exit(1);
});
