
-- ================================================================
-- MASTER DATA: single generic table for all 40+ lookup types
-- ================================================================
CREATE TABLE master_data (
  id           text PRIMARY KEY DEFAULT ('md_' || gen_random_uuid()::text),
  master_type  text NOT NULL,           -- e.g. 'brand', 'department', 'location'
  value        text NOT NULL,
  code         text,                    -- optional short code
  parent_id    text REFERENCES master_data(id) ON DELETE SET NULL,
  sort_order   integer NOT NULL DEFAULT 0,
  is_active    boolean NOT NULL DEFAULT true,
  metadata     jsonb,                   -- extra fields (colour, url, etc.)
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  created_by   text NOT NULL DEFAULT '',
  UNIQUE (master_type, value)
);
CREATE INDEX idx_master_data_type       ON master_data(master_type);
CREATE INDEX idx_master_data_type_active ON master_data(master_type, is_active);
CREATE INDEX idx_master_data_parent     ON master_data(parent_id);

-- ================================================================
-- ASSET CUSTOM FIELD DEFINITIONS (per category)
-- ================================================================
CREATE TABLE asset_custom_fields (
  id            text PRIMARY KEY DEFAULT ('acf_' || gen_random_uuid()::text),
  category      text NOT NULL,          -- e.g. 'Firewall', 'Medical Device'
  field_key     text NOT NULL,
  field_label   text NOT NULL,
  field_type    text NOT NULL DEFAULT 'text',  -- text|number|date|select|boolean
  field_options jsonb,                  -- array of options for select type
  is_required   boolean NOT NULL DEFAULT false,
  sort_order    integer NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category, field_key)
);
CREATE INDEX idx_acf_category ON asset_custom_fields(category, is_active);

-- ================================================================
-- RECYCLE BIN — soft-delete store for assets, customers, tasks
-- ================================================================
CREATE TABLE recycle_bin (
  id           text PRIMARY KEY DEFAULT ('rb_' || gen_random_uuid()::text),
  entity_type  text NOT NULL,   -- 'asset' | 'customer' | 'task'
  entity_id    text NOT NULL,
  entity_code  text,
  entity_name  text,
  snapshot     jsonb NOT NULL,  -- full row at delete time
  deleted_by   text NOT NULL,
  deleted_at   timestamptz NOT NULL DEFAULT now(),
  delete_reason text,
  restored_at  timestamptz,
  restored_by  text,
  UNIQUE (entity_type, entity_id)
);
CREATE INDEX idx_rb_entity_type ON recycle_bin(entity_type, deleted_at DESC);

-- ================================================================
-- EXTEND assets TABLE
-- ================================================================
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS deleted_at     timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by     text,
  ADD COLUMN IF NOT EXISTS delete_reason  text,
  ADD COLUMN IF NOT EXISTS assigned_user  text,
  ADD COLUMN IF NOT EXISTS custom_fields  jsonb,
  ADD COLUMN IF NOT EXISTS warranty_start date,
  ADD COLUMN IF NOT EXISTS department     text,
  ADD COLUMN IF NOT EXISTS username       text,
  ADD COLUMN IF NOT EXISTS password       text,
  ADD COLUMN IF NOT EXISTS asset_number   text;

-- ================================================================
-- RLS
-- ================================================================
ALTER TABLE master_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE recycle_bin ENABLE ROW LEVEL SECURITY;

-- master_data: anyone can read active; only authenticated can mutate
CREATE POLICY "anon_select_master_data"    ON master_data FOR SELECT USING (true);
CREATE POLICY "anon_insert_master_data"    ON master_data FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_master_data"    ON master_data FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_master_data"    ON master_data FOR DELETE USING (true);

CREATE POLICY "anon_select_acf"            ON asset_custom_fields FOR SELECT USING (true);
CREATE POLICY "anon_insert_acf"            ON asset_custom_fields FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_acf"            ON asset_custom_fields FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_acf"            ON asset_custom_fields FOR DELETE USING (true);

CREATE POLICY "anon_select_recycle_bin"    ON recycle_bin FOR SELECT USING (true);
CREATE POLICY "anon_insert_recycle_bin"    ON recycle_bin FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_recycle_bin"    ON recycle_bin FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_recycle_bin"    ON recycle_bin FOR DELETE USING (true);
