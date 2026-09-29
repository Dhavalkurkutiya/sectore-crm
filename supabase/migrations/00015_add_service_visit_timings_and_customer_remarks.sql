
-- Service visit timings on tasks (Reached Site → Complete Task)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS service_start_time  timestamptz,
  ADD COLUMN IF NOT EXISTS service_end_time    timestamptz,
  ADD COLUMN IF NOT EXISTS site_time_minutes   integer;

-- Customer-editable remarks stored separately for audit trail
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS customer_remarks    text,
  ADD COLUMN IF NOT EXISTS customer_feedback   text;

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_tasks_service_start ON tasks (service_start_time);
