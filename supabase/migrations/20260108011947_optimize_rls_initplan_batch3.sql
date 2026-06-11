-- Batch 3: deficiencies, design_studio tables

-- deficiencies - consolidate
DROP POLICY IF EXISTS "Users can manage Deficiencies in their org" ON deficiencies;
DROP POLICY IF EXISTS "Users can view Deficiencies in their org" ON deficiencies;
CREATE POLICY "Org members can access deficiencies" ON deficiencies FOR ALL
USING (org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid())));

-- design_studio_annotations
DROP POLICY IF EXISTS "Users can create annotations for projects they have access to" ON design_studio_annotations;
DROP POLICY IF EXISTS "Users can view annotations for projects they have access to" ON design_studio_annotations;
CREATE POLICY "Users can access annotations" ON design_studio_annotations FOR ALL
USING (EXISTS (SELECT 1 FROM design_studio_projects dsp JOIN projects p ON p.id = dsp.project_id 
  WHERE dsp.id = design_studio_annotations.project_id 
  AND (p.created_by = (select auth.uid()) OR p.org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid())))));

-- design_studio_assets
DROP POLICY IF EXISTS "Users can manage design studio assets" ON design_studio_assets;
CREATE POLICY "Users can manage design studio assets" ON design_studio_assets FOR ALL
USING (project_id IN (SELECT dsp.id FROM design_studio_projects dsp 
  JOIN projects p ON dsp.project_id = p.id 
  JOIN organization_members om ON p.org_id = om.org_id 
  WHERE om.user_id = (select auth.uid()) AND om.status = 'active'));

-- design_studio_exports
DROP POLICY IF EXISTS "Users can manage design exports" ON design_studio_exports;
CREATE POLICY "Users can manage design exports" ON design_studio_exports FOR ALL
USING (project_id IN (SELECT dsp.id FROM design_studio_projects dsp 
  JOIN projects p ON dsp.project_id = p.id 
  JOIN organization_members om ON p.org_id = om.org_id 
  WHERE om.user_id = (select auth.uid()) AND om.status = 'active'));

-- design_studio_projects
DROP POLICY IF EXISTS "Users can create design projects for projects they own" ON design_studio_projects;
DROP POLICY IF EXISTS "Users can update design projects they have access to" ON design_studio_projects;
DROP POLICY IF EXISTS "Users can view design projects they have access to" ON design_studio_projects;
CREATE POLICY "Users can access design projects" ON design_studio_projects FOR ALL
USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = design_studio_projects.project_id 
  AND (p.created_by = (select auth.uid()) OR p.org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid())))));

-- design_studio_sessions - consolidate
DROP POLICY IF EXISTS "Users can manage their own sessions" ON design_studio_sessions;
DROP POLICY IF EXISTS "Users can view sessions for projects they have access to" ON design_studio_sessions;
CREATE POLICY "Users can access design sessions" ON design_studio_sessions FOR ALL
USING (user_id = (select auth.uid()) OR EXISTS (SELECT 1 FROM design_studio_projects dsp 
  JOIN projects p ON p.id = dsp.project_id 
  WHERE dsp.id = design_studio_sessions.project_id 
  AND p.org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid()))));

-- design_studio_versions
DROP POLICY IF EXISTS "Users can manage design versions" ON design_studio_versions;
CREATE POLICY "Users can manage design versions" ON design_studio_versions FOR ALL
USING (project_id IN (SELECT dsp.id FROM design_studio_projects dsp 
  JOIN projects p ON dsp.project_id = p.id 
  JOIN organization_members om ON p.org_id = om.org_id 
  WHERE om.user_id = (select auth.uid()) AND om.status = 'active'));;
