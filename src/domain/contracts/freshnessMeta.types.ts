/**
 * Métadonnées de fraîcheur reçues du BFF dans les payloads /full.
 * Chaque champ du payload a un hint de fraîcheur (static, post_match, weekly, live)
 * que le mobile peut utiliser pour des TTL React Query différenciés.
 */

export type FreshnessClass = 'static' | 'post_match' | 'weekly' | 'live';

export type FieldFreshnessHint = {
  freshness: FreshnessClass;
  ttlSeconds: number;
};

export type PayloadFreshnessMeta = {
  generatedAt: string;
  fields: Record<string, FieldFreshnessHint>;
};
