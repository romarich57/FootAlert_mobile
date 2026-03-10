import type { Query } from '@tanstack/query-core';
import type { PersistedClient, Persister } from '@tanstack/query-persist-client-core';

import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';
import { appEnv } from '@data/config/env';
import type { AsyncStorageLike } from '@data/storage/asyncStorageTypes';
import {
  isPersistableQueryCachePolicy,
  queryCachePolicyMatrix,
} from '@data/query/queryCachePolicyMatrix';

export const MAX_PERSIST_BYTES = 512 * 1024;

type SafeAsyncStoragePersisterOptions = {
  storage: AsyncStorageLike | undefined | null;
  key: string;
  throttleTime?: number;
  maxBytes?: number;
  serialize?: (client: PersistedClient) => Promise<string> | string;
  deserialize?: (cachedString: string) => Promise<PersistedClient> | PersistedClient;
};

type SerializedPersistedClient = {
  payload: string;
  payloadBytes: number;
};

function isFollowKeyPersistable(queryKey: readonly unknown[]): boolean {
  if (queryKey[1] === 'followed-team-ids') {
    return isPersistableQueryCachePolicy(queryCachePolicyMatrix.follows.followedTeamIds.cachePolicy);
  }

  if (queryKey[1] === 'followed-player-ids') {
    return isPersistableQueryCachePolicy(queryCachePolicyMatrix.follows.followedPlayerIds.cachePolicy);
  }

  if (queryKey[1] === 'followed-league-ids') {
    return isPersistableQueryCachePolicy(
      queryCachePolicyMatrix.follows.followedCompetitionIds.cachePolicy,
    );
  }

  if (queryKey[1] === 'hide-trends') {
    return (
      queryKey.length >= 3 &&
      isPersistableQueryCachePolicy(queryCachePolicyMatrix.follows.hideTrends.cachePolicy)
    );
  }

  if (queryKey[1] === 'discovery') {
    return (
      queryKey.length >= 4 &&
      isPersistableQueryCachePolicy(queryCachePolicyMatrix.follows.discovery.cachePolicy)
    );
  }

  return false;
}

function isCompetitionsKeyPersistable(queryKey: readonly unknown[]): boolean {
  if (
    queryKey.length === 4 &&
    queryKey[1] === 'full' &&
    isPersistableQueryCachePolicy(queryCachePolicyMatrix.competitions.full.cachePolicy)
  ) {
    return true;
  }

  if (queryKey.length === 2 && queryKey[1] === 'catalog') {
    return isPersistableQueryCachePolicy(queryCachePolicyMatrix.competitions.catalog.cachePolicy);
  }

  return (
    queryKey.length === 4 &&
    queryKey[1] === 'details' &&
    queryKey[2] === 'header' &&
    isPersistableQueryCachePolicy(queryCachePolicyMatrix.competitions.header.cachePolicy)
  );
}

function isTeamKeyPersistable(queryKey: readonly unknown[]): boolean {
  if (queryKey[0] === 'teams') {
    if (queryKey[1] === 'full') {
      return isPersistableQueryCachePolicy(queryCachePolicyMatrix.teams.full.cachePolicy);
    }

    if (queryKey[1] === 'details') {
      return isPersistableQueryCachePolicy(queryCachePolicyMatrix.teams.details.cachePolicy);
    }

    if (queryKey[1] === 'leagues') {
      return isPersistableQueryCachePolicy(queryCachePolicyMatrix.teams.leagues.cachePolicy);
    }

    return false;
  }

  return (
    (queryKey[0] === 'team_squad' &&
      isPersistableQueryCachePolicy(queryCachePolicyMatrix.teams.squad.cachePolicy)) ||
    (queryKey[0] === 'team_standings' &&
      isPersistableQueryCachePolicy(queryCachePolicyMatrix.teams.standings.cachePolicy)) ||
    (queryKey[0] === 'team_transfers' &&
      isPersistableQueryCachePolicy(queryCachePolicyMatrix.teams.transfers.cachePolicy))
  );
}

