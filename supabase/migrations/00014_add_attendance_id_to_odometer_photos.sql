
ALTER TABLE odometer_photos ADD COLUMN IF NOT EXISTS attendance_id TEXT;
CREATE INDEX IF NOT EXISTS idx_odometer_photos_attendance_id ON odometer_photos(attendance_id);
