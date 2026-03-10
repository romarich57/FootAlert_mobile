import type { MigrationScript } from '../migrationRunner';

export const migration002RelationalCache: MigrationScript = {
  version: 2,
  name: '002_relational_cache',
  up: [
    `CREATE TABLE IF NOT EXISTS followed_entities (
      entity_type TEXT NOT NULL,
      entity_id   TEXT NOT NULL,
      position    INTEGER NOT NULL DEFAULT 0,
      updated_at  INTEGER NOT NULL,
      PRIMARY KEY (entity_type, entity_id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_followed_entities_type_position
     ON followed_entities(entity_type, position)`,

    `CREATE TABLE IF NOT EXISTS normalized_standings (
      competition_id TEXT NOT NULL,
      season         INTEGER NOT NULL,
      group_name     TEXT NOT NULL,
      team_id        TEXT NOT NULL,
      rank           INTEGER,
      team_name      TEXT,
      team_logo      TEXT,
      points         INTEGER,
      goals_diff     INTEGER,
      played         INTEGER,
      win            INTEGER,
      draw           INTEGER,
      lose           INTEGER,
      goals_for      INTEGER,
      goals_against  INTEGER,
      form           TEXT,
      description    TEXT,
      home_stats     TEXT,
      away_stats     TEXT,
      updated_at     INTEGER NOT NULL,
      PRIMARY KEY (competition_id, season, group_name, team_id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_normalized_standings_lookup
     ON normalized_standings(competition_id, season, rank)`,

    `ALTER TABLE matches_by_date ADD COLUMN competition_name TEXT`,
    `ALTER TABLE matches_by_date ADD COLUMN competition_logo TEXT`,
    `ALTER TABLE matches_by_date ADD COLUMN competition_country TEXT`,
    `ALTER TABLE matches_by_date ADD COLUMN start_date TEXT`,
    `ALTER TABLE matches_by_date ADD COLUMN minute INTEGER`,
    `ALTER TABLE matches_by_date ADD COLUMN venue TEXT`,
    `ALTER TABLE matches_by_date ADD COLUMN status_label TEXT`,
    `ALTER TABLE matches_by_date ADD COLUMN home_team_id TEXT`,
    `ALTER TABLE matches_by_date ADD COLUMN home_team_name TEXT`,
    `ALTER TABLE matches_by_date ADD COLUMN home_team_logo TEXT`,
    `ALTER TABLE matches_by_date ADD COLUMN away_team_id TEXT`,
    `ALTER TABLE matches_by_date ADD COLUMN away_team_name TEXT`,
    `ALTER TABLE matches_by_date ADD COLUMN away_team_logo TEXT`,
    `ALTER TABLE matches_by_date ADD COLUMN home_goals INTEGER`,
    `ALTER TABLE matches_by_date ADD COLUMN away_goals INTEGER`,
    `ALTER TABLE matches_by_date ADD COLUMN has_broadcast INTEGER NOT NULL DEFAULT 0`,
  ],
};
