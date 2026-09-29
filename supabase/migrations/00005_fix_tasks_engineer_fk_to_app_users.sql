
-- Drop the broken FK that points to engineer_profiles
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_engineer_id_fkey;

-- Re-add it pointing to app_users(id) — the correct table the app actually uses
ALTER TABLE tasks
  ADD CONSTRAINT tasks_engineer_id_fkey
  FOREIGN KEY (engineer_id) REFERENCES app_users(id) ON DELETE SET NULL;
