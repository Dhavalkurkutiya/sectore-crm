
-- 1. Add user_id to engineer_profiles (links app_users → engineer_profiles)
ALTER TABLE engineer_profiles
  ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES app_users(id);

-- 2. Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_engineer_profiles_user_id ON engineer_profiles(user_id);

-- 3. Try to auto-link existing records by matching email
UPDATE engineer_profiles ep
SET user_id = au.id
FROM app_users au
WHERE au.email = ep.email
  AND ep.user_id IS NULL;

-- 4. Drop the hard FK on attendance.engineer_id — replace with a soft text FK
--    so that if user_id is passed (before profile exists), it still inserts.
--    We keep data integrity via application-level validation instead.
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_engineer_id_fkey;

-- 5. Also add user_id column to attendance for direct app_users reference
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS app_user_id TEXT;

-- 6. Fix odometer_photos: drop FK on engineer_id if it points to engineer_profiles
ALTER TABLE odometer_photos DROP CONSTRAINT IF EXISTS odometer_photos_engineer_id_fkey;

-- 7. Fix odometer_verifications: drop FK on engineer_id
ALTER TABLE odometer_verifications DROP CONSTRAINT IF EXISTS odometer_verifications_engineer_id_fkey;

-- 8. Fix daily_reports: drop FK on engineer_id
ALTER TABLE daily_reports DROP CONSTRAINT IF EXISTS daily_reports_engineer_id_fkey;

-- 9. Fix fuel_logs: drop FK on engineer_id pointing to engineer_profiles
ALTER TABLE fuel_logs DROP CONSTRAINT IF EXISTS fuel_logs_engineer_id_fkey;

-- 10. Fix bikes: drop FK on assigned_engineer_id pointing to engineer_profiles
ALTER TABLE bikes DROP CONSTRAINT IF EXISTS bikes_assigned_engineer_id_fkey;
