-- Drop unused indexes - Batch 8 (remaining stakeholder, slate_drop, unified_files, deficiencies)

-- stakeholder_invitations
DROP INDEX IF EXISTS idx_stakeholder_invitations_org_id;
DROP INDEX IF EXISTS idx_stakeholder_invitations_invited_by;
DROP INDEX IF EXISTS idx_stakeholder_invitations_revoked_by;
DROP INDEX IF EXISTS idx_stakeholder_invitations_email;
DROP INDEX IF EXISTS idx_stakeholder_invitations_token;
DROP INDEX IF EXISTS idx_stakeholder_invitations_status;

-- stakeholder_activity
DROP INDEX IF EXISTS idx_stakeholder_activity_stakeholder_id;
DROP INDEX IF EXISTS idx_stakeholder_activity_created_at;

-- folder_permissions
DROP INDEX IF EXISTS idx_folder_permissions_stakeholder_id;

-- slate_drop_links
DROP INDEX IF EXISTS idx_slate_drop_links_project_id;
DROP INDEX IF EXISTS idx_slate_drop_links_folder_id;
DROP INDEX IF EXISTS idx_slate_drop_links_created_by;
DROP INDEX IF EXISTS idx_slate_drop_links_file_id;

-- suspicious_activity
DROP INDEX IF EXISTS idx_suspicious_activity_org_id;
DROP INDEX IF EXISTS idx_suspicious_activity_resolved_by;
DROP INDEX IF EXISTS idx_suspicious_activity_user_id;

-- tours
DROP INDEX IF EXISTS idx_tours_created_by;

-- unified_files
DROP INDEX IF EXISTS idx_unified_files_uploaded_by;
DROP INDEX IF EXISTS idx_unified_files_project_id;
DROP INDEX IF EXISTS idx_unified_files_folder_path;

-- file_folders
DROP INDEX IF EXISTS idx_file_folders_project_id;
DROP INDEX IF EXISTS idx_file_folders_parent_id;

-- deficiencies
DROP INDEX IF EXISTS idx_deficiencies_org;
DROP INDEX IF EXISTS idx_deficiencies_status;

-- user_notifications
DROP INDEX IF EXISTS idx_user_notifications_org_id;;
