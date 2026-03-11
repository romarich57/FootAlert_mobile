import {
  queryCachePolicyMatrix,
  type QueryFreshnessClass,
  type QueryPolicyTimingOverrides,
  type QueryRetryValue,
} from './queryCachePolicyMatrix';

export const QUERY_STALE_TIME_MS = 30_000;
export const QUERY_GC_TIME_MS = 30 * 60_000;
export const QUERY_PERSIST_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const APP_CACHE_SCHEMA_VERSION = 'v6';
export const QUERY_PERSIST_CACHE_KEY = `footalert-query-cache-${APP_CACHE_SCHEMA_VERSION}`;
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
  refetchOnWindowFocus: false,
  networkMode: 'offlineFirst',
};

export type QueryTimingOptions = QueryBaseOptions;

const GC_LIVE = 5 * 60_000;
const GC_DEFAULT = 30 * 60_000;
const GC_STABLE = 60 * 60_000;
const GC_STATIC = 7 * 24 * 60 * 60_000;

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
  static: {
    staleTime: Infinity,
    retry: 1,
    gcTime: GC_STATIC,
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

export function getQueryTimingOptions(
  descriptor: {
    freshness: QueryFreshnessClass;
    overrides?: QueryPolicyTimingOverrides;
  },
): QueryTimingOptions {
  return getQueryFreshnessProfile(descriptor.freshness, descriptor.overrides);
}

export const featureQueryOptions = {
  teams: {
    full: getQueryTimingOptions(queryCachePolicyMatrix.teams.full),
    details: getQueryTimingOptions(queryCachePolicyMatrix.teams.details),
    leagues: getQueryTimingOptions(queryCachePolicyMatrix.teams.leagues),
    matches: getQueryTimingOptions(queryCachePolicyMatrix.teams.matches),
    overview: getQueryTimingOptions(queryCachePolicyMatrix.teams.overview),
    overviewLeaders: getQueryTimingOptions(queryCachePolicyMatrix.teams.overviewLeaders),
    standings: getQueryTimingOptions(queryCachePolicyMatrix.teams.standings),
    stats: getQueryTimingOptions(queryCachePolicyMatrix.teams.stats),
    statsCore: getQueryTimingOptions(queryCachePolicyMatrix.teams.statsCore),
    statsPlayers: getQueryTimingOptions(queryCachePolicyMatrix.teams.statsPlayers),
    statsAdvanced: getQueryTimingOptions(queryCachePolicyMatrix.teams.statsAdvanced),
    transfers: getQueryTimingOptions(queryCachePolicyMatrix.teams.transfers),
    squad: getQueryTimingOptions(queryCachePolicyMatrix.teams.squad),
  },
  players: {
    full: getQueryTimingOptions(queryCachePolicyMatrix.players.full),
    overview: getQueryTimingOptions(queryCachePolicyMatrix.players.overview),
    details: getQueryTimingOptions(queryCachePolicyMatrix.players.details),
    stats: getQueryTimingOptions(queryCachePolicyMatrix.players.stats),
    statsCatalog: getQueryTimingOptions(queryCachePolicyMatrix.players.statsCatalog),
    matches: getQueryTimingOptions(queryCachePolicyMatrix.players.matches),
    career: getQueryTimingOptions(queryCachePolicyMatrix.players.career),
    trophies: getQueryTimingOptions(queryCachePolicyMatrix.players.trophies),
  },
  competitions: {
    full: getQueryTimingOptions(queryCachePolicyMatrix.competitions.full),
    header: getQueryTimingOptions(queryCachePolicyMatrix.competitions.header),
    fixtures: getQueryTimingOptions(queryCachePolicyMatrix.competitions.fixtures),
    standings: getQueryTimingOptions(queryCachePolicyMatrix.competitions.standings),
    transfers: getQueryTimingOptions(queryCachePolicyMatrix.competitions.transfers),
    seasons: getQueryTimingOptions(queryCachePolicyMatrix.competitions.seasons),
    playerStats: getQueryTimingOptions(queryCachePolicyMatrix.competitions.playerStats),
    teamStats: getQueryTimingOptions(queryCachePolicyMatrix.competitions.teamStats),
    teamAdvancedStats: getQueryTimingOptions(queryCachePolicyMatrix.competitions.teamAdvancedStats),
    totw: getQueryTimingOptions(queryCachePolicyMatrix.competitions.totw),
    bracket: getQueryTimingOptions(queryCachePolicyMatrix.competitions.bracket),
  },
  matches: {
    full: getQueryTimingOptions(queryCachePolicyMatrix.matches.full),
    details: getQueryTimingOptions(queryCachePolicyMatrix.matches.details),
    events: getQueryTimingOptions(queryCachePolicyMatrix.matches.events),
    statistics: getQueryTimingOptions(queryCachePolicyMatrix.matches.statistics),
    lineups: getQueryTimingOptions(queryCachePolicyMatrix.matches.lineups),
    predictions: getQueryTimingOptions(queryCachePolicyMatrix.matches.predictions),
    playersStats: getQueryTimingOptions(queryCachePolicyMatrix.matches.playersStats),
    absences: getQueryTimingOptions(queryCachePolicyMatrix.matches.absences),
    headToHead: getQueryTimingOptions(queryCachePolicyMatrix.matches.headToHead),
  },
} satisfies Record<string, Record<string, QueryTimingOptions>>;
