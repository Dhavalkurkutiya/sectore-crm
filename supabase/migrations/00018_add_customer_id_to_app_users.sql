-- Add customer_id to app_users for Customer ↔ User linking
ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_app_users_customer_id ON app_users(customer_id);

-- Also make optional customers fields truly allow empty (they already default to '' NOT NULL which is fine,
-- but we need to allow NULL too for cleaner nullable semantics going forward)
-- Keep NOT NULL with '' default as-is so existing rows don't break.
-- We just ensure the form can submit empty strings which map to '' in DB.

COMMENT ON COLUMN app_users.customer_id IS 'Links this user account to a customers row. Set for role=customer users.';
