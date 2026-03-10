/**
 * Types fondamentaux du store local SQLite.
 *
 * entity_type discrimine les 4 familles principales de données FootAlert.
 * Chaque ligne stocke le JSON complet du payload /full correspondant,
 * ce qui permet un affichage instantané sans réseau.
 */

export type EntityType = 'team' | 'player' | 'competition' | 'match';

/** Ligne brute de la table `entities`. */
export type EntityRow = {
  entity_type: EntityType;
  entity_id: string;
  data: string;
  updated_at: number;
  etag: string | null;
};

/** Ligne brute de la table `sync_metadata`. */
export type SyncMetadataRow = {
  key: string;
  value: string;
  updated_at: number;
};

/** Ligne brute de la table `matches_by_date`. */
export type MatchByDateRow = {
  date: string;
  match_id: string;
  league_id: string;
  status: string;
  data: string;
  updated_at: number;
};

/** Résultat d'une lecture depuis le store. */
export type EntityReadResult<T> = {
  data: T;
  updatedAt: number;
  etag: string | null;
} | null;

/** Paramètre d'upsert dans le store. */
export type EntityUpsertParams<T> = {
  entityType: EntityType;
  entityId: string;
  data: T;
  etag?: string | null;
};

/** Options de query par type. */
export type EntityQueryOptions = {
  entityType: EntityType;
  limit?: number;
  orderByUpdatedAt?: 'asc' | 'desc';
  /** Ne retourner que les entités mises à jour après ce timestamp. */
  updatedAfter?: number;
};
