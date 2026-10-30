-- 005 - Phase 1 stability fixes.
-- Adds payment metadata/provider transaction tracking, widens payment statuses,
-- and introduces a "pending" institution state so self-service signups cannot
-- activate a paid institution plan without admin approval.
-- Safe to run on an existing database: every statement is idempotent.

-- ---------------------------------------------------------------------------
-- Payment records
-- ---------------------------------------------------------------------------
ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS provider_transaction_id VARCHAR(200);
ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE payment_records DROP CONSTRAINT IF EXISTS payment_records_status_check;
ALTER TABLE payment_records
  ADD CONSTRAINT payment_records_status_check
  CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded', 'disputed'));

CREATE INDEX IF NOT EXISTS idx_payment_records_reference
  ON payment_records(provider, provider_reference);
CREATE INDEX IF NOT EXISTS idx_payment_records_transaction
  ON payment_records(provider, provider_transaction_id);

-- ---------------------------------------------------------------------------
-- Institutions: pending approval state
-- ---------------------------------------------------------------------------
ALTER TABLE institutions DROP CONSTRAINT IF EXISTS institutions_status_check;
ALTER TABLE institutions
  ADD CONSTRAINT institutions_status_check
  CHECK (status IN ('pending', 'active', 'suspended'));

ALTER TABLE institutions ALTER COLUMN status SET DEFAULT 'pending';
