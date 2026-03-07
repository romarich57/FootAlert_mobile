import type { Query } from '@tanstack/query-core';
import type { PersistedClient, Persister } from '@tanstack/query-persist-client-core';

import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';

export const MAX_PERSIST_BYTES = 180 * 1024;

type AsyncStorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

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

const PERSISTABLE_ROOT_KEYS = new Set(['follows', 'competitions']);

function isFollowKeyPersistable(queryKey: readonly unknown[]): boolean {
  if (queryKey[1] === 'followed-team-ids') {
    return true;
  }

  if (queryKey[1] === 'followed-player-ids') {
    return true;
  }

  if (queryKey[1] === 'followed-league-ids') {
    return true;
  }

  if (queryKey[1] === 'hide-trends') {
    return queryKey.length >= 3;
  }

  if (queryKey[1] === 'discovery') {
    return queryKey.length >= 4;
  }

  return false;
}

function isCompetitionsKeyPersistable(queryKey: readonly unknown[]): boolean {
  return queryKey.length === 2 && queryKey[1] === 'catalog';
}

function isPersistableQueryKey(queryKey: readonly unknown[]): boolean {
  if (queryKey.length === 0) {
    return false;
  }

  const rootKey = typeof queryKey[0] === 'string' ? queryKey[0] : null;
  if (!rootKey || !PERSISTABLE_ROOT_KEYS.has(rootKey)) {
    return false;
  }

  if (rootKey === 'follows') {
    return isFollowKeyPersistable(queryKey);
  }

  return isCompetitionsKeyPersistable(queryKey);
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
