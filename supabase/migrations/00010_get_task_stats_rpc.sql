
-- ── Server-side task stats — replaces full-table SELECT in frontend ───────────
CREATE OR REPLACE FUNCTION get_task_stats()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT jsonb_build_object(
    'today_total',       COUNT(*) FILTER (WHERE expected_visit_date = CURRENT_DATE),
    'pending',           COUNT(*) FILTER (WHERE status = 'Pending'),
    'completed_today',   COUNT(*) FILTER (WHERE status = 'Completed'
                           AND DATE(updated_at AT TIME ZONE 'UTC') = CURRENT_DATE),
    'overdue',           COUNT(*) FILTER (WHERE expected_visit_date < CURRENT_DATE
                           AND status NOT IN ('Completed','Closed','Cancelled')),
    'emergency',         COUNT(*) FILTER (WHERE priority = 'Emergency'
                           AND status NOT IN ('Completed','Closed','Cancelled')),
    'waiting_parts',     COUNT(*) FILTER (WHERE status = 'Waiting Parts'),
    'waiting_customer',  COUNT(*) FILTER (WHERE status = 'Waiting Customer')
  )
  FROM tasks
  WHERE status != 'Cancelled';
$$;
