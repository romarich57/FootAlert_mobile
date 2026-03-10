/**
 * Singleton de la base SQLite locale via op-sqlite.
 *
 * Initialise la DB, exécute les migrations, et expose le handle unique.
 * Le fichier DB est stocké dans le répertoire documents de l'app.
 */

import { open, type DB } from '@op-engineering/op-sqlite';

import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';

import { runMigrations } from './migrationRunner';
import { allMigrations } from './migrations';

const DB_NAME = 'footalert_local.sqlite';

let dbInstance: DB | null = null;
let initPromise: Promise<DB> | null = null;

/** Pragmas d'optimisation appliqués à l'ouverture. */
function applyPragmas(db: DB): void {
  // WAL pour des lectures non-bloquantes pendant les écritures
  db.executeSync('PRAGMA journal_mode = WAL');
  // Synchronisation normale — bon compromis perf/durabilité
  db.executeSync('PRAGMA synchronous = NORMAL');
  // Cache mémoire de 2MB (par défaut ~2KB)
  db.executeSync('PRAGMA cache_size = -2000');
  // Taille de page standard 4KB
  db.executeSync('PRAGMA page_size = 4096');
  // Foreign keys activées (bonne pratique même si pas encore utilisé)
  db.executeSync('PRAGMA foreign_keys = ON');
}

/**
 * Initialise la DB et exécute les migrations si nécessaire.
 * Appelé une seule fois au lancement de l'app.
 */
async function initializeDatabase(): Promise<DB> {
  const telemetry = getMobileTelemetry();
  const startMs = Date.now();

  try {
    const db = open({ name: DB_NAME });

    applyPragmas(db);
    runMigrations(db, allMigrations);

    const durationMs = Date.now() - startMs;
    telemetry.addBreadcrumb('db.init.success', { durationMs });

    dbInstance = db;
    return db;
  } catch (error) {
    telemetry.trackError(
      error instanceof Error ? error : new Error(String(error)),
      { feature: 'db.init' },
    );
    throw error;
  }
}

/**
 * Retourne le singleton DB. Initialise au premier appel.
 * Thread-safe via promesse partagée.
 */
export function getDatabase(): Promise<DB> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  if (!initPromise) {
    initPromise = initializeDatabase().catch(error => {
      // Reset pour permettre un retry au prochain appel
      initPromise = null;
      throw error;
    });
  }

  return initPromise;
}

/**
 * Retourne le singleton DB de manière synchrone.
 * Lève une erreur si la DB n'a pas encore été initialisée.
 * À utiliser uniquement dans les chemins chauds où l'init est garantie.
 */
export function getDatabaseSync(): DB {
  if (!dbInstance) {
    throw new Error(
      'Database not initialized. Call getDatabase() first during app startup.',
    );
  }
  return dbInstance;
}

/**
 * Ferme proprement la DB. À appeler lors du shutdown de l'app.
 */
export function closeDatabase(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // Ignorer les erreurs de fermeture
    }
    dbInstance = null;
    initPromise = null;
  }
}

/**
 * Efface et recrée la DB (recovery après corruption).
 */
export async function resetDatabase(): Promise<DB> {
  const telemetry = getMobileTelemetry();
  telemetry.addBreadcrumb('db.reset.start');

  closeDatabase();

  try {
    const db = open({ name: DB_NAME });
    db.executeSync('PRAGMA writable_schema = ON');
    db.executeSync("DELETE FROM sqlite_master WHERE type IN ('table', 'index', 'trigger')");
    db.executeSync('PRAGMA writable_schema = OFF');
    await db.execute('VACUUM');
    db.close();
  } catch {
    // Ignorer si la DB est corrompue au point de ne pas pouvoir être ouverte
  }

  // Ré-initialiser proprement
  initPromise = null;
  return getDatabase();
}
