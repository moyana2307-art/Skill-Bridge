-- ============================================================
-- SkillBridge AI - Seed data
-- Adds the shared skills catalogue only.
--
-- Opportunities are not seeded with invented records. The backend imports
-- real listings from ReliefWeb and Remotive on startup and every few hours
-- (see OPPORTUNITY_SYNC_* in backend/.env), or an admin can trigger a sync.
--
-- Safe to run more than once: skills use INSERT IGNORE.
-- Run as root AFTER schema.sql:
--   mysql -u root < backend/sql/seed.sql
-- ============================================================

USE skillbridge_ai;

INSERT IGNORE INTO skills (name, category) VALUES
  ('HTML', 'Programming'),
  ('CSS', 'Programming'),
  ('JavaScript', 'Programming'),
  ('React', 'Programming'),
  ('Node.js', 'Programming'),
  ('Python', 'Programming'),
  ('Git', 'Programming'),
  ('SQL', 'Data'),
  ('Data Visualization', 'Data'),
  ('Statistics', 'Data'),
  ('Excel', 'Data'),
  ('UI Design', 'Design'),
  ('UX Research', 'Design'),
  ('Figma', 'Design'),
  ('Graphic Design', 'Design'),
  ('Social Media Marketing', 'Marketing'),
  ('Content Writing', 'Marketing'),
  ('SEO', 'Marketing'),
  ('Email Marketing', 'Marketing'),
  ('Technical Support', 'IT Support'),
  ('Networking Basics', 'IT Support'),
  ('Troubleshooting', 'IT Support'),
  ('Cloud Computing', 'IT Support'),
  ('Communication', 'Professional'),
  ('Teamwork', 'Professional'),
  ('Problem Solving', 'Professional'),
  ('Time Management', 'Professional'),
  ('English Proficiency', 'Professional');