function isPlayerKeyPersistable(queryKey: readonly unknown[]): boolean {
  return (
    (queryKey[0] === 'players' &&
      queryKey[1] === 'full' &&
      isPersistableQueryCachePolicy(queryCachePolicyMatrix.players.full.cachePolicy)) ||
    (queryKey[0] === 'player_overview' &&
      isPersistableQueryCachePolicy(queryCachePolicyMatrix.players.overview.cachePolicy)) ||
    (queryKey[0] === 'player_details' &&
      isPersistableQueryCachePolicy(queryCachePolicyMatrix.players.details.cachePolicy)) ||
    (queryKey[0] === 'player_trophies' &&
      isPersistableQueryCachePolicy(queryCachePolicyMatrix.players.trophies.cachePolicy)) ||
    (queryKey[0] === 'player_career_aggregate' &&
      isPersistableQueryCachePolicy(queryCachePolicyMatrix.players.career.cachePolicy)) ||
    (queryKey[0] === 'player_stats_catalog' &&
      isPersistableQueryCachePolicy(queryCachePolicyMatrix.players.statsCatalog.cachePolicy))
  );
}

function isMatchDetailsKeyPersistable(queryKey: readonly unknown[]): boolean {
  if (
    queryKey[0] === 'match_details_full' &&
    isPersistableQueryCachePolicy(queryCachePolicyMatrix.matches.full.cachePolicy)
  ) {
    return true;
  }

  if (queryKey[0] !== 'match_details' || queryKey.length !== 3) {
    return false;
  }

  const reservedDatasetKeys = new Set([
    'events',
    'statistics',
    'lineups',
    'predictions',
    'team_players_stats',
    'absences',
    'head_to_head',
  ]);

  return (
    typeof queryKey[2] === 'string' &&
    !reservedDatasetKeys.has(queryKey[2]) &&
    isPersistableQueryCachePolicy(queryCachePolicyMatrix.matches.details.cachePolicy)
  );
}

function isCompetitionEntityKeyPersistable(queryKey: readonly unknown[]): boolean {
  return (
    (queryKey[0] === 'competition_standings' &&
      isPersistableQueryCachePolicy(queryCachePolicyMatrix.competitions.standings.cachePolicy)) ||
    (queryKey[0] === 'competition_seasons' &&
      isPersistableQueryCachePolicy(queryCachePolicyMatrix.competitions.seasons.cachePolicy))
  );
}

function isPersistableQueryKey(queryKey: readonly unknown[]): boolean {
  if (queryKey.length === 0) {
    return false;
  }

  if (queryKey[0] === 'follows') {
    return isFollowKeyPersistable(queryKey);
  }

  if (queryKey[0] === 'competitions') {
    return isCompetitionsKeyPersistable(queryKey);
  }

  return (
    isTeamKeyPersistable(queryKey) ||
    isPlayerKeyPersistable(queryKey) ||
    isMatchDetailsKeyPersistable(queryKey) ||
    isCompetitionEntityKeyPersistable(queryKey)
  );
}

function getPayloadBytes(payload: string): number {
  if (typeof Buffer !== 'undefined') {
    return Buffer.byteLength(payload, 'utf8');
  }

  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(payload).length;
  }

  return unescape(encodeURIComponent(payload)).length;
}

async function removePersistedSnapshot(
  storage: AsyncStorageLike,
  key: string,
): Promise<void> {
  try {
    await storage.removeItem(key);
  } catch {
    // Best-effort cleanup only.
  }
}

