-- Drop unused indexes - Batch 6 (remaining tables)

-- backup_history
DROP INDEX IF EXISTS idx_backup_history_initiated_by;

-- daily_logs
DROP INDEX IF EXISTS idx_daily_logs_org_id;
DROP INDEX IF EXISTS idx_daily_logs_created_by;
DROP INDEX IF EXISTS idx_daily_logs_approved_by;
DROP INDEX IF EXISTS idx_daily_logs_date;

-- data_exports
DROP INDEX IF EXISTS idx_data_exports_org_id;

-- org_invites
DROP INDEX IF EXISTS idx_org_invites_invited_by;
DROP INDEX IF EXISTS idx_org_invites_role_id;
DROP INDEX IF EXISTS idx_org_invites_revoked_by;

-- expenses
DROP INDEX IF EXISTS idx_expenses_created_by;

-- feature_flags
DROP INDEX IF EXISTS idx_feature_flags_created_by;

-- feature_flag_overrides
DROP INDEX IF EXISTS idx_feature_flag_overrides_created_by;

-- feature_requests
DROP INDEX IF EXISTS idx_feature_requests_user_id;

-- gdpr_requests
DROP INDEX IF EXISTS idx_gdpr_requests_processed_by;
DROP INDEX IF EXISTS idx_gdpr_requests_user_id;
DROP INDEX IF EXISTS idx_gdpr_requests_status;

-- invoices
DROP INDEX IF EXISTS idx_invoices_created_by;

-- meetings
DROP INDEX IF EXISTS idx_meetings_org_id;
DROP INDEX IF EXISTS idx_meetings_organizer_id;

-- print_jobs
DROP INDEX IF EXISTS idx_print_jobs_org_id;
DROP INDEX IF EXISTS idx_print_jobs_created_by;
DROP INDEX IF EXISTS idx_print_jobs_file_id;
DROP INDEX IF EXISTS idx_print_jobs_design_project_id;

-- project_members
DROP INDEX IF EXISTS idx_project_members_invited_by;
DROP INDEX IF EXISTS idx_project_members_user;;
