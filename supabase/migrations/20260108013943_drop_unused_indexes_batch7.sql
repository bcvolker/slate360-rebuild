-- Drop unused indexes - Batch 7 (stakeholder, project, system tables)

-- project_stakeholders
DROP INDEX IF EXISTS idx_project_stakeholders_org_id;
DROP INDEX IF EXISTS idx_project_stakeholders_invited_by;
DROP INDEX IF EXISTS idx_project_stakeholders_email;
DROP INDEX IF EXISTS idx_project_stakeholders_access_token;
DROP INDEX IF EXISTS idx_project_stakeholders_active;

-- project_tasks
DROP INDEX IF EXISTS idx_project_tasks_project_id;
DROP INDEX IF EXISTS idx_project_tasks_assigned_to;
DROP INDEX IF EXISTS idx_project_tasks_created_by;

-- project_assets
DROP INDEX IF EXISTS idx_project_assets_created_by;

-- project_documents
DROP INDEX IF EXISTS idx_project_documents_created_by;
DROP INDEX IF EXISTS idx_project_documents_type;

-- project_file_links
DROP INDEX IF EXISTS idx_project_file_links_created_by;
DROP INDEX IF EXISTS idx_project_file_links_org_id;

-- project_observations
DROP INDEX IF EXISTS idx_project_observations_created_by;

-- query_performance_logs
DROP INDEX IF EXISTS idx_query_performance_logs_org_id;
DROP INDEX IF EXISTS idx_query_performance_logs_user_id;

-- api_performance_logs
DROP INDEX IF EXISTS idx_api_performance_logs_created_at;
DROP INDEX IF EXISTS idx_api_performance_logs_org_id;
DROP INDEX IF EXISTS idx_api_performance_logs_user_id;

-- ab_experiments
DROP INDEX IF EXISTS idx_ab_experiments_created_by;

-- completion_certificates
DROP INDEX IF EXISTS idx_completion_certificates_created_by;
DROP INDEX IF EXISTS idx_completion_certificates_org_id;

-- system_health
DROP INDEX IF EXISTS idx_system_health_service_name;;
