
-- attendance: add missing working_hours, selfie_photo_url
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS working_hours   numeric,
  ADD COLUMN IF NOT EXISTS selfie_photo_url text,
  ADD COLUMN IF NOT EXISTS updated_at      timestamptz DEFAULT now();

-- fuel_logs: align columns to match app service model
ALTER TABLE fuel_logs
  ADD COLUMN IF NOT EXISTS entry_date          date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS opening_km          numeric,
  ADD COLUMN IF NOT EXISTS closing_km          numeric,
  ADD COLUMN IF NOT EXISTS distance_travelled  numeric,
  ADD COLUMN IF NOT EXISTS fuel_filled         numeric,
  ADD COLUMN IF NOT EXISTS fuel_cost           numeric,
  ADD COLUMN IF NOT EXISTS updated_at          timestamptz DEFAULT now();

-- parts_used: add recorded_by
ALTER TABLE parts_used
  ADD COLUMN IF NOT EXISTS recorded_by text NOT NULL DEFAULT 'System',
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz DEFAULT now();

-- customer_documents: add category + version (used by documentService)
ALTER TABLE customer_documents
  ADD COLUMN IF NOT EXISTS category   text NOT NULL DEFAULT 'Other',
  ADD COLUMN IF NOT EXISTS version    integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS entity_type text NOT NULL DEFAULT 'customer',
  ADD COLUMN IF NOT EXISTS entity_id   text;

-- backfill entity_id from customer_id for existing rows
UPDATE customer_documents SET entity_id = customer_id WHERE entity_id IS NULL;
