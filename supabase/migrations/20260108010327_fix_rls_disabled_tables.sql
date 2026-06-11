-- ==============================================
-- FIX 1: Enable RLS on tables that have it disabled
-- ==============================================

-- Enable RLS on projects table
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Enable RLS on organization_members table
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Enable RLS on project_history_events table  
ALTER TABLE public.project_history_events ENABLE ROW LEVEL SECURITY;

-- connectivity_test is likely a debug table - enable RLS but allow public read
ALTER TABLE public.connectivity_test ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- FIX 2: Add RLS policies for projects
-- ==============================================
DROP POLICY IF EXISTS "Users can view projects in their org" ON public.projects;
DROP POLICY IF EXISTS "Users can create projects in their org" ON public.projects;
DROP POLICY IF EXISTS "Users can update projects in their org" ON public.projects;
DROP POLICY IF EXISTS "Users can delete projects in their org" ON public.projects;

CREATE POLICY "Users can view projects in their org" 
ON public.projects FOR SELECT
TO authenticated
USING (
  org_id IN (
    SELECT org_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "Users can create projects in their org" 
ON public.projects FOR INSERT
TO authenticated
WITH CHECK (
  org_id IN (
    SELECT org_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "Users can update projects in their org" 
ON public.projects FOR UPDATE
TO authenticated
USING (
  org_id IN (
    SELECT org_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "Users can delete projects in their org" 
ON public.projects FOR DELETE
TO authenticated
USING (
  org_id IN (
    SELECT org_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
  )
);

-- ==============================================
-- FIX 3: Add RLS policies for organization_members
-- ==============================================
DROP POLICY IF EXISTS "Users can view org members in their org" ON public.organization_members;
DROP POLICY IF EXISTS "Admins can manage org members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view their own membership" ON public.organization_members;

CREATE POLICY "Users can view org members in their org"
ON public.organization_members FOR SELECT
TO authenticated
USING (
  org_id IN (
    SELECT om.org_id FROM public.organization_members om
    WHERE om.user_id = auth.uid() AND om.status = 'active'
  )
);

CREATE POLICY "Admins can manage org members"
ON public.organization_members FOR ALL
TO authenticated
USING (
  org_id IN (
    SELECT om.org_id FROM public.organization_members om
    WHERE om.user_id = auth.uid() AND om.status = 'active' AND om.role IN ('owner', 'admin')
  )
);

-- ==============================================
-- FIX 4: Add RLS policies for project_history_events
-- ==============================================
DROP POLICY IF EXISTS "Users can view project history" ON public.project_history_events;
DROP POLICY IF EXISTS "System can insert project history" ON public.project_history_events;

CREATE POLICY "Users can view project history"
ON public.project_history_events FOR SELECT
TO authenticated
USING (
  project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.organization_members om ON p.org_id = om.org_id
    WHERE om.user_id = auth.uid() AND om.status = 'active'
  )
);

CREATE POLICY "System can insert project history"
ON public.project_history_events FOR INSERT
TO authenticated
WITH CHECK (true);

-- ==============================================
-- FIX 5: Add policy for connectivity_test (public read for health checks)
-- ==============================================
DROP POLICY IF EXISTS "Allow public read for connectivity test" ON public.connectivity_test;

CREATE POLICY "Allow public read for connectivity test"
ON public.connectivity_test FOR SELECT
TO anon, authenticated
USING (true);;
