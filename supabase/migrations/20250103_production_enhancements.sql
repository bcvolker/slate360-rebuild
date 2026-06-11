-- =====================================================
-- SLATE360 PRODUCTION ENHANCEMENTS
-- Additional tables and features for production SaaS
-- =====================================================

-- =====================================================
-- 1. SYSTEM HEALTH & MONITORING TABLES
-- =====================================================

-- System health checks
CREATE TABLE IF NOT EXISTS public.system_health (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
  response_time_ms INTEGER,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);
-- Background job queue
CREATE TABLE IF NOT EXISTS public.background_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_type TEXT NOT NULL,
  job_data JSONB DEFAULT '{}'::jsonb,
  priority INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  max_attempts INTEGER DEFAULT 3,
  attempt_count INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- 2. NOTIFICATION SYSTEM
-- =====================================================

-- Notification templates
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  subject_template TEXT,
  body_template TEXT,
  email_template TEXT,
  notification_type TEXT NOT NULL, -- 'email', 'in_app', 'push', 'sms'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- User notifications
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Notification details
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT DEFAULT 'info', -- 'info', 'success', 'warning', 'error'
  category TEXT, -- 'project', 'billing', 'system', 'integration'

  -- Delivery methods
  email_sent BOOLEAN DEFAULT false,
  in_app_read BOOLEAN DEFAULT false,
  push_sent BOOLEAN DEFAULT false,

  -- Metadata
  action_url TEXT, -- URL to redirect when clicked
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- 3. RATE LIMITING & ABUSE PREVENTION
-- =====================================================

-- API rate limits
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identifier TEXT NOT NULL, -- IP, user_id, org_id
  identifier_type TEXT NOT NULL, -- 'ip', 'user', 'org'
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  window_end TIMESTAMPTZ,
  limit_exceeded BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Suspicious activity log
CREATE TABLE IF NOT EXISTS public.suspicious_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id),
  org_id UUID REFERENCES public.organizations(id),

  -- Activity details
  activity_type TEXT NOT NULL, -- 'failed_login', 'rate_limit', 'suspicious_ip'
  severity TEXT DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
  description TEXT,

  -- Context
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Response
  action_taken TEXT, -- 'logged', 'blocked', 'notified'
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- 4. DATA EXPORT & BACKUP TABLES
-- =====================================================

-- Data export requests
CREATE TABLE IF NOT EXISTS public.data_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requested_by UUID REFERENCES public.profiles(id),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Export details
  export_type TEXT NOT NULL, -- 'project', 'organization', 'all_data'
  resource_id UUID, -- Project ID if project export
  format TEXT DEFAULT 'json', -- 'json', 'csv', 'pdf'
  include_attachments BOOLEAN DEFAULT false,

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  file_url TEXT,
  file_size INTEGER,
  expires_at TIMESTAMPTZ,

  -- Progress
  progress_percentage INTEGER DEFAULT 0,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
-- Backup history
CREATE TABLE IF NOT EXISTS public.backup_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  backup_type TEXT NOT NULL, -- 'automatic', 'manual', 'pre_deployment'
  status TEXT DEFAULT 'completed', -- 'in_progress', 'completed', 'failed'

  -- Backup details
  file_path TEXT,
  file_size INTEGER,
  record_count INTEGER,
  tables_backed_up TEXT[],

  -- Metadata
  initiated_by UUID REFERENCES public.profiles(id),
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
-- =====================================================
-- 5. FEATURE FLAGS & EXPERIMENTATION
-- =====================================================

-- Feature flags
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT,
  description TEXT,

  -- Flag settings
  is_enabled BOOLEAN DEFAULT false,
  rollout_percentage INTEGER DEFAULT 0, -- 0-100
  target_audience JSONB DEFAULT '{}'::jsonb, -- org_ids, user_ids, etc.

  -- Metadata
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Feature flag overrides (for specific users/orgs)
CREATE TABLE IF NOT EXISTS public.feature_flag_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feature_flag_id UUID REFERENCES public.feature_flags(id) ON DELETE CASCADE,

  -- Override target
  target_type TEXT NOT NULL, -- 'user', 'org', 'global'
  target_id UUID, -- user_id or org_id

  -- Override value
  is_enabled BOOLEAN NOT NULL,

  -- Metadata
  created_by UUID REFERENCES public.profiles(id),
  reason TEXT,
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- A/B test experiments
CREATE TABLE IF NOT EXISTS public.ab_experiments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT,
  description TEXT,

  -- Experiment settings
  status TEXT DEFAULT 'draft', -- 'draft', 'running', 'completed', 'stopped'
  variants JSONB DEFAULT '[]'::jsonb, -- [{name: 'control', weight: 50}, {name: 'variant_a', weight: 50}]

  -- Target audience
  target_percentage INTEGER DEFAULT 100,
  target_filters JSONB DEFAULT '{}'::jsonb,

  -- Results
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  winner_variant TEXT,

  -- Metadata
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- 6. PERFORMANCE MONITORING
-- =====================================================

