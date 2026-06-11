-- Batch 10: stakeholder, submittals, tasks, tours, user tables, workflow_executions

-- stakeholder_activity - consolidate
DROP POLICY IF EXISTS "Project members can view stakeholder activity" ON stakeholder_activity;
DROP POLICY IF EXISTS "Stakeholders can view their activity" ON stakeholder_activity;
CREATE POLICY "Org members can access stakeholder activity" ON stakeholder_activity FOR ALL
USING (project_id IN (SELECT p.id FROM projects p 
  JOIN organization_members om ON p.org_id = om.org_id 
  WHERE om.user_id = (select auth.uid()) AND om.status = 'active'));

-- stakeholder_invitations - consolidate
DROP POLICY IF EXISTS "Project admins can manage invitations" ON stakeholder_invitations;
DROP POLICY IF EXISTS "Project members can view invitations" ON stakeholder_invitations;
CREATE POLICY "Org members can access stakeholder invitations" ON stakeholder_invitations FOR ALL
USING (org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid())));

-- submittals - consolidate
DROP POLICY IF EXISTS "Members can create org submittals" ON submittals;
DROP POLICY IF EXISTS "Members can update org submittals" ON submittals;
DROP POLICY IF EXISTS "Members can view org submittals" ON submittals;
CREATE POLICY "Org members can access submittals" ON submittals FOR ALL
USING (org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid())));

-- tasks - consolidate
DROP POLICY IF EXISTS "Members can create org tasks" ON tasks;
DROP POLICY IF EXISTS "Members can update org tasks" ON tasks;
DROP POLICY IF EXISTS "Members can view org tasks" ON tasks;
CREATE POLICY "Org members can access tasks" ON tasks FOR ALL
USING (org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid())));

-- tour_analytics - keep anonymous insert, optimize view
DROP POLICY IF EXISTS "Allow anonymous tour analytics" ON tour_analytics;
DROP POLICY IF EXISTS "Users can view tour analytics" ON tour_analytics;
CREATE POLICY "Allow anonymous tour analytics insert" ON tour_analytics FOR INSERT WITH CHECK (true);
CREATE POLICY "Org members can view tour analytics" ON tour_analytics FOR SELECT
USING (tour_id IN (SELECT t.id FROM tours t 
  JOIN organization_members om ON t.org_id = om.org_id 
  WHERE om.user_id = (select auth.uid()) AND om.status = 'active'));

-- tours - consolidate
DROP POLICY IF EXISTS "Members can create org tours" ON tours;
DROP POLICY IF EXISTS "Members can update org tours" ON tours;
DROP POLICY IF EXISTS "Members can view org tours" ON tours;
CREATE POLICY "Org members can access tours" ON tours FOR ALL
USING (org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid())));

-- user_integrations - optimize
DROP POLICY IF EXISTS "Org members can manage integrations" ON user_integrations;
CREATE POLICY "Org members can manage integrations" ON user_integrations FOR ALL
USING (user_id = (select auth.uid()) OR org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid())));

-- user_notifications - optimize (keep service role policy)
DROP POLICY IF EXISTS "Users can view own notifications" ON user_notifications;
CREATE POLICY "Users can view own notifications" ON user_notifications FOR SELECT
USING (user_id = (select auth.uid()));

-- workflow_executions - optimize (uses document_id -> document_workflows -> org_id)
DROP POLICY IF EXISTS "Users can manage workflow executions" ON workflow_executions;
CREATE POLICY "Users can manage workflow executions" ON workflow_executions FOR ALL
USING (initiated_by = (select auth.uid()) OR workflow_id IN (
  SELECT dw.id FROM document_workflows dw 
  JOIN organization_members om ON dw.org_id = om.org_id 
  WHERE om.user_id = (select auth.uid()) AND om.status = 'active'));;
