
-- =====================================================================
-- SECTORE 360 — INCREMENTAL MIGRATION v2
-- =====================================================================

-- application_config
CREATE TABLE IF NOT EXISTS public.application_config (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  group_name text NOT NULL DEFAULT 'general',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.application_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cfg_all_anon" ON public.application_config;
CREATE POLICY "cfg_all_anon" ON public.application_config FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "cfg_all_auth" ON public.application_config;
CREATE POLICY "cfg_all_auth" ON public.application_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
INSERT INTO public.application_config (key, value, group_name) VALUES
  ('setup_completed', 'false', 'setup'),
  ('app_version', '"1.0.0"', 'system'),
  ('session_timeout_minutes', '480', 'security'),
  ('password_min_length', '8', 'security')
ON CONFLICT (key) DO NOTHING;

-- notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id          text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     text REFERENCES public.app_users(id) ON DELETE CASCADE,
  type        text NOT NULL DEFAULT 'General',
  title       text NOT NULL,
  message     text NOT NULL,
  is_read     boolean NOT NULL DEFAULT false,
  link        text,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notif_all_anon" ON public.notifications;
CREATE POLICY "notif_all_anon" ON public.notifications FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "notif_all_auth" ON public.notifications;
CREATE POLICY "notif_all_auth" ON public.notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- attachments
CREATE TABLE IF NOT EXISTS public.attachments (
  id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  entity_type   text NOT NULL,
  entity_id     text NOT NULL,
  file_name     text NOT NULL,
  file_type     text,
  file_size     bigint,
  storage_path  text NOT NULL,
  public_url    text,
  category      text,
  uploaded_by   text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "att_all_anon" ON public.attachments;
CREATE POLICY "att_all_anon" ON public.attachments FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "att_all_auth" ON public.attachments;
CREATE POLICY "att_all_auth" ON public.attachments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- reports
CREATE TABLE IF NOT EXISTS public.reports (
  id           text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  report_type  text NOT NULL,
  title        text NOT NULL,
  parameters   jsonb NOT NULL DEFAULT '{}',
  storage_path text,
  generated_by text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rpt_all_anon" ON public.reports;
CREATE POLICY "rpt_all_anon" ON public.reports FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "rpt_all_auth" ON public.reports;
CREATE POLICY "rpt_all_auth" ON public.reports FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- task_checklist
CREATE TABLE IF NOT EXISTS public.task_checklist (
  id         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  task_id    text NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  item_text  text NOT NULL,
  is_done    boolean NOT NULL DEFAULT false,
  done_at    timestamptz,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.task_checklist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tc_all_anon" ON public.task_checklist;
CREATE POLICY "tc_all_anon" ON public.task_checklist FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "tc_all_auth" ON public.task_checklist;
CREATE POLICY "tc_all_auth" ON public.task_checklist FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- task_materials
CREATE TABLE IF NOT EXISTS public.task_materials (
  id          text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  task_id     text NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  part_name   text NOT NULL,
  part_code   text,
  quantity    int NOT NULL DEFAULT 1,
  unit_price  numeric(12,2),
  notes       text,
  added_by    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.task_materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tm_all_anon" ON public.task_materials;
CREATE POLICY "tm_all_anon" ON public.task_materials FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "tm_all_auth" ON public.task_materials;
CREATE POLICY "tm_all_auth" ON public.task_materials FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Missing columns
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.company_profile ADD COLUMN IF NOT EXISTS updated_by text;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_app_users_username   ON public.app_users(username);
CREATE INDEX IF NOT EXISTS idx_app_users_role       ON public.app_users(role);
CREATE INDEX IF NOT EXISTS idx_customers_status     ON public.customers(status);
CREATE INDEX IF NOT EXISTS idx_assets_customer      ON public.assets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tasks_customer       ON public.tasks(customer_id);
CREATE INDEX IF NOT EXISTS idx_tasks_engineer       ON public.tasks(engineer_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status         ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user   ON public.notifications(user_id, is_read);

-- =====================================================================
-- STORAGE BUCKETS
-- =====================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('company-logo',   'company-logo',   true,  5242880,  ARRAY['image/png','image/jpeg','image/webp','image/svg+xml']),
  ('engineer-photo', 'engineer-photo', true,  2097152,  ARRAY['image/png','image/jpeg','image/webp']),
  ('customer-logo',  'customer-logo',  true,  2097152,  ARRAY['image/png','image/jpeg','image/webp']),
  ('task-photo',     'task-photo',     true,  10485760, ARRAY['image/png','image/jpeg','image/webp']),
  ('attachments',    'attachments',    false, 20971520, NULL),
  ('generated-pdf',  'generated-pdf',  false, 20971520, ARRAY['application/pdf']),
  ('signatures',     'signatures',     true,  1048576,  ARRAY['image/png','image/jpeg','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "storage_public_read" ON storage.objects;
CREATE POLICY "storage_public_read" ON storage.objects FOR SELECT TO public
  USING (bucket_id IN ('company-logo','engineer-photo','customer-logo','task-photo','signatures'));
DROP POLICY IF EXISTS "storage_anon_insert" ON storage.objects;
CREATE POLICY "storage_anon_insert" ON storage.objects FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "storage_anon_update" ON storage.objects;
CREATE POLICY "storage_anon_update" ON storage.objects FOR UPDATE TO anon USING (true);
DROP POLICY IF EXISTS "storage_anon_delete" ON storage.objects;
CREATE POLICY "storage_anon_delete" ON storage.objects FOR DELETE TO anon USING (true);

-- =====================================================================
-- EMPLOYEE CODE GENERATOR
-- =====================================================================
CREATE OR REPLACE FUNCTION generate_user_code(p_role text)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_prefix text;
  v_seq    int;
BEGIN
  v_prefix := CASE p_role
    WHEN 'superadmin' THEN 'SA'
    WHEN 'admin'      THEN 'ADM'
    WHEN 'manager'    THEN 'MGR'
    WHEN 'backoffice' THEN 'BO'
    WHEN 'engineer'   THEN 'ENG'
    WHEN 'customer'   THEN 'CUS'
    ELSE 'USR'
  END;
  SELECT COALESCE(MAX(
    CASE WHEN employee_code ~ ('^' || v_prefix || '-[0-9]+$')
    THEN CAST(SUBSTRING(employee_code FROM LENGTH(v_prefix)+2) AS int)
    ELSE 0 END
  ), 0) + 1
  INTO v_seq
  FROM public.app_users;
  RETURN v_prefix || '-' || LPAD(v_seq::text, 4, '0');
END;
$$;

-- =====================================================================
-- CUSTOMER / ASSET / TASK CODE GENERATORS
-- =====================================================================
CREATE SEQUENCE IF NOT EXISTS cust_code_seq START 1;
CREATE SEQUENCE IF NOT EXISTS asset_code_seq START 1;
CREATE SEQUENCE IF NOT EXISTS task_code_seq START 1;
CREATE SEQUENCE IF NOT EXISTS amc_code_seq START 1;

CREATE OR REPLACE FUNCTION next_customer_code() RETURNS text LANGUAGE sql AS $$
  SELECT 'CUST-' || LPAD(nextval('cust_code_seq')::text, 6, '0');
$$;
CREATE OR REPLACE FUNCTION next_asset_code() RETURNS text LANGUAGE sql AS $$
  SELECT 'ASSET-' || LPAD(nextval('asset_code_seq')::text, 6, '0');
$$;
CREATE OR REPLACE FUNCTION next_task_number() RETURNS text LANGUAGE sql AS $$
  SELECT 'TASK-' || LPAD(nextval('task_code_seq')::text, 6, '0');
$$;
CREATE OR REPLACE FUNCTION next_amc_number() RETURNS text LANGUAGE sql AS $$
  SELECT 'AMC-' || LPAD(nextval('amc_code_seq')::text, 6, '0');
$$;

-- Ensure company_profile has at least one row
INSERT INTO public.company_profile (id, name, tagline, business_line, footer_text, address, contact_person, primary_phone)
SELECT gen_random_uuid()::text, 'Sectore Tecknologies', 'Securing Today. Powering Tomorrow.',
  'Computers • Servers • Storage • CCTV • Networking • Firewalls • Cloud • AMC',
  'Design • Deploy • Secure • Support',
  E'F/29, 1st Floor, KSB Olympia,\nOpp. Kailash Nagar BRTS Station,\nBamroli Althan Road, Pandesara,\nSurat, Gujarat – 394221',
  'Manoharlal L Seervi', '9019987991'
WHERE NOT EXISTS (SELECT 1 FROM public.company_profile);
