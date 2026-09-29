
-- FK: tasks.customer_id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'tasks' AND constraint_name = 'tasks_customer_id_fkey'
  ) THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- FK: tasks.engineer_id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'tasks' AND constraint_name = 'tasks_engineer_id_fkey'
  ) THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_engineer_id_fkey
      FOREIGN KEY (engineer_id) REFERENCES engineer_profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Missing performance indexes
CREATE INDEX IF NOT EXISTS idx_app_users_email       ON app_users(email);
CREATE INDEX IF NOT EXISTS idx_tasks_task_type        ON tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_amc_documents_amc_id   ON amc_documents(amc_id);
CREATE INDEX IF NOT EXISTS idx_amc_renewals_amc_id    ON amc_renewals(amc_id);
CREATE INDEX IF NOT EXISTS idx_amc_timeline_amc_id    ON amc_timeline(amc_id);
CREATE INDEX IF NOT EXISTS idx_task_documents_task_id ON task_documents(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_task_id  ON task_activity(task_id);
CREATE INDEX IF NOT EXISTS idx_task_timeline_task_id  ON task_timeline(task_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp   ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id     ON audit_logs(user_id);

-- Remove duplicate indexes (same column, redundant names)
DROP INDEX IF EXISTS idx_assets_customer;
DROP INDEX IF EXISTS idx_tasks_customer;
DROP INDEX IF EXISTS idx_tasks_engineer;
