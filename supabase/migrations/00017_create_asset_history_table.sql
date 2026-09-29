
CREATE TABLE IF NOT EXISTS asset_history (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  asset_id      TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  action        TEXT NOT NULL,          -- e.g. 'Asset Created', 'Location Changed'
  field_name    TEXT,                   -- which field changed
  old_value     TEXT,
  new_value     TEXT,
  performed_by  TEXT NOT NULL,
  performed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes         TEXT
);

CREATE INDEX IF NOT EXISTS idx_asset_history_asset_id ON asset_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_history_performed_at ON asset_history(performed_at DESC);

-- RLS: allow anon read/insert (app uses anon key)
ALTER TABLE asset_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_asset_history" ON asset_history FOR SELECT USING (true);
CREATE POLICY "anon_insert_asset_history" ON asset_history FOR INSERT WITH CHECK (true);
