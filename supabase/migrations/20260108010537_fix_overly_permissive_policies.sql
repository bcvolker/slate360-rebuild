-- ==============================================
-- Fix overly permissive RLS policies (USING (true) is insecure)
-- ==============================================

-- Fix budget_line_items - should be org/project scoped
DROP POLICY IF EXISTS "Project members can access budget" ON public.budget_line_items;
CREATE POLICY "Org members can access budget"
ON public.budget_line_items FOR ALL
TO authenticated
USING (
  org_id IN (
    SELECT org_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Fix credits - should be org scoped
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.credits;
CREATE POLICY "Org members can manage credits"
ON public.credits FOR ALL
TO authenticated
USING (
  org_id IN (
    SELECT org_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Fix feature_requests - should be user scoped for write, public read
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.feature_requests;
CREATE POLICY "Users can manage their feature requests"
ON public.feature_requests FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "All users can view feature requests" ON public.feature_requests;
CREATE POLICY "All users can view feature requests"
ON public.feature_requests FOR SELECT
TO authenticated
USING (true);

-- Fix print_jobs - should be org scoped
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.print_jobs;
CREATE POLICY "Org members can manage print jobs"
ON public.print_jobs FOR ALL
TO authenticated
USING (
  org_id IN (
    SELECT org_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Fix processing_jobs - should be org scoped (uses organization_id, not org_id)
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.processing_jobs;
CREATE POLICY "Org members can manage processing jobs"
ON public.processing_jobs FOR ALL
TO authenticated
USING (
  organization_id IN (
    SELECT org_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Fix schedule_tasks - remove the overly permissive one
DROP POLICY IF EXISTS "Project members can access schedule" ON public.schedule_tasks;

-- Fix schedule_versions - should be project scoped properly  
DROP POLICY IF EXISTS "Project members can access versions" ON public.schedule_versions;
CREATE POLICY "Org members can access schedule versions"
ON public.schedule_versions FOR ALL
TO authenticated
USING (
  org_id IN (
    SELECT org_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);;
