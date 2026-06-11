-- Optimize service role policies (these use current_setting checks)
-- Service role policies should be simplified to just check the role

-- user_notifications - fix service role policy
DROP POLICY IF EXISTS "Service role can manage notifications" ON user_notifications;
CREATE POLICY "Service role can manage notifications" ON user_notifications FOR ALL
USING (current_setting('role') = 'service_role');

-- api_rate_limits
DROP POLICY IF EXISTS "Service role can manage rate limits" ON api_rate_limits;
CREATE POLICY "Service role can manage rate limits" ON api_rate_limits FOR ALL
USING (current_setting('role') = 'service_role');

-- suspicious_activity
DROP POLICY IF EXISTS "Service role can manage suspicious activity" ON suspicious_activity;
CREATE POLICY "Service role can manage suspicious activity" ON suspicious_activity FOR ALL
USING (current_setting('role') = 'service_role');

-- feature_flags
DROP POLICY IF EXISTS "Service role can manage feature flags" ON feature_flags;
CREATE POLICY "Service role can manage feature flags" ON feature_flags FOR ALL
USING (current_setting('role') = 'service_role');
CREATE POLICY "Anyone can view feature flags" ON feature_flags FOR SELECT
USING (true);

-- system_health
DROP POLICY IF EXISTS "Service role can manage system health" ON system_health;
CREATE POLICY "Service role can manage system health" ON system_health FOR ALL
USING (current_setting('role') = 'service_role');

-- background_jobs
DROP POLICY IF EXISTS "Service role can manage background jobs" ON background_jobs;
CREATE POLICY "Service role can manage background jobs" ON background_jobs FOR ALL
USING (current_setting('role') = 'service_role');

-- notification_templates
DROP POLICY IF EXISTS "Service role can manage notification templates" ON notification_templates;
CREATE POLICY "Service role can manage notification templates" ON notification_templates FOR ALL
USING (current_setting('role') = 'service_role');

-- feature_flag_overrides
DROP POLICY IF EXISTS "Service role can manage feature overrides" ON feature_flag_overrides;
CREATE POLICY "Service role can manage feature overrides" ON feature_flag_overrides FOR ALL
USING (current_setting('role') = 'service_role');

-- ab_experiments
DROP POLICY IF EXISTS "Service role can manage experiments" ON ab_experiments;
CREATE POLICY "Service role can manage experiments" ON ab_experiments FOR ALL
USING (current_setting('role') = 'service_role');

-- api_performance_logs
DROP POLICY IF EXISTS "Service role can view performance logs" ON api_performance_logs;
CREATE POLICY "Service role can view performance logs" ON api_performance_logs FOR SELECT
USING (current_setting('role') = 'service_role');

-- query_performance_logs
DROP POLICY IF EXISTS "Service role can view query logs" ON query_performance_logs;
CREATE POLICY "Service role can view query logs" ON query_performance_logs FOR SELECT
USING (current_setting('role') = 'service_role');

-- data_retention_policies
DROP POLICY IF EXISTS "Service role can manage retention policies" ON data_retention_policies;
CREATE POLICY "Service role can manage retention policies" ON data_retention_policies FOR ALL
USING (current_setting('role') = 'service_role');

-- organizations
DROP POLICY IF EXISTS "Service role full access" ON organizations;
CREATE POLICY "Service role full access" ON organizations FOR ALL
USING (current_setting('role') = 'service_role');

-- project_members
DROP POLICY IF EXISTS "Service role full access" ON project_members;
CREATE POLICY "Service role full access" ON project_members FOR ALL
USING (current_setting('role') = 'service_role');

-- punch_items
DROP POLICY IF EXISTS "Service role full access" ON punch_items;
CREATE POLICY "Service role full access" ON punch_items FOR ALL
USING (current_setting('role') = 'service_role');

-- daily_logs
DROP POLICY IF EXISTS "Service role full access" ON daily_logs;
CREATE POLICY "Service role full access" ON daily_logs FOR ALL
USING (current_setting('role') = 'service_role');

-- meetings
DROP POLICY IF EXISTS "Service role full access" ON meetings;
CREATE POLICY "Service role full access" ON meetings FOR ALL
USING (current_setting('role') = 'service_role');

-- inspections
DROP POLICY IF EXISTS "Service role full access" ON inspections;
CREATE POLICY "Service role full access" ON inspections FOR ALL
USING (current_setting('role') = 'service_role');

-- unified_files - optimize
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON unified_files;
CREATE POLICY "Enable all access for authenticated users" ON unified_files FOR ALL
USING ((select auth.uid()) IS NOT NULL);

-- file_folders - optimize
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON file_folders;
CREATE POLICY "Enable all access for authenticated users" ON file_folders FOR ALL
USING ((select auth.uid()) IS NOT NULL);;
