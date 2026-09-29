
-- ============================================================
-- 1. FIX ATTENDANCE RLS
-- The app uses a custom JWT (not Supabase Auth). The token is
-- stored in localStorage but never passed to Supabase as an
-- Authorization header, so auth.uid() is always NULL.
-- Strategy: drop conflicting policies, keep the permissive
-- anon policies so inserts/updates work, add row-ownership
-- guard at the application layer (engineer_id check in service).
-- ============================================================

-- Drop all attendance policies and replace with clean ones
DROP POLICY IF EXISTS anon_delete_attendance    ON attendance;
DROP POLICY IF EXISTS anon_insert_attendance    ON attendance;
DROP POLICY IF EXISTS anon_select_attendance    ON attendance;
DROP POLICY IF EXISTS anon_update_attendance    ON attendance;
DROP POLICY IF EXISTS attendance_insert         ON attendance;
DROP POLICY IF EXISTS attendance_select         ON attendance;
DROP POLICY IF EXISTS attendance_update         ON attendance;

-- Allow all operations via anon key (app controls access by engineer_id in queries)
CREATE POLICY attendance_anon_select ON attendance FOR SELECT USING (true);
CREATE POLICY attendance_anon_insert ON attendance FOR INSERT WITH CHECK (true);
CREATE POLICY attendance_anon_update ON attendance FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY attendance_anon_delete ON attendance FOR DELETE USING (true);

-- ============================================================
-- 2. ADD user_id column to attendance (for future Supabase Auth)
-- ============================================================
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS user_id text;

-- ============================================================
-- 3. FIX BIKES TABLE — add missing columns
-- ============================================================
ALTER TABLE bikes ADD COLUMN IF NOT EXISTS initial_odometer    numeric  NOT NULL DEFAULT 0;
ALTER TABLE bikes ADD COLUMN IF NOT EXISTS average_mileage     numeric  NOT NULL DEFAULT 0;
ALTER TABLE bikes ADD COLUMN IF NOT EXISTS puc_expiry_date     date;
ALTER TABLE bikes ADD COLUMN IF NOT EXISTS current_odometer    numeric  NOT NULL DEFAULT 0;
ALTER TABLE bikes ADD COLUMN IF NOT EXISTS assigned_engineer_name text;

-- Drop and replace bike policies
DROP POLICY IF EXISTS anon_delete_bikes   ON bikes;
DROP POLICY IF EXISTS anon_insert_bikes   ON bikes;
DROP POLICY IF EXISTS anon_select_bikes   ON bikes;
DROP POLICY IF EXISTS anon_update_bikes   ON bikes;
DROP POLICY IF EXISTS bikes_select        ON bikes;
DROP POLICY IF EXISTS bikes_insert        ON bikes;
DROP POLICY IF EXISTS bikes_update        ON bikes;
DROP POLICY IF EXISTS bikes_delete        ON bikes;

CREATE POLICY bikes_anon_select ON bikes FOR SELECT USING (true);
CREATE POLICY bikes_anon_insert ON bikes FOR INSERT WITH CHECK (true);
CREATE POLICY bikes_anon_update ON bikes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY bikes_anon_delete ON bikes FOR DELETE USING (true);

-- ============================================================
-- 4. FIX FUEL_LOGS — add missing admin-model columns
-- ============================================================
ALTER TABLE fuel_logs ADD COLUMN IF NOT EXISTS invoice_number  text;
ALTER TABLE fuel_logs ADD COLUMN IF NOT EXISTS mileage         numeric;
ALTER TABLE fuel_logs ADD COLUMN IF NOT EXISTS fuel_cost_per_km numeric;
ALTER TABLE fuel_logs ADD COLUMN IF NOT EXISTS bike_id_ref     text;
ALTER TABLE fuel_logs ADD COLUMN IF NOT EXISTS added_by_admin  text;
ALTER TABLE fuel_logs ADD COLUMN IF NOT EXISTS updated_at      timestamptz DEFAULT now();

-- Drop and replace fuel_logs policies
DROP POLICY IF EXISTS anon_delete_fuel_logs  ON fuel_logs;
DROP POLICY IF EXISTS anon_insert_fuel_logs  ON fuel_logs;
DROP POLICY IF EXISTS anon_select_fuel_logs  ON fuel_logs;
DROP POLICY IF EXISTS anon_update_fuel_logs  ON fuel_logs;
DROP POLICY IF EXISTS fuel_logs_insert       ON fuel_logs;
DROP POLICY IF EXISTS fuel_logs_select       ON fuel_logs;
DROP POLICY IF EXISTS fuel_logs_update       ON fuel_logs;
DROP POLICY IF EXISTS fuel_logs_delete       ON fuel_logs;

