-- ============================================================
-- SkillBridge AI - Migration 002: profile pictures
--
-- Run once against an existing database:
--   Get-Content backend\sql\migrations\002_profile_avatar.sql |
--     psql "$DATABASE_URL" -f backend/sql/migrations/002_profile_avatar.sql
--
-- Avatar images are stored in PostgreSQL/BYTEA so they survive backend restarts and
-- redeploys. The frontend compresses uploads before sending them, and the
-- backend accepts only JPEG, PNG, or WebP data up to 2 MB.
-- This migration is safe to run more than once.
-- ============================================================

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_data BYTEA;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_mime VARCHAR(30);
