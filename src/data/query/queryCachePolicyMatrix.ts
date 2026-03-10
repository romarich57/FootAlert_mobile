export type QueryRetryValue = boolean | number;
export type QueryFreshnessClass = 'live' | 'interactive' | 'stable';
export type QueryCachePolicy = 'live-only' | 'revalidable' | 'persistable';

export type QueryPolicyTimingOverrides = {
  retry?: QueryRetryValue;
  staleTime?: number;
  gcTime?: number;
};

export type QueryPolicyDescriptor = {
  freshness: QueryFreshnessClass;
  cachePolicy: QueryCachePolicy;
  overrides?: QueryPolicyTimingOverrides;
};

export const queryCachePolicyMatrix = {
  follows: {
    followedTeamIds: { freshness: 'stable', cachePolicy: 'persistable' },
    followedPlayerIds: { freshness: 'stable', cachePolicy: 'persistable' },
    followedCompetitionIds: { freshness: 'stable', cachePolicy: 'persistable' },
    hideTrends: { freshness: 'stable', cachePolicy: 'persistable' },
    discovery: { freshness: 'interactive', cachePolicy: 'persistable' },
    teamCards: { freshness: 'interactive', cachePolicy: 'revalidable' },
    playerCards: { freshness: 'interactive', cachePolicy: 'revalidable' },
    trends: { freshness: 'interactive', cachePolicy: 'revalidable' },
  },
  teams: {
    full: {
      freshness: 'interactive',
      cachePolicy: 'persistable',
      overrides: { staleTime: 60_000, retry: 1 },
    },
    details: {
      freshness: 'stable',
      cachePolicy: 'persistable',
      overrides: { staleTime: 60 * 60_000 },
    },
    leagues: {
      freshness: 'stable',
      cachePolicy: 'persistable',
      overrides: { staleTime: 24 * 60 * 60 * 1000 },
    },
    overview: {
      freshness: 'interactive',
      cachePolicy: 'revalidable',
      overrides: { staleTime: 45_000 },
    },
    overviewLeaders: {
      freshness: 'interactive',
      cachePolicy: 'revalidable',
      overrides: { staleTime: 60_000, retry: 1 },
    },
    matches: {
      freshness: 'interactive',
      cachePolicy: 'revalidable',
      overrides: { staleTime: 30_000, retry: 1 },
    },
    standings: {
      freshness: 'interactive',
      cachePolicy: 'persistable',
    },
    stats: {
      freshness: 'interactive',
      cachePolicy: 'revalidable',
    },
    statsCore: {
      freshness: 'interactive',
      cachePolicy: 'revalidable',
      overrides: { staleTime: 60_000, retry: 1 },
    },
    statsPlayers: {
      freshness: 'interactive',
      cachePolicy: 'revalidable',
      overrides: { staleTime: 5 * 60_000, retry: 1 },
    },
    statsAdvanced: {
      freshness: 'interactive',
      cachePolicy: 'revalidable',
      overrides: { staleTime: 30 * 60_000, retry: 1 },
    },
    transfers: {
      freshness: 'stable',
      cachePolicy: 'persistable',
      overrides: { staleTime: 6 * 60 * 60 * 1000, retry: 2 },
    },
    squad: {
      freshness: 'stable',
      cachePolicy: 'persistable',
      overrides: { staleTime: 6 * 60 * 60 * 1000 },
    },
  },
  players: {
    full: {
      freshness: 'interactive',
      cachePolicy: 'persistable',
      overrides: { staleTime: 5 * 60_000, retry: 1 },
    },
    overview: {
      freshness: 'stable',
      cachePolicy: 'persistable',
      overrides: { staleTime: 60 * 60_000 },
    },
    details: {
      freshness: 'stable',
      cachePolicy: 'persistable',
      overrides: { staleTime: 60 * 60_000 },
    },
    stats: {
      freshness: 'interactive',
      cachePolicy: 'revalidable',
      overrides: { staleTime: 5 * 60_000 },
    },
    statsCatalog: {
      freshness: 'stable',
      cachePolicy: 'persistable',
      overrides: { staleTime: 24 * 60 * 60 * 1000 },
    },
    matches: {
      freshness: 'interactive',
      cachePolicy: 'revalidable',
      overrides: { staleTime: 5 * 60_000 },
    },
    career: {
      freshness: 'stable',
      cachePolicy: 'persistable',
      overrides: { staleTime: 24 * 60 * 60 * 1000 },
    },
    trophies: {
      freshness: 'stable',
      cachePolicy: 'persistable',
      overrides: { staleTime: 24 * 60 * 60 * 1000 },
    },
  },
  competitions: {
    catalog: {
      freshness: 'stable',
      cachePolicy: 'persistable',
      overrides: { staleTime: 24 * 60 * 60 * 1000 },
    },
    full: {
      freshness: 'interactive',
      cachePolicy: 'persistable',
      overrides: { staleTime: 2 * 60_000, retry: 1 },
    },
    header: {
      freshness: 'stable',
      cachePolicy: 'persistable',
      overrides: { staleTime: 12 * 60 * 60 * 1000 },
    },
    fixtures: {
      freshness: 'interactive',
      cachePolicy: 'revalidable',
      overrides: { staleTime: 2 * 60_000 },
    },
    standings: {
      freshness: 'interactive',
      cachePolicy: 'persistable',
      overrides: { staleTime: 2 * 60_000 },
    },
    transfers: {
      freshness: 'stable',
      cachePolicy: 'revalidable',
      overrides: { staleTime: 6 * 60 * 60 * 1000 },
    },
    seasons: {
      freshness: 'stable',
      cachePolicy: 'persistable',
      overrides: { staleTime: 24 * 60 * 60 * 1000 },
    },
    playerStats: {
      freshness: 'interactive',
      cachePolicy: 'revalidable',
      overrides: { staleTime: 5 * 60 * 1000, retry: 1 },
    },
    teamStats: {
      freshness: 'interactive',
      cachePolicy: 'revalidable',
      overrides: { staleTime: 5 * 60 * 1000, retry: 1 },
    },
    teamAdvancedStats: {
      freshness: 'interactive',
      cachePolicy: 'revalidable',
      overrides: { staleTime: 30 * 60 * 1000, retry: 1 },
    },
    totw: {
      freshness: 'stable',
      cachePolicy: 'revalidable',
      overrides: { staleTime: 30 * 60 * 1000 },
    },
    bracket: {
      freshness: 'interactive',
      cachePolicy: 'revalidable',
      overrides: { staleTime: 6 * 60_000 },
    },
  },
  matches: {
    full: {
      freshness: 'interactive',
      cachePolicy: 'persistable',
      overrides: { staleTime: 30_000, retry: 1 },
    },
    details: {
      freshness: 'interactive',
      cachePolicy: 'persistable',
    },
    events: {
      freshness: 'live',
      cachePolicy: 'live-only',
    },
    statistics: {
      freshness: 'live',
      cachePolicy: 'live-only',
    },
    lineups: {
      freshness: 'interactive',
      cachePolicy: 'revalidable',
      overrides: { staleTime: 30_000 },
    },
    predictions: {
      freshness: 'stable',
      cachePolicy: 'revalidable',
      overrides: { staleTime: 10 * 60_000 },
    },
    playersStats: {
      freshness: 'live',
      cachePolicy: 'live-only',
      overrides: { staleTime: 20_000 },
    },
    absences: {
      freshness: 'stable',
      cachePolicy: 'revalidable',
      overrides: { staleTime: 30 * 60_000 },
    },
    headToHead: {
      freshness: 'stable',
      cachePolicy: 'revalidable',
      overrides: { staleTime: 10 * 60_000 },
    },
  },
} as const;

export function isPersistableQueryCachePolicy(
  policy: QueryCachePolicy,
): boolean {
  return policy === 'persistable';
}
