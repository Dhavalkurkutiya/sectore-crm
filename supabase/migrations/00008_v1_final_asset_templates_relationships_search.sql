
-- =====================================================================
-- 1. ASSET TEMPLATES
-- =====================================================================
CREATE TABLE IF NOT EXISTS asset_templates (
  id            text PRIMARY KEY DEFAULT 'at_' || gen_random_uuid(),
  name          text NOT NULL,
  category      text NOT NULL,
  device_type   text NOT NULL,
  brand         text,
  model         text,
  specifications jsonb DEFAULT '{}',
  custom_fields  jsonb DEFAULT '{}',
  notes          text,
  is_active      boolean NOT NULL DEFAULT true,
  sort_order     integer NOT NULL DEFAULT 0,
  created_by     text NOT NULL DEFAULT 'system',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE asset_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "asset_templates_read" ON asset_templates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "asset_templates_write" ON asset_templates
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "asset_templates_update" ON asset_templates
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "asset_templates_delete" ON asset_templates
  FOR DELETE TO authenticated USING (true);

-- =====================================================================
-- 2. ASSET RELATIONSHIPS (parent-child)
-- =====================================================================
CREATE TABLE IF NOT EXISTS asset_relationships (
  id            text PRIMARY KEY DEFAULT 'ar_' || gen_random_uuid(),
  parent_id     text NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  child_id      text NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  relationship  text NOT NULL DEFAULT 'child',
  created_by    text NOT NULL DEFAULT 'system',
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(parent_id, child_id)
);

ALTER TABLE asset_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "asset_rel_read" ON asset_relationships
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "asset_rel_write" ON asset_relationships
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "asset_rel_delete" ON asset_relationships
  FOR DELETE TO authenticated USING (true);

-- =====================================================================
-- 3. EXTEND ASSETS TABLE
-- =====================================================================
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS asset_number  text,
  ADD COLUMN IF NOT EXISTS qr_code       text,
  ADD COLUMN IF NOT EXISTS barcode       text,
  ADD COLUMN IF NOT EXISTS template_id   text REFERENCES asset_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_user text,
  ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '{}';

-- parent_id self-reference (separate step to avoid circular dep on CREATE)
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS parent_id text;

-- =====================================================================
-- 4. SERVER-SIDE ASSET SEARCH FUNCTION
-- =====================================================================
CREATE OR REPLACE FUNCTION search_assets(
  p_customer_id  text     DEFAULT NULL,
  p_query        text     DEFAULT NULL,
  p_category     text     DEFAULT NULL,
  p_status       text     DEFAULT NULL,
  p_page         integer  DEFAULT 1,
  p_page_size    integer  DEFAULT 25
)
RETURNS TABLE (
  id               text,
  code             text,
  asset_number     text,
  customer_id      text,
  category         text,
  device_type      text,
  brand            text,
  model            text,
  serial_number    text,
  location         text,
  department       text,
  assigned_user    text,
  ip_address       text,
  mac_address      text,
  status           text,
  specifications   jsonb,
  custom_fields    jsonb,
  qr_code          text,
  warranty_expiry  date,
  created_at       timestamptz,
  total_count      bigint
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_offset integer := (p_page - 1) * p_page_size;
  v_total  bigint;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM assets a
  WHERE (p_customer_id IS NULL OR a.customer_id = p_customer_id)
    AND (p_category    IS NULL OR a.category    = p_category)
    AND (p_status      IS NULL OR a.status      = p_status)
    AND (a.deleted_at  IS NULL)
    AND (
      p_query IS NULL OR
      a.code            ILIKE '%' || p_query || '%' OR
      a.asset_number    ILIKE '%' || p_query || '%' OR
      a.serial_number   ILIKE '%' || p_query || '%' OR
      a.brand           ILIKE '%' || p_query || '%' OR
      a.model           ILIKE '%' || p_query || '%' OR
      a.device_type     ILIKE '%' || p_query || '%' OR
      a.location        ILIKE '%' || p_query || '%' OR
      a.department      ILIKE '%' || p_query || '%' OR
      a.assigned_user   ILIKE '%' || p_query || '%' OR
      (a.specifications->>'ip_address')  ILIKE '%' || p_query || '%' OR
      (a.specifications->>'mac_address') ILIKE '%' || p_query || '%' OR
      a.notes           ILIKE '%' || p_query || '%'
    );

  RETURN QUERY
  SELECT
    a.id::text,
    a.code::text,
    a.asset_number::text,
    a.customer_id::text,
    a.category::text,
    a.device_type::text,
    a.brand::text,
    a.model::text,
    a.serial_number::text,
    a.location::text,
    a.department::text,
    a.assigned_user::text,
    (a.specifications->>'ip_address')::text,
    (a.specifications->>'mac_address')::text,
    a.status::text,
    a.specifications,
    COALESCE(a.custom_fields, '{}'::jsonb),
    a.qr_code::text,
    a.warranty_expiry,
    a.created_at,
    v_total
  FROM assets a
  WHERE (p_customer_id IS NULL OR a.customer_id = p_customer_id)
    AND (p_category    IS NULL OR a.category    = p_category)
    AND (p_status      IS NULL OR a.status      = p_status)
    AND (a.deleted_at  IS NULL)
    AND (
      p_query IS NULL OR
      a.code            ILIKE '%' || p_query || '%' OR
      a.asset_number    ILIKE '%' || p_query || '%' OR
      a.serial_number   ILIKE '%' || p_query || '%' OR
      a.brand           ILIKE '%' || p_query || '%' OR
      a.model           ILIKE '%' || p_query || '%' OR
      a.device_type     ILIKE '%' || p_query || '%' OR
      a.location        ILIKE '%' || p_query || '%' OR
      a.department      ILIKE '%' || p_query || '%' OR
      a.assigned_user   ILIKE '%' || p_query || '%' OR
      (a.specifications->>'ip_address')  ILIKE '%' || p_query || '%' OR
      (a.specifications->>'mac_address') ILIKE '%' || p_query || '%' OR
      a.notes           ILIKE '%' || p_query || '%'
    )
  ORDER BY a.code
  LIMIT p_page_size OFFSET v_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION search_assets TO authenticated;

-- =====================================================================
-- 5. ASSET TIMELINE
-- =====================================================================
CREATE TABLE IF NOT EXISTS asset_timeline (
  id             text PRIMARY KEY DEFAULT 'tl_' || gen_random_uuid(),
  asset_id       text NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  event_type     text NOT NULL,
  title          text NOT NULL,
  description    text,
  performed_by   text,
  event_date     timestamptz NOT NULL DEFAULT now(),
  reference_id   text,
  reference_type text,
  metadata       jsonb DEFAULT '{}',
  created_by     text NOT NULL DEFAULT 'system',
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS asset_timeline_asset_id_idx ON asset_timeline(asset_id, event_date DESC);

ALTER TABLE asset_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "timeline_read" ON asset_timeline
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "timeline_write" ON asset_timeline
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "timeline_update" ON asset_timeline
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "timeline_delete" ON asset_timeline
  FOR DELETE TO authenticated USING (true);

-- =====================================================================
-- 6. SEED ASSET TEMPLATES (cast jsonb explicitly)
-- =====================================================================
INSERT INTO asset_templates (id, name, category, device_type, brand, model, specifications, created_by)
VALUES
  ('at_tmpl_001', 'Dell OptiPlex 7010',        'Computers', 'Desktop',    'Dell',     'OptiPlex 7010',        '{"os":"Windows 11","ram":"8 GB","ssd":"256 GB","processor_brand":"Intel"}'::jsonb,  'system'),
  ('at_tmpl_002', 'Dell OptiPlex 7090',        'Computers', 'Desktop',    'Dell',     'OptiPlex 7090',        '{"os":"Windows 11","ram":"16 GB","ssd":"512 GB","processor_brand":"Intel"}'::jsonb, 'system'),
  ('at_tmpl_003', 'HP EliteDesk 800 G9',       'Computers', 'Desktop',    'HP',       'EliteDesk 800 G9',     '{"os":"Windows 11","ram":"16 GB","ssd":"512 GB","processor_brand":"Intel"}'::jsonb, 'system'),
  ('at_tmpl_004', 'HP ProBook 440 G10',        'Laptops',   'Laptop',     'HP',       'ProBook 440 G10',      '{"os":"Windows 11","ram":"16 GB","ssd":"512 GB","screen_size":"14\""}'::jsonb,       'system'),
  ('at_tmpl_005', 'Dell Latitude 5530',        'Laptops',   'Laptop',     'Dell',     'Latitude 5530',        '{"os":"Windows 11","ram":"16 GB","ssd":"512 GB","screen_size":"15.6\""}'::jsonb,     'system'),
  ('at_tmpl_006', 'Lenovo ThinkPad E15',       'Laptops',   'Laptop',     'Lenovo',   'ThinkPad E15',         '{"os":"Windows 11","ram":"8 GB","ssd":"256 GB","screen_size":"15.6\""}'::jsonb,      'system'),
  ('at_tmpl_007', 'Sophos XGS 136',            'Firewall',  'Firewall',   'Sophos',   'XGS 136',              '{"vpn_enabled":true}'::jsonb,                                                        'system'),
  ('at_tmpl_008', 'Sophos XGS 2100',           'Firewall',  'Firewall',   'Sophos',   'XGS 2100',             '{"vpn_enabled":true}'::jsonb,                                                        'system'),
  ('at_tmpl_009', 'Fortinet FortiGate 60F',    'Firewall',  'Firewall',   'Fortinet', 'FortiGate 60F',        '{"vpn_enabled":true}'::jsonb,                                                        'system'),
  ('at_tmpl_010', 'Cisco CBS350-24T',          'Switch',    'Switch',     'Cisco',    'CBS350-24T',           '{"ports":24,"managed":true,"poe":false}'::jsonb,                                     'system'),
  ('at_tmpl_011', 'Cisco CBS350-24P-4G',       'Switch',    'Switch',     'Cisco',    'CBS350-24P-4G',        '{"ports":24,"managed":true,"poe":true}'::jsonb,                                      'system'),
  ('at_tmpl_012', 'TP-Link TL-SG108',         'Switch',    'Switch',     'TP-Link',  'TL-SG108',             '{"ports":8,"managed":false,"poe":false}'::jsonb,                                     'system'),
  ('at_tmpl_013', 'Hikvision DS-2CD2143G2-I', 'CCTV',      'IP Camera',  'Hikvision','DS-2CD2143G2-I',       '{"camera_type":"Dome","lens":"2.8mm"}'::jsonb,                                       'system'),
  ('at_tmpl_014', 'Hikvision DS-7616NI-Q2',   'NVR/DVR',   'NVR',        'Hikvision','DS-7616NI-Q2',         '{"channels":16}'::jsonb,                                                             'system'),
  ('at_tmpl_015', 'Dahua DH-NVR4116HS',       'NVR/DVR',   'NVR',        'Dahua',    'DH-NVR4116HS',         '{"channels":16}'::jsonb,                                                             'system'),
  ('at_tmpl_016', 'Dell PowerEdge R550',       'Servers',   'Rack Server','Dell',     'PowerEdge R550',       '{"raid":"RAID 10","os":"Windows Server 2022"}'::jsonb,                               'system'),
  ('at_tmpl_017', 'HPE ProLiant DL380 Gen10',  'Servers',   'Rack Server','HPE',      'ProLiant DL380 Gen10', '{"raid":"RAID 10","os":"Windows Server 2019"}'::jsonb,                               'system'),
  ('at_tmpl_018', 'QNAP TS-453D',             'Storage',   'NAS',        'QNAP',     'TS-453D',              '{"raid":"RAID 5"}'::jsonb,                                                           'system'),
  ('at_tmpl_019', 'Synology DS923+',           'Storage',   'NAS',        'Synology', 'DS923+',               '{"raid":"RAID 5"}'::jsonb,                                                           'system'),
  ('at_tmpl_020', 'HP LaserJet Pro M404dn',   'Printer',   'Printer',    'HP',       'LaserJet Pro M404dn',  '{"duplex":true,"color":false,"connection_net":true}'::jsonb,                         'system'),
  ('at_tmpl_021', 'APC Smart-UPS 2200VA',     'UPS',       'UPS',        'APC',      'Smart-UPS 2200VA',     '{"capacity":"2200VA"}'::jsonb,                                                       'system'),
  ('at_tmpl_022', 'Luminous 2KVA',            'UPS',       'UPS',        'Luminous', '2KVA Sine Wave',       '{"capacity":"2000VA"}'::jsonb,                                                       'system')
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- 7. PERFORMANCE INDEXES
-- =====================================================================
CREATE INDEX IF NOT EXISTS assets_customer_id_idx  ON assets(customer_id);
CREATE INDEX IF NOT EXISTS assets_status_idx        ON assets(status);
CREATE INDEX IF NOT EXISTS assets_category_idx      ON assets(category);
CREATE INDEX IF NOT EXISTS assets_code_idx          ON assets(code);
CREATE INDEX IF NOT EXISTS assets_serial_idx        ON assets(serial_number);
CREATE INDEX IF NOT EXISTS assets_asset_number_idx  ON assets(asset_number);
CREATE INDEX IF NOT EXISTS master_data_type_idx     ON master_data(master_type, is_active);
