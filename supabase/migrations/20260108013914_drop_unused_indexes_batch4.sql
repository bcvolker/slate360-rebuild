-- Drop unused indexes - Batch 4 (schedule tables, autodesk, integrations, documents)

-- schedule_of_values
DROP INDEX IF EXISTS idx_schedule_of_values_org_id;
DROP INDEX IF EXISTS idx_schedule_of_values_created_by;

-- schedule_tasks
DROP INDEX IF EXISTS idx_schedule_tasks_org_id;
DROP INDEX IF EXISTS idx_schedule_tasks_created_by;
DROP INDEX IF EXISTS idx_schedule_tasks_parent_id;
DROP INDEX IF EXISTS idx_schedule_tasks_project_id;

-- schedule_versions
DROP INDEX IF EXISTS idx_schedule_versions_org_id;
DROP INDEX IF EXISTS idx_schedule_versions_project_id;
DROP INDEX IF EXISTS idx_schedule_versions_created_by;

-- autodesk_sync_queue
DROP INDEX IF EXISTS idx_autodesk_sync_queue_org_id;
DROP INDEX IF EXISTS idx_autodesk_sync_queue_integration_id;
DROP INDEX IF EXISTS idx_autodesk_sync_queue_status;

-- integration_oauth_states
DROP INDEX IF EXISTS idx_integration_oauth_states_org_id;
DROP INDEX IF EXISTS idx_integration_oauth_states_user_id;
DROP INDEX IF EXISTS idx_integration_oauth_states_state;

-- integration_webhooks
DROP INDEX IF EXISTS idx_integration_webhooks_org_id;
DROP INDEX IF EXISTS idx_integration_webhooks_integration_id;

-- documents
DROP INDEX IF EXISTS idx_documents_org_id;
DROP INDEX IF EXISTS idx_documents_created_by;
DROP INDEX IF EXISTS idx_documents_type;

-- shared_links
DROP INDEX IF EXISTS idx_shared_links_token;
DROP INDEX IF EXISTS idx_shared_links_org_id;
DROP INDEX IF EXISTS idx_shared_links_created_by;

-- user_integrations
DROP INDEX IF EXISTS idx_user_integrations_org_provider;
DROP INDEX IF EXISTS idx_user_integrations_user_id;

-- integration_activity_log
DROP INDEX IF EXISTS idx_integration_activity_log_integration_id;
DROP INDEX IF EXISTS idx_integration_activity_log_org_id;
DROP INDEX IF EXISTS idx_integration_activity_log_user_id;;
