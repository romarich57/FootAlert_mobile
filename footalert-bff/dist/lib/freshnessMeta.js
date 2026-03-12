/**
 * Métadonnées de fraîcheur embarquées dans les payloads /full.
 * Permet au mobile d'appliquer des TTL React Query différenciés
 * par sous-section du payload sans modifier la structure des données.
 */
const STATIC_HINT = {
    freshness: 'static',
    ttlSeconds: 30 * 24 * 3600,
};
const POST_MATCH_HINT = {
    freshness: 'post_match',
    ttlSeconds: 6 * 3600,
};
const WEEKLY_HINT = {
    freshness: 'weekly',
    ttlSeconds: 24 * 3600,
};
const LIVE_HINT = {
    freshness: 'live',
    ttlSeconds: 60,
};
export function buildFreshnessMeta(fields) {
    return {
        generatedAt: new Date().toISOString(),
        fields,
    };
}
export const freshnessHints = {
    static: STATIC_HINT,
    postMatch: POST_MATCH_HINT,
    weekly: WEEKLY_HINT,
    live: LIVE_HINT,
};
