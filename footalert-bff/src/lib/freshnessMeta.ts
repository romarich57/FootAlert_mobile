/**
 * Métadonnées de fraîcheur embarquées dans les payloads /full.
 * Permet au mobile d'appliquer des TTL React Query différenciés
 * par sous-section du payload sans modifier la structure des données.
 */

export type FreshnessClass = 'static' | 'post_match' | 'weekly' | 'live';

export type FieldFreshnessHint = {
  freshness: FreshnessClass;
  /** Durée en secondes pendant laquelle la donnée est considérée fraîche */
  ttlSeconds: number;
};

export type PayloadFreshnessMeta = {
  generatedAt: string;
  fields: Record<string, FieldFreshnessHint>;
};

const STATIC_HINT: FieldFreshnessHint = {
  freshness: 'static',
  ttlSeconds: 30 * 24 * 3600,
};

const POST_MATCH_HINT: FieldFreshnessHint = {
  freshness: 'post_match',
  ttlSeconds: 6 * 3600,
};

const WEEKLY_HINT: FieldFreshnessHint = {
  freshness: 'weekly',
  ttlSeconds: 24 * 3600,
};

const LIVE_HINT: FieldFreshnessHint = {
  freshness: 'live',
  ttlSeconds: 60,
};

export function buildFreshnessMeta(
  fields: Record<string, FieldFreshnessHint>,
): PayloadFreshnessMeta {
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
} as const;
