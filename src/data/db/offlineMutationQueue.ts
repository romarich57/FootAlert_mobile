/**
 * File d'attente de mutations offline persistée en SQLite.
 *
 * Stocke les mutations échouées (ex: postFollowEvent) quand l'appareil est
 * hors-ligne, et les rejoue automatiquement à la reconnexion.
 *
 * Stratégie :
 * 1. Le caller appelle `enqueueMutation(type, payload)`
 * 2. Le replay est déclenché par `drainMutationQueue()` — appelé à la reconnexion
 * 3. Chaque mutation est tentée une fois ; en cas d'échec réseau on la laisse
 *    dans la queue pour le prochain drain. Après MAX_RETRIES, la mutation est supprimée.
 * 4. Les mutations expirées (> 24h) sont nettoyées automatiquement.
 */

import { getDatabaseSync } from './database';
import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';

export type MutationType = 'follow_event';

type PendingMutation = {
  id: number;
  mutationType: MutationType;
  payload: string;
  retries: number;
  createdAt: number;
};

const MAX_RETRIES = 5;
const MUTATION_TTL_MS = 24 * 60 * 60_000; // 24h

type MutationExecutor = (payload: unknown) => Promise<void>;

const executors = new Map<MutationType, MutationExecutor>();

/**
 * Enregistre un executor pour un type de mutation.
 * Appelé au bootstrap de l'app pour câbler les appels réseau réels.
 */
export function registerMutationExecutor(
  mutationType: MutationType,
  executor: MutationExecutor,
): void {
  executors.set(mutationType, executor);
}

/**
 * Ajoute une mutation à la queue offline.
 * Appelé quand un appel réseau échoue en mode offline.
 */
export function enqueueMutation(
  mutationType: MutationType,
  payload: unknown,
): void {
  const db = getDatabaseSync();
  const now = Date.now();
  const jsonPayload = JSON.stringify(payload);

  db.executeSync(
    `INSERT INTO offline_mutation_queue (mutation_type, payload, retries, created_at)
     VALUES (?, ?, 0, ?)`,
    [mutationType, jsonPayload, now],
  );

  getMobileTelemetry().trackEvent('db.offline_queue.enqueued', {
    mutationType,
  });
}

/**
 * Rejoue toutes les mutations en attente.
 * Appelé à la reconnexion réseau.
 *
 * @returns Nombre de mutations traitées avec succès.
 */
export async function drainMutationQueue(): Promise<number> {
  const db = getDatabaseSync();
  const telemetry = getMobileTelemetry();
  const cutoff = Date.now() - MUTATION_TTL_MS;

  // Nettoyer les mutations expirées
  const expiredResult = db.executeSync(
    'DELETE FROM offline_mutation_queue WHERE created_at < ?',
    [cutoff],
  );
  if (expiredResult.rowsAffected > 0) {
    telemetry.trackEvent('db.offline_queue.expired_cleanup', {
      count: expiredResult.rowsAffected,
    });
  }

  // Nettoyer les mutations ayant dépassé le max de retries
  const overRetryResult = db.executeSync(
    'DELETE FROM offline_mutation_queue WHERE retries >= ?',
    [MAX_RETRIES],
  );
  if (overRetryResult.rowsAffected > 0) {
    telemetry.trackEvent('db.offline_queue.max_retries_cleanup', {
      count: overRetryResult.rowsAffected,
    });
  }

  // Lire les mutations en attente
  const pending = db.executeSync(
    `SELECT id, mutation_type, payload, retries, created_at
     FROM offline_mutation_queue
     ORDER BY created_at ASC
     LIMIT 50`,
  );

  if (pending.rows.length === 0) return 0;

  let successCount = 0;

  for (const row of pending.rows) {
    const mutation: PendingMutation = {
      id: row.id as number,
      mutationType: row.mutation_type as MutationType,
      payload: row.payload as string,
      retries: row.retries as number,
      createdAt: row.created_at as number,
    };

    const executor = executors.get(mutation.mutationType);
    if (!executor) {
      // Pas d'executor enregistré — supprimer la mutation orpheline
      db.executeSync('DELETE FROM offline_mutation_queue WHERE id = ?', [mutation.id]);
      continue;
    }

    try {
      const parsedPayload = JSON.parse(mutation.payload);
      await executor(parsedPayload);

      // Succès — supprimer de la queue
      db.executeSync('DELETE FROM offline_mutation_queue WHERE id = ?', [mutation.id]);
      successCount += 1;
    } catch {
      // Échec — incrémenter retries
      db.executeSync(
        'UPDATE offline_mutation_queue SET retries = retries + 1 WHERE id = ?',
        [mutation.id],
      );
    }
  }

  if (successCount > 0 || pending.rows.length > 0) {
    telemetry.trackEvent('db.offline_queue.drain_complete', {
      processed: pending.rows.length,
      succeeded: successCount,
      failed: pending.rows.length - successCount,
    });
  }

  return successCount;
}

/**
 * Retourne le nombre de mutations en attente.
 */
export function getPendingMutationCount(): number {
  const db = getDatabaseSync();
  const result = db.executeSync(
    'SELECT COUNT(*) as cnt FROM offline_mutation_queue',
  );
  return (result.rows[0]?.cnt as number) ?? 0;
}
