-- Migration: Fix security issues and add tier-based limits
-- Created: 2026-01-09
-- Description: 
--   1. Fix function search paths
--   2. Add missing RLS policies
--   3. Add tier limits to organizations
--   4. Fix duplicate RLS policies
--   5. Initialize credits for organizations
--   6. Add tier configuration table

-- ============================================
-- PART 1: Fix Function Search Paths (Security)
-- ============================================

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
-- Fix handle_new_user function (recreate with secure search_path)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;
-- ============================================
-- PART 2: Add Missing RLS Policies
-- ============================================

-- budget_change_orders policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view budget_change_orders" ON public.budget_change_orders;
  DROP POLICY IF EXISTS "Users can insert budget_change_orders" ON public.budget_change_orders;
  DROP POLICY IF EXISTS "Users can update budget_change_orders" ON public.budget_change_orders;
  DROP POLICY IF EXISTS "Users can delete budget_change_orders" ON public.budget_change_orders;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "Users can view budget_change_orders" ON public.budget_change_orders
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON om.org_id = p.org_id
      WHERE om.user_id = (SELECT auth.uid())
    )
  );
CREATE POLICY "Users can insert budget_change_orders" ON public.budget_change_orders
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON om.org_id = p.org_id
      WHERE om.user_id = (SELECT auth.uid())
    )
  );
CREATE POLICY "Users can update budget_change_orders" ON public.budget_change_orders
  FOR UPDATE USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON om.org_id = p.org_id
      WHERE om.user_id = (SELECT auth.uid())
    )
  );
CREATE POLICY "Users can delete budget_change_orders" ON public.budget_change_orders
  FOR DELETE USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON om.org_id = p.org_id
      WHERE om.user_id = (SELECT auth.uid())
    )
  );
-- budget_versions policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view budget_versions" ON public.budget_versions;
  DROP POLICY IF EXISTS "Users can insert budget_versions" ON public.budget_versions;
  DROP POLICY IF EXISTS "Users can update budget_versions" ON public.budget_versions;
  DROP POLICY IF EXISTS "Users can delete budget_versions" ON public.budget_versions;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "Users can view budget_versions" ON public.budget_versions
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON om.org_id = p.org_id
      WHERE om.user_id = (SELECT auth.uid())
    )
  );
CREATE POLICY "Users can insert budget_versions" ON public.budget_versions
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON om.org_id = p.org_id
      WHERE om.user_id = (SELECT auth.uid())
    )
  );
CREATE POLICY "Users can update budget_versions" ON public.budget_versions
  FOR UPDATE USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON om.org_id = p.org_id
      WHERE om.user_id = (SELECT auth.uid())
    )
  );
CREATE POLICY "Users can delete budget_versions" ON public.budget_versions
  FOR DELETE USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON om.org_id = p.org_id
      WHERE om.user_id = (SELECT auth.uid())
    )
  );
-- observations policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view observations" ON public.observations;
  DROP POLICY IF EXISTS "Users can insert observations" ON public.observations;
  DROP POLICY IF EXISTS "Users can update observations" ON public.observations;
  DROP POLICY IF EXISTS "Users can delete observations" ON public.observations;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "Users can view observations" ON public.observations
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON om.org_id = p.org_id
      WHERE om.user_id = (SELECT auth.uid())
    )
  );
CREATE POLICY "Users can insert observations" ON public.observations
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON om.org_id = p.org_id
      WHERE om.user_id = (SELECT auth.uid())
    )
  );
CREATE POLICY "Users can update observations" ON public.observations
  FOR UPDATE USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON om.org_id = p.org_id
      WHERE om.user_id = (SELECT auth.uid())
    )
  );
CREATE POLICY "Users can delete observations" ON public.observations
  FOR DELETE USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON om.org_id = p.org_id
      WHERE om.user_id = (SELECT auth.uid())
    )
  );
-- organization_integrations policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view org_integrations" ON public.organization_integrations;
  DROP POLICY IF EXISTS "Admins can manage org_integrations" ON public.organization_integrations;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "Users can view org_integrations" ON public.organization_integrations
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.organization_members
      WHERE user_id = (SELECT auth.uid())
    )
  );
CREATE POLICY "Admins can manage org_integrations" ON public.organization_integrations
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM public.organization_members
      WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );
