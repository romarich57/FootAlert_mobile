export type SnapshotPolicy = {
  freshMs: number;
  staleMs: number;
  refreshIntervalMs: number;
};

// ─── Politiques par classe de fraîcheur ───

/** Données statiques à vie : historique carrière, trophées, matchs passés, infos stade */
export const STATIC_LIFETIME_POLICY: SnapshotPolicy = {
  freshMs: 30 * 24 * 60 * 60_000,
  staleMs: 90 * 24 * 60 * 60_000,
  refreshIntervalMs: 7 * 24 * 60 * 60_000,
};

/** Données post-match : stats saison en cours, classement, effectif, forme récente */
export const POST_MATCH_POLICY: SnapshotPolicy = {
  freshMs: 6 * 60 * 60_000,
  staleMs: 24 * 60 * 60_000,
  refreshIntervalMs: 6 * 60 * 60_000,
};

/** Données hebdomadaires : transferts, TOTW, prédictions */
export const WEEKLY_POLICY: SnapshotPolicy = {
  freshMs: 24 * 60 * 60_000,
  staleMs: 7 * 24 * 60 * 60_000,
  refreshIntervalMs: 24 * 60 * 60_000,
};

// ─── Politiques par entité (payload complet) ───

export const BOOTSTRAP_POLICY: SnapshotPolicy = {
  freshMs: 5 * 60_000,
  staleMs: 30 * 60_000,
  refreshIntervalMs: 5 * 60_000,
};

export const TEAM_POLICY: SnapshotPolicy = {
  freshMs: 6 * 60 * 60_000,
  staleMs: 24 * 60 * 60_000,
  refreshIntervalMs: 6 * 60 * 60_000,
};

export const PLAYER_POLICY: SnapshotPolicy = {
  freshMs: 12 * 60 * 60_000,
  staleMs: 36 * 60 * 60_000,
  refreshIntervalMs: 12 * 60 * 60_000,
};

export const COMPETITION_POLICY: SnapshotPolicy = {
  freshMs: 4 * 60 * 60_000,
  staleMs: 24 * 60 * 60_000,
  refreshIntervalMs: 4 * 60 * 60_000,
};

// ─── Politiques sectionnées pour les payloads full progressifs ───

export const TEAM_CORE_POLICY: SnapshotPolicy = {
  freshMs: 30 * 60_000,
  staleMs: 6 * 60 * 60_000,
  refreshIntervalMs: 30 * 60_000,
};

export const TEAM_STATISTICS_POLICY = POST_MATCH_POLICY;
export const TEAM_ADVANCED_STATS_POLICY = POST_MATCH_POLICY;
export const TEAM_STATS_PLAYERS_POLICY = POST_MATCH_POLICY;
export const TEAM_SQUAD_POLICY = WEEKLY_POLICY;
export const TEAM_TRANSFERS_POLICY = WEEKLY_POLICY;
export const TEAM_TROPHIES_POLICY = STATIC_LIFETIME_POLICY;

export const PLAYER_CORE_POLICY: SnapshotPolicy = {
  freshMs: 30 * 60_000,
  staleMs: 6 * 60 * 60_000,
  refreshIntervalMs: 30 * 60_000,
};

export const PLAYER_MATCHES_POLICY = POST_MATCH_POLICY;
export const PLAYER_STATS_CATALOG_POLICY: SnapshotPolicy = {
  freshMs: 7 * 24 * 60 * 60_000,
  staleMs: 30 * 24 * 60 * 60_000,
  refreshIntervalMs: 7 * 24 * 60 * 60_000,
};
export const PLAYER_CAREER_POLICY = STATIC_LIFETIME_POLICY;
export const PLAYER_TROPHIES_POLICY = STATIC_LIFETIME_POLICY;

export const COMPETITION_CORE_POLICY: SnapshotPolicy = {
  freshMs: 15 * 60_000,
  staleMs: 6 * 60 * 60_000,
  refreshIntervalMs: 15 * 60_000,
};

export const COMPETITION_BRACKET_POLICY = POST_MATCH_POLICY;
export const COMPETITION_PLAYER_STATS_POLICY = POST_MATCH_POLICY;
export const COMPETITION_TEAM_STATS_POLICY = POST_MATCH_POLICY;
export const COMPETITION_TRANSFERS_POLICY = WEEKLY_POLICY;

// ─── Politiques match par état du cycle de vie ───

export const MATCH_DEFAULT_POLICY: SnapshotPolicy = {
  freshMs: 5 * 60_000,
  staleMs: 30 * 60_000,
  refreshIntervalMs: 5 * 60_000,
};

/** Match terminé depuis > 24h : données figées */
export const MATCH_FINISHED_POLICY: SnapshotPolicy = {
  freshMs: 7 * 24 * 60 * 60_000,
  staleMs: 30 * 24 * 60 * 60_000,
  refreshIntervalMs: 7 * 24 * 60 * 60_000,
};

export const MATCH_LIVE_POLICY: SnapshotPolicy = {
  freshMs: 2 * 60_000,
  staleMs: 10 * 60_000,
  refreshIntervalMs: 2 * 60_000,
};

export const MATCH_LIVE_OVERLAY_POLICY: SnapshotPolicy = {
  freshMs: 30_000,
  staleMs: 2 * 60_000,
  refreshIntervalMs: 30_000,
};

export function resolveMatchSnapshotPolicy(lifecycleState: string): SnapshotPolicy {
  if (lifecycleState === 'live') {
    return MATCH_LIVE_POLICY;
  }

  if (lifecycleState === 'finished') {
    return MATCH_FINISHED_POLICY;
  }

  return MATCH_DEFAULT_POLICY;
}
