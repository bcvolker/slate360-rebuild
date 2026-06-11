-- =====================================================
-- ACTIVITY LOG & ALERTS MIGRATION
-- Adds tracking for project events and user notifications
-- =====================================================

-- =====================================================
-- 1. PROJECT ACTIVITY TABLE
-- Stores events like uploads, RFI creation, etc.
-- =====================================================
CREATE TABLE IF NOT EXISTS public.project_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE, -- Nullable for org-level events
  user_id UUID REFERENCES public.profiles(id), -- Nullable for system events or external users
  
  -- Event details
  type TEXT NOT NULL, -- 'upload', 'rfi', 'submittal', 'system', 'alert'
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb, -- Store file_id, path, etc.
  
  -- Alert status
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical', 'success')),
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_activity_org_id ON public.project_activity(org_id);
CREATE INDEX IF NOT EXISTS idx_project_activity_project_id ON public.project_activity(project_id);
CREATE INDEX IF NOT EXISTS idx_project_activity_created_at ON public.project_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_activity_is_read ON public.project_activity(is_read);
-- =====================================================
-- 2. RLS POLICIES
-- =====================================================
ALTER TABLE public.project_activity ENABLE ROW LEVEL SECURITY;
-- Members can view their org's activity
DROP POLICY IF EXISTS "Members can view org activity" ON public.project_activity;
CREATE POLICY "Members can view org activity" ON public.project_activity
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
-- Members can insert activity (e.g. client-side events)
DROP POLICY IF EXISTS "Members can insert org activity" ON public.project_activity;
CREATE POLICY "Members can insert org activity" ON public.project_activity
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
-- Members can update (mark as read)
DROP POLICY IF EXISTS "Members can update org activity" ON public.project_activity;
CREATE POLICY "Members can update org activity" ON public.project_activity
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
-- =====================================================
-- 3. HELPER FUNCTION: Log Activity
-- =====================================================
CREATE OR REPLACE FUNCTION log_project_activity(
  p_org_id UUID,
  p_project_id UUID,
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_description TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_severity TEXT DEFAULT 'info'
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.project_activity (
    org_id, project_id, user_id, type, title, description, metadata, severity
  ) VALUES (
    p_org_id, p_project_id, p_user_id, p_type, p_title, p_description, p_metadata, p_severity
  ) RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION log_project_activity TO authenticated;
GRANT EXECUTE ON FUNCTION log_project_activity TO service_role;
