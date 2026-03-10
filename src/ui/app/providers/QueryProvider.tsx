import NetInfo from '@react-native-community/netinfo';
import {
  QueryClient,
  QueryClientProvider,
  onlineManager,
} from '@tanstack/react-query';
import {
  PersistQueryClientProvider,
} from '@tanstack/react-query-persist-client';
import type { PropsWithChildren } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { appEnv } from '@data/config/env';
import { getDatabase } from '@data/db/database';
import { runGarbageCollection } from '@data/db/garbageCollector';
import { hydrateQueryClientFromSqlite } from '@data/db/hydrationBridge';
import { buildDefaultHydrationMappings } from '@data/db/hydrationMappings';
import { setupQueryCacheSyncMiddleware } from '@data/db/queryCacheSyncMiddleware';
import { getStoreSizeBytes } from '@data/db/entityStore';
import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';
import { mmkvStorage } from '@data/storage/mmkvStorage';
import {
  APP_CACHE_SCHEMA_VERSION,
  defaultQueryOptions,
  QUERY_PERSIST_CACHE_KEY,
  QUERY_PERSIST_MAX_AGE_MS,
} from '@ui/shared/query/queryOptions';
import {
  safeAsyncStoragePersister,
  shouldDehydrateQuery,
} from '@ui/shared/query/queryPersistence';

type QueryProviderProps = PropsWithChildren<{
  enablePersistence?: boolean;
  queryOptionsOverrides?: Partial<typeof defaultQueryOptions>;
}>;

let hasRegisteredOnlineManager = false;

function isJestRuntime(): boolean {
  const runtimeProcess = (globalThis as { process?: { env?: { JEST_WORKER_ID?: string } } }).process;
  return Boolean(runtimeProcess?.env?.JEST_WORKER_ID);
}

function registerOnlineManagerIfNeeded(): void {
  if (hasRegisteredOnlineManager) {
    return;
  }

  // Tests don't need a global NetInfo bridge and it can keep open handles.
  if (isJestRuntime()) {
    hasRegisteredOnlineManager = true;
    return;
  }

  if (typeof NetInfo.addEventListener !== 'function') {
    hasRegisteredOnlineManager = true;
    return;
  }

  onlineManager.setEventListener(setOnline => {
    return NetInfo.addEventListener(state => {
      const isOnline =
        state.isConnected !== false && state.isInternetReachable !== false;
      setOnline(isOnline);
    });
  });

  hasRegisteredOnlineManager = true;
}

export function QueryProvider({
  children,
  enablePersistence = true,
  queryOptionsOverrides,
}: QueryProviderProps) {
  const mergedQueryOptions = useMemo(
    () => ({
      ...defaultQueryOptions,
      ...(isJestRuntime() ? { gcTime: Infinity } : {}),
      ...queryOptionsOverrides,
    }),
    [queryOptionsOverrides],
  );

  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: mergedQueryOptions,
          mutations: {
            networkMode: 'offlineFirst',
            retry: 1,
          },
        },
      }),
  );
  const syncCleanupRef = useRef<(() => void) | null>(null);
  const shouldBootstrapSqlite =
    appEnv.mobileEnableSqliteLocalFirst && !isJestRuntime();
  const [isSqliteReady, setIsSqliteReady] = useState(() => !shouldBootstrapSqlite);

  useEffect(() => {
    return () => {
      syncCleanupRef.current?.();
      syncCleanupRef.current = null;
      client.clear();
    };
  }, [client]);

  registerOnlineManagerIfNeeded();

  useEffect(() => {
    if (!shouldBootstrapSqlite) {
      setIsSqliteReady(true);
      return;
    }

    let isCancelled = false;

    const bootstrapSqlite = async () => {
      const startedAt = Date.now();
      try {
        await getDatabase();
        const garbageCollectionResult = runGarbageCollection();
        const hydrationResult = hydrateQueryClientFromSqlite(
          client,
          buildDefaultHydrationMappings(
            Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris',
          ),
        );
        const dbSizeBytes = getStoreSizeBytes();

        syncCleanupRef.current?.();
        syncCleanupRef.current = setupQueryCacheSyncMiddleware(client.getQueryCache());

        getMobileTelemetry().trackEvent('db.bootstrap.complete', {
          durationMs: Date.now() - startedAt,
          hydrationDurationMs: hydrationResult.durationMs,
          hydratedTeams: hydrationResult.hydratedCounts.team,
          hydratedPlayers: hydrationResult.hydratedCounts.player,
          hydratedCompetitions: hydrationResult.hydratedCounts.competition,
          hydratedMatches: hydrationResult.hydratedCounts.match,
          gcDeletedTeams: garbageCollectionResult.deletedByType.team,
          gcDeletedPlayers: garbageCollectionResult.deletedByType.player,
          gcDeletedCompetitions: garbageCollectionResult.deletedByType.competition,
          gcDeletedMatches: garbageCollectionResult.deletedByType.match,
          gcDeletedMatchesByDate: garbageCollectionResult.matchesByDateDeleted,
          dbSizeBytes,
        });

        if (!isCancelled) {
          setIsSqliteReady(true);
        }
      } catch (error) {
        getMobileTelemetry().trackError(
          error instanceof Error ? error : new Error(String(error)),
          { feature: 'query_provider.sqlite_bootstrap' },
        );
        appEnv.mobileEnableSqliteLocalFirst = false;

        if (!isCancelled) {
          setIsSqliteReady(true);
        }
      }
    };

    bootstrapSqlite();

    return () => {
      isCancelled = true;
      syncCleanupRef.current?.();
      syncCleanupRef.current = null;
    };
  }, [client, shouldBootstrapSqlite]);

  const persister = useMemo(() => {
    if (!enablePersistence) {
      return null;
    }

    return safeAsyncStoragePersister({
      storage: mmkvStorage,
      key: QUERY_PERSIST_CACHE_KEY,
      maxBytes: appEnv.mobileQueryPersistMaxBytes,
    });
  }, [enablePersistence]);

  if (!isSqliteReady) {
    return null;
  }

  if (!enablePersistence || !persister) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister,
        maxAge: QUERY_PERSIST_MAX_AGE_MS,
        buster: APP_CACHE_SCHEMA_VERSION,
        dehydrateOptions: {
          shouldDehydrateQuery,
          shouldDehydrateMutation: () => false,
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
