import type { QueryObserverOptions } from '@tanstack/react-query';

export const QUERY_STALE_TIME_MS = 30_000;
export const QUERY_GC_TIME_MS = 30 * 60_000;
export const QUERY_PERSIST_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const APP_CACHE_SCHEMA_VERSION = 'v3';
export const QUERY_PERSIST_CACHE_KEY = `footalert-query-cache-${APP_CACHE_SCHEMA_VERSION}`;

export const defaultQueryOptions: Pick<
  QueryObserverOptions,
  | 'retry'
  | 'staleTime'
  | 'gcTime'
  | 'refetchOnReconnect'
  | 'refetchOnMount'
  | 'refetchOnWindowFocus'
  | 'networkMode'
> = {
  retry: 2,
  staleTime: QUERY_STALE_TIME_MS,
  gcTime: QUERY_GC_TIME_MS,
  refetchOnReconnect: true,
  refetchOnMount: false,
  // Sur mobile, le "window focus" = retour au foreground → géré manuellement via useFocusEffect
  refetchOnWindowFocus: false,
  networkMode: 'offlineFirst',
};

type QueryTimingOptions = Pick<QueryObserverOptions, 'staleTime' | 'retry' | 'gcTime'>;

const GC_LIVE = 5 * 60_000;       // données live (events, statistics)
const GC_DEFAULT = 30 * 60_000;   // données semi-volatiles (défaut)
const GC_STABLE = 60 * 60_000;    // données stables (trophies, squad, transfers, career)

export const featureQueryOptions = {
  teams: {
    matches: { staleTime: 30_000, retry: 1 },
    overview: { staleTime: 45_000, retry: 2 },
    standings: { staleTime: 60_000, retry: 2 },
    stats: { staleTime: 60_000, retry: 2 },
    transfers: { staleTime: 2 * 60_000, retry: 2, gcTime: GC_STABLE },
    squad: { staleTime: 10 * 60_000, retry: 1, gcTime: GC_STABLE },
    trophies: { staleTime: 60 * 60_000, retry: 1, gcTime: GC_STABLE },
  },
  players: {
    details: { staleTime: 5 * 60_000, retry: 2, gcTime: GC_DEFAULT },
    stats: { staleTime: 5 * 60_000, retry: 2 },
    matches: { staleTime: 5 * 60_000, retry: 2 },
    career: { staleTime: 60 * 60_000, retry: 1, gcTime: GC_STABLE },
    trophies: { staleTime: 60 * 60_000, retry: 1, gcTime: GC_STABLE },
  },
  competitions: {
    fixtures: { staleTime: 2 * 60_000, retry: 2 },
    standings: { staleTime: 2 * 60_000, retry: 2 },
    transfers: { staleTime: 6 * 60 * 60 * 1000, retry: 1, gcTime: GC_STABLE },
    seasons: { staleTime: 24 * 60 * 60 * 1000, retry: 1 },
    playerStats: { staleTime: 5 * 60 * 1000, retry: 1 },
    teamStats: { staleTime: 5 * 60 * 1000, retry: 1 },
    teamAdvancedStats: { staleTime: 30 * 60 * 1000, retry: 1 },
    totw: { staleTime: 30 * 60 * 1000, retry: 1 },
    bracket: { staleTime: 6 * 60_000, retry: 2 },
  },
  matches: {
    details: { staleTime: 60_000, retry: 2 },
    events: { staleTime: 15_000, retry: 2, gcTime: GC_LIVE },
    statistics: { staleTime: 15_000, retry: 2, gcTime: GC_LIVE },
    lineups: { staleTime: 30_000, retry: 2 },
    predictions: { staleTime: 10 * 60_000, retry: 1 },
    playersStats: { staleTime: 20_000, retry: 2 },
    absences: { staleTime: 30 * 60_000, retry: 1 },
    headToHead: { staleTime: 10 * 60_000, retry: 1 },
  },
} satisfies Record<string, Record<string, QueryTimingOptions>>;
