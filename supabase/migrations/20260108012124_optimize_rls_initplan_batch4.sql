-- Batch 4: digital_twin, document, email, expenses, feature_requests

-- digital_twin_versions (uses project_id, not org_id)
DROP POLICY IF EXISTS "Users can manage digital twin versions in their org" ON digital_twin_versions;
CREATE POLICY "Users can manage digital twin versions in their org" ON digital_twin_versions FOR ALL
USING (project_id IN (SELECT p.id FROM projects p 
  JOIN organization_members om ON p.org_id = om.org_id 
  WHERE om.user_id = (select auth.uid()) AND om.status = 'active'));

-- document_workflows - has org_id, consolidate
DROP POLICY IF EXISTS "Org members can manage workflows" ON document_workflows;
DROP POLICY IF EXISTS "Org members can view workflows" ON document_workflows;
CREATE POLICY "Org members can access workflows" ON document_workflows FOR ALL
USING (org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid())));

-- documents - has org_id, consolidate
DROP POLICY IF EXISTS "Users can manage Documents in their org" ON documents;
DROP POLICY IF EXISTS "Users can view Documents in their org" ON documents;
CREATE POLICY "Org members can access documents" ON documents FOR ALL
USING (org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid())));

-- email_notifications - has org_id and user_id
DROP POLICY IF EXISTS "Users can view their own email notifications" ON email_notifications;
CREATE POLICY "Users can view their own email notifications" ON email_notifications FOR SELECT
USING (user_id = (select auth.uid()));

-- expenses (uses project_id, not org_id)
DROP POLICY IF EXISTS "Users can manage expenses in their org" ON expenses;
DROP POLICY IF EXISTS "Users can view expenses in their org" ON expenses;
CREATE POLICY "Org members can access expenses" ON expenses FOR ALL
USING (project_id IN (SELECT p.id FROM projects p 
  JOIN organization_members om ON p.org_id = om.org_id 
  WHERE om.user_id = (select auth.uid()) AND om.status = 'active'));

-- feature_requests - has user_id only, consolidate
DROP POLICY IF EXISTS "Users can create feature requests" ON feature_requests;
DROP POLICY IF EXISTS "Users can manage their own feature requests" ON feature_requests;
DROP POLICY IF EXISTS "Users can view feature requests" ON feature_requests;
-- All authenticated users can view feature requests, but only owners can modify
CREATE POLICY "Authenticated users can view feature requests" ON feature_requests FOR SELECT
USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Users can manage their own feature requests" ON feature_requests FOR ALL
USING (user_id = (select auth.uid()));;
