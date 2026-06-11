-- Batch 5: file_versions, folder_permissions, gdpr_requests, integration tables

-- file_versions (uses document_id -> documents -> org_id)
DROP POLICY IF EXISTS "Org members can manage file versions" ON file_versions;
CREATE POLICY "Org members can manage file versions" ON file_versions FOR ALL
USING (document_id IN (SELECT d.id FROM documents d 
  JOIN organization_members om ON d.org_id = om.org_id 
  WHERE om.user_id = (select auth.uid()) AND om.status = 'active'));

-- folder_permissions (uses folder_id -> check via project_folders or file_folders)
DROP POLICY IF EXISTS "Users can manage folder permissions in their org" ON folder_permissions;
DROP POLICY IF EXISTS "Users can view folder permissions in their org" ON folder_permissions;
CREATE POLICY "Org members can access folder permissions" ON folder_permissions FOR ALL
USING (folder_id IN (
  SELECT pf.id FROM project_folders pf 
  JOIN projects p ON pf.project_id = p.id 
  JOIN organization_members om ON p.org_id = om.org_id 
  WHERE om.user_id = (select auth.uid()) AND om.status = 'active'
) OR folder_id IN (
  SELECT ff.id FROM file_folders ff 
  JOIN organization_members om ON ff.org_id = om.org_id 
  WHERE om.user_id = (select auth.uid()) AND om.status = 'active'
));

-- gdpr_requests (user_id only)
DROP POLICY IF EXISTS "Users can manage their own GDPR requests" ON gdpr_requests;
DROP POLICY IF EXISTS "Users can view their own GDPR requests" ON gdpr_requests;
CREATE POLICY "Users can access their own GDPR requests" ON gdpr_requests FOR ALL
USING (user_id = (select auth.uid()));

-- integration_activity_log - consolidate
DROP POLICY IF EXISTS "Users can manage their integration activity" ON integration_activity_log;
DROP POLICY IF EXISTS "Users can view their integration activity" ON integration_activity_log;
CREATE POLICY "Users can access their integration activity" ON integration_activity_log FOR ALL
USING (user_id = (select auth.uid()) OR org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid())));

-- integration_oauth_states - consolidate
DROP POLICY IF EXISTS "Users can manage their oauth states" ON integration_oauth_states;
DROP POLICY IF EXISTS "Users can view their oauth states" ON integration_oauth_states;
CREATE POLICY "Users can access their oauth states" ON integration_oauth_states FOR ALL
USING (user_id = (select auth.uid()));

-- integration_webhooks - consolidate
DROP POLICY IF EXISTS "Org members can manage webhooks" ON integration_webhooks;
DROP POLICY IF EXISTS "Org members can view webhooks" ON integration_webhooks;
CREATE POLICY "Org members can access webhooks" ON integration_webhooks FOR ALL
USING (org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid())));;
