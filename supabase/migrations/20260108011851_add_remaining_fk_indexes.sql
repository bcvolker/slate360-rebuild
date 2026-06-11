-- Add remaining FK indexes for performance
-- These are mostly created_by, user_id columns

-- ab_experiments
CREATE INDEX IF NOT EXISTS idx_ab_experiments_created_by ON ab_experiments(created_by);

-- api_performance_logs
CREATE INDEX IF NOT EXISTS idx_api_performance_logs_org_id ON api_performance_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_api_performance_logs_user_id ON api_performance_logs(user_id);

-- completion_certificates
CREATE INDEX IF NOT EXISTS idx_completion_certificates_created_by ON completion_certificates(created_by);
CREATE INDEX IF NOT EXISTS idx_completion_certificates_org_id ON completion_certificates(org_id);

-- design_studio_annotations
CREATE INDEX IF NOT EXISTS idx_design_studio_annotations_user_id ON design_studio_annotations(user_id);

-- design_studio_exports
CREATE INDEX IF NOT EXISTS idx_design_studio_exports_user_id ON design_studio_exports(user_id);

-- design_studio_versions
CREATE INDEX IF NOT EXISTS idx_design_studio_versions_user_id ON design_studio_versions(user_id);

-- digital_twin_versions
CREATE INDEX IF NOT EXISTS idx_digital_twin_versions_primary_asset_id ON digital_twin_versions(primary_asset_id);
CREATE INDEX IF NOT EXISTS idx_digital_twin_versions_thumbnail_asset_id ON digital_twin_versions(thumbnail_asset_id);

-- feature_flag_overrides
CREATE INDEX IF NOT EXISTS idx_feature_flag_overrides_created_by ON feature_flag_overrides(created_by);

-- gdpr_requests
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_processed_by ON gdpr_requests(processed_by);

-- integration_activity_log
CREATE INDEX IF NOT EXISTS idx_integration_activity_log_org_id ON integration_activity_log(org_id);
CREATE INDEX IF NOT EXISTS idx_integration_activity_log_user_id ON integration_activity_log(user_id);

-- org_invites
CREATE INDEX IF NOT EXISTS idx_org_invites_revoked_by ON org_invites(revoked_by);

-- print_jobs
CREATE INDEX IF NOT EXISTS idx_print_jobs_design_project_id ON print_jobs(design_project_id);

-- project_assets
CREATE INDEX IF NOT EXISTS idx_project_assets_created_by ON project_assets(created_by);

-- project_documents
CREATE INDEX IF NOT EXISTS idx_project_documents_created_by ON project_documents(created_by);

-- project_file_links
CREATE INDEX IF NOT EXISTS idx_project_file_links_created_by ON project_file_links(created_by);
CREATE INDEX IF NOT EXISTS idx_project_file_links_org_id ON project_file_links(org_id);

-- project_observations
CREATE INDEX IF NOT EXISTS idx_project_observations_created_by ON project_observations(created_by);

-- query_performance_logs
CREATE INDEX IF NOT EXISTS idx_query_performance_logs_org_id ON query_performance_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_query_performance_logs_user_id ON query_performance_logs(user_id);

-- slate_drop_links
CREATE INDEX IF NOT EXISTS idx_slate_drop_links_file_id ON slate_drop_links(file_id);

-- stakeholder_invitations
CREATE INDEX IF NOT EXISTS idx_stakeholder_invitations_revoked_by ON stakeholder_invitations(revoked_by);

-- submittals
CREATE INDEX IF NOT EXISTS idx_submittals_created_by ON submittals(created_by);
CREATE INDEX IF NOT EXISTS idx_submittals_reviewer ON submittals(reviewer);

-- suspicious_activity
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_org_id ON suspicious_activity(org_id);
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_resolved_by ON suspicious_activity(resolved_by);
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_user_id ON suspicious_activity(user_id);

-- tasks
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);

-- tours
CREATE INDEX IF NOT EXISTS idx_tours_created_by ON tours(created_by);

-- unified_files
CREATE INDEX IF NOT EXISTS idx_unified_files_uploaded_by ON unified_files(uploaded_by);

-- user_integrations
CREATE INDEX IF NOT EXISTS idx_user_integrations_user_id ON user_integrations(user_id);

-- user_notifications
CREATE INDEX IF NOT EXISTS idx_user_notifications_org_id ON user_notifications(org_id);

-- workflow_executions
CREATE INDEX IF NOT EXISTS idx_workflow_executions_document_id ON workflow_executions(document_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_initiated_by ON workflow_executions(initiated_by);;
