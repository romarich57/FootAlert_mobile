import type { MigrationScript } from '../migrationRunner';

export const migration003BootstrapCache: MigrationScript = {
  version: 3,
  name: '003_bootstrap_cache',
  up: [
    `CREATE TABLE IF NOT EXISTS bootstrap_snapshots (
      snapshot_key TEXT PRIMARY KEY,
      payload      TEXT NOT NULL,
      updated_at   INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_bootstrap_snapshots_updated
     ON bootstrap_snapshots(updated_at)`,
  ],
};