export function shouldDehydrateQuery(query: Query): boolean {
  if (query.state.status !== 'success') {
    return false;
  }

  if (appEnv.mobileEnableSqliteLocalFirst) {
    const queryKey = query.queryKey;
    const isSqliteCanonicalQuery =
      (queryKey[0] === 'teams' && queryKey[1] === 'full') ||
      (queryKey[0] === 'players' && queryKey[1] === 'full') ||
      (queryKey[0] === 'competitions' && queryKey[1] === 'full') ||
      queryKey[0] === 'match_details_full';

    if (isSqliteCanonicalQuery) {
      return false;
    }
  }

  return isPersistableQueryKey(query.queryKey);
}

export async function serializePersistedClientWithBudget(
  persistedClient: PersistedClient,
  maxBytes = MAX_PERSIST_BYTES,
  serialize: (client: PersistedClient) => Promise<string> | string = JSON.stringify,
): Promise<SerializedPersistedClient | undefined> {
  const payload = await serialize(persistedClient);
  const payloadBytes = getPayloadBytes(payload);
  if (payloadBytes > maxBytes) {
    return undefined;
  }

  return {
    payload,
    payloadBytes,
  };
}

export function safeAsyncStoragePersister({
  storage,
  key,
  throttleTime = 1000,
  maxBytes = MAX_PERSIST_BYTES,
  serialize = JSON.stringify,
  deserialize = JSON.parse as (cachedString: string) => PersistedClient,
}: SafeAsyncStoragePersisterOptions): Persister {
  if (!storage) {
    return {
      persistClient: async () => undefined,
      restoreClient: async () => undefined,
      removeClient: async () => undefined,
    };
  }

  let queuedClient: PersistedClient | null = null;
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  let flushPromise: Promise<void> | null = null;

  const flushQueuedClient = async (): Promise<void> => {
    if (!queuedClient) {
      flushTimer = null;
      flushPromise = null;
      return;
    }

    const persistedClient = queuedClient;
    queuedClient = null;
    flushTimer = null;

    try {
      const payload = await serialize(persistedClient);
      const payloadBytes = getPayloadBytes(payload);

      if (payloadBytes > maxBytes) {
        await removePersistedSnapshot(storage, key);
        getMobileTelemetry().trackEvent('query_persist.write_skipped_oversize', {
          payloadBytes,
          reason: 'oversize',
        });
        return;
      }

      await storage.setItem(key, payload);
    } catch (error) {
      await removePersistedSnapshot(storage, key);
      getMobileTelemetry().trackEvent('query_persist.write_skipped_oversize', {
        payloadBytes: -1,
        reason: error instanceof Error ? 'storage_write_error' : 'unknown_write_error',
      });
    } finally {
      flushPromise = null;
      if (queuedClient) {
        flushPromise = scheduleFlush();
      }
    }
  };

  const scheduleFlush = (): Promise<void> => {
    if (flushPromise) {
      return flushPromise;
    }

    if (throttleTime <= 0) {
      flushPromise = flushQueuedClient();
      return flushPromise;
    }

    flushPromise = new Promise(resolve => {
      flushTimer = setTimeout(() => {
        void flushQueuedClient().finally(resolve);
      }, throttleTime);
    });

    return flushPromise;
  };

  return {
    persistClient: async persistedClient => {
      queuedClient = persistedClient;
      await scheduleFlush();
    },
    restoreClient: async () => {
      let cachedString: string | null = null;

      try {
        cachedString = await storage.getItem(key);
      } catch {
        await removePersistedSnapshot(storage, key);
        getMobileTelemetry().trackEvent('query_persist.restore_cleared', {
          payloadBytes: -1,
          reason: 'storage_read_error',
        });
        return undefined;
      }

      if (!cachedString) {
        return undefined;
      }

      try {
        return await deserialize(cachedString);
      } catch {
        await removePersistedSnapshot(storage, key);
        getMobileTelemetry().trackEvent('query_persist.restore_cleared', {
          payloadBytes: getPayloadBytes(cachedString),
          reason: 'deserialize_error',
        });
        return undefined;
      }
    },
    removeClient: async () => {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      queuedClient = null;
      flushPromise = null;
      await removePersistedSnapshot(storage, key);
    },
  };
}
