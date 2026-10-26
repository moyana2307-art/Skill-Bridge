-- ============================================================
-- SkillBridge AI - Migration 002: profile pictures
--
-- Run once against an existing database:
--   Get-Content backend\sql\migrations\002_profile_avatar.sql |
--     & "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" -u root -p
--
-- Avatar images are stored in MySQL so they survive backend restarts and
-- redeploys. The frontend compresses uploads before sending them, and the
-- backend accepts only JPEG, PNG, or WebP data up to 2 MB.
-- This migration is safe to run more than once.
-- ============================================================

USE skillbridge_ai;

DROP PROCEDURE IF EXISTS skillbridge_migrate_002;

DELIMITER //

CREATE PROCEDURE skillbridge_migrate_002()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'user_profiles'
      AND COLUMN_NAME = 'avatar_data'
  ) THEN
    ALTER TABLE user_profiles
      ADD COLUMN avatar_data MEDIUMBLOB DEFAULT NULL AFTER learning_preferences;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'user_profiles'
      AND COLUMN_NAME = 'avatar_mime'
  ) THEN
    ALTER TABLE user_profiles
      ADD COLUMN avatar_mime VARCHAR(30) DEFAULT NULL AFTER avatar_data;
  END IF;
END//

DELIMITER ;

CALL skillbridge_migrate_002();
DROP PROCEDURE IF EXISTS skillbridge_migrate_002;
