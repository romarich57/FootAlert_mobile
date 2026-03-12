/**
 * Middleware de synchronisation React Query → SQLite.
 *
 * S'abonne aux mises à jour du QueryCache pour écrire automatiquement
 * en SQLite les résultats des queries persistables.
 * Cela permet une migration progressive : les queries existantes continuent
 * de fonctionner normalement, mais leurs résultats sont aussi écrits en DB
 * pour que le local-first adapter puisse les lire ensuite.
 */

import type { Query, QueryCache } from '@tanstack/react-query';

import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';

import {
  buildCompetitionFullEntityId,
  buildMatchFullEntityId,
  buildPlayerFullEntityId,
  buildTeamFullEntityId,
} from './fullEntityIds';
import { upsertEntity } from './entityStore';
import { setLastSyncTimestamp } from './syncMetadata';
import type { EntityType } from './types';

/** Configuration d'un mapping queryKey → entité SQLite. */
export type QuerySyncRule = {
  /**
   * Teste si une queryKey correspond à cette règle.
   * Ex: (key) => key[0] === 'teams' && key[1] === 'full'
   */
  match: (queryKey: readonly unknown[]) => boolean;
  /** Type d'entité cible dans SQLite. */
  entityType: EntityType;
  /** Extrait l'entityId depuis la queryKey. */
  extractEntityId: (queryKey: readonly unknown[]) => string | null;
  /**
   * Transforme les données de la query avant écriture en DB.
   * Par défaut, écrit le data tel quel.
   */
  transform?: (data: unknown) => unknown;
};

/** Règles de sync pour les endpoints /full. */
export const defaultSyncRules: QuerySyncRule[] = [
  {
    match: (key) => key[0] === 'teams' && key[1] === 'full',
    entityType: 'team',
    extractEntityId: (key) =>
      typeof key[2] === 'string' && typeof key[3] === 'string'
        ? buildTeamFullEntityId(
            key[2],
            typeof key[4] === 'string' ? key[4] : null,
            typeof key[5] === 'number' ? key[5] : null,
            key[3],
          )
        : null,
  },
  {
    match: (key) => key[0] === 'players' && key[1] === 'full',
    entityType: 'player',
    extractEntityId: (key) =>
      typeof key[2] === 'string' && typeof key[3] === 'number'
        ? buildPlayerFullEntityId(key[2], key[3])
        : null,
  },
  {
    match: (key) => key[0] === 'competitions' && key[1] === 'full',
    entityType: 'competition',
    extractEntityId: (key) =>
      typeof key[2] === 'string'
        ? buildCompetitionFullEntityId(
            key[2],
            typeof key[3] === 'number' ? key[3] : null,
          )
        : null,
  },
  {
    match: (key) => key[0] === 'match_details_full',
    entityType: 'match',
    extractEntityId: (key) =>
      typeof key[1] === 'string' ? buildMatchFullEntityId(key[1]) : null,
  },
];

/** Désabonnement retourné par setupQueryCacheSyncMiddleware. */
export type SyncMiddlewareUnsubscribe = () => void;

/**
 * Installe le middleware de sync sur le QueryCache.
 *
 * Écoute les événements `updated` sur les queries qui matchent une règle,
 * et écrit les données en SQLite.
 *
 * @returns Fonction de désabonnement.
 */
export function setupQueryCacheSyncMiddleware(
  queryCache: QueryCache,
  rules: QuerySyncRule[] = defaultSyncRules,
): SyncMiddlewareUnsubscribe {
  const telemetry = getMobileTelemetry();

  const unsubscribe = queryCache.subscribe(event => {
    // On ne s'intéresse qu'aux mises à jour réussies
    if (event.type !== 'updated' || event.action.type !== 'success') {
      return;
    }

    const query = event.query as Query;
    const queryKey = query.queryKey;
    const data = query.state.data;

    if (data === undefined || data === null) return;

    // Chercher la première règle qui matche
    for (const rule of rules) {
      if (!rule.match(queryKey)) continue;

      const entityId = rule.extractEntityId(queryKey);
      if (!entityId) break;

      try {
        const dataToStore = rule.transform ? rule.transform(data) : data;

        upsertEntity({
          entityType: rule.entityType,
          entityId,
          data: dataToStore,
        });
        setLastSyncTimestamp(rule.entityType, entityId);
      } catch (error) {
        telemetry.trackEvent('db.sqlite_write.failed', {
          entityType: rule.entityType,
          queryFamily:
            typeof queryKey[0] === 'string' ? queryKey[0] : 'unknown',
        });
        telemetry.trackError(
          error instanceof Error ? error : new Error(String(error)),
          { feature: 'db.syncMiddleware' },
        );
      }

      break; // Une seule règle par query
    }
  });

  telemetry.addBreadcrumb('db.syncMiddleware.installed', {
    rulesCount: rules.length,
  });

  return unsubscribe;
}