-- schedule_milestones policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view schedule_milestones" ON public.schedule_milestones;
  DROP POLICY IF EXISTS "Users can insert schedule_milestones" ON public.schedule_milestones;
  DROP POLICY IF EXISTS "Users can update schedule_milestones" ON public.schedule_milestones;
  DROP POLICY IF EXISTS "Users can delete schedule_milestones" ON public.schedule_milestones;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "Users can view schedule_milestones" ON public.schedule_milestones
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON om.org_id = p.org_id
      WHERE om.user_id = (SELECT auth.uid())
    )
  );
CREATE POLICY "Users can insert schedule_milestones" ON public.schedule_milestones
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON om.org_id = p.org_id
      WHERE om.user_id = (SELECT auth.uid())
    )
  );
CREATE POLICY "Users can update schedule_milestones" ON public.schedule_milestones
  FOR UPDATE USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON om.org_id = p.org_id
      WHERE om.user_id = (SELECT auth.uid())
    )
  );
CREATE POLICY "Users can delete schedule_milestones" ON public.schedule_milestones
  FOR DELETE USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON om.org_id = p.org_id
      WHERE om.user_id = (SELECT auth.uid())
    )
  );
-- slatedrop_uploads policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view slatedrop_uploads" ON public.slatedrop_uploads;
  DROP POLICY IF EXISTS "Users can insert slatedrop_uploads" ON public.slatedrop_uploads;
  DROP POLICY IF EXISTS "Users can update slatedrop_uploads" ON public.slatedrop_uploads;
  DROP POLICY IF EXISTS "Users can delete slatedrop_uploads" ON public.slatedrop_uploads;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "Users can view slatedrop_uploads" ON public.slatedrop_uploads
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON om.org_id = p.org_id
      WHERE om.user_id = (SELECT auth.uid())
    )
  );
CREATE POLICY "Users can insert slatedrop_uploads" ON public.slatedrop_uploads
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON om.org_id = p.org_id
      WHERE om.user_id = (SELECT auth.uid())
    )
  );
CREATE POLICY "Users can update slatedrop_uploads" ON public.slatedrop_uploads
  FOR UPDATE USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON om.org_id = p.org_id
      WHERE om.user_id = (SELECT auth.uid())
    )
  );
CREATE POLICY "Users can delete slatedrop_uploads" ON public.slatedrop_uploads
  FOR DELETE USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON om.org_id = p.org_id
      WHERE om.user_id = (SELECT auth.uid())
    )
  );
-- ============================================
-- PART 3: Add Tier Limits to Organizations
-- ============================================

-- Add missing columns to organizations table
ALTER TABLE public.organizations 
  ADD COLUMN IF NOT EXISTS storage_limit_bytes BIGINT DEFAULT 1073741824, -- 1GB default
  ADD COLUMN IF NOT EXISTS monthly_compute_units INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS seats_limit INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS projects_limit INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS billing_email TEXT,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
-- Create tier_limits configuration table
CREATE TABLE IF NOT EXISTS public.tier_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tier_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  monthly_price_cents INTEGER NOT NULL DEFAULT 0,
  annual_price_cents INTEGER,
  storage_limit_bytes BIGINT NOT NULL DEFAULT 1073741824, -- 1GB
  monthly_compute_units INTEGER NOT NULL DEFAULT 50,
  seats_limit INTEGER NOT NULL DEFAULT 1,
  projects_limit INTEGER NOT NULL DEFAULT 3,
  features JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- Enable RLS on tier_limits
ALTER TABLE public.tier_limits ENABLE ROW LEVEL SECURITY;
-- Everyone can read tier limits (pricing page)
CREATE POLICY "Anyone can view tier_limits" ON public.tier_limits
  FOR SELECT USING (true);
-- Only admins can modify (via service role)
CREATE POLICY "Service role can manage tier_limits" ON public.tier_limits
  FOR ALL TO service_role USING (true);
-- Insert default tier limits
INSERT INTO public.tier_limits (tier_name, display_name, monthly_price_cents, annual_price_cents, storage_limit_bytes, monthly_compute_units, seats_limit, projects_limit, features, display_order)
VALUES 
  ('trial', 'Trial', 0, NULL, 1073741824, 50, 1, 3, '{"watermark": true, "support": "community"}', 0),
  ('beta', 'Beta', 2900, 29000, 10737418240, 200, 3, 10, '{"watermark": false, "support": "email"}', 1),
  ('creator', 'Creator', 7900, 79000, 53687091200, 500, 5, 25, '{"watermark": false, "support": "priority", "api_access": true}', 2),
  ('model', 'Model', 14900, 149000, 161061273600, 1500, 10, 100, '{"watermark": false, "support": "priority", "api_access": true, "custom_branding": true}', 3),
  ('business', 'Business', 29900, 299000, 536870912000, 5000, 25, -1, '{"watermark": false, "support": "dedicated", "api_access": true, "custom_branding": true, "sla": true}', 4),
  ('enterprise', 'Enterprise', 0, NULL, -1, -1, -1, -1, '{"watermark": false, "support": "dedicated", "api_access": true, "custom_branding": true, "sla": true, "custom_integrations": true}', 5)
