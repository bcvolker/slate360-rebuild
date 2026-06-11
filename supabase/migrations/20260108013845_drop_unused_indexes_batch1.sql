-- Drop unused indexes - Batch 1 (tours, rfis, submittals, tasks, punch_lists, daily_reports)

-- tours
DROP INDEX IF EXISTS idx_tours_status;

-- tour_analytics
DROP INDEX IF EXISTS idx_tour_analytics_tour_id;

-- rfis
DROP INDEX IF EXISTS idx_rfis_project_id;
DROP INDEX IF EXISTS idx_rfis_status;
DROP INDEX IF EXISTS idx_rfis_created_by;
DROP INDEX IF EXISTS idx_rfis_response_by;

-- submittals
DROP INDEX IF EXISTS idx_submittals_project_id;
DROP INDEX IF EXISTS idx_submittals_status;
DROP INDEX IF EXISTS idx_submittals_assigned_to;
DROP INDEX IF EXISTS idx_submittals_created_by;
DROP INDEX IF EXISTS idx_submittals_reviewer;

-- tasks
DROP INDEX IF EXISTS idx_tasks_project_id;
DROP INDEX IF EXISTS idx_tasks_org_id;
DROP INDEX IF EXISTS idx_tasks_status;
DROP INDEX IF EXISTS idx_tasks_assigned_to;
DROP INDEX IF EXISTS idx_tasks_parent_id;
DROP INDEX IF EXISTS idx_tasks_due_date;
DROP INDEX IF EXISTS idx_tasks_created_by;

-- punch_lists
DROP INDEX IF EXISTS idx_punch_lists_status;
DROP INDEX IF EXISTS idx_punch_lists_org_id;
DROP INDEX IF EXISTS idx_punch_lists_created_by;
DROP INDEX IF EXISTS idx_punch_lists_verified_by;

-- daily_reports
DROP INDEX IF EXISTS idx_daily_reports_report_date;
DROP INDEX IF EXISTS idx_daily_reports_status;
DROP INDEX IF EXISTS idx_daily_reports_org_id;
DROP INDEX IF EXISTS idx_daily_reports_created_by;
DROP INDEX IF EXISTS idx_daily_reports_approved_by;;
