-- Fix remaining service role policies with initplan optimization
-- These policies are using current_setting() without the initplan wrapper

-- user_notifications: Service role can manage notifications
DROP POLICY IF EXISTS "Service role can manage notifications" ON user_notifications;
CREATE POLICY "Service role can manage notifications" ON user_notifications
  FOR ALL USING ((select current_setting('role', true)) = 'service_role');

-- api_rate_limits: Service role can manage rate limits
DROP POLICY IF EXISTS "Service role can manage rate limits" ON api_rate_limits;
CREATE POLICY "Service role can manage rate limits" ON api_rate_limits
  FOR ALL USING ((select current_setting('role', true)) = 'service_role');

-- suspicious_activity: Service role can manage suspicious activity
DROP POLICY IF EXISTS "Service role can manage suspicious activity" ON suspicious_activity;
CREATE POLICY "Service role can manage suspicious activity" ON suspicious_activity
  FOR ALL USING ((select current_setting('role', true)) = 'service_role');

-- feature_flags: Service role can manage feature flags
DROP POLICY IF EXISTS "Service role can manage feature flags" ON feature_flags;
CREATE POLICY "Service role can manage feature flags" ON feature_flags
  FOR ALL USING ((select current_setting('role', true)) = 'service_role');

-- system_health: Service role can manage system health
DROP POLICY IF EXISTS "Service role can manage system health" ON system_health;
CREATE POLICY "Service role can manage system health" ON system_health
  FOR ALL USING ((select current_setting('role', true)) = 'service_role');

-- background_jobs: Service role can manage background jobs
DROP POLICY IF EXISTS "Service role can manage background jobs" ON background_jobs;
CREATE POLICY "Service role can manage background jobs" ON background_jobs
  FOR ALL USING ((select current_setting('role', true)) = 'service_role');

-- notification_templates: Service role can manage notification templates
DROP POLICY IF EXISTS "Service role can manage notification templates" ON notification_templates;
CREATE POLICY "Service role can manage notification templates" ON notification_templates
  FOR ALL USING ((select current_setting('role', true)) = 'service_role');

-- feature_flag_overrides: Service role can manage feature overrides
DROP POLICY IF EXISTS "Service role can manage feature overrides" ON feature_flag_overrides;
CREATE POLICY "Service role can manage feature overrides" ON feature_flag_overrides
  FOR ALL USING ((select current_setting('role', true)) = 'service_role');

-- ab_experiments: Service role can manage experiments
DROP POLICY IF EXISTS "Service role can manage experiments" ON ab_experiments;
CREATE POLICY "Service role can manage experiments" ON ab_experiments
  FOR ALL USING ((select current_setting('role', true)) = 'service_role');

-- api_performance_logs: Service role can view performance logs
DROP POLICY IF EXISTS "Service role can view performance logs" ON api_performance_logs;
CREATE POLICY "Service role can view performance logs" ON api_performance_logs
  FOR ALL USING ((select current_setting('role', true)) = 'service_role');

-- query_performance_logs: Service role can view query logs
DROP POLICY IF EXISTS "Service role can view query logs" ON query_performance_logs;
CREATE POLICY "Service role can view query logs" ON query_performance_logs
  FOR ALL USING ((select current_setting('role', true)) = 'service_role');

-- data_retention_policies: Service role can manage retention policies
DROP POLICY IF EXISTS "Service role can manage retention policies" ON data_retention_policies;
CREATE POLICY "Service role can manage retention policies" ON data_retention_policies
  FOR ALL USING ((select current_setting('role', true)) = 'service_role');

-- organizations: Service role full access
DROP POLICY IF EXISTS "Service role full access" ON organizations;
CREATE POLICY "Service role full access" ON organizations
  FOR ALL USING ((select current_setting('role', true)) = 'service_role');

-- project_members: Service role full access
DROP POLICY IF EXISTS "Service role full access" ON project_members;
CREATE POLICY "Service role full access" ON project_members
  FOR ALL USING ((select current_setting('role', true)) = 'service_role');

-- punch_items: Service role full access
DROP POLICY IF EXISTS "Service role full access" ON punch_items;
CREATE POLICY "Service role full access" ON punch_items
  FOR ALL USING ((select current_setting('role', true)) = 'service_role');

-- daily_logs: Service role full access
DROP POLICY IF EXISTS "Service role full access" ON daily_logs;
CREATE POLICY "Service role full access" ON daily_logs
  FOR ALL USING ((select current_setting('role', true)) = 'service_role');

-- meetings: Service role full access
DROP POLICY IF EXISTS "Service role full access" ON meetings;
CREATE POLICY "Service role full access" ON meetings
  FOR ALL USING ((select current_setting('role', true)) = 'service_role');

-- inspections: Service role full access
DROP POLICY IF EXISTS "Service role full access" ON inspections;
CREATE POLICY "Service role full access" ON inspections
  FOR ALL USING ((select current_setting('role', true)) = 'service_role');;
