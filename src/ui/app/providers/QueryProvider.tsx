import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import {
  QueryClient,
  QueryClientProvider,
  onlineManager,
} from '@tanstack/react-query';
import {
  PersistQueryClientProvider,
} from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { PropsWithChildren } from 'react';
import { useEffect, useMemo, useState } from 'react';

import {
  APP_CACHE_SCHEMA_VERSION,
  defaultQueryOptions,
  QUERY_PERSIST_CACHE_KEY,
  QUERY_PERSIST_MAX_AGE_MS,
} from '@ui/shared/query/queryOptions';

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

  useEffect(() => {
    return () => {
      client.clear();
    };
  }, [client]);

  registerOnlineManagerIfNeeded();

  const persister = useMemo(() => {
    if (!enablePersistence) {
      return null;
    }

    return createAsyncStoragePersister({
      storage: AsyncStorage,
      key: QUERY_PERSIST_CACHE_KEY,
    });
  }, [enablePersistence]);

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
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
