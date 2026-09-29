
-- 1. Fix testcustomer user: point company_id to real customer UUID
UPDATE app_users
SET company_id = 'faa0cca8-1057-40fa-b031-726faf2062cd'
WHERE username = 'testcustomer' AND role = 'customer';

-- 2. Add contact_person and contact_mobile columns to tasks (if not present)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS contact_person  TEXT,
  ADD COLUMN IF NOT EXISTS contact_mobile  TEXT;
