/**
 * Bridge d'hydratation : SQLite → React Query au cold start.
 *
 * Au lancement de l'app, lit les entités les plus récentes de chaque type
 * depuis SQLite et les injecte dans le QueryClient via setQueryData.
 * Cela permet un affichage immédiat des écrans déjà visités.
 *
 * Ce bridge complète (ne remplace pas encore) le MMKV persister existant.
 * À terme, les entités migrées vers SQLite n'auront plus besoin du blob MMKV.
 */

import type { QueryClient } from '@tanstack/react-query';

import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';

import { getEntitiesByIds, queryEntityRows } from './entityStore';
import type { EntityType } from './types';

/** Nombre max d'entités à hydrater par type au cold start. */
const HYDRATION_LIMITS: Record<EntityType, number> = {
  team: 30,
  player: 30,
  competition: 20,
  match: 50,
};

export type HydrationMapping = {
  entityType: EntityType;
  /**
   * IDs à hydrater en priorité avant le lot "plus récent".
   * Typiquement les entités suivies localement.
   */
  priorityEntityIds?: () => string[];
  /**
   * Construit la queryKey React Query à partir de l'entité.
   * Retourne null pour skip l'entité (ex: données incomplètes).
   */
  buildQueryKey: (entity: HydrationEntity) => readonly unknown[] | null;
  /**
   * Transforme l'entité pour le format attendu par React Query.
   * Par défaut, retourne l'entité telle quelle.
   */
  transform?: (entity: HydrationEntity) => unknown;
};

export type HydrationEntity = {
  id: string;
  data: unknown;
  updatedAt: number;
};

/** Résultat de l'hydratation pour la télémétrie. */
export type HydrationResult = {
  hydratedCounts: Record<EntityType, number>;
  durationMs: number;
};

/**
 * Hydrate le QueryClient depuis SQLite pour un ensemble de mappings.
 *
 * Appelé une seule fois au cold start, après l'init de la DB.
 */
export function hydrateQueryClientFromSqlite(
  queryClient: QueryClient,
  mappings: HydrationMapping[],
): HydrationResult {
  const telemetry = getMobileTelemetry();
  const startMs = Date.now();

  const hydratedCounts: Record<EntityType, number> = {
    team: 0,
    player: 0,
    competition: 0,
    match: 0,
  };

  for (const mapping of mappings) {
    const { entityType, buildQueryKey, transform } = mapping;
    const limit = HYDRATION_LIMITS[entityType];
    const priorityIds = mapping.priorityEntityIds?.() ?? [];
    const seenEntityIds = new Set<string>();
    const entities: Array<{
      entityId: string;
      data: Record<string, unknown>;
      updatedAt: number;
      etag: string | null;
    }> = [];

    if (priorityIds.length > 0) {
      const priorityEntities = getEntitiesByIds<Record<string, unknown>>(
        entityType,
        priorityIds,
      );

      priorityIds.forEach(entityId => {
        const entity = priorityEntities.get(entityId);
        if (!entity) {
          return;
        }

        entities.push({
          entityId,
          data: entity.data,
          updatedAt: entity.updatedAt,
          etag: entity.etag,
        });
        seenEntityIds.add(entityId);
      });
    }

    const recentEntities = queryEntityRows<Record<string, unknown>>({
      entityType,
      limit,
      orderByUpdatedAt: 'desc',
    });

    recentEntities.forEach(entity => {
      if (seenEntityIds.has(entity.entityId) || entities.length >= limit) {
        return;
      }

      entities.push(entity);
      seenEntityIds.add(entity.entityId);
    });

    for (const entity of entities) {
      const hydrationEntity: HydrationEntity = {
        id: entity.entityId,
        data: entity.data,
        updatedAt: entity.updatedAt,
      };

      const queryKey = buildQueryKey(hydrationEntity);
      if (!queryKey) continue;

      const queryData = transform ? transform(hydrationEntity) : entity.data;

      // Injecter dans React Query sans déclencher de refetch
      queryClient.setQueryData(queryKey, queryData, {
        updatedAt: hydrationEntity.updatedAt,
      });

      hydratedCounts[entityType]++;
    }
  }

  const durationMs = Date.now() - startMs;

  const totalHydrated = Object.values(hydratedCounts).reduce((a, b) => a + b, 0);
  telemetry.trackEvent('db.hydration.complete', {
    ...hydratedCounts,
    totalHydrated,
    durationMs,
  });
  if (totalHydrated > 0) {
    telemetry.addBreadcrumb('db.hydration.complete', {
      ...hydratedCounts,
      totalHydrated,
      durationMs,
    });
  }

  return { hydratedCounts, durationMs };
}
