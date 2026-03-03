CREATE TABLE IF NOT EXISTS mobile_refresh_sessions (
  id UUID PRIMARY KEY,
  family_id UUID NOT NULL,
  auth_subject TEXT NOT NULL,
  platform TEXT NOT NULL,
  integrity TEXT NOT NULL,
  scope JSONB NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  rotated_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  replaced_by UUID REFERENCES mobile_refresh_sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_mobile_refresh_sessions_family_id
ON mobile_refresh_sessions (family_id);

CREATE INDEX IF NOT EXISTS idx_mobile_refresh_sessions_auth_subject
ON mobile_refresh_sessions (auth_subject);
