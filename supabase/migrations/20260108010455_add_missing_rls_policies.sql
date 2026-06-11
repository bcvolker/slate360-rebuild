-- ==============================================
-- Add RLS policies to tables with RLS enabled but no policies
-- ==============================================

-- autodesk_sync_queue - org-scoped
DROP POLICY IF EXISTS "Users can manage their org sync queue" ON public.autodesk_sync_queue;
CREATE POLICY "Users can manage their org sync queue"
ON public.autodesk_sync_queue FOR ALL
TO authenticated
USING (
  org_id IN (
    SELECT org_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- backup_history - user who initiated can view
DROP POLICY IF EXISTS "Users can view their initiated backups" ON public.backup_history;
CREATE POLICY "Users can view their initiated backups"
ON public.backup_history FOR SELECT
TO authenticated
USING (initiated_by = auth.uid());

-- design_studio_assets - project scoped via design_studio_projects -> projects
DROP POLICY IF EXISTS "Users can manage design studio assets" ON public.design_studio_assets;
CREATE POLICY "Users can manage design studio assets"
ON public.design_studio_assets FOR ALL
TO authenticated
USING (
  project_id IN (
    SELECT dsp.id FROM public.design_studio_projects dsp
    JOIN public.projects p ON dsp.project_id = p.id
    JOIN public.organization_members om ON p.org_id = om.org_id
    WHERE om.user_id = auth.uid() AND om.status = 'active'
  )
);

-- design_studio_exports - project scoped
DROP POLICY IF EXISTS "Users can manage design exports" ON public.design_studio_exports;
CREATE POLICY "Users can manage design exports"
ON public.design_studio_exports FOR ALL
TO authenticated
USING (
  project_id IN (
    SELECT dsp.id FROM public.design_studio_projects dsp
    JOIN public.projects p ON dsp.project_id = p.id
    JOIN public.organization_members om ON p.org_id = om.org_id
    WHERE om.user_id = auth.uid() AND om.status = 'active'
  )
);

-- design_studio_versions - project scoped
DROP POLICY IF EXISTS "Users can manage design versions" ON public.design_studio_versions;
CREATE POLICY "Users can manage design versions"
ON public.design_studio_versions FOR ALL
TO authenticated
USING (
  project_id IN (
    SELECT dsp.id FROM public.design_studio_projects dsp
    JOIN public.projects p ON dsp.project_id = p.id
    JOIN public.organization_members om ON p.org_id = om.org_id
    WHERE om.user_id = auth.uid() AND om.status = 'active'
  )
);

-- document_signatures - via document
DROP POLICY IF EXISTS "Users can manage document signatures" ON public.document_signatures;
CREATE POLICY "Users can manage document signatures"
ON public.document_signatures FOR ALL
TO authenticated
USING (
  document_id IN (
    SELECT d.id FROM public.documents d
    JOIN public.organization_members om ON d.org_id = om.org_id
    WHERE om.user_id = auth.uid() AND om.status = 'active'
  )
);

-- document_workflows - org scoped
DROP POLICY IF EXISTS "Users can manage document workflows" ON public.document_workflows;
CREATE POLICY "Users can manage document workflows"
ON public.document_workflows FOR ALL
TO authenticated
USING (
  org_id IN (
    SELECT org_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- file_versions - via document
DROP POLICY IF EXISTS "Users can view file versions" ON public.file_versions;
CREATE POLICY "Users can view file versions"
ON public.file_versions FOR ALL
TO authenticated
USING (
  document_id IN (
    SELECT d.id FROM public.documents d
    JOIN public.organization_members om ON d.org_id = om.org_id
    WHERE om.user_id = auth.uid() AND om.status = 'active'
  )
);

-- integration_oauth_states - user scoped
DROP POLICY IF EXISTS "Users can manage their oauth states" ON public.integration_oauth_states;
CREATE POLICY "Users can manage their oauth states"
ON public.integration_oauth_states FOR ALL
TO authenticated
USING (user_id = auth.uid());

-- integration_webhooks - org scoped
DROP POLICY IF EXISTS "Users can manage org webhooks" ON public.integration_webhooks;
CREATE POLICY "Users can manage org webhooks"
ON public.integration_webhooks FOR ALL
TO authenticated
USING (
  org_id IN (
    SELECT org_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- tour_analytics - via tour
DROP POLICY IF EXISTS "Users can view tour analytics" ON public.tour_analytics;
CREATE POLICY "Users can view tour analytics"
ON public.tour_analytics FOR SELECT
TO authenticated
USING (
  tour_id IN (
    SELECT t.id FROM public.tours t
    JOIN public.organization_members om ON t.org_id = om.org_id
    WHERE om.user_id = auth.uid() AND om.status = 'active'
  )
);

-- Allow anonymous analytics insertion (public tours)
DROP POLICY IF EXISTS "Allow anonymous tour analytics" ON public.tour_analytics;
CREATE POLICY "Allow anonymous tour analytics"
ON public.tour_analytics FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- workflow_executions - via workflow
DROP POLICY IF EXISTS "Users can manage workflow executions" ON public.workflow_executions;
CREATE POLICY "Users can manage workflow executions"
ON public.workflow_executions FOR ALL
TO authenticated
USING (
  workflow_id IN (
    SELECT dw.id FROM public.document_workflows dw
    JOIN public.organization_members om ON dw.org_id = om.org_id
    WHERE om.user_id = auth.uid() AND om.status = 'active'
  )
);;
