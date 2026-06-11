-- Drop unused indexes identified by the performance advisor
-- These indexes have never been used and are consuming storage/write overhead

-- project_files indexes
DROP INDEX IF EXISTS idx_project_files_org_id;
DROP INDEX IF EXISTS idx_project_files_folder_path;
DROP INDEX IF EXISTS idx_project_files_s3_key;
DROP INDEX IF EXISTS idx_project_files_created_at;
DROP INDEX IF EXISTS idx_project_files_not_deleted;
DROP INDEX IF EXISTS idx_project_files_scope;
DROP INDEX IF EXISTS idx_project_files_deleted_at;

-- system_health
DROP INDEX IF EXISTS idx_system_health_checked_at;

-- background_jobs
DROP INDEX IF EXISTS idx_background_jobs_status;
DROP INDEX IF EXISTS idx_background_jobs_scheduled_at;

-- project_file_links
DROP INDEX IF EXISTS idx_project_file_links_token;
DROP INDEX IF EXISTS idx_project_file_links_file_id;
DROP INDEX IF EXISTS idx_project_file_links_active;

-- user_notifications
DROP INDEX IF EXISTS idx_user_notifications_user_id;
DROP INDEX IF EXISTS idx_user_notifications_created_at;

-- api_rate_limits
DROP INDEX IF EXISTS idx_api_rate_limits_identifier;

-- suspicious_activity
DROP INDEX IF EXISTS idx_suspicious_activity_created_at;

-- data_exports
DROP INDEX IF EXISTS idx_data_exports_requested_by;
DROP INDEX IF EXISTS idx_data_exports_status;

-- feature_flags
DROP INDEX IF EXISTS idx_feature_flags_name;

-- feature_flag_overrides
DROP INDEX IF EXISTS idx_feature_flag_overrides_feature_flag_id;

-- ab_experiments
DROP INDEX IF EXISTS idx_ab_experiments_status;

-- api_performance_logs
DROP INDEX IF EXISTS idx_api_performance_logs_endpoint;

-- project_history_events
DROP INDEX IF EXISTS project_history_events_org_id_idx;
DROP INDEX IF EXISTS project_history_events_project_id_idx;
DROP INDEX IF EXISTS project_history_events_created_at_idx;

-- org_roles
DROP INDEX IF EXISTS idx_org_roles_org_id;
DROP INDEX IF EXISTS idx_org_roles_is_default;

-- project_activity
DROP INDEX IF EXISTS idx_project_activity_org_id;
DROP INDEX IF EXISTS idx_project_activity_is_read;

-- org_invites
DROP INDEX IF EXISTS idx_org_invites_org_id;
DROP INDEX IF EXISTS idx_org_invites_email;
DROP INDEX IF EXISTS idx_org_invites_token;
DROP INDEX IF EXISTS idx_org_invites_status;

-- project_assets
DROP INDEX IF EXISTS idx_project_assets_org_id;
DROP INDEX IF EXISTS idx_project_assets_type;

-- project_folders
DROP INDEX IF EXISTS idx_project_folders_tab_tag;

-- design_studio tables
DROP INDEX IF EXISTS idx_design_studio_projects_project_id;
DROP INDEX IF EXISTS idx_design_studio_sessions_project_id;
DROP INDEX IF EXISTS idx_design_studio_sessions_user_id;
DROP INDEX IF EXISTS idx_design_studio_sessions_active;
DROP INDEX IF EXISTS idx_design_studio_annotations_project_id;
DROP INDEX IF EXISTS idx_design_studio_versions_project_id;
DROP INDEX IF EXISTS idx_design_studio_assets_project_id;
DROP INDEX IF EXISTS idx_design_studio_assets_type;

-- tours
DROP INDEX IF EXISTS idx_tours_project_id;
DROP INDEX IF EXISTS idx_tours_org_id;;
