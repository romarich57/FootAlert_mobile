/**
 * Utilitaires pour exploiter les métadonnées de fraîcheur (_meta)
 * reçues du BFF dans les payloads /full.
 *
 * Permet au mobile de dériver un staleTime React Query par champ
 * en se basant sur la classification BFF (static, post_match, weekly, live).
 */

import type {
  FreshnessClass,
  PayloadFreshnessMeta,
} from '@domain/contracts/freshnessMeta.types';

const FRESHNESS_STALE_TIME_MS: Record<FreshnessClass, number> = {
  static: Infinity,
  post_match: 6 * 60 * 60_000,
  weekly: 24 * 60 * 60_000,
  live: 15_000,
};

/**
 * Retourne le staleTime React Query recommandé pour un champ donné
 * du payload full, basé sur les hints du BFF.
 */
export function getFieldStaleTime(
  meta: PayloadFreshnessMeta | undefined,
  fieldName: string,
): number | undefined {
  if (!meta?.fields) {
    return undefined;
  }

  const hint = meta.fields[fieldName];
  if (!hint) {
    return undefined;
  }

  return FRESHNESS_STALE_TIME_MS[hint.freshness] ?? hint.ttlSeconds * 1000;
}

/**
 * Retourne la classe de fraîcheur BFF pour un champ donné.
 */
export function getFieldFreshnessClass(
  meta: PayloadFreshnessMeta | undefined,
  fieldName: string,
): FreshnessClass | undefined {
  return meta?.fields?.[fieldName]?.freshness;
}

/**
 * Vérifie si un payload full est encore « frais » en se basant
 * sur le champ le plus volatile (TTL le plus court).
 */
export function isPayloadFresh(
  meta: PayloadFreshnessMeta | undefined,
): boolean {
  if (!meta?.generatedAt || !meta.fields) {
    return false;
  }

  const generatedAtMs = new Date(meta.generatedAt).getTime();
  if (!Number.isFinite(generatedAtMs)) {
    return false;
  }

  const now = Date.now();
  const fields = Object.values(meta.fields);
  if (fields.length === 0) {
    return false;
  }

  const minTtlMs = Math.min(
    ...fields.map(hint => hint.ttlSeconds * 1000),
  );

  return now - generatedAtMs < minTtlMs;
}
