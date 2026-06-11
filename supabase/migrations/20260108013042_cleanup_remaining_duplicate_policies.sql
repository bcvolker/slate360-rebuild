-- Final cleanup: Remove old duplicate policies that are causing multiple permissive policy warnings

-- digital_twin_versions
DROP POLICY IF EXISTS "Org members can view twin versions" ON digital_twin_versions;

-- documents
DROP POLICY IF EXISTS "Project members can view documents" ON documents;
DROP POLICY IF EXISTS "Project members can manage documents" ON documents;

-- email_notifications
DROP POLICY IF EXISTS "Service role full access" ON email_notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON email_notifications;

-- expenses  
DROP POLICY IF EXISTS "Members can view expenses" ON expenses;

-- feature_flags
DROP POLICY IF EXISTS "Anyone can view feature flags" ON feature_flags;

-- feature_requests
DROP POLICY IF EXISTS "Users can manage their feature requests" ON feature_requests;

-- file_versions
DROP POLICY IF EXISTS "Users can view file versions" ON file_versions;

-- folder_permissions
DROP POLICY IF EXISTS "Project admins can manage folder permissions" ON folder_permissions;
DROP POLICY IF EXISTS "Stakeholders can view their folder permissions" ON folder_permissions;

-- gdpr_requests
DROP POLICY IF EXISTS "Users can view own GDPR requests" ON gdpr_requests;
DROP POLICY IF EXISTS "Users can create GDPR requests" ON gdpr_requests;
DROP POLICY IF EXISTS "Service role can manage GDPR requests" ON gdpr_requests;

-- integration_activity_log
DROP POLICY IF EXISTS "Org members can view integration activity" ON integration_activity_log;

-- integration_webhooks
DROP POLICY IF EXISTS "Users can manage org webhooks" ON integration_webhooks;

-- invoices
DROP POLICY IF EXISTS "Members can view invoices" ON invoices;

-- model_processing_jobs
DROP POLICY IF EXISTS "Users can view own processing jobs" ON model_processing_jobs;
DROP POLICY IF EXISTS "Users can create processing jobs" ON model_processing_jobs;

-- org_invites
DROP POLICY IF EXISTS "Members can view org invites" ON org_invites;
DROP POLICY IF EXISTS "Seat managers can manage invites" ON org_invites;

-- org_roles
DROP POLICY IF EXISTS "Members can view org roles" ON org_roles;
DROP POLICY IF EXISTS "Admins can manage org roles" ON org_roles;

-- org_upload_limits
DROP POLICY IF EXISTS "Members can view org upload limits" ON org_upload_limits;

-- org_usage
DROP POLICY IF EXISTS "Members can view org usage" ON org_usage;

-- org_usage_events  
DROP POLICY IF EXISTS "Members can view org usage events" ON org_usage_events;

-- organization_members
DROP POLICY IF EXISTS "Users can view org members in their org" ON organization_members;

-- pay_applications
DROP POLICY IF EXISTS "Project members can view pay applications" ON pay_applications;
DROP POLICY IF EXISTS "Project members can manage pay applications" ON pay_applications;

-- print_jobs
DROP POLICY IF EXISTS "Org members can manage print jobs" ON print_jobs;

-- processing_jobs
DROP POLICY IF EXISTS "Org members can view jobs" ON processing_jobs;
DROP POLICY IF EXISTS "Org members can create jobs" ON processing_jobs;
DROP POLICY IF EXISTS "Org members can manage processing jobs" ON processing_jobs;

-- profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

-- document_signatures
DROP POLICY IF EXISTS "Users can manage document signatures" ON document_signatures;

-- document_workflows
DROP POLICY IF EXISTS "Users can manage document workflows" ON document_workflows;

-- schedule_versions
DROP POLICY IF EXISTS "Org members can access schedule versions" ON schedule_versions;
-- Recreate with optimization
CREATE POLICY "Org members can access schedule versions" ON schedule_versions FOR ALL
USING (org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid())));

-- project_folders
DROP POLICY IF EXISTS "Org members can access project folders" ON project_folders;
-- Recreate with optimization
CREATE POLICY "Org members can access project folders" ON project_folders FOR ALL
USING (org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid())));;
