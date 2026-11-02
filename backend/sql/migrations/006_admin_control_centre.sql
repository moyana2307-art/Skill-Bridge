-- 006 - Admin control centre foundation.
-- Adds account status and presence tracking, activity/audit history, and
-- subscription events used by the admin reporting and security screens.
-- Safe to run on an existing database: every statement is idempotent.

-- ---------------------------------------------------------------------------
-- Users: suspension and presence
-- ---------------------------------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users
  ADD CONSTRAINT users_status_check CHECK (status IN ('active', 'suspended'));

CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- ---------------------------------------------------------------------------
-- Activity stream. This is a human-readable feed, not an immutable ledger.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(80) NOT NULL,
  entity_type VARCHAR(40),
  entity_id BIGINT,
  title VARCHAR(200),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address VARCHAR(64),
  user_agent VARCHAR(300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created
  ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user
  ON activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type
  ON activity_logs(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity
  ON activity_logs(entity_type, entity_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Admin audit ledger. Rows must never be edited or deleted.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  admin_user_id BIGINT,
  admin_name VARCHAR(100),
  action VARCHAR(80) NOT NULL,
  target_type VARCHAR(40) NOT NULL,
  target_id BIGINT,
  target_label VARCHAR(200),
  before_data JSONB,
  after_data JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address VARCHAR(64),
  user_agent VARCHAR(300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created
  ON admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin
  ON admin_audit_logs(admin_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action
  ON admin_audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target
  ON admin_audit_logs(target_type, target_id, created_at DESC);

CREATE OR REPLACE FUNCTION prevent_admin_audit_log_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'admin_audit_logs rows are immutable';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS admin_audit_logs_immutable ON admin_audit_logs;
CREATE TRIGGER admin_audit_logs_immutable
  BEFORE UPDATE OR DELETE ON admin_audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_admin_audit_log_mutation();

-- ---------------------------------------------------------------------------
-- Subscription history. The subscriptions table keeps one current row per
-- user; this table records every meaningful change over time.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscription_events (
  id BIGSERIAL PRIMARY KEY,
  subscription_id BIGINT REFERENCES subscriptions(id) ON DELETE SET NULL,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(40) NOT NULL,
  from_plan_code VARCHAR(30),
  to_plan_code VARCHAR(30),
  from_status VARCHAR(20),
  to_status VARCHAR(20),
  source VARCHAR(20),
  amount_cents INTEGER,
  currency VARCHAR(3),
  actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscription_events_created
  ON subscription_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_events_user
  ON subscription_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_events_subscription
  ON subscription_events(subscription_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type
  ON subscription_events(event_type, created_at DESC);

-- ---------------------------------------------------------------------------
-- Payment timestamps for accurate financial reporting.
-- ---------------------------------------------------------------------------
ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;
ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ;
ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS failure_reason TEXT;

UPDATE payment_records
SET paid_at = COALESCE(paid_at, updated_at)
WHERE status = 'paid' AND paid_at IS NULL;

UPDATE payment_records
SET refunded_at = COALESCE(refunded_at, updated_at)
WHERE status = 'refunded' AND refunded_at IS NULL;

UPDATE payment_records
SET failed_at = COALESCE(failed_at, updated_at)
WHERE status = 'failed' AND failed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payment_records_status_created
  ON payment_records(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_records_paid_at
  ON payment_records(paid_at DESC);
