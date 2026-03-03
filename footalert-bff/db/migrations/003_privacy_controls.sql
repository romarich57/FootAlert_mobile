CREATE TABLE IF NOT EXISTS mobile_privacy_erasure_audit (
  request_id UUID PRIMARY KEY,
  subject_hash TEXT NOT NULL,
  platform TEXT NOT NULL,
  erased_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mobile_privacy_erasure_audit_erased_at
ON mobile_privacy_erasure_audit (erased_at DESC);
