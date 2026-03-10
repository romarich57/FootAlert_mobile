/**
 * Adaptateur local-first pour React Query.
 *
 * Stratégie :
 * 1. Lecture synchrone depuis SQLite (< 5ms)
 * 2. Si cache frais OU offline → retour immédiat, pas de réseau
 * 3. Si cache stale + online → retour immédiat du cache, fetch réseau en arrière-plan
 * 4. Si pas de cache + online → fetch réseau et écriture en DB
 * 5. Si pas de cache + offline → erreur (pas de données)
 *
 * Ce module fournit `createLocalFirstQueryFn` qui wrape une fonction réseau
 * existante pour la rendre local-first. Il s'intègre avec React Query via
 * le paramètre `queryFn` standard.
 */

import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';

import { getEntityById, upsertEntity } from './entityStore';
import { getLastSyncTimestamp, setLastSyncTimestamp } from './syncMetadata';
import type { EntityType } from './types';

export type LocalFirstConfig = {
  /** Type d'entité dans le store SQLite. */
  entityType: EntityType;
  /** Durée en ms au-delà de laquelle le cache est considéré stale. */
  maxAgeMs: number;
};

export type LocalFirstNetworkFn<T> = (signal?: AbortSignal) => Promise<T>;

export type LocalFirstResult<T> = {
  data: T;
  /** Source de la donnée retournée. */
  source: 'sqlite' | 'network';
  /** Timestamp de la donnée retournée (écriture en DB). */
  updatedAt: number;
};

/**
 * Détermine si on est online en vérifiant le onlineManager de React Query.
 * Fallback sur navigator.onLine ou true par défaut.
 */
function isOnline(): boolean {
  try {
    // React Query expose un onlineManager global
    const { onlineManager } = require('@tanstack/react-query');
    return onlineManager.isOnline();
  } catch {
    return true;
  }
}

/**
 * Crée une queryFn local-first compatible avec React Query.
 *
 * Usage :
 * ```typescript
 * useQuery({
 *   queryKey: queryKeys.teams.full(teamId, ...),
 *   queryFn: createLocalFirstQueryFn({
 *     entityType: 'team',
 *     entityId: teamId,
 *     maxAgeMs: 60_000,
 *     fetchFn: (signal) => fetchTeamFull({ teamId, ... }, signal).then(p => p.response),
 *   }),
 * });
 * ```
 */
export function createLocalFirstQueryFn<T>(params: {
  entityType: EntityType;
  entityId: string;
  maxAgeMs: number;
  fetchFn: LocalFirstNetworkFn<T>;
}): (context: { signal: AbortSignal }) => Promise<T> {
  const { entityType, entityId, maxAgeMs, fetchFn } = params;

  return async ({ signal }: { signal: AbortSignal }) => {
    const telemetry = getMobileTelemetry();
    const startMs = Date.now();

    // 1. Lecture synchrone depuis SQLite
    const cached = getEntityById<T>(entityType, entityId);
    const online = isOnline();
    const lastSync = cached ? getLastSyncTimestamp(entityType, entityId) : null;
    const cacheAgeMs = lastSync === null ? null : Date.now() - lastSync;
    const fresh = cacheAgeMs !== null && cacheAgeMs < maxAgeMs;

    // 2. Cache frais → retour immédiat, pas de réseau
    if (cached && fresh) {
      telemetry.addBreadcrumb('db.localFirst.hit', {
        entityType,
        entityId,
        source: 'sqlite_fresh',
        durationMs: Date.now() - startMs,
      });
      telemetry.trackEvent('db.local_first.read', {
        entityType,
        entityId,
        outcome: 'fresh_hit',
        durationMs: Date.now() - startMs,
        cacheAgeMs,
      });
      return cached.data;
    }

    // 3. Offline → retourner le cache même stale, ou erreur
    if (!online) {
      if (cached) {
        telemetry.addBreadcrumb('db.localFirst.hit', {
          entityType,
          entityId,
          source: 'sqlite_offline',
          durationMs: Date.now() - startMs,
        });
        telemetry.trackEvent('db.local_first.read', {
          entityType,
          entityId,
          outcome: 'offline_hit',
          durationMs: Date.now() - startMs,
          cacheAgeMs,
        });
        return cached.data;
      }
      telemetry.trackEvent('db.local_first.read', {
        entityType,
        entityId,
        outcome: 'offline_miss',
        durationMs: Date.now() - startMs,
      });
      throw new LocalFirstOfflineError(entityType, entityId);
    }

    // 4. Online + cache stale → fetch réseau, retourner les données fraîches
    //    React Query gère déjà le placeholderData pour afficher le cache pendant le fetch.
    try {
      const networkData = await fetchFn(signal);

      // Écrire en DB pour les prochaines lectures
      upsertEntity({ entityType, entityId, data: networkData });
      setLastSyncTimestamp(entityType, entityId);

      telemetry.addBreadcrumb('db.localFirst.hit', {
        entityType,
        entityId,
        source: 'network',
        durationMs: Date.now() - startMs,
      });
      telemetry.trackEvent('db.local_first.read', {
        entityType,
        entityId,
        outcome: cached ? 'network_refresh' : 'network_miss',
        durationMs: Date.now() - startMs,
        cacheAgeMs,
      });

      return networkData;
    } catch (networkError) {
      // Si le fetch échoue mais qu'on a un cache stale → fallback
      if (cached) {
        telemetry.addBreadcrumb('db.localFirst.fallback', {
          entityType,
          entityId,
          source: 'sqlite_stale',
          durationMs: Date.now() - startMs,
        });
        telemetry.trackEvent('db.local_first.read', {
          entityType,
          entityId,
          outcome: 'stale_fallback',
          durationMs: Date.now() - startMs,
          cacheAgeMs,
        });
        return cached.data;
      }

      // Pas de cache et réseau en erreur → propager l'erreur
      throw networkError;
    }
  };
}

/**
 * Erreur spécifique quand on est offline sans cache local.
 */
export class LocalFirstOfflineError extends Error {
  public readonly entityType: EntityType;
  public readonly entityId: string;

  constructor(entityType: EntityType, entityId: string) {
    super(`No local data for ${entityType}/${entityId} and device is offline`);
    this.name = 'LocalFirstOfflineError';
    this.entityType = entityType;
    this.entityId = entityId;
  }
}

/**
 * Écrit des données dans le store local sans passer par le réseau.
 * Utile pour persister les résultats de queries existantes (migration progressive).
 */
export function writeToLocalStore<T>(
  entityType: EntityType,
  entityId: string,
  data: T,
): void {
  upsertEntity({ entityType, entityId, data });
  setLastSyncTimestamp(entityType, entityId);
}

/**
 * Lit des données depuis le store local de manière synchrone.
 * Retourne null si non trouvé.
 */
export function readFromLocalStore<T>(
  entityType: EntityType,
  entityId: string,
): T | null {
  const result = getEntityById<T>(entityType, entityId);
  return result?.data ?? null;
}
