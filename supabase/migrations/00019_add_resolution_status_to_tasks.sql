-- 00019_add_resolution_status_to_tasks.sql
-- Adds resolution_status, parts_required, and follow_up_date to tasks table

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS resolution_status TEXT,
  ADD COLUMN IF NOT EXISTS parts_required    TEXT,
  ADD COLUMN IF NOT EXISTS follow_up_date    DATE;

CREATE INDEX IF NOT EXISTS idx_tasks_resolution_status ON tasks (resolution_status);
