/**
 * Runner de migrations SQLite.
 *
 * Applique les migrations dans l'ordre croissant de version.
 * Utilise la table sync_metadata pour persister la version courante.
 * Toutes les instructions d'une migration s'exécutent dans une transaction unique.
 */

import type { DB } from '@op-engineering/op-sqlite';

import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';

export type MigrationScript = {
  version: number;
  name: string;
  up: string[];
};

const SCHEMA_VERSION_KEY = 'db_schema_version';

/** Lit la version courante du schéma depuis sync_metadata. */
function getCurrentVersion(db: DB): number {
  try {
    const result = db.executeSync(
      'SELECT value FROM sync_metadata WHERE key = ?',
      [SCHEMA_VERSION_KEY],
    );
    if (result.rows.length > 0) {
      return Number(result.rows[0].value) || 0;
    }
  } catch {
    // Table sync_metadata n'existe pas encore → version 0
  }
  return 0;
}

/** Met à jour la version courante dans sync_metadata. */
function setCurrentVersion(db: DB, version: number): void {
  db.executeSync(
    `INSERT OR REPLACE INTO sync_metadata (key, value, updated_at)
     VALUES (?, ?, ?)`,
    [SCHEMA_VERSION_KEY, String(version), Date.now()],
  );
}

/**
 * Applique toutes les migrations dont la version est supérieure à la version courante.
 * Chaque migration est wrappée dans une transaction (rollback si erreur).
 */
export function runMigrations(db: DB, migrations: readonly MigrationScript[]): void {
  const telemetry = getMobileTelemetry();
  const currentVersion = getCurrentVersion(db);

  const pendingMigrations = migrations
    .filter(m => m.version > currentVersion)
    .sort((a, b) => a.version - b.version);

  if (pendingMigrations.length === 0) {
    return;
  }

  telemetry.addBreadcrumb(
    `db.migrations.start`,
    { currentVersion, pendingCount: pendingMigrations.length },
  );

  for (const migration of pendingMigrations) {
    const startMs = Date.now();
    try {
      db.executeSync('BEGIN TRANSACTION');

      for (const statement of migration.up) {
        db.executeSync(statement);
      }

      setCurrentVersion(db, migration.version);

      db.executeSync('COMMIT');

      const durationMs = Date.now() - startMs;
      telemetry.addBreadcrumb(
        `db.migration.applied`,
        { version: migration.version, name: migration.name, durationMs },
      );
    } catch (error) {
      try {
        db.executeSync('ROLLBACK');
      } catch {
        // Rollback peut échouer si la transaction n'est plus active
      }

      telemetry.trackError(error instanceof Error ? error : new Error(String(error)), {
        feature: 'db.migration',
        details: { version: migration.version, name: migration.name },
      });

      throw new Error(
        `Migration ${migration.name} (v${migration.version}) failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  telemetry.addBreadcrumb(
    `db.migrations.complete`,
    { newVersion: pendingMigrations[pendingMigrations.length - 1].version },
  );
}
