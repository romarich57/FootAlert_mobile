/**
 * Garbage collector pour la DB locale.
 *
 * Supprime les entités obsolètes pour maintenir la taille de la DB
 * dans des limites raisonnables. Exécuté au lancement de l'app.
 */

import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';

import { getDatabaseSync } from './database';
import { deleteEntitiesOlderThan, countEntities, getStoreSizeBytes } from './entityStore';
import { deleteMatchesOlderThan } from './matchesByDateStore';
import type { EntityType } from './types';

/** Durée de rétention par type d'entité (en ms). */
const RETENTION_MS: Record<EntityType, number> = {
  team: 7 * 24 * 60 * 60 * 1000,         // 7 jours
  player: 7 * 24 * 60 * 60 * 1000,       // 7 jours
  competition: 7 * 24 * 60 * 60 * 1000,  // 7 jours
  match: 3 * 24 * 60 * 60 * 1000,        // 3 jours (données plus volatiles)
};

/** Nombre maximum d'entités par type. */
const MAX_ENTITIES: Record<EntityType, number> = {
  team: 200,
  player: 200,
  competition: 50,
  match: 500,
};

/** Taille maximale de la DB avant nettoyage agressif (50 MB). */
const MAX_DB_SIZE_BYTES = 50 * 1024 * 1024;

/** Nombre de jours de matches à conserver dans matches_by_date. */
const MATCHES_BY_DATE_RETENTION_DAYS = 7;

/**
 * Exécute le garbage collection.
 * Retourne un résumé des suppressions.
 */
export function runGarbageCollection(): {
  deletedByType: Record<EntityType, number>;
  matchesByDateDeleted: number;
  dbSizeBytes: number;
} {
  const telemetry = getMobileTelemetry();
  const startMs = Date.now();

  const deletedByType: Record<EntityType, number> = {
    team: 0,
    player: 0,
    competition: 0,
    match: 0,
  };

  // 1. Supprimer les entités trop anciennes
  const entityTypes: EntityType[] = ['team', 'player', 'competition', 'match'];
  for (const entityType of entityTypes) {
    deletedByType[entityType] += deleteEntitiesOlderThan(
      entityType,
      RETENTION_MS[entityType],
    );
  }

  // 2. Supprimer les entités excédentaires (garder les N plus récentes)
  for (const entityType of entityTypes) {
    const count = countEntities(entityType);
    if (count > MAX_ENTITIES[entityType]) {
      const db = getDatabaseSync();
      const result = db.executeSync(
        `DELETE FROM entities
         WHERE entity_type = ? AND rowid NOT IN (
           SELECT rowid FROM entities
           WHERE entity_type = ?
           ORDER BY updated_at DESC
           LIMIT ?
         )`,
        [entityType, entityType, MAX_ENTITIES[entityType]],
      );
      deletedByType[entityType] += result.rowsAffected;
    }
  }

  // 3. Supprimer les matches_by_date obsolètes
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - MATCHES_BY_DATE_RETENTION_DAYS);
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
  const matchesByDateDeleted = deleteMatchesOlderThan(cutoffDateStr);

  // 4. Vérifier la taille de la DB
  const dbSizeBytes = getStoreSizeBytes();

  // 5. Si la DB est trop grosse, nettoyage agressif
  if (dbSizeBytes > MAX_DB_SIZE_BYTES) {
    telemetry.addBreadcrumb('db.gc.aggressive', { dbSizeBytes });
    for (const entityType of entityTypes) {
      const halfMax = Math.floor(MAX_ENTITIES[entityType] / 2);
      const count = countEntities(entityType);
      if (count > halfMax) {
        const db = getDatabaseSync();
        const result = db.executeSync(
          `DELETE FROM entities
           WHERE entity_type = ? AND rowid NOT IN (
             SELECT rowid FROM entities
             WHERE entity_type = ?
             ORDER BY updated_at DESC
             LIMIT ?
           )`,
          [entityType, entityType, halfMax],
        );
        deletedByType[entityType] += result.rowsAffected;
      }
    }

    // VACUUM pour libérer l'espace disque
    try {
      getDatabaseSync().executeSync('VACUUM');
    } catch {
      // VACUUM peut échouer si une transaction est active
    }
  }

  const durationMs = Date.now() - startMs;
  const totalDeleted = Object.values(deletedByType).reduce((a, b) => a + b, 0) + matchesByDateDeleted;

  if (totalDeleted > 0) {
    telemetry.trackEvent('db.gc.complete', {
      durationMs,
      totalDeleted,
      ...deletedByType,
      matchesByDateDeleted,
      dbSizeBytes: getStoreSizeBytes(),
    });
  }

  return { deletedByType, matchesByDateDeleted, dbSizeBytes };
}
