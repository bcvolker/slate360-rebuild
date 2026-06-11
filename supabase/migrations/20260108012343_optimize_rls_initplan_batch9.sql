-- Batch 9: punch_lists, rfis, schedule tables, shared_links, slate_drop_links

-- punch_lists - consolidate
DROP POLICY IF EXISTS "Members can view org punch lists" ON punch_lists;
CREATE POLICY "Org members can access punch lists" ON punch_lists FOR ALL
USING (org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid())));

-- rfis - consolidate
DROP POLICY IF EXISTS "Members can create org rfis" ON rfis;
DROP POLICY IF EXISTS "Members can update org rfis" ON rfis;
DROP POLICY IF EXISTS "Members can view org rfis" ON rfis;
CREATE POLICY "Org members can access rfis" ON rfis FOR ALL
USING (org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid())));

-- schedule_of_values - consolidate
DROP POLICY IF EXISTS "Members can delete SOV" ON schedule_of_values;
DROP POLICY IF EXISTS "Members can insert SOV" ON schedule_of_values;
DROP POLICY IF EXISTS "Members can update SOV" ON schedule_of_values;
DROP POLICY IF EXISTS "Project members can view SOV" ON schedule_of_values;
CREATE POLICY "Org members can access schedule of values" ON schedule_of_values FOR ALL
USING (org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid())));

-- schedule_tasks - consolidate
DROP POLICY IF EXISTS "Project members can manage schedule tasks" ON schedule_tasks;
DROP POLICY IF EXISTS "Project members can view schedule tasks" ON schedule_tasks;
CREATE POLICY "Org members can access schedule tasks" ON schedule_tasks FOR ALL
USING (org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid())));

-- schedule_versions - already optimized, skip

-- shared_links - consolidate
DROP POLICY IF EXISTS "Link creators can manage shared links" ON shared_links;
DROP POLICY IF EXISTS "Project members can view shared links" ON shared_links;
CREATE POLICY "Org members can access shared links" ON shared_links FOR ALL
USING (org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid())));

-- slate_drop_links - optimize
DROP POLICY IF EXISTS "Users can manage links for their projects" ON slate_drop_links;
CREATE POLICY "Users can manage links for their projects" ON slate_drop_links FOR ALL
USING (project_id IN (SELECT p.id FROM projects p 
  JOIN organization_members om ON p.org_id = om.org_id 
  WHERE om.user_id = (select auth.uid()) AND om.status = 'active'));;
