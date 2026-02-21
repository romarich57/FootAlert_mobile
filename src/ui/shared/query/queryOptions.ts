import type { QueryObserverOptions } from '@tanstack/react-query';

export const QUERY_STALE_TIME_MS = 30_000;
export const QUERY_GC_TIME_MS = 5 * 60_000;
export const QUERY_PERSIST_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const defaultQueryOptions: Pick<
  QueryObserverOptions,
  'retry' | 'staleTime' | 'gcTime' | 'refetchOnReconnect' | 'refetchOnMount'
> = {
  retry: 2,
  staleTime: QUERY_STALE_TIME_MS,
  gcTime: QUERY_GC_TIME_MS,
  refetchOnReconnect: true,
  refetchOnMount: false,
};
