-- Add indexes for the remaining unindexed foreign keys reported by advisor

-- data_exports.requested_by
CREATE INDEX IF NOT EXISTS idx_data_exports_requested_by ON data_exports(requested_by);

-- design_studio_annotations.project_id
CREATE INDEX IF NOT EXISTS idx_design_studio_annotations_project_id ON design_studio_annotations(project_id);

-- design_studio_assets.project_id
CREATE INDEX IF NOT EXISTS idx_design_studio_assets_project_id ON design_studio_assets(project_id);

-- design_studio_projects.project_id
CREATE INDEX IF NOT EXISTS idx_design_studio_projects_project_id ON design_studio_projects(project_id);

-- design_studio_sessions.project_id
CREATE INDEX IF NOT EXISTS idx_design_studio_sessions_project_id ON design_studio_sessions(project_id);

-- design_studio_sessions.user_id
CREATE INDEX IF NOT EXISTS idx_design_studio_sessions_user_id ON design_studio_sessions(user_id);

-- design_studio_versions.project_id
CREATE INDEX IF NOT EXISTS idx_design_studio_versions_project_id ON design_studio_versions(project_id);

-- feature_flag_overrides.feature_flag_id
CREATE INDEX IF NOT EXISTS idx_feature_flag_overrides_feature_flag_id ON feature_flag_overrides(feature_flag_id);

-- org_invites.org_id
CREATE INDEX IF NOT EXISTS idx_org_invites_org_id ON org_invites(org_id);

-- project_activity.org_id
CREATE INDEX IF NOT EXISTS idx_project_activity_org_id ON project_activity(org_id);

-- project_assets.org_id
CREATE INDEX IF NOT EXISTS idx_project_assets_org_id ON project_assets(org_id);

-- project_file_links.file_id
CREATE INDEX IF NOT EXISTS idx_project_file_links_file_id ON project_file_links(file_id);

-- project_files.org_id
CREATE INDEX IF NOT EXISTS idx_project_files_org_id ON project_files(org_id);

-- tours.org_id
CREATE INDEX IF NOT EXISTS idx_tours_org_id ON tours(org_id);

-- tours.project_id
CREATE INDEX IF NOT EXISTS idx_tours_project_id ON tours(project_id);

-- user_notifications.user_id
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);;
