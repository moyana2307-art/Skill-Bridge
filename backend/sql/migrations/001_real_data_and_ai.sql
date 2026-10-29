-- SkillBridge AI - Migration 001: real opportunities + AI analyses
-- Run once: psql "$DATABASE_URL" -f backend/sql/migrations/001_real_data_and_ai.sql

ALTER TABLE opportunities DROP COLUMN IF EXISTS is_demo;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS external_id VARCHAR(200);
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS uq_opportunities_source_external
  ON opportunities(source_name, external_id)
  WHERE source_name IS NOT NULL AND external_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS ai_analyses (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  analysis_type VARCHAR(50) NOT NULL,
  career_goal_id BIGINT REFERENCES career_goals(id) ON DELETE SET NULL,
  opportunity_id BIGINT REFERENCES opportunities(id) ON DELETE CASCADE,
  model VARCHAR(100),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_user_type
  ON ai_analyses(user_id, analysis_type, created_at);
