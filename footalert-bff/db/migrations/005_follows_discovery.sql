CREATE TABLE IF NOT EXISTS follow_entity_states (
  subject_hash TEXT NOT NULL,
  entity_kind TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  is_following BOOLEAN NOT NULL,
  first_followed_at TIMESTAMPTZ NULL,
  last_changed_at TIMESTAMPTZ NOT NULL,
  last_source TEXT NOT NULL,
  PRIMARY KEY (subject_hash, entity_kind, entity_id)
);

CREATE TABLE IF NOT EXISTS follow_entity_aggregates (
  entity_kind TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  active_followers_count INTEGER NOT NULL DEFAULT 0,
  total_follow_adds_count INTEGER NOT NULL DEFAULT 0,
  last_followed_at TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_kind, entity_id)
);

CREATE TABLE IF NOT EXISTS follow_entity_daily_stats (
  bucket_date DATE NOT NULL,
  entity_kind TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  follow_adds_count INTEGER NOT NULL DEFAULT 0,
  follow_removes_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket_date, entity_kind, entity_id)
);

CREATE TABLE IF NOT EXISTS follow_entity_metadata (
  entity_kind TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  country TEXT NULL,
  position TEXT NULL,
  team_name TEXT NULL,
  team_logo TEXT NULL,
  league_name TEXT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_kind, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_follow_entity_states_subject_kind_entity
  ON follow_entity_states (subject_hash, entity_kind, entity_id);

CREATE INDEX IF NOT EXISTS idx_follow_entity_aggregates_rank
  ON follow_entity_aggregates (entity_kind, active_followers_count DESC, total_follow_adds_count DESC);

CREATE INDEX IF NOT EXISTS idx_follow_entity_daily_stats_recent
  ON follow_entity_daily_stats (entity_kind, bucket_date DESC, entity_id);

CREATE INDEX IF NOT EXISTS idx_follow_entity_metadata_lookup
  ON follow_entity_metadata (entity_kind, entity_id);
