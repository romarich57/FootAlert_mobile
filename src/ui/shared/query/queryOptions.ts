import type { QueryObserverOptions } from '@tanstack/react-query';

export const QUERY_STALE_TIME_MS = 30_000;
export const QUERY_GC_TIME_MS = 5 * 60_000;
export const QUERY_PERSIST_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const APP_CACHE_SCHEMA_VERSION = 'v2';
export const QUERY_PERSIST_CACHE_KEY = `footalert-query-cache-${APP_CACHE_SCHEMA_VERSION}`;

export const defaultQueryOptions: Pick<
  QueryObserverOptions,
  | 'retry'
  | 'staleTime'
  | 'gcTime'
  | 'refetchOnReconnect'
  | 'refetchOnMount'
  | 'networkMode'
> = {
  retry: 2,
  staleTime: QUERY_STALE_TIME_MS,
  gcTime: QUERY_GC_TIME_MS,
  refetchOnReconnect: true,
  refetchOnMount: false,
  networkMode: 'offlineFirst',
};

type QueryTimingOptions = Pick<QueryObserverOptions, 'staleTime' | 'retry'>;

export const featureQueryOptions = {
  teams: {
    matches: { staleTime: 30_000, retry: 1 },
    overview: { staleTime: 45_000, retry: 1 },
    standings: { staleTime: 60_000, retry: 2 },
    stats: { staleTime: 60_000, retry: 2 },
    transfers: { staleTime: 2 * 60_000, retry: 2 },
    squad: { staleTime: 10 * 60_000, retry: 1 },
    trophies: { staleTime: 60 * 60_000, retry: 1 },
  },
  players: {
    details: { staleTime: 5 * 60_000, retry: 2 },
    stats: { staleTime: 5 * 60_000, retry: 2 },
    matches: { staleTime: 5 * 60_000, retry: 2 },
    career: { staleTime: 60 * 60_000, retry: 1 },
    trophies: { staleTime: 60 * 60_000, retry: 1 },
  },
  competitions: {
    fixtures: { staleTime: 5 * 60_000, retry: 2 },
    standings: { staleTime: 5 * 60 * 1000, retry: 2 },
    transfers: { staleTime: 60 * 60 * 1000, retry: 1 },
    seasons: { staleTime: 24 * 60 * 60 * 1000, retry: 1 },
    playerStats: { staleTime: 60 * 60 * 1000, retry: 1 },
    teamStats: { staleTime: 5 * 60 * 1000, retry: 1 },
    teamAdvancedStats: { staleTime: 30 * 60 * 1000, retry: 1 },
    totw: { staleTime: 24 * 60 * 60 * 1000, retry: 1 },
  },
  matches: {
    details: { staleTime: 60_000, retry: 2 },
    events: { staleTime: 15_000, retry: 2 },
    statistics: { staleTime: 15_000, retry: 2 },
    lineups: { staleTime: 30_000, retry: 2 },
    h2h: { staleTime: 10 * 60_000, retry: 1 },
    predictions: { staleTime: 10 * 60_000, retry: 1 },
    playersStats: { staleTime: 20_000, retry: 2 },
    absences: { staleTime: 30 * 60_000, retry: 1 },
  },
} satisfies Record<string, Record<string, QueryTimingOptions>>;
