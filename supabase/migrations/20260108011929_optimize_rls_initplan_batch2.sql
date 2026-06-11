-- Batch 2: completion_certificates, credit_ledger, credit_purchases, credits, daily_reports, data_exports

-- completion_certificates - consolidate
DROP POLICY IF EXISTS "Project members can manage certificates" ON completion_certificates;
DROP POLICY IF EXISTS "Project members can view certificates" ON completion_certificates;
CREATE POLICY "Org members can access certificates" ON completion_certificates FOR ALL
USING (project_id IN (SELECT projects.id FROM projects WHERE projects.org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid()))));

-- credit_ledger
DROP POLICY IF EXISTS "Org members can view credit ledger" ON credit_ledger;
CREATE POLICY "Org members can view credit ledger" ON credit_ledger FOR SELECT
USING (organization_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid())));

-- credit_purchases
DROP POLICY IF EXISTS "Members can view org purchases" ON credit_purchases;
CREATE POLICY "Members can view org purchases" ON credit_purchases FOR SELECT
USING (org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid())));

-- credits
DROP POLICY IF EXISTS "Org members can manage credits" ON credits;
CREATE POLICY "Org members can manage credits" ON credits FOR ALL
USING (org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid()) AND organization_members.status = 'active'));

-- daily_reports - consolidate
DROP POLICY IF EXISTS "Members can manage org daily reports" ON daily_reports;
DROP POLICY IF EXISTS "Members can view org daily reports" ON daily_reports;
CREATE POLICY "Org members can access daily reports" ON daily_reports FOR ALL
USING (org_id IN (SELECT organization_members.org_id FROM organization_members WHERE organization_members.user_id = (select auth.uid())));

-- data_exports
DROP POLICY IF EXISTS "Users can create data export requests" ON data_exports;
CREATE POLICY "Users can create data export requests" ON data_exports FOR INSERT
WITH CHECK (requested_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own data exports" ON data_exports;
CREATE POLICY "Users can view own data exports" ON data_exports FOR SELECT
USING (requested_by = (select auth.uid()));;
