-- Batch 8: Consolidate project_* table policies

-- project_activity - drop duplicates, keep one optimized
DROP POLICY IF EXISTS "Members can insert org activity" ON project_activity;
DROP POLICY IF EXISTS "Members can update org activity" ON project_activity;
DROP POLICY IF EXISTS "Members can view org activity" ON project_activity;
DROP POLICY IF EXISTS "Project members can view activity" ON project_activity;
-- Org members can access project activity already exists and is optimized

-- project_assets - drop duplicates
DROP POLICY IF EXISTS "Members can delete org assets" ON project_assets;
DROP POLICY IF EXISTS "Members can insert org assets" ON project_assets;
DROP POLICY IF EXISTS "Members can update org assets" ON project_assets;
DROP POLICY IF EXISTS "Members can view org assets" ON project_assets;
-- Org members can access project assets already exists and is optimized

-- project_documents - drop duplicates
DROP POLICY IF EXISTS "Users can create documents in their projects" ON project_documents;
DROP POLICY IF EXISTS "Users can delete documents in their projects" ON project_documents;
DROP POLICY IF EXISTS "Users can update documents in their projects" ON project_documents;
DROP POLICY IF EXISTS "Users can view documents in their projects" ON project_documents;
-- Org members can access project documents already exists and is optimized

-- project_file_links - consolidate
DROP POLICY IF EXISTS "Members can create org file links" ON project_file_links;
DROP POLICY IF EXISTS "Members can view org file links" ON project_file_links;
CREATE POLICY "Org members can access project file links" ON project_file_links FOR ALL
USING (org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid())));

-- project_files - consolidate
DROP POLICY IF EXISTS "Members can insert org project files" ON project_files;
DROP POLICY IF EXISTS "Members can update org project files" ON project_files;
DROP POLICY IF EXISTS "Members can view org project files" ON project_files;
CREATE POLICY "Org members can access project files" ON project_files FOR ALL
USING (org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid())));

-- project_folders - drop duplicates
DROP POLICY IF EXISTS "Org members can delete project folders" ON project_folders;
DROP POLICY IF EXISTS "Org members can modify project folders" ON project_folders;
DROP POLICY IF EXISTS "Org members can update project folders" ON project_folders;
-- Org members can access project folders already exists

-- project_history_events - consolidate
DROP POLICY IF EXISTS "System can insert project history" ON project_history_events;
DROP POLICY IF EXISTS "Users can view project history" ON project_history_events;
CREATE POLICY "Org members can access project history" ON project_history_events FOR ALL
USING (org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid())));

-- project_observations - consolidate
DROP POLICY IF EXISTS "Members can create observations" ON project_observations;
DROP POLICY IF EXISTS "Members can delete observations" ON project_observations;
DROP POLICY IF EXISTS "Members can update observations" ON project_observations;
DROP POLICY IF EXISTS "Members can view org observations" ON project_observations;
CREATE POLICY "Org members can access project observations" ON project_observations FOR ALL
USING (project_id IN (SELECT p.id FROM projects p 
  JOIN organization_members om ON p.org_id = om.org_id 
  WHERE om.user_id = (select auth.uid()) AND om.status = 'active'));

-- project_stakeholders - consolidate
DROP POLICY IF EXISTS "Project admins can manage stakeholders" ON project_stakeholders;
DROP POLICY IF EXISTS "Project members can view stakeholders" ON project_stakeholders;
CREATE POLICY "Org members can access project stakeholders" ON project_stakeholders FOR ALL
USING (org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid())));

-- project_tasks - consolidate
DROP POLICY IF EXISTS "Members can view tasks" ON project_tasks;
CREATE POLICY "Org members can access project tasks" ON project_tasks FOR ALL
USING (project_id IN (SELECT p.id FROM projects p 
  JOIN organization_members om ON p.org_id = om.org_id 
  WHERE om.user_id = (select auth.uid()) AND om.status = 'active'));

-- projects - consolidate
DROP POLICY IF EXISTS "Users can create projects in their org" ON projects;
DROP POLICY IF EXISTS "Users can delete projects in their org" ON projects;
DROP POLICY IF EXISTS "Users can update projects in their org" ON projects;
DROP POLICY IF EXISTS "Users can view projects in their org" ON projects;
CREATE POLICY "Org members can access projects" ON projects FOR ALL
USING (org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid())));;
