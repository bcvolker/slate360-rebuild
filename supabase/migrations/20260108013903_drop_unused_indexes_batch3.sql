-- Drop unused indexes - Batch 3 (credit_ledger, projects, organization_members, project_files, project_folders)

-- credit_ledger
DROP INDEX IF EXISTS idx_credit_ledger_created;
DROP INDEX IF EXISTS idx_credit_ledger_category;
DROP INDEX IF EXISTS idx_credit_ledger_ref;
DROP INDEX IF EXISTS idx_credit_ledger_created_by;

-- projects
DROP INDEX IF EXISTS idx_projects_org_id;
DROP INDEX IF EXISTS idx_projects_created_by;

-- organization_members
DROP INDEX IF EXISTS idx_organization_members_org_role_id;
DROP INDEX IF EXISTS idx_organization_members_deactivated_by;

-- project_files
DROP INDEX IF EXISTS idx_project_files_created_by;
DROP INDEX IF EXISTS idx_project_files_deleted_by;

-- project_folders
DROP INDEX IF EXISTS idx_project_folders_created_by;

-- inspections
DROP INDEX IF EXISTS idx_inspections_org_id;
DROP INDEX IF EXISTS idx_inspections_inspector_id;

-- punch_items
DROP INDEX IF EXISTS idx_punch_items_org_id;
DROP INDEX IF EXISTS idx_punch_items_assigned_to;
DROP INDEX IF EXISTS idx_punch_items_created_by;
DROP INDEX IF EXISTS idx_punch_items_verified_by;

-- budget_line_items
DROP INDEX IF EXISTS idx_budget_line_items_org_id;
DROP INDEX IF EXISTS idx_budget_line_items_created_by;

-- change_orders
DROP INDEX IF EXISTS idx_change_orders_org_id;
DROP INDEX IF EXISTS idx_change_orders_created_by;
DROP INDEX IF EXISTS idx_change_orders_approved_by;

-- pay_applications
DROP INDEX IF EXISTS idx_pay_applications_org_id;
DROP INDEX IF EXISTS idx_pay_applications_created_by;;
