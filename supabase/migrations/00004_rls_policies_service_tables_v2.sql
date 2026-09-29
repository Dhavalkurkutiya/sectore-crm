
-- Use app_users (the actual users table)
-- attendance
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "attendance_select" ON attendance;
DROP POLICY IF EXISTS "attendance_insert" ON attendance;
DROP POLICY IF EXISTS "attendance_update" ON attendance;
CREATE POLICY "attendance_select" ON attendance FOR SELECT
  USING (EXISTS (SELECT 1 FROM app_users u WHERE u.id = (current_setting('request.jwt.claims',true)::jsonb->>'sub') AND u.status='Active'));
CREATE POLICY "attendance_insert" ON attendance FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM app_users u WHERE u.id = (current_setting('request.jwt.claims',true)::jsonb->>'sub') AND u.status='Active'));
CREATE POLICY "attendance_update" ON attendance FOR UPDATE
  USING (EXISTS (SELECT 1 FROM app_users u WHERE u.id = (current_setting('request.jwt.claims',true)::jsonb->>'sub') AND u.status='Active'));

-- fuel_logs
ALTER TABLE fuel_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fuel_logs_select" ON fuel_logs;
DROP POLICY IF EXISTS "fuel_logs_insert" ON fuel_logs;
CREATE POLICY "fuel_logs_select" ON fuel_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM app_users u WHERE u.id = (current_setting('request.jwt.claims',true)::jsonb->>'sub') AND u.status='Active'));
CREATE POLICY "fuel_logs_insert" ON fuel_logs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM app_users u WHERE u.id = (current_setting('request.jwt.claims',true)::jsonb->>'sub') AND u.status='Active'));

-- parts_used
ALTER TABLE parts_used ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "parts_used_select" ON parts_used;
DROP POLICY IF EXISTS "parts_used_insert" ON parts_used;
DROP POLICY IF EXISTS "parts_used_delete" ON parts_used;
CREATE POLICY "parts_used_select" ON parts_used FOR SELECT
  USING (EXISTS (SELECT 1 FROM app_users u WHERE u.id = (current_setting('request.jwt.claims',true)::jsonb->>'sub') AND u.status='Active'));
CREATE POLICY "parts_used_insert" ON parts_used FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM app_users u WHERE u.id = (current_setting('request.jwt.claims',true)::jsonb->>'sub') AND u.status='Active'));
CREATE POLICY "parts_used_delete" ON parts_used FOR DELETE
  USING (EXISTS (SELECT 1 FROM app_users u WHERE u.id = (current_setting('request.jwt.claims',true)::jsonb->>'sub') AND u.role IN ('admin','manager')));

-- entity_timeline
ALTER TABLE entity_timeline ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "entity_timeline_select" ON entity_timeline;
DROP POLICY IF EXISTS "entity_timeline_insert" ON entity_timeline;
CREATE POLICY "entity_timeline_select" ON entity_timeline FOR SELECT
  USING (EXISTS (SELECT 1 FROM app_users u WHERE u.id = (current_setting('request.jwt.claims',true)::jsonb->>'sub') AND u.status='Active'));
CREATE POLICY "entity_timeline_insert" ON entity_timeline FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM app_users u WHERE u.id = (current_setting('request.jwt.claims',true)::jsonb->>'sub') AND u.status='Active'));

-- customer_documents
ALTER TABLE customer_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customer_documents_select" ON customer_documents;
DROP POLICY IF EXISTS "customer_documents_insert" ON customer_documents;
DROP POLICY IF EXISTS "customer_documents_delete" ON customer_documents;
CREATE POLICY "customer_documents_select" ON customer_documents FOR SELECT
  USING (EXISTS (SELECT 1 FROM app_users u WHERE u.id = (current_setting('request.jwt.claims',true)::jsonb->>'sub') AND u.status='Active'));
CREATE POLICY "customer_documents_insert" ON customer_documents FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM app_users u WHERE u.id = (current_setting('request.jwt.claims',true)::jsonb->>'sub') AND u.status='Active'));
CREATE POLICY "customer_documents_delete" ON customer_documents FOR DELETE
  USING (EXISTS (SELECT 1 FROM app_users u WHERE u.id = (current_setting('request.jwt.claims',true)::jsonb->>'sub') AND u.role IN ('admin','manager')));

-- engineer_profiles
ALTER TABLE engineer_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "engineer_profiles_select" ON engineer_profiles;
CREATE POLICY "engineer_profiles_select" ON engineer_profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM app_users u WHERE u.id = (current_setting('request.jwt.claims',true)::jsonb->>'sub') AND u.status='Active'));

-- bikes
ALTER TABLE bikes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bikes_select" ON bikes;
CREATE POLICY "bikes_select" ON bikes FOR SELECT
  USING (EXISTS (SELECT 1 FROM app_users u WHERE u.id = (current_setting('request.jwt.claims',true)::jsonb->>'sub') AND u.status='Active'));