-- API performance logs
CREATE TABLE IF NOT EXISTS public.api_performance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,

  -- Performance metrics
  response_time_ms INTEGER,
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,

  -- Request details
  user_id UUID REFERENCES public.profiles(id),
  org_id UUID REFERENCES public.organizations(id),
  ip_address TEXT,
  user_agent TEXT,

  -- Error details
  error_message TEXT,
  stack_trace TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Database query performance
CREATE TABLE IF NOT EXISTS public.query_performance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query_type TEXT NOT NULL, -- 'select', 'insert', 'update', 'delete'
  table_name TEXT,
  execution_time_ms INTEGER,
  row_count INTEGER,
  query_plan JSONB,

  -- Context
  user_id UUID REFERENCES public.profiles(id),
  org_id UUID REFERENCES public.organizations(id),
  endpoint TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- 7. COMPLIANCE & AUDIT TABLES
-- =====================================================

-- GDPR data requests
CREATE TABLE IF NOT EXISTS public.gdpr_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id),
  request_type TEXT NOT NULL, -- 'access', 'delete', 'rectify', 'restrict'

  -- Request details
  description TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'rejected'

  -- Processing
  processed_by UUID REFERENCES public.profiles(id),
  processed_at TIMESTAMPTZ,
  completion_notes TEXT,

  -- Data export (for access requests)
  export_file_url TEXT,
  export_completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Data retention policies
CREATE TABLE IF NOT EXISTS public.data_retention_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  data_type TEXT NOT NULL, -- 'user_data', 'logs', 'temp_files', 'backups'
  retention_days INTEGER NOT NULL,
  deletion_method TEXT DEFAULT 'hard_delete', -- 'hard_delete', 'soft_delete', 'archive'

  -- Policy settings
  is_active BOOLEAN DEFAULT true,
  auto_delete BOOLEAN DEFAULT true,

  -- Compliance
  legal_basis TEXT,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_system_health_service_name ON public.system_health(service_name);
