-- SkillBridge AI - PostgreSQL/Supabase schema
-- Run with: psql "$DATABASE_URL" -f backend/sql/schema.sql

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  education_level VARCHAR(100), work_experience TEXT,
  career_interests VARCHAR(500), location VARCHAR(100), learning_preferences VARCHAR(500),
  avatar_data BYTEA, avatar_mime VARCHAR(30),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS skills (
  id BIGSERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(100), created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_skills (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id BIGINT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  proficiency VARCHAR(20) NOT NULL DEFAULT 'beginner' CHECK (proficiency IN ('beginner','intermediate','advanced')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, skill_id)
);

CREATE TABLE IF NOT EXISTS career_goals (
  id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  career_title VARCHAR(150) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_career_goals_user ON career_goals(user_id);

CREATE TABLE IF NOT EXISTS learning_roadmaps (
  id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  career_goal_id BIGINT REFERENCES career_goals(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL, summary TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_learning_roadmaps_user ON learning_roadmaps(user_id);

CREATE TABLE IF NOT EXISTS roadmap_tasks (
  id BIGSERIAL PRIMARY KEY, roadmap_id BIGINT NOT NULL REFERENCES learning_roadmaps(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL, description TEXT, skills_to_develop VARCHAR(500), learning_activities TEXT,
  practical_project TEXT, resources TEXT, estimated_duration VARCHAR(100), sort_order INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_roadmap_tasks_roadmap ON roadmap_tasks(roadmap_id);

CREATE TABLE IF NOT EXISTS opportunities (
  id BIGSERIAL PRIMARY KEY, title VARCHAR(200) NOT NULL, organisation VARCHAR(150), description TEXT,
  opportunity_type VARCHAR(20) NOT NULL CHECK (opportunity_type IN ('job','internship','scholarship','training','course')),
  required_skills VARCHAR(500), location VARCHAR(150), is_remote BOOLEAN NOT NULL DEFAULT FALSE,
  eligibility TEXT, application_deadline DATE, application_url VARCHAR(500), source_name VARCHAR(150), external_id VARCHAR(200),
  last_synced_at TIMESTAMPTZ, is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_name, external_id)
);
CREATE INDEX IF NOT EXISTS idx_opportunities_type ON opportunities(opportunity_type);
CREATE INDEX IF NOT EXISTS idx_opportunities_active ON opportunities(is_active);

CREATE TABLE IF NOT EXISTS saved_opportunities (
  id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opportunity_id BIGINT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, opportunity_id)
);
CREATE TABLE IF NOT EXISTS user_progress (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  roadmap_task_id BIGINT NOT NULL REFERENCES roadmap_tasks(id) ON DELETE CASCADE,
  previous_status VARCHAR(20),
  new_status VARCHAR(20) NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress(user_id);

CREATE TABLE IF NOT EXISTS ai_analyses (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  analysis_type VARCHAR(50) NOT NULL,
  career_goal_id BIGINT REFERENCES career_goals(id) ON DELETE SET NULL,
  opportunity_id BIGINT REFERENCES opportunities(id) ON DELETE CASCADE,
  model VARCHAR(100), payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_user_type ON ai_analyses(user_id, analysis_type, created_at);

-- ---------------------------------------------------------------------------
-- Portfolio settings live on the profile so a public portfolio can be shared.
-- ---------------------------------------------------------------------------
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS portfolio_slug VARCHAR(80);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS portfolio_headline VARCHAR(200);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS portfolio_about TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS portfolio_public BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_portfolio_slug
  ON user_profiles(portfolio_slug) WHERE portfolio_slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(40) NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT,
  link VARCHAR(300),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_user
  ON notifications(user_id, is_read, created_at DESC);

CREATE TABLE IF NOT EXISTS learning_resources (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  provider VARCHAR(150),
  url VARCHAR(500),
  description TEXT,
  resource_type VARCHAR(30) NOT NULL DEFAULT 'course'
    CHECK (resource_type IN ('course','article','video','book','tool','community')),
  skill_tags VARCHAR(500),
  is_free BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_learning_resources_active ON learning_resources(is_active);

CREATE TABLE IF NOT EXISTS career_assessments (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  result JSONB NOT NULL,
  model VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_career_assessments_user
  ON career_assessments(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS mentor_threads (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL DEFAULT 'Career mentor chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_mentor_threads_user ON mentor_threads(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS mentor_messages (
  id BIGSERIAL PRIMARY KEY,
  thread_id BIGINT NOT NULL REFERENCES mentor_threads(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_mentor_messages_thread ON mentor_messages(thread_id, created_at);

CREATE TABLE IF NOT EXISTS applications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opportunity_id BIGINT REFERENCES opportunities(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  organisation VARCHAR(150),
  status VARCHAR(20) NOT NULL DEFAULT 'saved'
    CHECK (status IN ('saved','applied','interviewing','offer','rejected','withdrawn')),
  applied_at DATE,
  deadline DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_id, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_user_opportunity
  ON applications(user_id, opportunity_id) WHERE opportunity_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS cv_documents (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL DEFAULT 'My CV',
  content JSONB NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_cv_documents_user ON cv_documents(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS cover_letters (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opportunity_id BIGINT REFERENCES opportunities(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL DEFAULT 'Cover letter',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_cover_letters_user ON cover_letters(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS mock_interviews (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(150) NOT NULL,
  interview_type VARCHAR(30) NOT NULL DEFAULT 'general'
    CHECK (interview_type IN ('general','behavioural','technical','case')),
  questions JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress','completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_mock_interviews_user ON mock_interviews(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS interview_answers (
  id BIGSERIAL PRIMARY KEY,
  interview_id BIGINT NOT NULL REFERENCES mock_interviews(id) ON DELETE CASCADE,
  question_index INTEGER NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  feedback JSONB,
  score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(interview_id, question_index)
);

CREATE TABLE IF NOT EXISTS projects (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  skills VARCHAR(500),
  status VARCHAR(20) NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned','in_progress','completed')),
  repo_url VARCHAR(500),
  live_url VARCHAR(500),
  evidence TEXT,
  evaluation JSONB,
  score INTEGER,
  submitted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS employability_snapshots (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  readiness_score INTEGER,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, snapshot_date)
);
CREATE INDEX IF NOT EXISTS idx_employability_snapshots_user
  ON employability_snapshots(user_id, snapshot_date DESC);

-- ---------------------------------------------------------------------------
-- 004 - Freemium plans, subscriptions, institutions, and plan requests
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

CREATE TABLE IF NOT EXISTS institutions (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  contact_email VARCHAR(200),
  package_code VARCHAR(20) NOT NULL DEFAULT 'small'
    CHECK (package_code IN ('small', 'growing', 'large')),
  seat_limit INTEGER NOT NULL DEFAULT 50 CHECK (seat_limit > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'suspended')),
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

CREATE TABLE IF NOT EXISTS payment_records (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  institution_id BIGINT REFERENCES institutions(id) ON DELETE SET NULL,
  plan_code VARCHAR(30) REFERENCES subscription_plans(code),
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  provider VARCHAR(50),
  provider_reference VARCHAR(200),
  provider_transaction_id VARCHAR(200),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded', 'disputed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_payment_records_user ON payment_records(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_records_reference
  ON payment_records(provider, provider_reference);
CREATE INDEX IF NOT EXISTS idx_payment_records_transaction
  ON payment_records(provider, provider_transaction_id);

INSERT INTO subscription_plans
  (code, name, description, price_cents, currency, billing_interval, rank, features, limits, sort_order)
VALUES
  ('free', 'Free', 'Start exploring careers and build one learning roadmap.', 0, 'USD', 'none', 0,
   '{"career_assessment": true, "career_recommendations": "limited", "skills_gap": "basic", "roadmaps": 1, "opportunities": true, "dashboard": "basic", "mentor": false, "cv_builder": false, "interview_prep": false, "advanced_analytics": false, "project_recommendations": false, "cover_letters": false, "portfolio_review": false, "priority_support": false}'::jsonb,
   '{"career_assessments_per_month": 1, "career_recommendations_per_month": 3, "skills_gap_analyses_per_month": 2, "ai_roadmaps_per_month": 1, "active_roadmaps": 1, "mentor_messages_per_month": 0, "cv_generations_per_month": 0, "cover_letters_per_month": 0, "mock_interviews_per_month": 0, "project_ideas_per_month": 0, "project_evaluations_per_month": 1, "ai_analyses_per_month": 8}'::jsonb,
   0),
  ('plus', 'SkillBridge Plus', 'Unlimited guidance, mentor, CV builder, interviews, and advanced analytics.', 500, 'USD', 'month', 1,
   '{"career_assessment": true, "career_recommendations": true, "skills_gap": "detailed", "roadmaps": "unlimited", "opportunities": true, "dashboard": "advanced", "mentor": true, "cv_builder": true, "interview_prep": true, "advanced_analytics": true, "project_recommendations": false, "cover_letters": false, "portfolio_review": false, "priority_support": false}'::jsonb,
   '{"career_assessments_per_month": 5, "career_recommendations_per_month": 30, "skills_gap_analyses_per_month": 20, "ai_roadmaps_per_month": 20, "active_roadmaps": 20, "mentor_messages_per_month": 300, "cv_generations_per_month": 20, "cover_letters_per_month": 5, "mock_interviews_per_month": 2, "project_ideas_per_month": 10, "project_evaluations_per_month": 20, "ai_analyses_per_month": 150}'::jsonb,
   1),
  ('premium', 'SkillBridge Premium', 'Everything in Plus, plus advanced CV tools, more interviews, projects, and portfolio reviews.', 1000, 'USD', 'month', 2,
   '{"career_assessment": true, "career_recommendations": true, "skills_gap": "detailed", "roadmaps": "unlimited", "opportunities": true, "dashboard": "advanced", "mentor": true, "cv_builder": true, "interview_prep": true, "advanced_analytics": true, "project_recommendations": true, "cover_letters": true, "portfolio_review": true, "priority_support": true}'::jsonb,
   '{"career_assessments_per_month": 20, "career_recommendations_per_month": 100, "skills_gap_analyses_per_month": 100, "ai_roadmaps_per_month": 100, "active_roadmaps": 100, "mentor_messages_per_month": 1000, "cv_generations_per_month": 100, "cover_letters_per_month": 50, "mock_interviews_per_month": 15, "project_ideas_per_month": 100, "project_evaluations_per_month": 100, "ai_analyses_per_month": 500}'::jsonb,
   2),
  ('institution', 'Institution', 'Plan assigned to students and members through a partner institution.', 0, 'USD', 'none', 3,
   '{"career_assessment": true, "career_recommendations": true, "skills_gap": "detailed", "roadmaps": "unlimited", "opportunities": true, "dashboard": "advanced", "mentor": true, "cv_builder": true, "interview_prep": true, "advanced_analytics": true, "project_recommendations": true, "cover_letters": true, "portfolio_review": true, "priority_support": true}'::jsonb,
   '{"career_assessments_per_month": 20, "career_recommendations_per_month": 100, "skills_gap_analyses_per_month": 100, "ai_roadmaps_per_month": 100, "active_roadmaps": 100, "mentor_messages_per_month": 1000, "cv_generations_per_month": 100, "cover_letters_per_month": 50, "mock_interviews_per_month": 15, "project_ideas_per_month": 100, "project_evaluations_per_month": 100, "ai_analyses_per_month": 500}'::jsonb,
   3)
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
