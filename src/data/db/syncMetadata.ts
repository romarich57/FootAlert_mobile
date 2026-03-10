/**
 * Gestion des métadonnées de synchronisation.
 *
 * Persiste les timestamps de dernière sync, les ETags des endpoints,
 * et tout état nécessaire au sync engine.
 */

import { getDatabaseSync } from './database';

/**
 * Lit une valeur de métadonnée par clé.
 */
export function getSyncMeta(key: string): string | null {
  const db = getDatabaseSync();
  const result = db.executeSync(
    'SELECT value FROM sync_metadata WHERE key = ?',
    [key],
  );

  if (result.rows.length > 0) {
    return result.rows[0].value as string;
  }
  return null;
}

/**
 * Écrit ou met à jour une valeur de métadonnée.
 */
export function setSyncMeta(key: string, value: string): void {
  const db = getDatabaseSync();
  db.executeSync(
    `INSERT OR REPLACE INTO sync_metadata (key, value, updated_at)
     VALUES (?, ?, ?)`,
    [key, value, Date.now()],
  );
}

/**
 * Supprime une valeur de métadonnée.
 */
export function deleteSyncMeta(key: string): void {
  const db = getDatabaseSync();
  db.executeSync('DELETE FROM sync_metadata WHERE key = ?', [key]);
}

// --- Helpers typés pour les cas courants ---

/** Clé normalisée pour le timestamp de dernière sync d'un type d'entité. */
function lastSyncKey(entityType: string, entityId?: string): string {
  return entityId
    ? `last_sync:${entityType}:${entityId}`
    : `last_sync:${entityType}`;
}

/**
 * Retourne le timestamp de dernière sync pour un type/id d'entité.
 */
export function getLastSyncTimestamp(
  entityType: string,
  entityId?: string,
): number | null {
  const raw = getSyncMeta(lastSyncKey(entityType, entityId));
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Enregistre le timestamp de dernière sync.
 */
export function setLastSyncTimestamp(
  entityType: string,
  entityId?: string,
): void {
  setSyncMeta(lastSyncKey(entityType, entityId), String(Date.now()));
}

/**
 * Vérifie si une sync est nécessaire (dernière sync trop ancienne).
 */
export function isSyncStale(
  entityType: string,
  maxAgeMs: number,
  entityId?: string,
): boolean {
  const lastSync = getLastSyncTimestamp(entityType, entityId);
  if (lastSync === null) return true;
  return Date.now() - lastSync > maxAgeMs;
}
