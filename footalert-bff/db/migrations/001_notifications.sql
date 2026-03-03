CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS push_devices (
  id UUID PRIMARY KEY,
  auth_subject TEXT NOT NULL,
  device_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  token_ciphertext TEXT NOT NULL,
  platform TEXT NOT NULL,
  provider TEXT NOT NULL,
  locale TEXT NOT NULL,
  timezone TEXT NOT NULL,
  app_version TEXT NOT NULL,
  status TEXT NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_push_devices_subject_device_provider
ON push_devices (auth_subject, device_id, provider);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY,
  device_fk UUID NOT NULL REFERENCES push_devices(id) ON DELETE CASCADE,
  scope_kind TEXT NOT NULL,
  scope_id TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  enabled BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (device_fk, scope_kind, scope_id, alert_type)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_scope_alert_enabled
ON push_subscriptions (scope_kind, scope_id, alert_type, enabled);

CREATE TABLE IF NOT EXISTS notification_events (
  id UUID PRIMARY KEY,
  source TEXT NOT NULL,
  external_event_id TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  fixture_id TEXT,
  competition_id TEXT,
  team_ids JSONB NOT NULL,
  player_ids JSONB NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (source, external_event_id)
);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id UUID PRIMARY KEY,
  event_fk UUID NOT NULL REFERENCES notification_events(id) ON DELETE CASCADE,
  device_fk UUID NOT NULL REFERENCES push_devices(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL,
  provider_message_id TEXT,
  error_code TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (event_fk, device_fk, alert_type)
);
