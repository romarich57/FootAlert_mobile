/**
 * Hook React Query qui intègre le local-first adapter SQLite.
 *
 * Remplace `useQuery` pour les entités persistées en DB locale.
 * Ajoute automatiquement :
 * - placeholderData depuis SQLite (affichage immédiat sans attendre le réseau)
 * - queryFn wrappé avec le local-first adapter
 * - metadata de source (sqlite vs network)
 */

import { useMemo } from 'react';
import {
  useQuery,
  type UseQueryResult,
} from '@tanstack/react-query';

import { createLocalFirstQueryFn, type LocalFirstNetworkFn } from './localFirstAdapter';
import { getEntityById } from './entityStore';
import type { EntityType } from './types';

export type LocalFirstQueryOptions = {
  retry?: number | boolean;
  staleTime?: number;
  gcTime?: number;
};

export type UseLocalFirstQueryParams<T> = {
  /** Clé React Query standard. */
  queryKey: readonly unknown[];
  /** Type d'entité dans le store SQLite. */
  entityType: EntityType;
  /** ID de l'entité (ex: teamId, playerId). */
  entityId: string;
  /** Durée max en ms avant de considérer le cache stale. */
  maxAgeMs: number;
  /** Fonction réseau existante (sans wrapping local-first). */
  fetchFn: LocalFirstNetworkFn<T>;
  /** Active/désactive la query. */
  enabled?: boolean;
  /** Options React Query additionnelles (staleTime, gcTime, retry...). */
  queryOptions?: LocalFirstQueryOptions;
};

export type UseLocalFirstQueryResult<T> = UseQueryResult<T, Error> & {
  /** La donnée provient-elle du cache SQLite ? */
  isFromLocalCache: boolean;
  /** Timestamp de la dernière écriture en DB locale. */
  localUpdatedAt: number | null;
};

/**
 * Hook local-first qui combine SQLite + React Query.
 *
 * Au mount :
 * 1. React Query reçoit `placeholderData` depuis SQLite → affichage instantané
 * 2. La `queryFn` locale-first décide si un fetch réseau est nécessaire
 * 3. Si les données réseau arrivent, elles remplacent le placeholder et sont écrites en DB
 */
export function useLocalFirstQuery<T>(
  params: UseLocalFirstQueryParams<T>,
): UseLocalFirstQueryResult<T> {
  const {
    queryKey,
    entityType,
    entityId,
    maxAgeMs,
    fetchFn,
    enabled = true,
    queryOptions = {},
  } = params;

  // Lecture synchrone du cache SQLite pour placeholderData
  const localCache = useMemo(() => {
    if (!enabled || !entityId) return null;
    return getEntityById<T>(entityType, entityId);
  }, [enabled, entityType, entityId]);

  const sqliteCacheData = localCache?.data;

  const query = useQuery<T, Error>({
    queryKey,
    queryFn: ({ signal }) =>
      createLocalFirstQueryFn<T>({
        entityType,
        entityId,
        maxAgeMs,
        fetchFn,
      })({ signal }),
    enabled: enabled && Boolean(entityId),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- NonFunctionGuard<T> incompatible avec generic T non-contraint
    placeholderData: ((prev: T | undefined) => prev ?? sqliteCacheData ?? undefined) as any,
    retry: queryOptions.retry,
    staleTime: queryOptions.staleTime,
    gcTime: queryOptions.gcTime,
  });

  const isFromLocalCache = query.isPlaceholderData && localCache !== null;
  const localUpdatedAt = localCache?.updatedAt ?? null;

  return useMemo(
    () => ({
      ...(query as UseQueryResult<T, Error>),
      isFromLocalCache,
      localUpdatedAt,
    }),
    [query, isFromLocalCache, localUpdatedAt],
  );
}
