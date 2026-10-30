-- SkillBridge AI - Row Level Security for Supabase
--
-- The API talks to PostgreSQL directly with a trusted server-side role
-- (DATABASE_URL), so the browser never queries Supabase tables directly.
-- This file locks the tables down anyway: direct access from Supabase's
-- anon/authenticated roles is revoked, and the role the API connects as
-- (current_user) keeps full access. The postgres and service_role roles are
-- also granted access when they exist.
--
-- Run AFTER schema.sql and the migrations:
--   psql "$DATABASE_URL" -f backend/sql/rls.sql
--
-- If you deploy the API with a custom database role, connect as that role (or
-- add a policy for it below) before relying on RLS.

DO $$
DECLARE
  table_name text;
  api_role text := current_user;
  tables text[] := ARRAY[
    'users',
    'user_profiles',
    'skills',
    'user_skills',
    'career_goals',
    'learning_roadmaps',
    'roadmap_tasks',
    'opportunities',
    'saved_opportunities',
    'user_progress',
    'ai_analyses',
    'notifications',
    'learning_resources',
    'career_assessments',
    'mentor_threads',
    'mentor_messages',
    'applications',
    'cv_documents',
    'cover_letters',
    'mock_interviews',
    'interview_answers',
    'projects',
    'employability_snapshots',
    'subscription_plans',
    'subscriptions',
    'plan_requests',
    'institutions',
    'institution_members',
    'payment_records'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', table_name || '_api_access', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO %I USING (true) WITH CHECK (true)',
      table_name || '_api_access',
      table_name,
      api_role
    );

    IF api_role <> 'postgres' AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', table_name || '_postgres_access', table_name);
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR ALL TO postgres USING (true) WITH CHECK (true)',
        table_name || '_postgres_access',
        table_name
      );
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', table_name || '_service_access', table_name);
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)',
        table_name || '_service_access',
        table_name
      );
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON %I FROM anon', table_name);
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE format('REVOKE ALL ON %I FROM authenticated', table_name);
    END IF;
  END LOOP;

  -- Sequences are used by BIGSERIAL ids and must be locked down too.
  FOR table_name IN
    SELECT sequence_name FROM information_schema.sequences
    WHERE sequence_schema = 'public'
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON SEQUENCE %I FROM anon', table_name);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE format('REVOKE ALL ON SEQUENCE %I FROM authenticated', table_name);
    END IF;
  END LOOP;
END $$;
