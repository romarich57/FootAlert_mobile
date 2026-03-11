/**
 * Point d'entrée du module de base de données locale SQLite.
 *
 * Usage :
 *   import { getDatabase, upsertEntity, getEntityById } from '@data/db';
 */

// --- Database lifecycle ---
export { getDatabase, getDatabaseSync, closeDatabase, resetDatabase } from './database';

// --- Entity CRUD ---
export {
  upsertEntity,
  upsertEntities,
  getEntityById,
  getEntitiesByIds,
  queryEntities,
  queryEntityRows,
  deleteEntity,
  deleteStaleEntities,
  deleteEntitiesOlderThan,
  countEntities,
  getStoreSizeBytes,
} from './entityStore';

// --- Matches by date ---
export {
  upsertMatchesByDate,
  getMatchesByDate,
  getMatchesByDateAndLeague,
  getLiveMatchesByDate,
  deleteMatchesOlderThan,
} from './matchesByDateStore';
export type { MatchByDateEntry } from './matchesByDateStore';
export {
  replaceFollowedEntities,
  listFollowedEntityIds,
  isEntityFollowed,
} from './followedEntitiesStore';
export type { FollowedEntityType } from './followedEntitiesStore';
export {
  upsertNormalizedStandings,
  getNormalizedStandings,
} from './standingsStore';

// --- Sync metadata ---
export {
  getSyncMeta,
  setSyncMeta,
  deleteSyncMeta,
  getLastSyncTimestamp,
  setLastSyncTimestamp,
  isSyncStale,
} from './syncMetadata';

// --- Garbage collection ---
export { runGarbageCollection } from './garbageCollector';

// --- Local-first adapter ---
export {
  createLocalFirstQueryFn,
  writeToLocalStore,
  readFromLocalStore,
  LocalFirstOfflineError,
} from './localFirstAdapter';
export type { LocalFirstConfig, LocalFirstNetworkFn, LocalFirstResult } from './localFirstAdapter';

// --- React Query hook ---
export { useLocalFirstQuery } from './useLocalFirstQuery';
export type { UseLocalFirstQueryParams, UseLocalFirstQueryResult } from './useLocalFirstQuery';

// --- Hydration bridge ---
export { hydrateQueryClientFromSqlite } from './hydrationBridge';
export type { HydrationMapping, HydrationEntity, HydrationResult } from './hydrationBridge';

// --- Query cache sync middleware ---
export {
  setupQueryCacheSyncMiddleware,
  defaultSyncRules,
} from './queryCacheSyncMiddleware';
export type { QuerySyncRule, SyncMiddlewareUnsubscribe } from './queryCacheSyncMiddleware';

// --- Offline mutation queue ---
export {
  enqueueMutation,
  drainMutationQueue,
  registerMutationExecutor,
  getPendingMutationCount,
} from './offlineMutationQueue';
export type { MutationType } from './offlineMutationQueue';

// --- Types ---
export type {
  EntityType,
  EntityRow,
  SyncMetadataRow,
  MatchByDateRow,
  EntityReadResult,
  EntityUpsertParams,
  EntityQueryOptions,
} from './types';
