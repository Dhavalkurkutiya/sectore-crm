
-- ── Performance Indexes: Phase 1 ─────────────────────────────────────────────
-- Tasks hot-path indexes
CREATE INDEX IF NOT EXISTS idx_tasks_status
  ON tasks(status);

CREATE INDEX IF NOT EXISTS idx_tasks_customer_id
  ON tasks(customer_id);

CREATE INDEX IF NOT EXISTS idx_tasks_asset_id
  ON tasks(asset_id);

CREATE INDEX IF NOT EXISTS idx_tasks_engineer_id
  ON tasks(engineer_id);

CREATE INDEX IF NOT EXISTS idx_tasks_created_at
  ON tasks(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_expected_visit_date
  ON tasks(expected_visit_date);

CREATE INDEX IF NOT EXISTS idx_tasks_task_number
  ON tasks(task_number);

CREATE INDEX IF NOT EXISTS idx_tasks_status_created
  ON tasks(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_customer_status
  ON tasks(customer_id, status);

-- Assets hot-path indexes
CREATE INDEX IF NOT EXISTS idx_assets_customer_id
  ON assets(customer_id);

CREATE INDEX IF NOT EXISTS idx_assets_status
  ON assets(status);

CREATE INDEX IF NOT EXISTS idx_assets_customer_status
  ON assets(customer_id, status);

CREATE INDEX IF NOT EXISTS idx_assets_serial_number
  ON assets(serial_number);

CREATE INDEX IF NOT EXISTS idx_assets_code
  ON assets(code);

-- Customers
CREATE INDEX IF NOT EXISTS idx_customers_status
  ON customers(status);

CREATE INDEX IF NOT EXISTS idx_customers_company_name
  ON customers(company_name);

-- AMC indexes
CREATE INDEX IF NOT EXISTS idx_amcs_customer_id
  ON amcs(customer_id);

CREATE INDEX IF NOT EXISTS idx_amcs_status
  ON amcs(status);

CREATE INDEX IF NOT EXISTS idx_amcs_end_date
  ON amcs(end_date);

CREATE INDEX IF NOT EXISTS idx_amcs_status_end_date
  ON amcs(status, end_date);

-- AMC visits
CREATE INDEX IF NOT EXISTS idx_amc_visits_amc_id
  ON amc_visits(amc_id);

CREATE INDEX IF NOT EXISTS idx_amc_visits_scheduled_date
  ON amc_visits(scheduled_date);

-- app_users
CREATE INDEX IF NOT EXISTS idx_app_users_role
  ON app_users(role);

CREATE INDEX IF NOT EXISTS idx_app_users_username
  ON app_users(username);

CREATE INDEX IF NOT EXISTS idx_app_users_email
  ON app_users(email);

CREATE INDEX IF NOT EXISTS idx_app_users_mobile
  ON app_users(mobile);

-- Task sub-tables
CREATE INDEX IF NOT EXISTS idx_task_notes_task_id
  ON task_notes(task_id);

CREATE INDEX IF NOT EXISTS idx_task_photos_task_id
  ON task_photos(task_id);

CREATE INDEX IF NOT EXISTS idx_task_documents_task_id
  ON task_documents(task_id);

CREATE INDEX IF NOT EXISTS idx_task_timeline_task_id
  ON task_timeline(task_id);

CREATE INDEX IF NOT EXISTS idx_task_activity_task_id
  ON task_activity(task_id);

-- Audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp
  ON audit_logs(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
  ON audit_logs(user_id);
