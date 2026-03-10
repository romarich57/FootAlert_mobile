import { getDatabaseSync } from './database';
import type { BootstrapPayload } from '@domain/contracts/bootstrap.types';

type BootstrapSnapshotRow = {
  snapshot_key: string;
  payload: string;
  updated_at: number;
};

export type BootstrapSnapshotRecord = {
  snapshotKey: string;
  payload: BootstrapPayload;
  updatedAt: number;
};

export function upsertBootstrapSnapshot(
  snapshotKey: string,
  payload: BootstrapPayload,
): void {
  const db = getDatabaseSync();
  db.executeSync(
    `INSERT OR REPLACE INTO bootstrap_snapshots (
      snapshot_key,
      payload,
      updated_at
    ) VALUES (?, ?, ?)`,
    [snapshotKey, JSON.stringify(payload), Date.now()],
  );
}

export function getBootstrapSnapshot(
  snapshotKey: string,
): BootstrapSnapshotRecord | null {
  const db = getDatabaseSync();
  const result = db.executeSync(
    `SELECT snapshot_key, payload, updated_at
     FROM bootstrap_snapshots
     WHERE snapshot_key = ?
     LIMIT 1`,
    [snapshotKey],
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0] as BootstrapSnapshotRow;
  try {
    return {
      snapshotKey: row.snapshot_key,
      payload: JSON.parse(row.payload) as BootstrapPayload,
      updatedAt: row.updated_at,
    };
  } catch {
    return null;
  }
}
