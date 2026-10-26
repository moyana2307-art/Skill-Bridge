-- ============================================================
-- SkillBridge AI - Database schema (MySQL 8.4)
-- Run as the MySQL root user:
--   mysql -u root < backend/sql/schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS skillbridge_ai
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE skillbridge_ai;

-- 1. users: login accounts only. Passwords are stored as bcrypt hashes,
--    never as plain text. Email must be unique.
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

-- 2. user_profiles: optional personal details, one row per user.
--    Created after registration, edited from the profile page.
CREATE TABLE IF NOT EXISTS user_profiles (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  education_level VARCHAR(100) DEFAULT NULL,
  work_experience TEXT DEFAULT NULL,
  career_interests VARCHAR(500) DEFAULT NULL,
  location VARCHAR(100) DEFAULT NULL,
  learning_preferences VARCHAR(500) DEFAULT NULL,
  avatar_data MEDIUMBLOB DEFAULT NULL,
  avatar_mime VARCHAR(30) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_profiles_user (user_id),
  CONSTRAINT fk_user_profiles_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. skills: shared catalogue of skills users can choose from.
--    Seeded by backend/sql/seed.sql.
CREATE TABLE IF NOT EXISTS skills (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(100) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_skills_name (name)
) ENGINE=InnoDB;

-- 4. user_skills: which skills each user has, and how strong they are.
--    One row per user-skill pair (no duplicates).
CREATE TABLE IF NOT EXISTS user_skills (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  skill_id INT UNSIGNED NOT NULL,
  proficiency ENUM('beginner', 'intermediate', 'advanced')
    NOT NULL DEFAULT 'beginner',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_skills (user_id, skill_id),
  CONSTRAINT fk_user_skills_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_user_skills_skill
    FOREIGN KEY (skill_id) REFERENCES skills (id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. career_goals: the career a user is working towards.
--    A user may have several; one is marked 'active' at a time.
CREATE TABLE IF NOT EXISTS career_goals (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  career_title VARCHAR(150) NOT NULL,
  status ENUM('active', 'completed', 'archived')
    NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_career_goals_user (user_id),
  CONSTRAINT fk_career_goals_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. learning_roadmaps: AI-generated (or manual) study plans.
--    Linked to the career goal they were created for (optional).
CREATE TABLE IF NOT EXISTS learning_roadmaps (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  career_goal_id INT UNSIGNED DEFAULT NULL,
  title VARCHAR(200) NOT NULL,
  summary TEXT DEFAULT NULL,
  status ENUM('active', 'completed', 'archived')
    NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_learning_roadmaps_user (user_id),
  CONSTRAINT fk_learning_roadmaps_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_learning_roadmaps_goal
    FOREIGN KEY (career_goal_id) REFERENCES career_goals (id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- 7. roadmap_tasks: individual steps inside a roadmap.
--    The status column drives the progress percentage shown to the user.
CREATE TABLE IF NOT EXISTS roadmap_tasks (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  roadmap_id INT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT DEFAULT NULL,
  skills_to_develop VARCHAR(500) DEFAULT NULL,
  learning_activities TEXT DEFAULT NULL,
  practical_project TEXT DEFAULT NULL,
  resources TEXT DEFAULT NULL,
  estimated_duration VARCHAR(100) DEFAULT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  status ENUM('not_started', 'in_progress', 'completed')
    NOT NULL DEFAULT 'not_started',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_roadmap_tasks_roadmap (roadmap_id),
  CONSTRAINT fk_roadmap_tasks_roadmap
    FOREIGN KEY (roadmap_id) REFERENCES learning_roadmaps (id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- 8. opportunities: jobs, internships, scholarships, training, courses.
--    Real records imported from public APIs or entered by an admin. The
--    (source_name, external_id) unique key makes repeated syncs idempotent.
CREATE TABLE IF NOT EXISTS opportunities (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  organisation VARCHAR(150) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  opportunity_type ENUM('job', 'internship', 'scholarship', 'training', 'course')
    NOT NULL,
  required_skills VARCHAR(500) DEFAULT NULL,
  location VARCHAR(150) DEFAULT NULL,
  is_remote TINYINT(1) NOT NULL DEFAULT 0,
  eligibility TEXT DEFAULT NULL,
  application_deadline DATE DEFAULT NULL,
  application_url VARCHAR(500) DEFAULT NULL,
  source_name VARCHAR(150) DEFAULT NULL,
  external_id VARCHAR(200) DEFAULT NULL,
  last_synced_at TIMESTAMP NULL DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_opportunities_source_external (source_name, external_id),
  KEY idx_opportunities_type (opportunity_type),
  KEY idx_opportunities_active (is_active)
) ENGINE=InnoDB;

-- 9. saved_opportunities: a user's bookmarked opportunities.
--    The unique key prevents saving the same item twice.
CREATE TABLE IF NOT EXISTS saved_opportunities (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  opportunity_id INT UNSIGNED NOT NULL,
  saved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_saved_opportunities (user_id, opportunity_id),
  CONSTRAINT fk_saved_opportunities_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_saved_opportunities_opportunity
    FOREIGN KEY (opportunity_id) REFERENCES opportunities (id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- 10. user_progress: history of roadmap task status changes.
--     Overall percentages are calculated from roadmap_tasks (single
--     source of truth); this log lets us show progress over time.
CREATE TABLE IF NOT EXISTS user_progress (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  roadmap_task_id INT UNSIGNED NOT NULL,
  previous_status VARCHAR(20) DEFAULT NULL,
  new_status VARCHAR(20) NOT NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_progress_user (user_id),
  CONSTRAINT fk_user_progress_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_user_progress_task
    FOREIGN KEY (roadmap_task_id) REFERENCES roadmap_tasks (id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- 11. ai_analyses: saved AI results so users can revisit their latest
--     skills-gap analysis, opportunity insight, or profile review.
CREATE TABLE IF NOT EXISTS ai_analyses (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  analysis_type VARCHAR(50) NOT NULL,
  career_goal_id INT UNSIGNED DEFAULT NULL,
  opportunity_id INT UNSIGNED DEFAULT NULL,
  model VARCHAR(100) DEFAULT NULL,
  payload JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ai_analyses_user_type (user_id, analysis_type, created_at),
  CONSTRAINT fk_ai_analyses_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_ai_analyses_goal
    FOREIGN KEY (career_goal_id) REFERENCES career_goals (id)
    ON DELETE SET NULL,
  CONSTRAINT fk_ai_analyses_opportunity
    FOREIGN KEY (opportunity_id) REFERENCES opportunities (id)
    ON DELETE CASCADE
) ENGINE=InnoDB;
