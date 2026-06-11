-- =====================================================
-- SAFE MIGRATION PREP SCRIPT
-- Run this FIRST to clean up existing policies/triggers
-- Then you can re-run any migration file safely
-- 
-- NOTE: Uses DO blocks to safely drop policies only if
-- the table exists, avoiding "relation does not exist" errors
-- =====================================================

DO $$ 
BEGIN
  -- =====================================================
  -- 001_org_usage.sql policies and triggers
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'org_usage') THEN
    DROP POLICY IF EXISTS "Members can view org usage" ON public.org_usage;
    DROP TRIGGER IF EXISTS update_org_usage_updated_at ON public.org_usage;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'org_usage_events') THEN
    DROP POLICY IF EXISTS "Members can view org usage events" ON public.org_usage_events;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'credit_packs') THEN
    DROP POLICY IF EXISTS "Anyone can view credit packs" ON public.credit_packs;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'credit_purchases') THEN
    DROP POLICY IF EXISTS "Members can view org purchases" ON public.credit_purchases;
  END IF;

  -- =====================================================
  -- 20241209_project_files.sql policies
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_files') THEN
    DROP POLICY IF EXISTS "Members can view org project files" ON public.project_files;
    DROP POLICY IF EXISTS "Members can insert org project files" ON public.project_files;
    DROP POLICY IF EXISTS "Members can update org project files" ON public.project_files;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_file_links') THEN
    DROP POLICY IF EXISTS "Members can view org file links" ON public.project_file_links;
    DROP POLICY IF EXISTS "Members can create org file links" ON public.project_file_links;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_folders') THEN
    DROP POLICY IF EXISTS "Members can view org folders" ON public.project_folders;
    DROP POLICY IF EXISTS "Members can manage org folders" ON public.project_folders;
    DROP POLICY IF EXISTS "Project members can view folders" ON public.project_folders;
    DROP POLICY IF EXISTS "Project admins can manage folders" ON public.project_folders;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'org_upload_limits') THEN
    DROP POLICY IF EXISTS "Members can view org upload limits" ON public.org_upload_limits;
  END IF;

  -- =====================================================
  -- 20241210_activity_log.sql policies
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_activity') THEN
    DROP POLICY IF EXISTS "Members can view org activity" ON public.project_activity;
    DROP POLICY IF EXISTS "Members can insert org activity" ON public.project_activity;
    DROP POLICY IF EXISTS "Members can update org activity" ON public.project_activity;
  END IF;

  -- =====================================================
  -- 20241210_project_assets.sql policies
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_assets') THEN
    DROP POLICY IF EXISTS "Members can view org assets" ON public.project_assets;
    DROP POLICY IF EXISTS "Members can insert org assets" ON public.project_assets;
    DROP POLICY IF EXISTS "Members can update org assets" ON public.project_assets;
    DROP POLICY IF EXISTS "Members can delete org assets" ON public.project_assets;
  END IF;

  -- =====================================================
  -- 20241210_enterprise_seats.sql policies
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'org_roles') THEN
    DROP POLICY IF EXISTS "Members can view org roles" ON public.org_roles;
    DROP POLICY IF EXISTS "Admins can manage org roles" ON public.org_roles;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'org_invites') THEN
    DROP POLICY IF EXISTS "Members can view org invites" ON public.org_invites;
    DROP POLICY IF EXISTS "Seat managers can manage invites" ON public.org_invites;
  END IF;

  -- =====================================================
  -- 20241210_analytics_events.sql policies
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'analytics_events') THEN
    DROP POLICY IF EXISTS "Members can view org analytics events" ON public.analytics_events;
    DROP POLICY IF EXISTS "Members can insert org analytics events" ON public.analytics_events;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'analytics_budget_aggregates') THEN
    DROP POLICY IF EXISTS "Members can view org budget aggregates" ON public.analytics_budget_aggregates;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'analytics_schedule_aggregates') THEN
    DROP POLICY IF EXISTS "Members can view org schedule aggregates" ON public.analytics_schedule_aggregates;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'analytics_rfi_submittal_aggregates') THEN
    DROP POLICY IF EXISTS "Members can view org rfi submittal aggregates" ON public.analytics_rfi_submittal_aggregates;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'analytics_daily_log_aggregates') THEN
    DROP POLICY IF EXISTS "Members can view org daily log aggregates" ON public.analytics_daily_log_aggregates;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'analytics_file_aggregates') THEN
    DROP POLICY IF EXISTS "Members can view org file aggregates" ON public.analytics_file_aggregates;
  END IF;

  -- =====================================================
  -- 20241210_feature_suggestions.sql policies
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'feature_suggestions') THEN
    DROP POLICY IF EXISTS "Users can view own suggestions" ON public.feature_suggestions;
    DROP POLICY IF EXISTS "Org admins can view org suggestions" ON public.feature_suggestions;
    DROP POLICY IF EXISTS "Super admins can view all suggestions" ON public.feature_suggestions;
    DROP POLICY IF EXISTS "Users can insert own suggestions" ON public.feature_suggestions;
    DROP POLICY IF EXISTS "Super admins can update suggestions" ON public.feature_suggestions;
  END IF;

  -- =====================================================
  -- 008_budget_tables.sql policies
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'budget_versions') THEN
    DROP POLICY IF EXISTS "Members can view org budget versions" ON public.budget_versions;
    DROP POLICY IF EXISTS "Members can manage org budget versions" ON public.budget_versions;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'budget_line_items') THEN
    DROP POLICY IF EXISTS "Members can view budget line items" ON public.budget_line_items;
    DROP POLICY IF EXISTS "Members can manage budget line items" ON public.budget_line_items;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'budget_change_orders') THEN
    DROP POLICY IF EXISTS "Members can view change orders" ON public.budget_change_orders;
    DROP POLICY IF EXISTS "Members can manage change orders" ON public.budget_change_orders;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'budget_commitments') THEN
    DROP POLICY IF EXISTS "Members can view commitments" ON public.budget_commitments;
    DROP POLICY IF EXISTS "Members can manage commitments" ON public.budget_commitments;
  END IF;

  -- =====================================================
  -- 009_schedule_tables.sql policies
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schedule_versions') THEN
    DROP POLICY IF EXISTS "Members can view org schedule versions" ON public.schedule_versions;
    DROP POLICY IF EXISTS "Members can manage org schedule versions" ON public.schedule_versions;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schedule_tasks') THEN
    DROP POLICY IF EXISTS "Members can view schedule tasks" ON public.schedule_tasks;
    DROP POLICY IF EXISTS "Members can manage schedule tasks" ON public.schedule_tasks;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schedule_milestones') THEN
    DROP POLICY IF EXISTS "Members can view milestones" ON public.schedule_milestones;
    DROP POLICY IF EXISTS "Members can manage milestones" ON public.schedule_milestones;
  END IF;

  -- =====================================================
  -- 20241212_slatedrop.sql policies
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_templates') THEN
    DROP POLICY IF EXISTS "Members can view org templates" ON public.project_templates;
    DROP POLICY IF EXISTS "Admins can manage templates" ON public.project_templates;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'slate_drop_links') THEN
    DROP POLICY IF EXISTS "Org members can view drop links" ON public.slate_drop_links;
    DROP POLICY IF EXISTS "Admins can manage drop links" ON public.slate_drop_links;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'slate_drop_uploads') THEN
    DROP POLICY IF EXISTS "Org members can view uploads" ON public.slate_drop_uploads;
    DROP POLICY IF EXISTS "Admins can manage uploads" ON public.slate_drop_uploads;
    DROP POLICY IF EXISTS "Anyone can upload via valid link" ON public.slate_drop_uploads;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_cost_codes') THEN
    DROP POLICY IF EXISTS "Project members can view cost codes" ON public.project_cost_codes;
    DROP POLICY IF EXISTS "Project admins can manage cost codes" ON public.project_cost_codes;
  END IF;

END $$;
-- =====================================================
-- DONE! Now you can run any migration file safely.
-- =====================================================
SELECT 'All existing policies dropped safely. You can now run migrations.' as message;
