// ─── Politiques par classe de fraîcheur ───
/** Données statiques à vie : historique carrière, trophées, matchs passés, infos stade */
export const STATIC_LIFETIME_POLICY = {
    freshMs: 30 * 24 * 60 * 60_000,
    staleMs: 90 * 24 * 60 * 60_000,
    refreshIntervalMs: 7 * 24 * 60 * 60_000,
};
/** Données post-match : stats saison en cours, classement, effectif, forme récente */
export const POST_MATCH_POLICY = {
    freshMs: 6 * 60 * 60_000,
    staleMs: 24 * 60 * 60_000,
    refreshIntervalMs: 6 * 60 * 60_000,
};
/** Données hebdomadaires : transferts, TOTW, prédictions */
export const WEEKLY_POLICY = {
    freshMs: 24 * 60 * 60_000,
    staleMs: 7 * 24 * 60 * 60_000,
    refreshIntervalMs: 24 * 60 * 60_000,
};
// ─── Politiques par entité (payload complet) ───
export const BOOTSTRAP_POLICY = {
    freshMs: 5 * 60_000,
    staleMs: 30 * 60_000,
    refreshIntervalMs: 5 * 60_000,
};
export const TEAM_POLICY = {
    freshMs: 6 * 60 * 60_000,
    staleMs: 24 * 60 * 60_000,
    refreshIntervalMs: 6 * 60 * 60_000,
};
export const PLAYER_POLICY = {
    freshMs: 12 * 60 * 60_000,
    staleMs: 36 * 60 * 60_000,
    refreshIntervalMs: 12 * 60 * 60_000,
};
export const COMPETITION_POLICY = {
    freshMs: 4 * 60 * 60_000,
    staleMs: 24 * 60 * 60_000,
    refreshIntervalMs: 4 * 60 * 60_000,
};
// ─── Politiques match par état du cycle de vie ───
export const MATCH_DEFAULT_POLICY = {
    freshMs: 5 * 60_000,
    staleMs: 30 * 60_000,
    refreshIntervalMs: 5 * 60_000,
};
/** Match terminé depuis > 24h : données figées */
export const MATCH_FINISHED_POLICY = {
    freshMs: 7 * 24 * 60 * 60_000,
    staleMs: 30 * 24 * 60 * 60_000,
    refreshIntervalMs: 7 * 24 * 60 * 60_000,
};
export const MATCH_LIVE_POLICY = {
    freshMs: 2 * 60_000,
    staleMs: 10 * 60_000,
    refreshIntervalMs: 2 * 60_000,
};
export const MATCH_LIVE_OVERLAY_POLICY = {
    freshMs: 30_000,
    staleMs: 2 * 60_000,
    refreshIntervalMs: 30_000,
};
export function resolveMatchSnapshotPolicy(lifecycleState) {
    if (lifecycleState === 'live') {
        return MATCH_LIVE_POLICY;
    }
    if (lifecycleState === 'finished') {
        return MATCH_FINISHED_POLICY;
    }
    return MATCH_DEFAULT_POLICY;
}
