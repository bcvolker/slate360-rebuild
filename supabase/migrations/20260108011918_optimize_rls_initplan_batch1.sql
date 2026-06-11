-- Optimize RLS policies to use (select auth.uid()) for better performance
-- Batch 1: assets, autodesk_sync_queue, backup_history, budget_line_items, change_orders

-- assets
DROP POLICY IF EXISTS "Org members can create assets" ON assets;
CREATE POLICY "Org members can create assets" ON assets FOR INSERT
WITH CHECK (organization_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Org members can update assets" ON assets;
CREATE POLICY "Org members can update assets" ON assets FOR UPDATE
USING (organization_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Org members can view assets" ON assets;
CREATE POLICY "Org members can view assets" ON assets FOR SELECT
USING (organization_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid())));

-- autodesk_sync_queue
DROP POLICY IF EXISTS "Users can manage their org sync queue" ON autodesk_sync_queue;
CREATE POLICY "Users can manage their org sync queue" ON autodesk_sync_queue FOR ALL
USING (org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid()) AND organization_members.status = 'active'));

-- backup_history
DROP POLICY IF EXISTS "Users can view their initiated backups" ON backup_history;
CREATE POLICY "Users can view their initiated backups" ON backup_history FOR SELECT
USING (initiated_by = (select auth.uid()));

-- budget_line_items - consolidate multiple policies
DROP POLICY IF EXISTS "Org members can access budget" ON budget_line_items;
DROP POLICY IF EXISTS "Project members can manage budget items" ON budget_line_items;
DROP POLICY IF EXISTS "Project members can view budget items" ON budget_line_items;
CREATE POLICY "Org members can access budget" ON budget_line_items FOR ALL
USING (org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid()) AND organization_members.status = 'active'));

-- change_orders - consolidate
DROP POLICY IF EXISTS "Project members can manage change orders" ON change_orders;
DROP POLICY IF EXISTS "Project members can view change orders" ON change_orders;
CREATE POLICY "Org members can access change orders" ON change_orders FOR ALL
USING (project_id IN (SELECT projects.id FROM projects WHERE projects.org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid()))));;