CREATE INDEX IF NOT EXISTS idx_system_health_checked_at ON public.system_health(checked_at);
CREATE INDEX IF NOT EXISTS idx_background_jobs_status ON public.background_jobs(status);
CREATE INDEX IF NOT EXISTS idx_background_jobs_scheduled_at ON public.background_jobs(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON public.user_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_identifier ON public.api_rate_limits(identifier);
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_created_at ON public.suspicious_activity(created_at);
CREATE INDEX IF NOT EXISTS idx_data_exports_requested_by ON public.data_exports(requested_by);
CREATE INDEX IF NOT EXISTS idx_data_exports_status ON public.data_exports(status);
CREATE INDEX IF NOT EXISTS idx_feature_flags_name ON public.feature_flags(name);
CREATE INDEX IF NOT EXISTS idx_feature_flag_overrides_feature_flag_id ON public.feature_flag_overrides(feature_flag_id);
CREATE INDEX IF NOT EXISTS idx_ab_experiments_status ON public.ab_experiments(status);
CREATE INDEX IF NOT EXISTS idx_api_performance_logs_endpoint ON public.api_performance_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_performance_logs_created_at ON public.api_performance_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_user_id ON public.gdpr_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_status ON public.gdpr_requests(status);
-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE public.system_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suspicious_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flag_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_performance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.query_performance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;
-- System health: Service role only
CREATE POLICY "Service role can manage system health" ON public.system_health
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
-- Background jobs: Service role only
CREATE POLICY "Service role can manage background jobs" ON public.background_jobs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
-- Notification templates: Service role only
CREATE POLICY "Service role can manage notification templates" ON public.notification_templates
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
-- User notifications: Users can view their own
CREATE POLICY "Users can view own notifications" ON public.user_notifications
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Service role can manage notifications" ON public.user_notifications
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
-- API rate limits: Service role only
CREATE POLICY "Service role can manage rate limits" ON public.api_rate_limits
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
-- Suspicious activity: Service role only
CREATE POLICY "Service role can manage suspicious activity" ON public.suspicious_activity
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
-- Data exports: Users can view their own requests
CREATE POLICY "Users can view own data exports" ON public.data_exports
  FOR SELECT USING (requested_by = auth.uid());
CREATE POLICY "Users can create data export requests" ON public.data_exports
  FOR INSERT WITH CHECK (requested_by = auth.uid());
-- Feature flags: Everyone can read, service role can manage
CREATE POLICY "Anyone can view feature flags" ON public.feature_flags
  FOR SELECT USING (true);
CREATE POLICY "Service role can manage feature flags" ON public.feature_flags
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
-- Feature flag overrides: Service role only
CREATE POLICY "Service role can manage feature overrides" ON public.feature_flag_overrides
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
-- A/B experiments: Service role only
CREATE POLICY "Service role can manage experiments" ON public.ab_experiments
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
-- Performance logs: Service role only
CREATE POLICY "Service role can view performance logs" ON public.api_performance_logs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role can view query logs" ON public.query_performance_logs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
-- GDPR requests: Users can view their own, service role can manage all
CREATE POLICY "Users can view own GDPR requests" ON public.gdpr_requests
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create GDPR requests" ON public.gdpr_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Service role can manage GDPR requests" ON public.gdpr_requests
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
-- Data retention policies: Service role only
CREATE POLICY "Service role can manage retention policies" ON public.data_retention_policies
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
-- Grant permissions on new tables
GRANT ALL ON public.system_health TO service_role;
GRANT ALL ON public.background_jobs TO service_role;
GRANT ALL ON public.notification_templates TO service_role;
GRANT ALL ON public.user_notifications TO authenticated;
GRANT ALL ON public.api_rate_limits TO service_role;
GRANT ALL ON public.suspicious_activity TO service_role;
GRANT ALL ON public.data_exports TO authenticated;
GRANT ALL ON public.backup_history TO service_role;
GRANT SELECT ON public.feature_flags TO authenticated;
GRANT ALL ON public.feature_flags TO service_role;
GRANT ALL ON public.feature_flag_overrides TO service_role;
GRANT ALL ON public.ab_experiments TO service_role;
GRANT ALL ON public.api_performance_logs TO service_role;
GRANT ALL ON public.query_performance_logs TO service_role;
GRANT ALL ON public.gdpr_requests TO authenticated;
GRANT ALL ON public.gdpr_requests TO service_role;
GRANT ALL ON public.data_retention_policies TO service_role;
-- =====================================================
-- UPDATE TRIGGERS FOR NEW TABLES
-- =====================================================

-- Apply update triggers to new tables
CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON notification_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_notifications_updated_at BEFORE UPDATE ON user_notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_exports_updated_at BEFORE UPDATE ON data_exports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_feature_flag_overrides_updated_at BEFORE UPDATE ON feature_flag_overrides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ab_experiments_updated_at BEFORE UPDATE ON ab_experiments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gdpr_requests_updated_at BEFORE UPDATE ON gdpr_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_retention_policies_updated_at BEFORE UPDATE ON data_retention_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- =====================================================
-- DEFAULT DATA INSERTS
-- =====================================================

-- Insert default notification templates
INSERT INTO public.notification_templates (name, subject_template, body_template, notification_type) VALUES
  ('welcome_email', 'Welcome to Slate360!', 'Welcome {{user_name}}! Your account has been created successfully.', 'email'),
  ('project_invitation', 'You''ve been invited to join {{project_name}}', 'You have been invited to collaborate on {{project_name}}.', 'email'),
  ('payment_failed', 'Payment Failed', 'Your payment of ${{amount}} has failed. Please update your payment method.', 'email'),
  ('trial_expiring', 'Your trial expires in {{days_left}} days', 'Your free trial will expire on {{expiration_date}}. Upgrade now to continue using Slate360.', 'email')
ON CONFLICT (name) DO NOTHING;
-- Insert default data retention policies
INSERT INTO public.data_retention_policies (table_name, data_type, retention_days, legal_basis) VALUES
  ('user_notifications', 'user_data', 365, 'User consent and service improvement'),
  ('api_performance_logs', 'logs', 90, 'System monitoring and debugging'),
  ('audit_log', 'logs', 2555, 'Legal compliance and security'),
  ('suspicious_activity', 'logs', 365, 'Security and fraud prevention'),
  ('backup_history', 'backups', 365, 'Data recovery and business continuity')
ON CONFLICT DO NOTHING;
-- =====================================================
-- SUCCESS! Production enhancements added.
-- =====================================================;;
