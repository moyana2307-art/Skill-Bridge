-- 003 - Career intelligence, mentoring, career studio, projects, portfolio,
-- applications, notifications, learning resources, and employability tracking.
-- Safe to run on an existing database: every statement is idempotent.

-- ---------------------------------------------------------------------------
-- Portfolio settings live on the profile so a public portfolio can be shared.
-- ---------------------------------------------------------------------------
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS portfolio_slug VARCHAR(80);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS portfolio_headline VARCHAR(200);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS portfolio_about TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS portfolio_public BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_portfolio_slug
  ON user_profiles(portfolio_slug) WHERE portfolio_slug IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Learning resource catalogue (admin managed, shown with roadmaps)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Career assessments and saved career intelligence results
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- AI career mentor conversations
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Opportunity application tracking
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- CV and cover letter studio
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Mock interviews
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Practical projects and digital portfolio
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Employability snapshots (one per user per day for trend charts)
-- ---------------------------------------------------------------------------
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
