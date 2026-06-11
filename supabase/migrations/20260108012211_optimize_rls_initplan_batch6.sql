-- Batch 6: invoices, model_processing_jobs, org tables, organization_members

-- invoices (uses project_id)
DROP POLICY IF EXISTS "Users can manage Invoices in their org" ON invoices;
DROP POLICY IF EXISTS "Users can view Invoices in their org" ON invoices;
CREATE POLICY "Org members can access invoices" ON invoices FOR ALL
USING (project_id IN (SELECT p.id FROM projects p 
  JOIN organization_members om ON p.org_id = om.org_id 
  WHERE om.user_id = (select auth.uid()) AND om.status = 'active'));

-- model_processing_jobs
DROP POLICY IF EXISTS "Users can manage their model processing jobs" ON model_processing_jobs;
DROP POLICY IF EXISTS "Users can view their model processing jobs" ON model_processing_jobs;
CREATE POLICY "Users can access their model processing jobs" ON model_processing_jobs FOR ALL
USING (user_id = (select auth.uid()) OR org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid())));

-- org_invites - consolidate
DROP POLICY IF EXISTS "Org members can manage invites" ON org_invites;
DROP POLICY IF EXISTS "Org members can view invites" ON org_invites;
CREATE POLICY "Org members can access invites" ON org_invites FOR ALL
USING (org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid())));

-- org_roles - consolidate
DROP POLICY IF EXISTS "Org members can manage roles" ON org_roles;
DROP POLICY IF EXISTS "Org members can view roles" ON org_roles;
CREATE POLICY "Org members can access roles" ON org_roles FOR ALL
USING (org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid())));

-- org_upload_limits
DROP POLICY IF EXISTS "Org members can manage upload limits" ON org_upload_limits;
DROP POLICY IF EXISTS "Org members can view upload limits" ON org_upload_limits;
CREATE POLICY "Org members can access upload limits" ON org_upload_limits FOR ALL
USING (org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid())));

-- org_usage - consolidate
DROP POLICY IF EXISTS "Org members can manage usage" ON org_usage;
DROP POLICY IF EXISTS "Org members can view usage" ON org_usage;
CREATE POLICY "Org members can access usage" ON org_usage FOR ALL
USING (org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid())));

-- org_usage_events - consolidate
DROP POLICY IF EXISTS "Org members can manage usage events" ON org_usage_events;
DROP POLICY IF EXISTS "Org members can view usage events" ON org_usage_events;
CREATE POLICY "Org members can access usage events" ON org_usage_events FOR ALL
USING (org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid())));

-- organization_members
DROP POLICY IF EXISTS "Users can view org members" ON organization_members;
DROP POLICY IF EXISTS "Admins can manage org members" ON organization_members;
CREATE POLICY "Users can view org members" ON organization_members FOR SELECT
USING (org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = (select auth.uid())));
CREATE POLICY "Admins can manage org members" ON organization_members FOR ALL
USING (org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = (select auth.uid()) AND om.role IN ('owner', 'admin')));;
