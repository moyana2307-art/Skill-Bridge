-- ============================================================
-- SkillBridge AI - Migration 001: real opportunities + AI analyses
--
-- Run once against an existing database:
--   Get-Content backend\sql\migrations\001_real_data_and_ai.sql |
--     & "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" -u root -p
--
-- This migration:
--   1. Deletes the old demo opportunity rows.
--   2. Removes the is_demo column.
--   3. Adds external_id and last_synced_at for live API syncs.
--   4. Adds the ai_analyses table.
-- It is safe to run more than once.
-- ============================================================

USE skillbridge_ai;

DROP PROCEDURE IF EXISTS skillbridge_migrate_001;

DELIMITER //

CREATE PROCEDURE skillbridge_migrate_001()
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'opportunities'
      AND COLUMN_NAME = 'is_demo'
  ) THEN
    DELETE FROM opportunities WHERE is_demo = 1;
    ALTER TABLE opportunities DROP COLUMN is_demo;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'opportunities'
      AND COLUMN_NAME = 'external_id'
  ) THEN
    ALTER TABLE opportunities
      ADD COLUMN external_id VARCHAR(200) DEFAULT NULL AFTER source_name;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'opportunities'
      AND COLUMN_NAME = 'last_synced_at'
  ) THEN
    ALTER TABLE opportunities
      ADD COLUMN last_synced_at TIMESTAMP NULL DEFAULT NULL AFTER external_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'opportunities'
      AND INDEX_NAME = 'uq_opportunities_source_external'
  ) THEN
    ALTER TABLE opportunities
      ADD UNIQUE KEY uq_opportunities_source_external (source_name, external_id);
  END IF;

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
END//

DELIMITER ;

CALL skillbridge_migrate_001();
DROP PROCEDURE skillbridge_migrate_001;
