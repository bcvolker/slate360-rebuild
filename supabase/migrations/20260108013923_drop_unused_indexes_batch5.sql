-- Drop unused indexes - Batch 5 (document_*, file_versions, workflow_*, credit_purchases, design_studio_*)

-- document_signatures
DROP INDEX IF EXISTS idx_document_signatures_document_id;
DROP INDEX IF EXISTS idx_document_signatures_signed_by;

-- document_workflows
DROP INDEX IF EXISTS idx_document_workflows_document_id;
DROP INDEX IF EXISTS idx_document_workflows_org_id;
DROP INDEX IF EXISTS idx_document_workflows_created_by;

-- file_versions
DROP INDEX IF EXISTS idx_file_versions_document_id;
DROP INDEX IF EXISTS idx_file_versions_uploaded_by;

-- workflow_executions
DROP INDEX IF EXISTS idx_workflow_executions_workflow_id;
DROP INDEX IF EXISTS idx_workflow_executions_document_id;
DROP INDEX IF EXISTS idx_workflow_executions_initiated_by;

-- credit_purchases
DROP INDEX IF EXISTS idx_credit_purchases_user_id;
DROP INDEX IF EXISTS idx_credit_purchases_credit_pack_id;
DROP INDEX IF EXISTS idx_credit_purchases_org_id;

-- org_usage_events
DROP INDEX IF EXISTS idx_org_usage_events_user_id;
DROP INDEX IF EXISTS idx_org_usage_events_org_id;
DROP INDEX IF EXISTS idx_org_usage_events_created_at;
DROP INDEX IF EXISTS idx_org_usage_events_event_type;

-- project_activity
DROP INDEX IF EXISTS idx_project_activity_user_id;

-- design_studio_exports
DROP INDEX IF EXISTS idx_design_studio_exports_project_id;
DROP INDEX IF EXISTS idx_design_studio_exports_user_id;

-- design_studio_annotations
DROP INDEX IF EXISTS idx_design_studio_annotations_user_id;

-- design_studio_versions
DROP INDEX IF EXISTS idx_design_studio_versions_user_id;;
