export type QueryRetryValue = boolean | number;
export type QueryFreshnessClass = 'live' | 'interactive' | 'stable' | 'static';
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
    /** Payload complet — contient mix statique + saisonnier, aligné sur TEAM_POLICY BFF (6h) */
    full: {
      freshness: 'stable',
      cachePolicy: 'persistable',
      overrides: { staleTime: 6 * 60 * 60_000, gcTime: 24 * 60 * 60_000, retry: 1 },
    },
    /** Infos de base équipe : nom, logo, pays — quasi-statique */
    details: {
      freshness: 'static',
      cachePolicy: 'persistable',
    },
    /** Ligues d'une équipe — change rarement (inter-saisons) */
    leagues: {
      freshness: 'static',
      cachePolicy: 'persistable',
    },
    /** Vue d'ensemble — post-match refresh (classement, forme, prochains matchs) */
    overview: {
      freshness: 'stable',
      cachePolicy: 'persistable',
      overrides: { staleTime: 30 * 60_000 },
    },
    /** Leaders joueurs — post-match refresh */
    overviewLeaders: {
      freshness: 'stable',
      cachePolicy: 'revalidable',
      overrides: { staleTime: 30 * 60_000, retry: 1 },
    },
    /** Matchs équipe — rafraîchir souvent les jours de match */
    matches: {
      freshness: 'interactive',
      cachePolicy: 'revalidable',
      overrides: { staleTime: 5 * 60_000, retry: 1 },
    },
    /** Classement — post-match refresh */
    standings: {
      freshness: 'stable',
      cachePolicy: 'persistable',
      overrides: { staleTime: 30 * 60_000 },
    },
    /** Stats saison — post-match refresh */
    stats: {
      freshness: 'stable',
      cachePolicy: 'revalidable',
      overrides: { staleTime: 30 * 60_000 },
    },
    /** Stats core — post-match refresh */
    statsCore: {
      freshness: 'stable',
      cachePolicy: 'revalidable',
      overrides: { staleTime: 30 * 60_000, retry: 1 },
    },
    /** Stats joueurs — post-match refresh */
    statsPlayers: {
      freshness: 'stable',
      cachePolicy: 'revalidable',
      overrides: { staleTime: 60 * 60_000, retry: 1 },
    },
    /** Stats avancées — change peu souvent */
    statsAdvanced: {
      freshness: 'stable',
      cachePolicy: 'revalidable',
      overrides: { staleTime: 2 * 60 * 60_000, retry: 1 },
    },
    /** Transferts — hebdomadaire */
    transfers: {
      freshness: 'stable',
      cachePolicy: 'persistable',
      overrides: { staleTime: 24 * 60 * 60_000, retry: 2 },
    },
    /** Effectif — change rarement en saison */
    squad: {
      freshness: 'stable',
      cachePolicy: 'persistable',
      overrides: { staleTime: 12 * 60 * 60_000 },
    },
  },
  players: {
    /** Payload complet — aligné sur PLAYER_POLICY BFF (12h) */
    full: {
      freshness: 'stable',
      cachePolicy: 'persistable',
      overrides: { staleTime: 12 * 60 * 60_000, gcTime: 36 * 60 * 60_000, retry: 1 },
    },
    /** Vue d'ensemble joueur — post-match refresh */
    overview: {
      freshness: 'stable',
      cachePolicy: 'persistable',
      overrides: { staleTime: 6 * 60 * 60_000 },
    },
    /** Infos de base : nom, photo, nationalité — quasi-statique */
    details: {
      freshness: 'static',
      cachePolicy: 'persistable',
    },
    /** Stats saison — post-match refresh */
    stats: {
      freshness: 'stable',
      cachePolicy: 'revalidable',
      overrides: { staleTime: 30 * 60_000 },
    },
    /** Catalogue saisons dispo — statique */
    statsCatalog: {
      freshness: 'static',
      cachePolicy: 'persistable',
    },
    /** Matchs récents — rafraîchir les jours de match */
    matches: {
      freshness: 'interactive',
      cachePolicy: 'revalidable',
      overrides: { staleTime: 5 * 60_000 },
    },
    /** Historique carrière — statique à vie (ne change qu'aux transferts) */
    career: {
      freshness: 'static',
      cachePolicy: 'persistable',
    },
    /** Trophées — statique à vie */
    trophies: {
      freshness: 'static',
      cachePolicy: 'persistable',
    },
  },
  competitions: {
    /** Catalogue compétitions — statique */
    catalog: {
      freshness: 'static',
      cachePolicy: 'persistable',
    },
    /** Payload complet — aligné sur COMPETITION_POLICY BFF (4h) */
    full: {
      freshness: 'stable',
      cachePolicy: 'persistable',
      overrides: { staleTime: 4 * 60 * 60_000, gcTime: 24 * 60 * 60_000, retry: 1 },
    },
    /** En-tête compétition — statique */
    header: {
      freshness: 'static',
      cachePolicy: 'persistable',
    },
    /** Calendrier — rafraîchir les jours de match */
    fixtures: {
      freshness: 'interactive',
      cachePolicy: 'revalidable',
      overrides: { staleTime: 5 * 60_000 },
    },
    /** Classement — post-match refresh */
    standings: {
      freshness: 'stable',
      cachePolicy: 'persistable',
      overrides: { staleTime: 30 * 60_000 },
    },
    /** Transferts — hebdomadaire */
    transfers: {
      freshness: 'stable',
      cachePolicy: 'persistable',
      overrides: { staleTime: 24 * 60 * 60_000 },
    },
    /** Saisons disponibles — statique */
    seasons: {
      freshness: 'static',
      cachePolicy: 'persistable',
    },
    /** Stats joueurs de la compétition — post-match refresh */
    playerStats: {
      freshness: 'stable',
      cachePolicy: 'revalidable',
      overrides: { staleTime: 60 * 60_000, retry: 1 },
    },
    /** Stats équipes — post-match refresh */
    teamStats: {
      freshness: 'stable',
      cachePolicy: 'revalidable',
      overrides: { staleTime: 60 * 60_000, retry: 1 },
    },
    /** Stats avancées équipes — change peu */
    teamAdvancedStats: {
      freshness: 'stable',
      cachePolicy: 'revalidable',
      overrides: { staleTime: 2 * 60 * 60_000, retry: 1 },
    },
    /** TOTW — hebdomadaire */
    totw: {
      freshness: 'stable',
      cachePolicy: 'persistable',
      overrides: { staleTime: 24 * 60 * 60_000 },
    },
    /** Bracket/tableau — post-match refresh */
    bracket: {
      freshness: 'stable',
      cachePolicy: 'revalidable',
      overrides: { staleTime: 30 * 60_000 },
    },
  },
  matches: {
    /** Payload complet match — aligné sur MATCH_DEFAULT_POLICY BFF (5min) */
    full: {
      freshness: 'interactive',
      cachePolicy: 'persistable',
      overrides: { staleTime: 60_000, gcTime: 30 * 60_000, retry: 1 },
    },
    /** Infos de base match — date, équipes, stade */
    details: {
      freshness: 'interactive',
      cachePolicy: 'persistable',
    },
    /** Événements live — 15s */
    events: {
      freshness: 'live',
      cachePolicy: 'live-only',
    },
    /** Statistiques live — 15s */
    statistics: {
      freshness: 'live',
      cachePolicy: 'live-only',
    },
    /** Compos — stables après le coup d'envoi */
    lineups: {
      freshness: 'interactive',
      cachePolicy: 'revalidable',
      overrides: { staleTime: 60_000 },
    },
    /** Prédictions — pré-match, statiques une fois le match lancé */
    predictions: {
      freshness: 'stable',
      cachePolicy: 'persistable',
      overrides: { staleTime: 2 * 60 * 60_000 },
    },
    /** Stats joueurs live — 20s */
    playersStats: {
      freshness: 'live',
      cachePolicy: 'live-only',
      overrides: { staleTime: 20_000 },
    },
    /** Absences — pré-match, ne change plus pendant */
    absences: {
      freshness: 'stable',
      cachePolicy: 'persistable',
      overrides: { staleTime: 2 * 60 * 60_000 },
    },
    /** Head-to-head — historique statique */
    headToHead: {
      freshness: 'stable',
      cachePolicy: 'persistable',
      overrides: { staleTime: 24 * 60 * 60_000 },
    },
  },
} as const;

export function isPersistableQueryCachePolicy(
  policy: QueryCachePolicy,
): boolean {
  return policy === 'persistable';
}
