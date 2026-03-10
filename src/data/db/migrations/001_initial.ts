/**
 * Migration initiale — schéma SQLite pour le store local offline-first.
 *
 * Tables :
 * - entities       : cache JSON des payloads /full (teams, players, competitions, matches)
 * - sync_metadata  : métadonnées de synchronisation (last_synced_at, cursors, etc.)
 * - matches_by_date: index dénormalisé pour l'écran Matches par date
 */

import type { MigrationScript } from '../migrationRunner';

export const migration001Initial: MigrationScript = {
  version: 1,
  name: '001_initial',
  up: [
    // Table principale des entités — stocke le JSON complet du payload /full
    `CREATE TABLE IF NOT EXISTS entities (
      entity_type TEXT NOT NULL,
      entity_id   TEXT NOT NULL,
      data        TEXT NOT NULL,
      updated_at  INTEGER NOT NULL,
      etag        TEXT,
      PRIMARY KEY (entity_type, entity_id)
    )`,

    // Index pour le garbage collector (suppression des plus anciennes)
    `CREATE INDEX IF NOT EXISTS idx_entities_type_updated
     ON entities(entity_type, updated_at)`,

    // Métadonnées de synchronisation (clés libres, ex: "last_sync_teams", "schema_version")
    `CREATE TABLE IF NOT EXISTS sync_metadata (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )`,

    // Table dénormalisée pour l'écran Matches par date (accès rapide sans parser tous les matches)
    `CREATE TABLE IF NOT EXISTS matches_by_date (
      date       TEXT NOT NULL,
      match_id   TEXT NOT NULL,
      league_id  TEXT NOT NULL,
      status     TEXT NOT NULL,
      data       TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (date, match_id)
    )`,

    `CREATE INDEX IF NOT EXISTS idx_matches_date_league
     ON matches_by_date(date, league_id)`,

    `CREATE INDEX IF NOT EXISTS idx_matches_date_status
     ON matches_by_date(date, status)`,
  ],
};
