export const QUERY_STALE_TIME_MS = 30_000;
export const QUERY_GC_TIME_MS = 30 * 60_000;
export const QUERY_PERSIST_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const APP_CACHE_SCHEMA_VERSION = 'v3';
export const QUERY_PERSIST_CACHE_KEY = `footalert-query-cache-${APP_CACHE_SCHEMA_VERSION}`;

export type QueryRetryValue = boolean | number;
export type QueryRefetchMode = boolean | 'always';
export type QueryNetworkMode = 'online' | 'always' | 'offlineFirst';

export type QueryBaseOptions = {
  retry?: QueryRetryValue;
  staleTime?: number;
  gcTime?: number;
};

export type DefaultQueryOptions = QueryBaseOptions & {
  refetchOnReconnect?: QueryRefetchMode;
  refetchOnMount?: QueryRefetchMode;
  refetchOnWindowFocus?: QueryRefetchMode;
  networkMode?: QueryNetworkMode;
};

export const defaultQueryOptions: DefaultQueryOptions = {
  retry: 2,
  staleTime: QUERY_STALE_TIME_MS,
  gcTime: QUERY_GC_TIME_MS,
  refetchOnReconnect: true,
  refetchOnMount: false,
  // Sur mobile, le "window focus" = retour au foreground → géré manuellement via useFocusEffect
  refetchOnWindowFocus: false,
  networkMode: 'offlineFirst',
};

export type QueryTimingOptions = QueryBaseOptions;
export type QueryFreshnessClass = 'live' | 'interactive' | 'stable';

const GC_LIVE = 5 * 60_000;       // données live (events, statistics)
const GC_DEFAULT = 30 * 60_000;   // données semi-volatiles (défaut)
const GC_STABLE = 60 * 60_000;    // données stables (trophies, squad, transfers, career)

const QUERY_FRESHNESS_PROFILES: Record<QueryFreshnessClass, QueryTimingOptions> = {
  live: {
    staleTime: 15_000,
    retry: 2,
    gcTime: GC_LIVE,
  },
  interactive: {
    staleTime: 60_000,
    retry: 2,
    gcTime: GC_DEFAULT,
  },
  stable: {
    staleTime: 60 * 60_000,
    retry: 1,
    gcTime: GC_STABLE,
  },
};

export function getQueryFreshnessProfile(
  freshness: QueryFreshnessClass,
  overrides: Partial<QueryTimingOptions> = {},
): QueryTimingOptions {
  return {
    ...QUERY_FRESHNESS_PROFILES[freshness],
    ...overrides,
  };
}

export const featureQueryOptions = {
  teams: {
    details: getQueryFreshnessProfile('interactive', { staleTime: 5 * 60_000 }),
    leagues: getQueryFreshnessProfile('stable', { staleTime: 10 * 60_000 }),
    matches: getQueryFreshnessProfile('interactive', { staleTime: 30_000, retry: 1 }),
    overview: getQueryFreshnessProfile('interactive', { staleTime: 45_000 }),
    overviewLeaders: getQueryFreshnessProfile('interactive', { staleTime: 60_000, retry: 1 }),
    standings: getQueryFreshnessProfile('interactive'),
    stats: getQueryFreshnessProfile('interactive'),
    statsCore: getQueryFreshnessProfile('interactive', { staleTime: 60_000, retry: 1 }),
    statsPlayers: getQueryFreshnessProfile('interactive', { staleTime: 5 * 60_000, retry: 1 }),
    statsAdvanced: getQueryFreshnessProfile('interactive', { staleTime: 30 * 60_000, retry: 1 }),
    transfers: getQueryFreshnessProfile('stable', { staleTime: 6 * 60 * 60 * 1000, retry: 2 }),
    squad: getQueryFreshnessProfile('stable', { staleTime: 10 * 60_000 }),
  },
  players: {
    overview: getQueryFreshnessProfile('interactive', { staleTime: 5 * 60_000 }),
    details: getQueryFreshnessProfile('interactive', { staleTime: 5 * 60_000 }),
    stats: getQueryFreshnessProfile('interactive', { staleTime: 5 * 60_000 }),
    statsCatalog: getQueryFreshnessProfile('stable', { staleTime: 30 * 60_000 }),
    matches: getQueryFreshnessProfile('interactive', { staleTime: 5 * 60_000 }),
    career: getQueryFreshnessProfile('stable'),
    trophies: getQueryFreshnessProfile('stable'),
  },
  competitions: {
    fixtures: getQueryFreshnessProfile('interactive', { staleTime: 2 * 60_000 }),
    standings: getQueryFreshnessProfile('interactive', { staleTime: 2 * 60_000 }),
    transfers: getQueryFreshnessProfile('stable', { staleTime: 6 * 60 * 60 * 1000 }),
    seasons: getQueryFreshnessProfile('stable', { staleTime: 24 * 60 * 60 * 1000 }),
    playerStats: getQueryFreshnessProfile('interactive', { staleTime: 5 * 60 * 1000, retry: 1 }),
    teamStats: getQueryFreshnessProfile('interactive', { staleTime: 5 * 60 * 1000, retry: 1 }),
    teamAdvancedStats: getQueryFreshnessProfile('interactive', { staleTime: 30 * 60 * 1000, retry: 1 }),
    totw: getQueryFreshnessProfile('stable', { staleTime: 30 * 60 * 1000 }),
    bracket: getQueryFreshnessProfile('interactive', { staleTime: 6 * 60_000 }),
  },
  matches: {
    details: getQueryFreshnessProfile('interactive'),
    events: getQueryFreshnessProfile('live'),
    statistics: getQueryFreshnessProfile('live'),
    lineups: getQueryFreshnessProfile('interactive', { staleTime: 30_000 }),
    predictions: getQueryFreshnessProfile('stable', { staleTime: 10 * 60_000 }),
    playersStats: getQueryFreshnessProfile('live', { staleTime: 20_000 }),
    absences: getQueryFreshnessProfile('stable', { staleTime: 30 * 60_000 }),
    headToHead: getQueryFreshnessProfile('stable', { staleTime: 10 * 60_000 }),
  },
} satisfies Record<string, Record<string, QueryTimingOptions>>;
