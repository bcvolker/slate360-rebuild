-- ==============================================
-- Consolidate redundant permissive policies
-- Multiple permissive policies for same role/action hurt performance
-- ==============================================

-- project_folders: Has 5+ policies for SELECT - consolidate
DROP POLICY IF EXISTS "Global folders visible to org members" ON public.project_folders;
DROP POLICY IF EXISTS "Members can manage org folders" ON public.project_folders;
DROP POLICY IF EXISTS "Members can view org folders" ON public.project_folders;
DROP POLICY IF EXISTS "Project folders visible to project members" ON public.project_folders;
DROP POLICY IF EXISTS "Users can manage folders" ON public.project_folders;

-- Create single unified policy for project_folders
CREATE POLICY "Org members can access project folders"
ON public.project_folders FOR SELECT
TO authenticated
USING (
  org_id IN (
    SELECT org_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
  OR (project_id IS NOT NULL AND project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.organization_members om ON p.org_id = om.org_id
    WHERE om.user_id = auth.uid() AND om.status = 'active'
  ))
);

CREATE POLICY "Org members can modify project folders"
ON public.project_folders FOR INSERT
TO authenticated
WITH CHECK (
  org_id IN (
    SELECT org_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "Org members can update project folders"
ON public.project_folders FOR UPDATE
TO authenticated
USING (
  org_id IN (
    SELECT org_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "Org members can delete project folders"
ON public.project_folders FOR DELETE
TO authenticated
USING (
  org_id IN (
    SELECT org_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- rfis: Remove duplicates, keep proper org-scoped ones
DROP POLICY IF EXISTS "Service role full access" ON public.rfis;
DROP POLICY IF EXISTS "Members can view rfis" ON public.rfis;
-- Keep: Members can view org rfis, Members can create org rfis, Members can update org rfis

-- submittals: Remove duplicates
DROP POLICY IF EXISTS "Service role full access" ON public.submittals;
DROP POLICY IF EXISTS "Members can view submittals" ON public.submittals;
-- Keep: Members can view org submittals, Members can create org submittals, Members can update org submittals

-- tasks: Remove duplicates
DROP POLICY IF EXISTS "Service role full access" ON public.tasks;
-- Keep: Members can view org tasks, Members can create org tasks, Members can update org tasks

-- tours: Remove duplicates
DROP POLICY IF EXISTS "Service role full access" ON public.tours;
-- Keep: Members can view org tours, Members can create org tours, Members can update org tours

-- profiles: Consolidate SELECT policies
DROP POLICY IF EXISTS "Service role can manage all profiles" ON public.profiles;
-- Keep: Users can view their own profile, Users can update their own profile

-- punch_lists: Consolidate SELECT policies
DROP POLICY IF EXISTS "Members can manage org punch lists" ON public.punch_lists;
-- Keep: Members can view org punch lists

-- schedule_of_values: Consolidate SELECT policies
DROP POLICY IF EXISTS "Project members can manage SOV" ON public.schedule_of_values;
-- Keep: Project members can view SOV

-- Create proper INSERT/UPDATE/DELETE policies for schedule_of_values
CREATE POLICY "Members can insert SOV"
ON public.schedule_of_values FOR INSERT
TO authenticated
WITH CHECK (
  org_id IN (
    SELECT org_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "Members can update SOV"
ON public.schedule_of_values FOR UPDATE
TO authenticated
USING (
  org_id IN (
    SELECT org_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "Members can delete SOV"
ON public.schedule_of_values FOR DELETE
TO authenticated
USING (
  org_id IN (
    SELECT org_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);;
