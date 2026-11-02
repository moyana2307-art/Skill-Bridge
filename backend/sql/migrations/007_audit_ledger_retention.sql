-- 007 - Keep audit entries when an administrator account is deleted.
-- admin_audit_logs is append-only, so it must not use ON DELETE SET NULL:
-- that FK action would attempt an UPDATE and hit the immutability trigger.
-- The admin_name snapshot keeps the actor identifiable after deletion.
-- Safe to run on an existing database: idempotent.

ALTER TABLE admin_audit_logs
  DROP CONSTRAINT IF EXISTS admin_audit_logs_admin_user_id_fkey;
