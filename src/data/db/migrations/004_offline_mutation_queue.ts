import type { MigrationScript } from '../migrationRunner';

export const migration004OfflineMutationQueue: MigrationScript = {
  version: 4,
  name: '004_offline_mutation_queue',
  up: [
    `CREATE TABLE IF NOT EXISTS offline_mutation_queue (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      mutation_type  TEXT NOT NULL,
      payload        TEXT NOT NULL,
      retries        INTEGER NOT NULL DEFAULT 0,
      created_at     INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_offline_queue_created
     ON offline_mutation_queue(created_at)`,
  ],
};
