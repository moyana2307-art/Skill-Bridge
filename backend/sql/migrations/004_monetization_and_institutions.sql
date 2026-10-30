-- 004 - Freemium plans, entitlements, institutions, and plan requests.
-- Safe to run on an existing database: every statement is idempotent.

-- ---------------------------------------------------------------------------
-- Plan catalogue. The API reads plan limits from config/plans.js, but these
-- rows keep the commercial definition available to admins and future billing.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscription_plans (
  code VARCHAR(30) PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  billing_interval VARCHAR(20) NOT NULL DEFAULT 'month'
    CHECK (billing_interval IN ('month', 'year', 'none')),
  rank SMALLINT NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------------
-- Institutions (universities, colleges, NGOs, bootcamps, career centres)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS institutions (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  contact_email VARCHAR(200),
  package_code VARCHAR(20) NOT NULL DEFAULT 'small'
    CHECK (package_code IN ('small', 'growing', 'large')),
  seat_limit INTEGER NOT NULL DEFAULT 50 CHECK (seat_limit > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended')),
  owner_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_institutions_owner ON institutions(owner_user_id);

CREATE TABLE IF NOT EXISTS institution_members (
  id BIGSERIAL PRIMARY KEY,
  institution_id BIGINT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member'
    CHECK (role IN ('admin', 'member')),
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'invited', 'removed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (institution_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_institution_members_user ON institution_members(user_id, status);
CREATE INDEX IF NOT EXISTS idx_institution_members_institution
  ON institution_members(institution_id, status);

-- ---------------------------------------------------------------------------
-- One active subscription per user. Institutions assign the "institution"
-- plan to their members; individuals can be upgraded by an admin.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  plan_code VARCHAR(30) NOT NULL REFERENCES subscription_plans(code),
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'trialing', 'past_due', 'canceled')),
  source VARCHAR(20) NOT NULL DEFAULT 'admin'
    CHECK (source IN ('admin', 'institution', 'system', 'payment')),
  institution_id BIGINT REFERENCES institutions(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan_code, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_institution ON subscriptions(institution_id);

-- ---------------------------------------------------------------------------
-- Upgrade requests. Without a payment gateway yet, users request a plan and
-- an admin approves it, which activates the subscription.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plan_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_code VARCHAR(30) NOT NULL REFERENCES subscription_plans(code),
  note TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_plan_requests_status ON plan_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plan_requests_user ON plan_requests(user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Payment records (reserved for a future gateway integration)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_records (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  institution_id BIGINT REFERENCES institutions(id) ON DELETE SET NULL,
  plan_code VARCHAR(30) REFERENCES subscription_plans(code),
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  provider VARCHAR(50),
  provider_reference VARCHAR(200),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_payment_records_user ON payment_records(user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Seed the plan catalogue.
-- ---------------------------------------------------------------------------
INSERT INTO subscription_plans
  (code, name, description, price_cents, currency, billing_interval, rank, features, limits, sort_order)
VALUES
  (
    'free', 'Free', 'Start exploring careers and build one learning roadmap.', 0, 'USD', 'none', 0,
    '{"career_assessment": true, "career_recommendations": "limited", "skills_gap": "basic", "roadmaps": 1, "opportunities": true, "dashboard": "basic", "mentor": false, "cv_builder": false, "interview_prep": false, "advanced_analytics": false, "project_recommendations": false, "cover_letters": false, "portfolio_review": false, "priority_support": false}'::jsonb,
    '{"career_assessments_per_month": 1, "career_recommendations_per_month": 3, "skills_gap_analyses_per_month": 2, "ai_roadmaps_per_month": 1, "active_roadmaps": 1, "mentor_messages_per_month": 0, "cv_generations_per_month": 0, "cover_letters_per_month": 0, "mock_interviews_per_month": 0, "project_ideas_per_month": 0, "project_evaluations_per_month": 1, "ai_analyses_per_month": 8}'::jsonb,
    0
  ),
  (
    'plus', 'SkillBridge Plus', 'Unlimited guidance, mentor, CV builder, interviews, and advanced analytics.', 500, 'USD', 'month', 1,
    '{"career_assessment": true, "career_recommendations": true, "skills_gap": "detailed", "roadmaps": "unlimited", "opportunities": true, "dashboard": "advanced", "mentor": true, "cv_builder": true, "interview_prep": true, "advanced_analytics": true, "project_recommendations": false, "cover_letters": false, "portfolio_review": false, "priority_support": false}'::jsonb,
    '{"career_assessments_per_month": 5, "career_recommendations_per_month": 30, "skills_gap_analyses_per_month": 20, "ai_roadmaps_per_month": 20, "active_roadmaps": 20, "mentor_messages_per_month": 300, "cv_generations_per_month": 20, "cover_letters_per_month": 5, "mock_interviews_per_month": 2, "project_ideas_per_month": 10, "project_evaluations_per_month": 20, "ai_analyses_per_month": 150}'::jsonb,
    1
  ),
  (
    'premium', 'SkillBridge Premium', 'Everything in Plus, plus advanced CV tools, more interviews, projects, and portfolio reviews.', 1000, 'USD', 'month', 2,
    '{"career_assessment": true, "career_recommendations": true, "skills_gap": "detailed", "roadmaps": "unlimited", "opportunities": true, "dashboard": "advanced", "mentor": true, "cv_builder": true, "interview_prep": true, "advanced_analytics": true, "project_recommendations": true, "cover_letters": true, "portfolio_review": true, "priority_support": true}'::jsonb,
    '{"career_assessments_per_month": 20, "career_recommendations_per_month": 100, "skills_gap_analyses_per_month": 100, "ai_roadmaps_per_month": 100, "active_roadmaps": 100, "mentor_messages_per_month": 1000, "cv_generations_per_month": 100, "cover_letters_per_month": 50, "mock_interviews_per_month": 15, "project_ideas_per_month": 100, "project_evaluations_per_month": 100, "ai_analyses_per_month": 500}'::jsonb,
    2
  ),
  (
    'institution', 'Institution', 'Plan assigned to students and members through a partner institution.', 0, 'USD', 'none', 3,
    '{"career_assessment": true, "career_recommendations": true, "skills_gap": "detailed", "roadmaps": "unlimited", "opportunities": true, "dashboard": "advanced", "mentor": true, "cv_builder": true, "interview_prep": true, "advanced_analytics": true, "project_recommendations": true, "cover_letters": true, "portfolio_review": true, "priority_support": true}'::jsonb,
    '{"career_assessments_per_month": 20, "career_recommendations_per_month": 100, "skills_gap_analyses_per_month": 100, "ai_roadmaps_per_month": 100, "active_roadmaps": 100, "mentor_messages_per_month": 1000, "cv_generations_per_month": 100, "cover_letters_per_month": 50, "mock_interviews_per_month": 15, "project_ideas_per_month": 100, "project_evaluations_per_month": 100, "ai_analyses_per_month": 500}'::jsonb,
    3
  )
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_cents = EXCLUDED.price_cents,
  currency = EXCLUDED.currency,
  billing_interval = EXCLUDED.billing_interval,
  rank = EXCLUDED.rank,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  sort_order = EXCLUDED.sort_order,
  updated_at = CURRENT_TIMESTAMP;
