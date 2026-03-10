CREATE TABLE IF NOT EXISTS bootstrap_snapshots (
  snapshot_key TEXT PRIMARY KEY,
  payload_json JSONB NOT NULL,
  payload_version INTEGER NOT NULL DEFAULT 1,
  fresh_until TIMESTAMPTZ,
  stale_until TIMESTAMPTZ,
  last_source_sync_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bootstrap_snapshots_fresh_until
  ON bootstrap_snapshots (fresh_until);

CREATE INDEX IF NOT EXISTS idx_bootstrap_snapshots_stale_until
  ON bootstrap_snapshots (stale_until);

CREATE INDEX IF NOT EXISTS idx_bootstrap_snapshots_updated_at
  ON bootstrap_snapshots (updated_at DESC);

CREATE TABLE IF NOT EXISTS entity_snapshots (
  entity_kind TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  scope_key TEXT NOT NULL DEFAULT '',
  payload_json JSONB NOT NULL,
  payload_version INTEGER NOT NULL DEFAULT 1,
  fresh_until TIMESTAMPTZ,
  stale_until TIMESTAMPTZ,
  last_source_sync_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  priority INTEGER NOT NULL DEFAULT 100,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (entity_kind, entity_id, scope_key)
);

CREATE INDEX IF NOT EXISTS idx_entity_snapshots_kind_entity
  ON entity_snapshots (entity_kind, entity_id);

CREATE INDEX IF NOT EXISTS idx_entity_snapshots_stale_until
  ON entity_snapshots (stale_until);

CREATE INDEX IF NOT EXISTS idx_entity_snapshots_priority
  ON entity_snapshots (priority DESC, updated_at DESC);

CREATE TABLE IF NOT EXISTS match_live_overlays (
  match_id TEXT PRIMARY KEY,
  payload_json JSONB NOT NULL,
  payload_version INTEGER NOT NULL DEFAULT 1,
  fresh_until TIMESTAMPTZ,
  stale_until TIMESTAMPTZ,
  last_source_sync_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_match_live_overlays_stale_until
  ON match_live_overlays (stale_until);

CREATE INDEX IF NOT EXISTS idx_match_live_overlays_updated_at
  ON match_live_overlays (updated_at DESC);

CREATE TABLE IF NOT EXISTS snapshot_refresh_queue (
  task_key TEXT PRIMARY KEY,
  task_kind TEXT NOT NULL,
  entity_kind TEXT,
  entity_id TEXT,
  scope_key TEXT NOT NULL DEFAULT '',
  payload_json JSONB,
  priority INTEGER NOT NULL DEFAULT 100,
  next_refresh_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_success_at TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  lease_owner TEXT,
  lease_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT snapshot_refresh_queue_unique_target
    UNIQUE (entity_kind, entity_id, scope_key)
);

CREATE INDEX IF NOT EXISTS idx_snapshot_refresh_queue_claim
  ON snapshot_refresh_queue (next_refresh_at ASC, priority DESC);

CREATE INDEX IF NOT EXISTS idx_snapshot_refresh_queue_lease
  ON snapshot_refresh_queue (lease_until);

CREATE INDEX IF NOT EXISTS idx_snapshot_refresh_queue_error
  ON snapshot_refresh_queue (last_error);

CREATE TABLE IF NOT EXISTS snapshot_worker_heartbeats (
  worker_id TEXT PRIMARY KEY,
  last_seen_at TIMESTAMPTZ NOT NULL,
  metadata_json JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_snapshot_worker_heartbeats_last_seen
  ON snapshot_worker_heartbeats (last_seen_at DESC);

CREATE TABLE IF NOT EXISTS snapshot_access_log (
  entity_kind TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  scope_key TEXT NOT NULL DEFAULT '',
  last_accessed_at TIMESTAMPTZ NOT NULL,
  access_count BIGINT NOT NULL DEFAULT 1,
  PRIMARY KEY (entity_kind, entity_id, scope_key)
);

CREATE INDEX IF NOT EXISTS idx_snapshot_access_log_last_accessed
  ON snapshot_access_log (last_accessed_at DESC);
