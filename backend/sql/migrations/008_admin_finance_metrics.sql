ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS amount_cents INTEGER;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'USD';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_interval VARCHAR(20) NOT NULL DEFAULT 'month';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'expired'));

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_billing_interval_check;
ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_billing_interval_check
  CHECK (billing_interval IN ('month', 'year', 'none'));

UPDATE subscriptions s
SET amount_cents = p.price_cents,
    currency = p.currency,
    billing_interval = p.billing_interval,
    current_period_start = COALESCE(s.current_period_start, s.started_at)
FROM subscription_plans p
WHERE p.code = s.plan_code;

ALTER TABLE payment_records
  ADD COLUMN IF NOT EXISTS subscription_id BIGINT REFERENCES subscriptions(id) ON DELETE SET NULL;
ALTER TABLE payment_records
  ADD COLUMN IF NOT EXISTS refunded_amount_cents INTEGER NOT NULL DEFAULT 0;

ALTER TABLE payment_records DROP CONSTRAINT IF EXISTS payment_records_refunded_amount_check;
ALTER TABLE payment_records
  ADD CONSTRAINT payment_records_refunded_amount_check
  CHECK (refunded_amount_cents >= 0);

UPDATE payment_records
SET refunded_amount_cents = amount_cents
WHERE status = 'refunded' AND refunded_amount_cents = 0;

CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end
  ON subscriptions(current_period_end);
CREATE INDEX IF NOT EXISTS idx_subscriptions_billing
  ON subscriptions(source, status, current_period_end);
CREATE INDEX IF NOT EXISTS idx_payment_records_subscription
  ON payment_records(subscription_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_records_provider_reference_unique
  ON payment_records(provider, provider_reference)
  WHERE provider_reference IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_records_provider_transaction_unique
  ON payment_records(provider, provider_transaction_id)
  WHERE provider_transaction_id IS NOT NULL;
