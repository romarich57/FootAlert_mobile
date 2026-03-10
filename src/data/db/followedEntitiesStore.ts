import { getDatabaseSync } from './database';

export type FollowedEntityType = 'team' | 'player' | 'competition' | 'match';

export function replaceFollowedEntities(
  entityType: FollowedEntityType,
  entityIds: string[],
): void {
  const db = getDatabaseSync();
  const now = Date.now();

  db.executeSync('BEGIN TRANSACTION');
  try {
    db.executeSync('DELETE FROM followed_entities WHERE entity_type = ?', [entityType]);

    entityIds.forEach((entityId, index) => {
      db.executeSync(
        `INSERT OR REPLACE INTO followed_entities (entity_type, entity_id, position, updated_at)
         VALUES (?, ?, ?, ?)`,
        [entityType, entityId, index, now],
      );
    });

    db.executeSync('COMMIT');
  } catch (error) {
    db.executeSync('ROLLBACK');
    throw error;
  }
}

export function listFollowedEntityIds(entityType: FollowedEntityType): string[] {
  const db = getDatabaseSync();
  const result = db.executeSync(
    `SELECT entity_id
     FROM followed_entities
     WHERE entity_type = ?
     ORDER BY position ASC, updated_at DESC`,
    [entityType],
  );

  return result.rows
    .map(row => row.entity_id)
    .filter((value): value is string => typeof value === 'string' && value.length > 0);
}

export function isEntityFollowed(
  entityType: FollowedEntityType,
  entityId: string,
): boolean {
  const db = getDatabaseSync();
  const result = db.executeSync(
    `SELECT 1
     FROM followed_entities
     WHERE entity_type = ? AND entity_id = ?
     LIMIT 1`,
    [entityType, entityId],
  );

  return result.rows.length > 0;
}
