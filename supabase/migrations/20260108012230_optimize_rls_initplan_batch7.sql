-- Batch 7: pay_applications, print_jobs, processing_jobs, profiles, project_activity, project_assets, project_documents

-- pay_applications - has org_id
DROP POLICY IF EXISTS "Users can manage pay applications in their org" ON pay_applications;
DROP POLICY IF EXISTS "Users can view pay applications in their org" ON pay_applications;
CREATE POLICY "Org members can access pay applications" ON pay_applications FOR ALL
USING (org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid())));

-- print_jobs - has org_id
DROP POLICY IF EXISTS "Users can manage print jobs in their org" ON print_jobs;
DROP POLICY IF EXISTS "Users can view print jobs in their org" ON print_jobs;
CREATE POLICY "Org members can access print jobs" ON print_jobs FOR ALL
USING (org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid())));

-- processing_jobs - uses project_id
DROP POLICY IF EXISTS "Users can manage processing jobs in their org" ON processing_jobs;
DROP POLICY IF EXISTS "Users can view processing jobs in their org" ON processing_jobs;
CREATE POLICY "Org members can access processing jobs" ON processing_jobs FOR ALL
USING (project_id IN (SELECT p.id FROM projects p 
  JOIN organization_members om ON p.org_id = om.org_id 
  WHERE om.user_id = (select auth.uid()) AND om.status = 'active'));

-- profiles
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can view profiles" ON profiles FOR SELECT
USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE
USING (id = (select auth.uid()));

-- project_activity - has org_id
DROP POLICY IF EXISTS "Users can manage project activity in their org" ON project_activity;
DROP POLICY IF EXISTS "Users can view project activity in their org" ON project_activity;
CREATE POLICY "Org members can access project activity" ON project_activity FOR ALL
USING (org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid())));

-- project_assets - has org_id
DROP POLICY IF EXISTS "Users can manage project assets in their org" ON project_assets;
DROP POLICY IF EXISTS "Users can view project assets in their org" ON project_assets;
CREATE POLICY "Org members can access project assets" ON project_assets FOR ALL
USING (org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid())));

-- project_documents - uses project_id
DROP POLICY IF EXISTS "Users can manage project documents in their org" ON project_documents;
DROP POLICY IF EXISTS "Users can view project documents in their org" ON project_documents;
CREATE POLICY "Org members can access project documents" ON project_documents FOR ALL
USING (project_id IN (SELECT p.id FROM projects p 
  JOIN organization_members om ON p.org_id = om.org_id 
  WHERE om.user_id = (select auth.uid()) AND om.status = 'active'));;