ON CONFLICT (tier_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  monthly_price_cents = EXCLUDED.monthly_price_cents,
  annual_price_cents = EXCLUDED.annual_price_cents,
  storage_limit_bytes = EXCLUDED.storage_limit_bytes,
  monthly_compute_units = EXCLUDED.monthly_compute_units,
  seats_limit = EXCLUDED.seats_limit,
  projects_limit = EXCLUDED.projects_limit,
  features = EXCLUDED.features,
  display_order = EXCLUDED.display_order,
  updated_at = now();
-- ============================================
-- PART 4: Initialize Credits for Organizations
-- ============================================

-- Function to initialize credits for an organization
CREATE OR REPLACE FUNCTION public.initialize_org_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  tier_config public.tier_limits%ROWTYPE;
BEGIN
  -- Get tier configuration
  SELECT * INTO tier_config FROM public.tier_limits WHERE tier_name = COALESCE(NEW.tier, NEW.plan_type, 'trial');
  
  IF tier_config IS NULL THEN
    SELECT * INTO tier_config FROM public.tier_limits WHERE tier_name = 'trial';
  END IF;
  
  -- Create credits record if it doesn't exist
  INSERT INTO public.credits (org_id, balance, monthly_allocation)
  VALUES (NEW.id, tier_config.monthly_compute_units, tier_config.monthly_compute_units)
  ON CONFLICT (org_id) DO NOTHING;
  
  -- Update organization limits from tier
  NEW.storage_limit_bytes := tier_config.storage_limit_bytes;
  NEW.monthly_compute_units := tier_config.monthly_compute_units;
  NEW.seats_limit := tier_config.seats_limit;
  NEW.projects_limit := tier_config.projects_limit;
  
  RETURN NEW;
END;
$$;
-- Add unique constraint on credits.org_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'credits_org_id_key'
  ) THEN
    ALTER TABLE public.credits ADD CONSTRAINT credits_org_id_key UNIQUE (org_id);
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
-- Create trigger for new organizations
DROP TRIGGER IF EXISTS initialize_org_credits_trigger ON public.organizations;
CREATE TRIGGER initialize_org_credits_trigger
  BEFORE INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_org_credits();
-- Initialize credits for existing organizations
INSERT INTO public.credits (org_id, balance, monthly_allocation)
SELECT o.id, COALESCE(tl.monthly_compute_units, 50), COALESCE(tl.monthly_compute_units, 50)
FROM public.organizations o
LEFT JOIN public.tier_limits tl ON tl.tier_name = COALESCE(o.tier, o.plan_type, 'trial')
WHERE NOT EXISTS (SELECT 1 FROM public.credits c WHERE c.org_id = o.id)
ON CONFLICT DO NOTHING;
-- ============================================
-- PART 5: Remove Duplicate Indexes
-- ============================================

DROP INDEX IF EXISTS public.idx_projects_org;
DROP INDEX IF EXISTS public.idx_unified_files_folder;
DROP INDEX IF EXISTS public.idx_unified_files_project;
DROP INDEX IF EXISTS public.idx_budget_items_project;
DROP INDEX IF EXISTS public.idx_project_folders_project;
DROP INDEX IF EXISTS public.idx_punch_lists_project;
-- ============================================
-- PART 6: Fix Duplicate RLS Policies
-- ============================================

-- profiles: Remove duplicate SELECT policies (keep "Users can view profiles")
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
-- profiles: Remove duplicate UPDATE policies (keep "Users can update their own profile")
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
-- organization_members: Remove duplicate SELECT policies
DROP POLICY IF EXISTS "Users can view own membership" ON public.organization_members;
-- design_studio_projects: Remove duplicate policies (keep the specific ones)
DROP POLICY IF EXISTS "Users can access design projects" ON public.design_studio_projects;
-- ============================================
-- PART 7: Add Credit Deduction Function
-- ============================================