CREATE POLICY fuel_logs_anon_select ON fuel_logs FOR SELECT USING (true);
CREATE POLICY fuel_logs_anon_insert ON fuel_logs FOR INSERT WITH CHECK (true);
CREATE POLICY fuel_logs_anon_update ON fuel_logs FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY fuel_logs_anon_delete ON fuel_logs FOR DELETE USING (true);

-- ============================================================
-- 5. CREATE odometer_photos TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS odometer_photos (
  id               text        NOT NULL DEFAULT ('odo_' || gen_random_uuid()::text) PRIMARY KEY,
  engineer_id      text        NOT NULL,
  engineer_name    text        NOT NULL DEFAULT '',
  bike_id          text,
  date             date        NOT NULL DEFAULT CURRENT_DATE,
  photo_type       text        NOT NULL CHECK (photo_type IN ('morning', 'evening')),
  photo_url        text        NOT NULL,
  gps_lat          numeric,
  gps_lng          numeric,
  captured_at      timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (engineer_id, date, photo_type)
);

ALTER TABLE odometer_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY odo_photos_anon_select ON odometer_photos FOR SELECT USING (true);
CREATE POLICY odo_photos_anon_insert ON odometer_photos FOR INSERT WITH CHECK (true);
CREATE POLICY odo_photos_anon_update ON odometer_photos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY odo_photos_anon_delete ON odometer_photos FOR DELETE USING (true);

-- ============================================================
-- 6. CREATE odometer_verifications TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS odometer_verifications (
  id                   text        NOT NULL DEFAULT ('odv_' || gen_random_uuid()::text) PRIMARY KEY,
  engineer_id          text        NOT NULL,
  engineer_name        text        NOT NULL DEFAULT '',
  bike_id              text,
  date                 date        NOT NULL DEFAULT CURRENT_DATE,
  morning_photo_id     text,
  evening_photo_id     text,
  morning_reading      numeric,
  evening_reading      numeric,
  km_travelled         numeric GENERATED ALWAYS AS (
                         CASE WHEN evening_reading IS NOT NULL AND morning_reading IS NOT NULL
                              THEN evening_reading - morning_reading ELSE NULL END
                       ) STORED,
  verified_by          text,
  verified_at          timestamptz,
  status               text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified')),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (engineer_id, date)
);

ALTER TABLE odometer_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY odv_anon_select ON odometer_verifications FOR SELECT USING (true);
CREATE POLICY odv_anon_insert ON odometer_verifications FOR INSERT WITH CHECK (true);
CREATE POLICY odv_anon_update ON odometer_verifications FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY odv_anon_delete ON odometer_verifications FOR DELETE USING (true);

-- ============================================================
-- 7. CREATE daily_reports TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_reports (
  id                    text        NOT NULL DEFAULT ('dr_' || gen_random_uuid()::text) PRIMARY KEY,
  engineer_id           text        NOT NULL,
  engineer_name         text        NOT NULL DEFAULT '',
  attendance_id         text,
  date                  date        NOT NULL DEFAULT CURRENT_DATE,
  parts_required        text,
  customer_followup     text,
  issues_faced          text,
  tomorrow_priority     text,
  remarks               text,
  site_photo_urls       text[]      DEFAULT '{}',
  bill_urls             text[]      DEFAULT '{}',
  document_urls         text[]      DEFAULT '{}',
  status                text        NOT NULL DEFAULT 'submitted'
                           CHECK (status IN ('submitted','approved','sent_back')),
  admin_notes           text,
  reviewed_by           text,
  reviewed_at           timestamptz,
  submitted_at          timestamptz NOT NULL DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (engineer_id, date)
);

ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY dr_anon_select ON daily_reports FOR SELECT USING (true);
CREATE POLICY dr_anon_insert ON daily_reports FOR INSERT WITH CHECK (true);
CREATE POLICY dr_anon_update ON daily_reports FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY dr_anon_delete ON daily_reports FOR DELETE USING (true);

-- ============================================================
-- 8. CREATE storage buckets via SQL (if not exists)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('odometer-photos', 'odometer-photos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('daily-report-files', 'daily-report-files', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('fuel-bills', 'fuel-bills', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for odometer-photos
DROP POLICY IF EXISTS "odometer_photos_select" ON storage.objects;
DROP POLICY IF EXISTS "odometer_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "odometer_photos_update" ON storage.objects;
DROP POLICY IF EXISTS "odometer_photos_delete" ON storage.objects;

CREATE POLICY "storage_public_select"  ON storage.objects FOR SELECT USING (true);
CREATE POLICY "storage_public_insert"  ON storage.objects FOR INSERT WITH CHECK (true);
CREATE POLICY "storage_public_update"  ON storage.objects FOR UPDATE USING (true);
CREATE POLICY "storage_public_delete"  ON storage.objects FOR DELETE USING (true);
