/**
 * CRUD typé pour le store local SQLite.
 *
 * Toutes les opérations sont synchrones (op-sqlite executeSync sur le thread JSI).
 * Les données sont stockées en JSON dans la colonne `data`.
 */

import type { Scalar } from '@op-engineering/op-sqlite';

import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';

import { getDatabaseSync } from './database';
import type {
  EntityQueryOptions,
  EntityReadResult,
  EntityType,
  EntityUpsertParams,
} from './types';

/**
 * Insère ou met à jour une entité dans le store.
 * Le JSON est sérialisé à l'écriture.
 */
export function upsertEntity<T>(params: EntityUpsertParams<T>): void {
  const { entityType, entityId, data, etag = null } = params;
  const db = getDatabaseSync();
  const now = Date.now();
  const jsonData = JSON.stringify(data);

  db.executeSync(
    `INSERT OR REPLACE INTO entities (entity_type, entity_id, data, updated_at, etag)
     VALUES (?, ?, ?, ?, ?)`,
    [entityType, entityId, jsonData, now, etag],
  );
}

/**
 * Insère ou met à jour plusieurs entités en une seule transaction.
 * Beaucoup plus performant que des upsert individuels (1 transaction vs N).
 */
export function upsertEntities<T>(
  entityType: EntityType,
  entities: Array<{ id: string; data: T; etag?: string | null }>,
): void {
  if (entities.length === 0) return;

  const db = getDatabaseSync();
  const now = Date.now();

  db.executeSync('BEGIN TRANSACTION');
  try {
    for (const entity of entities) {
      const jsonData = JSON.stringify(entity.data);
      db.executeSync(
        `INSERT OR REPLACE INTO entities (entity_type, entity_id, data, updated_at, etag)
         VALUES (?, ?, ?, ?, ?)`,
        [entityType, entity.id, jsonData, now, entity.etag ?? null],
      );
    }
    db.executeSync('COMMIT');
  } catch (error) {
    db.executeSync('ROLLBACK');
    throw error;
  }
}

/**
 * Lit une entité par type et ID.
 * Retourne null si non trouvée.
 */