-- Function to deduct credits when processing job completes
CREATE OR REPLACE FUNCTION public.deduct_processing_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  credits_to_deduct NUMERIC;
  current_balance INTEGER;
  org_uuid UUID;
BEGIN
  -- Only process when status changes to 'completed' or 'finished'
  IF NEW.status NOT IN ('completed', 'finished') THEN
    RETURN NEW;
  END IF;
  
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Get org_id (handle both column names)
  org_uuid := COALESCE(NEW.organization_id, NEW.org_id);
  
  IF org_uuid IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Calculate credits to deduct
  credits_to_deduct := COALESCE(NEW.credits_used, 0);
  
  IF credits_to_deduct <= 0 THEN
    RETURN NEW;
  END IF;
  
  -- Update credits balance
  UPDATE public.credits
  SET 
    balance = GREATEST(0, balance - credits_to_deduct::INTEGER),
    updated_at = now()
  WHERE org_id = org_uuid
  RETURNING balance INTO current_balance;
  
  -- Log to credit_ledger
  INSERT INTO public.credit_ledger (
    organization_id,
    delta,
    running_balance,
    reason,
    category,
    ref_type,
    ref_id,
    created_by,
    metadata
  ) VALUES (
    org_uuid,
    -credits_to_deduct,
    current_balance,
    'Processing job completed: ' || COALESCE(NEW.name, NEW.job_type, 'Unknown'),
    'processing',
    'processing_job',
    NEW.id,
    COALESCE(NEW.created_by, NEW.user_id),
    jsonb_build_object(
      'job_type', COALESCE(NEW.job_type, NEW.type),
      'gpu_minutes', NEW.gpu_minutes,
      'cpu_minutes', NEW.cpu_minutes
    )
  );
  
  RETURN NEW;
END;
$$;
-- Create trigger for processing_jobs
DROP TRIGGER IF EXISTS deduct_credits_on_completion ON public.processing_jobs;
CREATE TRIGGER deduct_credits_on_completion
  AFTER UPDATE ON public.processing_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_processing_credits();
-- ============================================
-- PART 8: Add Usage Summary View
-- ============================================

CREATE OR REPLACE VIEW public.org_usage_summary AS
SELECT 
  o.id AS org_id,
  o.name AS org_name,
  o.tier,
  o.plan_type,
  tl.display_name AS tier_display_name,
  COALESCE(c.balance, 0) AS credits_remaining,
  COALESCE(c.monthly_allocation, 0) AS monthly_credits,
  COALESCE(storage.total_bytes, 0) AS storage_used_bytes,
  COALESCE(o.storage_limit_bytes, tl.storage_limit_bytes, 1073741824) AS storage_limit_bytes,
  ROUND(COALESCE(storage.total_bytes, 0)::NUMERIC / NULLIF(COALESCE(o.storage_limit_bytes, tl.storage_limit_bytes, 1073741824), 0) * 100, 2) AS storage_percent_used,
  COALESCE(processing.total_jobs, 0) AS total_processing_jobs,
  COALESCE(processing.completed_jobs, 0) AS completed_processing_jobs,
  COALESCE(processing.total_credits_used, 0) AS total_credits_used_processing,
  o.seats_purchased,
  o.seats_used,
  COALESCE(o.seats_limit, tl.seats_limit, 1) AS seats_limit,
  (SELECT COUNT(*) FROM public.projects p WHERE p.org_id = o.id) AS projects_count,
  COALESCE(o.projects_limit, tl.projects_limit, 3) AS projects_limit
FROM public.organizations o
LEFT JOIN public.tier_limits tl ON tl.tier_name = COALESCE(o.tier, o.plan_type, 'trial')
LEFT JOIN public.credits c ON c.org_id = o.id
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(storage_bytes_delta), 0) AS total_bytes
  FROM public.org_usage_events 
  WHERE org_id = o.id
) storage ON true
LEFT JOIN LATERAL (
  SELECT 
    COUNT(*) AS total_jobs,
    COUNT(*) FILTER (WHERE status IN ('completed', 'finished')) AS completed_jobs,
    COALESCE(SUM(credits_used), 0) AS total_credits_used
  FROM public.processing_jobs 
  WHERE COALESCE(organization_id, org_id) = o.id
) processing ON true;
-- Grant access to the view
GRANT SELECT ON public.org_usage_summary TO authenticated;
COMMENT ON VIEW public.org_usage_summary IS 'Aggregated usage statistics for each organization including credits, storage, and processing job metrics';