export function getEntityById<T>(
  entityType: EntityType,
  entityId: string,
): EntityReadResult<T> {
  const db = getDatabaseSync();

  const result = db.executeSync(
    'SELECT data, updated_at, etag FROM entities WHERE entity_type = ? AND entity_id = ?',
    [entityType, entityId],
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  try {
    return {
      data: JSON.parse(row.data as string) as T,
      updatedAt: row.updated_at as number,
      etag: (row.etag as string) ?? null,
    };
  } catch {
    // JSON corrompu — supprimer l'entrée et retourner null
    getMobileTelemetry().trackError(
      new Error(`Corrupt entity JSON: ${entityType}/${entityId}`),
      { feature: 'db.entityStore' },
    );
    deleteEntity(entityType, entityId);
    return null;
  }
}

/**
 * Lit plusieurs entités par leurs IDs.
 * Retourne un Map<entityId, EntityReadResult<T>>.
 */
export function getEntitiesByIds<T>(
  entityType: EntityType,
  entityIds: string[],
): Map<string, EntityReadResult<T>> {
  const resultMap = new Map<string, EntityReadResult<T>>();
  if (entityIds.length === 0) return resultMap;

  const db = getDatabaseSync();
  const placeholders = entityIds.map(() => '?').join(',');

  const result = db.executeSync(
    `SELECT entity_id, data, updated_at, etag FROM entities
     WHERE entity_type = ? AND entity_id IN (${placeholders})`,
    [entityType, ...entityIds] as Scalar[],
  );

  for (const row of result.rows) {
    const entityId = row.entity_id as string;
    try {
      resultMap.set(entityId, {
        data: JSON.parse(row.data as string) as T,
        updatedAt: row.updated_at as number,
        etag: (row.etag as string) ?? null,
      });
    } catch {
      resultMap.set(entityId, null);
    }
  }

  return resultMap;
}

/**
 * Requête générique par type d'entité avec options de tri et limite.
 */
export function queryEntities<T>(options: EntityQueryOptions): T[] {
  return queryEntityRows<T>(options).map(entry => entry.data);
}

/**
 * Requête générique par type d'entité avec métadonnées de ligne.
 */
export function queryEntityRows<T>(options: EntityQueryOptions): Array<{
  entityId: string;
  data: T;
  updatedAt: number;
  etag: string | null;
}> {
  const {
    entityType,
    limit = 100,
    orderByUpdatedAt = 'desc',
    updatedAfter,
  } = options;

  const db = getDatabaseSync();
  const orderDirection = orderByUpdatedAt === 'asc' ? 'ASC' : 'DESC';

  let sql = 'SELECT data FROM entities WHERE entity_type = ?';
  const params: Scalar[] = [entityType];

  if (updatedAfter !== undefined) {
    sql += ' AND updated_at > ?';
    params.push(updatedAfter);
  }

  sql += ` ORDER BY updated_at ${orderDirection} LIMIT ?`;
  params.push(limit);

  sql = sql.replace('SELECT data', 'SELECT entity_id, data, updated_at, etag');

  const result = db.executeSync(sql, params);
  const entities: Array<{
    entityId: string;
    data: T;
    updatedAt: number;
    etag: string | null;
  }> = [];

  for (const row of result.rows) {
    try {
      entities.push({
        entityId: row.entity_id as string,
        data: JSON.parse(row.data as string) as T,
        updatedAt: row.updated_at as number,
        etag: (row.etag as string) ?? null,
      });
    } catch {
      // Skip les entrées corrompues
    }
  }

  return entities;
}

/**
 * Supprime une entité spécifique.
 */
export function deleteEntity(entityType: EntityType, entityId: string): void {
  const db = getDatabaseSync();
  db.executeSync(
    'DELETE FROM entities WHERE entity_type = ? AND entity_id = ?',
    [entityType, entityId],
  );
}

/**
 * Supprime les entités les plus anciennes d'un type donné,
 * en gardant les N plus récentes.
 * Retourne le nombre d'entités supprimées.
 */
export function deleteStaleEntities(
  entityType: EntityType,
  keepCount: number,
): number {
  const db = getDatabaseSync();

  const result = db.executeSync(
    `DELETE FROM entities
     WHERE entity_type = ? AND rowid NOT IN (
       SELECT rowid FROM entities
       WHERE entity_type = ?
       ORDER BY updated_at DESC
       LIMIT ?
     )`,
    [entityType, entityType, keepCount],
  );

  return result.rowsAffected;
}

/**
 * Supprime les entités non mises à jour depuis le timestamp donné.
 * Retourne le nombre d'entités supprimées.
 */
export function deleteEntitiesOlderThan(
  entityType: EntityType,
  olderThanMs: number,
): number {
  const db = getDatabaseSync();
  const cutoff = Date.now() - olderThanMs;

  const result = db.executeSync(
    'DELETE FROM entities WHERE entity_type = ? AND updated_at < ?',
    [entityType, cutoff],
  );

  return result.rowsAffected;
}

/**
 * Compte le nombre d'entités par type.
 */
export function countEntities(entityType: EntityType): number {
  const db = getDatabaseSync();
  const result = db.executeSync(
    'SELECT COUNT(*) as cnt FROM entities WHERE entity_type = ?',
    [entityType],
  );

  if (result.rows.length > 0) {
    return (result.rows[0].cnt as number) ?? 0;
  }
  return 0;
}

/**
 * Retourne la taille approximative du store en octets.
 * Utile pour la télémétrie de monitoring.
 */
export function getStoreSizeBytes(): number {
  const db = getDatabaseSync();
  const result = db.executeSync(
    "SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()",
  );

  if (result.rows.length > 0) {
    return (result.rows[0].size as number) ?? 0;
  }
  return 0;
}
